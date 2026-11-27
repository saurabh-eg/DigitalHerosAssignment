import "server-only";
import { PDFDocument } from "pdf-lib";
import { DESIGN_LIMITS, UPLOAD_LIMITS } from "@/constants/limits";
import { BUCKET, type Bucket } from "@/constants/storage";
import { AppError, notFound } from "@/lib/errors";
import { imageSize, isUnsafeSvg, sniff, type SniffedType } from "@/lib/file-sniff";
import { requireUser } from "@/modules/auth/auth.service";
import type { SessionUser } from "@/modules/auth/auth.types";
import { getProductById } from "@/modules/catalogue/catalogue.service";
import type { ProductDetail } from "@/modules/catalogue/catalogue.types";
import { productConfigurationSchema, validateConfiguration } from "@/modules/catalogue/catalogue.validator";
import { guessMapping, parseCsv } from "./csv";
import * as designerRepository from "./designer.repository";
import type { CsvData, DesignSummary, DesignView, UploadedArtwork } from "./designer.types";
import { sceneSchema, type Scene, type StartJobInput } from "./designer.validator";
import { loadServerFontSet } from "./render/fonts.server";
import { effectiveDpi, isWithinArea } from "./render/geometry";
import { renderSceneSvg } from "./render/scene-svg";
import { blankScene, instantiateTemplate } from "./render/template";
import { validateRows, validateScene } from "./render/validate";

const MM_PER_PT = 25.4 / 72;

async function loadOwnDesign(designId: string) {
  // RLS returns nothing for designs outside the user's organization, which reads as "not found".
  const design = await designerRepository.findDesign(designId);
  if (!design) throw notFound("That design doesn't exist or isn't yours.");
  const product = await getProductById(design.product_id);
  if (!product) throw notFound("This product is no longer available.");
  return { design, product, scene: sceneSchema.parse(design.draft_scene) };
}

function sizeFor(product: ProductDetail, widthMm: number, heightMm: number) {
  return { widthMm, heightMm, bleedMm: product.bleedMm, safeMarginMm: product.safeMarginMm };
}

// ─── Starting a job ─────────────────────────────────────────────────────────

export async function startJob(input: StartJobInput): Promise<string> {
  const user = await requireUser();
  const product = await getProductById(input.product);
  if (!product) throw notFound("That product is not available.");

  const configuration = productConfigurationSchema.parse({
    widthMm: input.w, heightMm: input.h, orientation: input.o, materialId: input.m, quantity: input.q, characterCount: input.c,
  });
  const issues = validateConfiguration(product.parameters, product.materials.map((m) => m.id), configuration);
  if (issues.length > 0) throw new AppError("VALIDATION", issues[0].message);

  if (input.path === "upload" && !product.supportsUpload) throw new AppError("VALIDATION", "This product is designed online only.");
  if (input.path === "csv" && !product.supportsVariableData) throw new AppError("VALIDATION", "This product doesn't support spreadsheet merges.");

  const templates = await designerRepository.listTemplates(product.id);
  const template = templates.find((t) => t.id === input.template) ?? templates.find((t) => t.isDefault) ?? templates[0];
  const size = sizeFor(product, configuration.widthMm, configuration.heightMm);
  const scene = input.path === "upload" || !template ? blankScene(size) : instantiateTemplate(template.scene, size);

  return designerRepository.insertDesign({
    organizationId: user.organizationId,
    createdBy: user.id,
    productId: product.id,
    templateId: input.path === "upload" ? null : (template?.id ?? null),
    name: `${product.name}, ${configuration.widthMm} × ${configuration.heightMm} mm`,
    configuration,
    source: input.path === "upload" ? "upload" : "designer",
    scene,
  });
}

