import "server-only";
import { ROLE } from "@/constants/roles";
import { UPLOAD_LIMITS } from "@/constants/limits";
import { AppError, conflict, notFound } from "@/lib/errors";
import { sniff } from "@/lib/file-sniff";
import { requireRole } from "@/modules/auth/auth.service";
import { templateSceneSchema, type TemplateScene } from "@/modules/designer/designer.validator";
import { instantiateTemplate } from "@/modules/designer/render/template";
import { loadServerFontSet } from "@/modules/designer/render/fonts.server";
import { renderSceneSvg } from "@/modules/designer/render/scene-svg";
import * as repo from "./catalogue.admin.repository";
import type { productParametersSchema } from "./catalogue.validator";
import type { z } from "zod";

const admin = () => requireRole(ROLE.ADMIN);

/** Postgres unique-violation → a friendly conflict instead of a 500. */
function unique<T>(promise: Promise<T>, message: string): Promise<T> {
  return promise.catch((error) => {
    if (error?.code === "23505") throw conflict(message);
    throw error;
  });
}

export async function overview() {
  await admin();
  const [divisions, defaultTiers] = await Promise.all([repo.listDivisions(), repo.listTiers(null)]);
  return { divisions, defaultTiers };
}

export async function productDetail(productId: string) {
  await admin();
  const [product, materials, tiers, fonts] = await Promise.all([repo.findProduct(productId), repo.listMaterials(), repo.listTiers(productId), loadServerFontSet()]);
  if (!product) throw notFound("Product not found.");
  const params = product.parameters as z.infer<typeof productParametersSchema>;
  const preview = params.size.mode === "preset" ? params.size.presets[0] : { widthMm: params.size.widthMm.default, heightMm: params.size.heightMm.default };
  const templates = product.templates
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((t) => {
      const parsed = templateSceneSchema.safeParse(t.scene);
      return {
        ...t,
        // Preview at the product's default size, exactly as customers will see it on the start page.
        svg: parsed.success
          ? renderSceneSvg(
              instantiateTemplate(parsed.data, { ...preview, bleedMm: Number(product.bleed_mm), safeMarginMm: Number(product.safe_margin_mm) }),
              { fonts, imageHref: () => null },
              { includeBleed: false },
            )
          : null,
      };
    });
  return { product, materials, tiers, templates };
}

export async function updateProduct(input: {
  productId: string;
  name: string;
  summary: string;
  description: string;
  isActive: boolean;
  bleedMm: number;
  safeMarginMm: number;
  dpi: number;
  supportsDesigner: boolean;
  supportsUpload: boolean;
  supportsVariableData: boolean;
  parameters: z.infer<typeof productParametersSchema>;
}) {
  await admin();
  await repo.updateProduct(input.productId, {
    name: input.name,
    summary: input.summary,
    description: input.description,
    is_active: input.isActive,
    bleed_mm: input.bleedMm,
    safe_margin_mm: input.safeMarginMm,
    dpi: input.dpi,
    supports_designer: input.supportsDesigner,
    supports_upload: input.supportsUpload,
    supports_variable_data: input.supportsVariableData,
    parameters: input.parameters,
  });
}

export async function updatePricing(input: { productId: string; strategy: "area" | "per_unit" | "per_character"; setupFee: number; unitBase: number; areaRate: number; perCharacter: number; minUnit: number }) {
  await admin();
  await repo.upsertPricingRule({
    product_id: input.productId,
    strategy: input.strategy,
    setup_fee_minor: input.setupFee,
    unit_base_minor: input.unitBase,
    area_rate_minor_per_cm2: input.areaRate,
    per_character_minor: input.perCharacter,
    min_unit_minor: input.minUnit,
  });
}

export async function updateMaterials(productId: string, materialIds: string[], defaultMaterialId: string) {
  await admin();
  await repo.replaceProductMaterials(productId, materialIds, defaultMaterialId);
}

/** Replaces a product's volume tiers (or the store-wide defaults when productId is null). */
export async function updateTiers(productId: string | null, tiers: Array<{ minQuantity: number; discountBps: number }>) {
  await admin();
  await repo.replaceTiers(productId, [...tiers].sort((a, b) => a.minQuantity - b.minQuantity));
}

/** PRD §14: a new division is a row, not a code change; it gets the generic hub artwork until an image is set. */
export async function createDivision(input: { slug: string; name: string; tagline: string; description: string; sortOrder: number }) {
  await admin();
  await unique(repo.insertDivision({ slug: input.slug, name: input.name, tagline: input.tagline, description: input.description, sort_order: input.sortOrder }), "A division with that slug already exists.");
}

export async function setDivisionActive(divisionId: string, isActive: boolean) {
  await admin();
  await repo.setDivisionActive(divisionId, isActive);
}

/**
 * New products start hidden with sensible parameters; they go live once a pricing rule and materials are
 * set and "Active" is ticked (products without either are never sellable, see catalogue.service).
 */
export async function createProduct(input: { divisionId: string; slug: string; name: string; productType: string }): Promise<string> {
  await admin();
  return unique(
    repo.insertProduct({
      division_id: input.divisionId,
      slug: input.slug,
      name: input.name,
      product_type: input.productType,
      is_active: false,
      parameters: {
        size: { mode: "custom", widthMm: { min: 20, max: 300, step: 1, default: 100 }, heightMm: { min: 20, max: 300, step: 1, default: 100 }, presets: [] },
        orientations: ["landscape", "portrait"],
        quantity: { min: 1, max: 10000, step: 1, default: 50 },
      },
    }),
    "A product with that slug already exists in this division.",
  );
}

export async function saveTemplate(input: { productId: string; templateId?: string; name: string; isDefault: boolean; isActive: boolean; scene: TemplateScene }) {
  await admin();
  await repo.saveTemplate({ id: input.templateId, product_id: input.productId, name: input.name, scene: input.scene, is_default: input.isDefault, is_active: input.isActive });
}

export async function deleteTemplate(productId: string, templateId: string) {
  await admin();
  await repo.deleteTemplate(productId, templateId);
}

export async function listGallery() {
  await admin();
  const [items, divisions] = await Promise.all([repo.listGallery(), repo.listDivisions()]);
  return { items, divisions: divisions.map((d) => ({ id: d.id, name: d.name })) };
}

const GALLERY_TYPES = { png: "image/png", jpeg: "image/jpeg" } as const;

/** PRD §12 gallery of real work: uploads a photo (checked by its bytes) to the public gallery bucket. */
export async function addGalleryItem(input: { divisionId: string; title: string; description: string }, file: File) {
  await admin();
  if (file.size === 0) throw new AppError("VALIDATION", "Choose a photo to upload.");
  if (file.size > UPLOAD_LIMITS.galleryImageMaxBytes) throw new AppError("VALIDATION", "Photos must be under 4 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes);
  if (type !== "png" && type !== "jpeg") throw new AppError("VALIDATION", "Photos must be JPG or PNG.");
  const name = `${crypto.randomUUID()}.${type === "jpeg" ? "jpg" : "png"}`;
  await repo.uploadGalleryImage(name, bytes, GALLERY_TYPES[type]);
  await repo.insertGalleryItem({ division_id: input.divisionId, title: input.title, description: input.description, image_path: `gallery/${name}` });
}

export async function updateGalleryItem(itemId: string, action: "publish" | "unpublish" | "delete") {
  await admin();
  if (action === "delete") await repo.deleteGalleryItem(itemId);
  else await repo.updateGalleryItem(itemId, { is_published: action === "publish" });
}
