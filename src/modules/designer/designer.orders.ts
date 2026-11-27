import "server-only";
import type { Bucket } from "@/constants/storage";
import { AppError, notFound } from "@/lib/errors";
import { productConfigurationSchema, type ProductConfiguration } from "@/modules/catalogue/catalogue.validator";
import { parseCsv } from "./csv";
import * as designerRepository from "./designer.repository";
import { sceneSchema, type Scene } from "./designer.validator";
import { valuesForRow } from "./render/validate";
import { resolvedText } from "./render/scene-svg";
import { sceneSvg } from "@/modules/print-files/print-files.renderer";

// The designer's service surface for orders and proofs: always works from an immutable saved version.

export type SavedVersion = {
  designId: string;
  version: number;
  productId: string;
  organizationId: string;
  configuration: ProductConfiguration;
  scene: Scene | null;
  uploadId: string | null;
  csvDatasetId: string | null;
  csvRows: Array<Record<string, string>> | null;
  csvMapping: Record<string, string>;
};

export async function loadSavedVersion(designId: string, version: number, access: "user" | "service"): Promise<SavedVersion> {
  const row = await designerRepository.findVersion(designId, version, access);
  if (!row?.designs) throw notFound("That design version doesn't exist.");

  let csvRows: SavedVersion["csvRows"] = null;
  let csvMapping: Record<string, string> = {};
  if (row.csv_dataset_id) {
    const dataset = await designerRepository.findCsvRowsSource(row.csv_dataset_id, access);
    const bytes = dataset?.uploads ? await designerRepository.downloadAs(dataset.uploads.bucket as Bucket, dataset.uploads.path, access) : null;
    if (!dataset || !bytes) throw new AppError("VALIDATION", "The spreadsheet for this design couldn't be read.");
    csvRows = parseCsv(new TextDecoder().decode(bytes)).rows;
    csvMapping = (dataset.mapping ?? {}) as Record<string, string>;
  }

  return {
    designId,
    version: row.version,
    productId: row.designs.product_id,
    organizationId: row.designs.organization_id,
    configuration: productConfigurationSchema.parse(row.designs.configuration),
    scene: row.scene ? sceneSchema.parse(row.scene) : null,
    uploadId: row.upload_id,
    csvDatasetId: row.csv_dataset_id,
    csvRows,
    csvMapping,
  };
}

/** The latest saved version of one of the current user's designs, ready to price and order. */
export async function loadLatestForOrder(designId: string): Promise<SavedVersion> {
  const design = await designerRepository.findDesign(designId);
  if (!design) throw notFound("That design doesn't exist or isn't yours.");
  if (!design.is_saved || design.current_version < 1) {
    throw new AppError("VALIDATION", "Save your design before adding it to the basket.");
  }
  const saved = await loadSavedVersion(designId, design.current_version, "user");
  // Quantity lives on the design (a CSV merge sets it to the row count).
  return { ...saved, configuration: productConfigurationSchema.parse(design.configuration) };
}

/** Engraved characters per piece for per-character pricing: the longest row when merging a CSV (D-055). */
export function engravedCharacters(saved: SavedVersion): number {
  if (!saved.scene) return 0;
  const count = (values?: Record<string, string>) =>
    saved.scene!.elements.reduce((n, el) => (el.type === "text" ? n + resolvedText(el, values).replace(/\s/g, "").length : n), 0);
  if (!saved.csvRows?.length) return count();
  return Math.max(...saved.csvRows.map((row) => count(valuesForRow(row, saved.csvMapping))));
}

export type ItemPreview =
  | { kind: "svg"; svg: string; rows: number | null }
  | { kind: "file"; name: string; url: string | null; mimeType: string };

/** Thumbnail for a basket or order line: the rendered design (row 1 for CSV merges) or the uploaded file. */
export async function previewSavedVersion(designId: string, version: number, access: "user" | "service"): Promise<ItemPreview | null> {
  try {
    const saved = await loadSavedVersion(designId, version, access);
    if (saved.scene) {
      const values = saved.csvRows?.[0] ? valuesForRow(saved.csvRows[0], saved.csvMapping) : undefined;
      const svg = await sceneSvg(saved.scene, { includeBleed: false, values });
      return { kind: "svg", svg, rows: saved.csvRows?.length ?? null };
    }
    if (saved.uploadId) {
      const upload = await designerRepository.findUploadAs(saved.uploadId, access);
      if (!upload) return null;
      const urls = await designerRepository.signedUrls(upload.bucket as Bucket, [upload.path]);
      return { kind: "file", name: upload.original_name, url: urls[upload.path] ?? null, mimeType: upload.mime_type };
    }
  } catch (error) {
    console.warn("Preview failed", error instanceof Error ? error.message : error);
  }
  return null;
}

/** Latest saved version number of one of the current user's designs. */
export async function currentVersionOf(designId: string): Promise<number> {
  const design = await designerRepository.findDesign(designId);
  if (!design) throw notFound("That design doesn't exist or isn't yours.");
  return design.current_version;
}