/** Template previews for the start page, rendered at the customer's chosen size. */
export async function previewTemplates(productId: string, widthMm: number, heightMm: number) {
  const product = await getProductById(productId);
  if (!product) throw notFound("That product is not available.");
  const [templates, fonts] = await Promise.all([designerRepository.listTemplates(product.id), loadServerFontSet()]);
  return {
    product,
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      isDefault: t.isDefault,
      svg: renderSceneSvg(instantiateTemplate(t.scene, sizeFor(product, widthMm, heightMm)), { fonts, imageHref: () => null }, { includeBleed: false }),
    })),
  };
}

// ─── Loading a design ───────────────────────────────────────────────────────

function artworkNotes(row: { mime_type: string; width_px: number | null; height_px: number | null; needs_preflight: boolean }, scene: Scene): string[] {
  const notes: string[] = [];
  if (row.needs_preflight) notes.push("Our team will check this file by hand before printing (older Illustrator format).");
  if (row.width_px && row.height_px) {
    const dpi = effectiveDpi(row.width_px, row.height_px, scene.widthMm + 2 * scene.bleedMm, scene.heightMm + 2 * scene.bleedMm);
    notes.push(`${row.width_px} × ${row.height_px} px, about ${Math.round(dpi)} dpi at print size.`);
  }
  return notes;
}

async function loadCsv(datasetId: string): Promise<CsvData | null> {
  const dataset = await designerRepository.findCsvDataset(datasetId);
  if (!dataset?.uploads) return null;
  const bytes = await designerRepository.downloadObject(dataset.uploads.bucket as Bucket, dataset.uploads.path);
  if (!bytes) return null;
  const parsed = parseCsv(new TextDecoder().decode(bytes));
  return {
    id: dataset.id,
    columns: dataset.columns,
    rowCount: dataset.row_count,
    rows: parsed.rows,
    mapping: (dataset.mapping ?? {}) as Record<string, string>,
  };
}

export async function getDesign(designId: string): Promise<DesignView> {
  const user = await requireUser();
  const { design, product, scene } = await loadOwnDesign(designId);

  const imagePaths = scene.elements.flatMap((el) => (el.type === "image" ? [el.assetPath] : []));
  const [templates, assetUrls, upload, csv] = await Promise.all([
    designerRepository.listTemplates(product.id),
    designerRepository.signedUrls(BUCKET.DESIGN_ASSETS, imagePaths),
    design.upload_id ? designerRepository.findUpload(design.upload_id) : null,
    design.csv_dataset_id ? loadCsv(design.csv_dataset_id) : null,
  ]);

  let uploadView: UploadedArtwork | null = null;
  if (upload) {
    const urls = await designerRepository.signedUrls(upload.bucket as Bucket, [upload.path]);
    uploadView = {
      id: upload.id,
      originalName: upload.original_name,
      mimeType: upload.mime_type,
      sizeBytes: upload.size_bytes,
      url: urls[upload.path] ?? "",
      needsPreflight: upload.needs_preflight,
      notes: artworkNotes(upload, scene),
    };
  }

  return {
    id: design.id,
    name: design.name,
    source: design.source,
    configuration: productConfigurationSchema.parse(design.configuration),
    product,
    scene,
    currentVersion: design.current_version,
    isSaved: design.is_saved,
    organizationId: user.organizationId,
    templates,
    assetUrls,
    upload: uploadView,
    csv,
  };
}

export async function listMyDesigns(): Promise<DesignSummary[]> {
  const user = await requireUser();
  const rows = await designerRepository.listDesigns(user.organizationId);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    productName: r.products?.name ?? "",
    source: r.source,
    currentVersion: r.current_version,
    configuration: productConfigurationSchema.parse(r.configuration),
    updatedAt: r.updated_at,
  }));
}

// ─── Saving ─────────────────────────────────────────────────────────────────

/** Structural checks that need no fonts: same trim size, every element inside its print area, own assets only. */
function assertSceneAllowed(scene: Scene, original: Scene, user: SessionUser) {
  if (
    scene.widthMm !== original.widthMm ||
    scene.heightMm !== original.heightMm ||
    scene.bleedMm !== original.bleedMm ||
    JSON.stringify(scene.printAreas) !== JSON.stringify(original.printAreas)
  ) {
    throw new AppError("VALIDATION", "The print size and print areas of a design can't be changed.");
  }
  const areas = new Map(scene.printAreas.map((a) => [a.id, a]));
  for (const el of scene.elements) {
    const area = areas.get(el.printAreaId);
    if (!area || !isWithinArea(el, area)) {
      throw new AppError("VALIDATION", "Part of your design is outside the printable area.");
    }
    if (el.type === "image" && !el.assetPath.startsWith(`${user.organizationId}/`)) {
      throw new AppError("FORBIDDEN", "That image isn't in your account.");
    }
  }
}

export async function saveDraft(designId: string, name: string, scene: Scene): Promise<void> {
  const user = await requireUser();
  const { scene: original } = await loadOwnDesign(designId);
  assertSceneAllowed(scene, original, user);
  await designerRepository.updateDesign(designId, { name, scene });
}

export async function saveCsvMapping(designId: string, mapping: Record<string, string>): Promise<void> {
  await requireUser();
  const { design, scene } = await loadOwnDesign(designId);
  if (!design.csv_dataset_id) throw new AppError("VALIDATION", "Upload a spreadsheet first.");
  const dataset = await designerRepository.findCsvDataset(design.csv_dataset_id);
  const placeholders = new Set(scene.elements.flatMap((el) => (el.type === "text" && el.placeholder ? [el.placeholder] : [])));
  for (const [placeholder, column] of Object.entries(mapping)) {
    if (!placeholders.has(placeholder) || !dataset?.columns.includes(column)) {
      throw new AppError("VALIDATION", "That column or placeholder doesn't exist.");
    }
  }
  await designerRepository.updateCsvMapping(design.csv_dataset_id, mapping);
}

/** Validates the design in full (fit, resolution, every CSV row) and stores it as the next immutable version. */
export async function saveVersion(designId: string): Promise<{ version: number }> {
  const user = await requireUser();
  const { design, scene } = await loadOwnDesign(designId);
  assertSceneAllowed(scene, scene, user);

  if (design.source === "upload") {
    if (!design.upload_id) throw new AppError("VALIDATION", "Upload your artwork before saving.");
  } else {
    if (scene.elements.length === 0) throw new AppError("VALIDATION", "Add something to your design before saving.");
    const fonts = await loadServerFontSet();
    const errors = validateScene(scene, fonts).filter((i) => i.severity === "error");
    if (errors.length > 0) throw new AppError("VALIDATION", errors[0].message);

    if (design.csv_dataset_id) {
      const csv = await loadCsv(design.csv_dataset_id);
      if (!csv) throw new AppError("VALIDATION", "We couldn't read your spreadsheet. Please upload it again.");
      const placeholders = scene.elements.flatMap((el) => (el.type === "text" && el.placeholder ? [el.placeholder] : []));
      const unmapped = placeholders.filter((p) => !csv.mapping[p]);
      if (unmapped.length > 0) throw new AppError("VALIDATION", `Choose a column for "${unmapped[0]}".`);
      const rowIssues = validateRows(scene, fonts, csv.rows, csv.mapping);
      if (rowIssues.length > 0) {
        const rows = [...new Set(rowIssues.map((i) => i.row))].slice(0, 5).join(", ");
        throw new AppError("VALIDATION", `Some rows don't fit the layout (rows ${rows}). Shorten them or enlarge the text boxes.`);
      }
    }
  }

  const version = design.current_version + 1;
  await designerRepository.insertVersion({
    designId,
    version,
    scene: design.source === "upload" ? null : scene,
    uploadId: design.upload_id,
    csvDatasetId: design.csv_dataset_id,
    createdBy: user.id,
  });
  return { version };
}

// ─── Uploads ────────────────────────────────────────────────────────────────

const MIME: Record<Exclude<SniffedType, "unknown">, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  pdf: "application/pdf",
  svg: "image/svg+xml",
  postscript: "application/postscript",
};

type AssetKind = "logo" | "artwork" | "csv";

const KIND_RULES: Record<AssetKind, { bucket: Bucket; maxBytes: number; types: SniffedType[] }> = {
  logo: { bucket: BUCKET.DESIGN_ASSETS, maxBytes: UPLOAD_LIMITS.logoMaxBytes, types: ["png", "jpeg", "svg"] },
  artwork: { bucket: BUCKET.UPLOADS, maxBytes: UPLOAD_LIMITS.artworkMaxBytes, types: ["pdf", "svg", "png", "postscript"] },
  csv: { bucket: BUCKET.CSV, maxBytes: UPLOAD_LIMITS.csvMaxBytes, types: [] },
};

export type RegisteredLogo = { assetPath: string; mimeType: "image/png" | "image/jpeg" | "image/svg+xml"; pixelWidth: number; pixelHeight: number; url: string };

/**
 * Called after the browser uploads a file straight to storage. The server re-reads the bytes and decides
 * what the file really is, so a renamed or oversized file is rejected regardless of what the browser said.
 */
export async function registerAsset(designId: string, kind: AssetKind, path: string, originalName: string) {
  const user = await requireUser();
  const { design, product, scene } = await loadOwnDesign(designId);
  if (!path.startsWith(`${user.organizationId}/${designId}/`)) throw new AppError("FORBIDDEN", "That file isn't part of this design.");

  const rules = KIND_RULES[kind];
  const bytes = await designerRepository.downloadObject(rules.bucket, path);
  if (!bytes) throw notFound("The upload didn't finish. Please try again.");
  const reject = async (message: string): Promise<never> => {
    await designerRepository.removeObject(rules.bucket, path);
    throw new AppError("VALIDATION", message);
  };
  if (bytes.byteLength > rules.maxBytes) await reject(`Files must be under ${Math.round(rules.maxBytes / 1024 / 1024)} MB.`);

  if (kind === "csv") return registerCsv(user, design, product, scene, path, originalName, bytes, reject);

  const type = sniff(bytes);
  if (!rules.types.includes(type)) {
    await reject(kind === "logo" ? "Logos must be PNG, JPG or SVG files." : "Artwork must be a PDF, SVG, AI or PNG file.");
  }
  if (type === "svg" && isUnsafeSvg(new TextDecoder().decode(bytes))) await reject("This SVG contains scripts and can't be used.");

  const size = imageSize(bytes, type);
  const notes: string[] = [];
  let needsPreflight = false;

  if (kind === "artwork") {
    const printW = scene.widthMm + 2 * scene.bleedMm;
    const printH = scene.heightMm + 2 * scene.bleedMm;
    if (type === "postscript") {
      needsPreflight = true;
      notes.push("Our team will check this file by hand before printing (older Illustrator format).");
    }
    if (type === "png" && size) {
      const dpi = effectiveDpi(size.width, size.height, printW, printH);
      if (dpi < DESIGN_LIMITS.minImageDpi) {
        await reject(`This image is only ${Math.round(dpi)} dpi at ${printW} × ${printH} mm and would print blurry. Use at least ${DESIGN_LIMITS.minImageDpi} dpi.`);
      }
      notes.push(`${size.width} × ${size.height} px, about ${Math.round(dpi)} dpi at print size.`);
      if (dpi < DESIGN_LIMITS.warnImageDpi) notes.push("Below 300 dpi: fine details may look soft.");
    }
    if (type === "pdf") {
      try {
        const pdf = await PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false });
        const { width, height } = pdf.getPage(0).getSize();
        const [wMm, hMm] = [width * MM_PER_PT, height * MM_PER_PT];
        const near = (a: number, b: number) => Math.abs(a - b) <= 1;
        const matches = (w: number, h: number) => (near(wMm, w) && near(hMm, h)) || (near(wMm, h) && near(hMm, w));
        if (pdf.getPageCount() > 1) notes.push(`This PDF has ${pdf.getPageCount()} pages; we'll print page 1.`);
        if (matches(printW, printH)) notes.push("Page size matches the print size including bleed.");
        else if (matches(scene.widthMm, scene.heightMm)) notes.push(`No bleed: we'll extend the edges by ${scene.bleedMm} mm.`);
        else notes.push(`Page is ${Math.round(wMm)} × ${Math.round(hMm)} mm; it will be scaled to fit ${scene.widthMm} × ${scene.heightMm} mm.`);
      } catch {
        await reject("This PDF can't be opened. It may be password-protected or damaged.");
      }
    }
  }

  const mimeType = MIME[type as Exclude<SniffedType, "unknown">];
  const uploadId = await designerRepository.insertUpload({
    organizationId: user.organizationId,
    uploadedBy: user.id,
    kind,
    bucket: rules.bucket,
    path,
    originalName: originalName.slice(0, 200),
    mimeType,
    sizeBytes: bytes.byteLength,
    widthPx: size?.width ?? null,
    heightPx: size?.height ?? null,
    needsPreflight,
  });

  const urls = await designerRepository.signedUrls(rules.bucket, [path]);
  if (kind === "logo") {
    // SVG logos are vector: give them a nominal large pixel size so the DPI check never flags them.
    const logo: RegisteredLogo = {
      assetPath: path,
      mimeType: mimeType as RegisteredLogo["mimeType"],
      pixelWidth: size?.width ?? 4000,
      pixelHeight: size?.height ?? 4000,
      url: urls[path] ?? "",
    };
    return { kind: "logo" as const, logo };
  }

  await designerRepository.updateDesign(designId, { uploadId });
  const artwork: UploadedArtwork = {
    id: uploadId,
    originalName,
    mimeType,
    sizeBytes: bytes.byteLength,
    url: urls[path] ?? "",
    needsPreflight,
    notes,
  };
  return { kind: "artwork" as const, artwork };
}

async function registerCsv(
  user: SessionUser,
  design: NonNullable<Awaited<ReturnType<typeof designerRepository.findDesign>>>,
  product: ProductDetail,
  scene: Scene,
  path: string,
  originalName: string,
  bytes: Uint8Array,
  reject: (message: string) => Promise<never>,
) {
  if (!product.supportsVariableData) await reject("This product doesn't support spreadsheet merges.");
  const parsed = parseCsv(new TextDecoder().decode(bytes));
  if (parsed.errors.length > 0) await reject(parsed.errors[0]);

  const { min, max } = product.parameters.quantity;
  if (parsed.rows.length < min || parsed.rows.length > max) {
    await reject(`This product is ordered in quantities of ${min}–${max.toLocaleString("en-GB")}; your file has ${parsed.rows.length} rows.`);
  }

  const placeholders = scene.elements.flatMap((el) => (el.type === "text" && el.placeholder ? [el.placeholder] : []));
  const mapping = guessMapping(placeholders, parsed.columns);
  const uploadId = await designerRepository.insertUpload({
    organizationId: user.organizationId,
    uploadedBy: user.id,
    kind: "csv",
    bucket: BUCKET.CSV,
    path,
    originalName: originalName.slice(0, 200),
    mimeType: "text/csv",
    sizeBytes: bytes.byteLength,
    widthPx: null,
    heightPx: null,
    needsPreflight: false,
  });
  const datasetId = await designerRepository.insertCsvDataset({
    organizationId: user.organizationId,
    uploadId,
    columns: parsed.columns,
    rowCount: parsed.rows.length,
    mapping,
  });

  // One finished piece per row (PRD §07), so the quantity follows the spreadsheet.
  const configuration = productConfigurationSchema.parse({ ...(design.configuration as object), quantity: parsed.rows.length });
  await designerRepository.updateDesign(design.id, { csvDatasetId: datasetId, configuration });

  const csv: CsvData = { id: datasetId, columns: parsed.columns, rowCount: parsed.rows.length, rows: parsed.rows, mapping };
  return { kind: "csv" as const, csv };
}
