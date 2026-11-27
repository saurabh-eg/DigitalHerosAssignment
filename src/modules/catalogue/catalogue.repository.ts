import "server-only";
import { publicImageUrl, supabasePublic } from "@/lib/supabase/public";
import type { TaxSettings, VolumeTier } from "@/modules/pricing/pricing.types";
import type { Division, GalleryItem, Material, ProductDetail, ProductSummary } from "./catalogue.types";
import { productParametersSchema } from "./catalogue.validator";

const PRODUCT_DETAIL_COLUMNS = `
  id, slug, name, summary, description, product_type, parameters, bleed_mm, safe_margin_mm, dpi,
  supports_designer, supports_upload, supports_variable_data,
  divisions!inner(slug, name),
  product_materials(is_default, materials(id, slug, name, description, price_factor_bps, is_active)),
  pricing_rules(strategy, setup_fee_minor, unit_base_minor, area_rate_minor_per_cm2, per_character_minor, min_unit_minor)
`;

type DivisionRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  image_path: string | null;
  sort_order: number;
};

function toDivision(row: DivisionRow): Division {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    imageUrl: publicImageUrl(row.image_path),
    sortOrder: row.sort_order,
  };
}

export async function listDivisionsWithProducts(): Promise<Array<Division & { products: ProductSummary[] }>> {
  const { data, error } = await supabasePublic()
    .from("divisions")
    .select("id, slug, name, tagline, description, image_path, sort_order, products(id, slug, name, summary, sort_order)")
    .order("sort_order")
    .order("sort_order", { referencedTable: "products" });
  if (error) throw error;
  return data.map((row) => ({
    ...toDivision(row),
    products: row.products.map((p) => ({ id: p.id, slug: p.slug, name: p.name, summary: p.summary, divisionSlug: row.slug })),
  }));
}

export async function listTax(): Promise<TaxSettings> {
  const { data, error } = await supabasePublic()
    .from("tax_settings")
    .select("label, rate_bps, prices_include_tax, currency")
    .single();
  if (error) throw error;
  return { label: data.label, rateBps: data.rate_bps, pricesIncludeTax: data.prices_include_tax, currency: data.currency };
}

/** Every tier row; the service picks product-specific tiers or the defaults (product_id null). */
export async function listVolumeTiers(): Promise<Array<VolumeTier & { productId: string | null }>> {
  const { data, error } = await supabasePublic().from("volume_tiers").select("product_id, min_quantity, discount_bps");
  if (error) throw error;
  return data.map((t) => ({ productId: t.product_id, minQuantity: t.min_quantity, discountBps: t.discount_bps }));
}

type ProductQuery = { divisionSlug?: string; productSlug?: string; productId?: string };

/** Products with materials and pricing rule, but without tiers/tax (added by the service). */
export async function findProductDetails(
  query: ProductQuery = {},
): Promise<Array<Omit<ProductDetail, "pricing"> & { rule: ProductDetail["pricing"]["rule"] | null }>> {
  let request = supabasePublic().from("products").select(PRODUCT_DETAIL_COLUMNS).order("sort_order");
  if (query.productId) request = request.eq("id", query.productId);
  if (query.productSlug) request = request.eq("slug", query.productSlug);
  if (query.divisionSlug) request = request.eq("divisions.slug", query.divisionSlug);

  const { data, error } = await request;
  if (error) throw error;

  return data.map((row) => {
    const materials: Material[] = row.product_materials
      .filter((pm) => pm.materials?.is_active)
      .map((pm) => ({
        id: pm.materials!.id,
        slug: pm.materials!.slug,
        name: pm.materials!.name,
        description: pm.materials!.description,
        priceFactorBps: pm.materials!.price_factor_bps,
        isDefault: pm.is_default,
      }))
      .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.priceFactorBps - b.priceFactorBps);

    const rule = row.pricing_rules;
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      summary: row.summary,
      description: row.description,
      divisionSlug: row.divisions.slug,
      divisionName: row.divisions.name,
      productType: row.product_type,
      // Validated here so a malformed admin edit fails loudly instead of breaking the configurator.
      parameters: productParametersSchema.parse(row.parameters),
      bleedMm: Number(row.bleed_mm),
      safeMarginMm: Number(row.safe_margin_mm),
      dpi: row.dpi,
      supportsDesigner: row.supports_designer,
      supportsUpload: row.supports_upload,
      supportsVariableData: row.supports_variable_data,
      materials,
      rule: rule
        ? {
            strategy: rule.strategy,
            setupFeeMinor: rule.setup_fee_minor,
            unitBaseMinor: rule.unit_base_minor,
            areaRateMinorPerCm2: Number(rule.area_rate_minor_per_cm2),
            perCharacterMinor: rule.per_character_minor,
            minUnitMinor: rule.min_unit_minor,
          }
        : null,
    };
  });
}

export async function listGalleryItems(): Promise<GalleryItem[]> {
  const { data, error } = await supabasePublic()
    .from("gallery_items")
    .select("id, title, description, image_path, sort_order, divisions!inner(slug, name, sort_order)")
    .order("sort_order");
  if (error) throw error;
  return data
    .sort((a, b) => a.divisions.sort_order - b.divisions.sort_order || a.sort_order - b.sort_order)
    .map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      imageUrl: publicImageUrl(row.image_path)!,
      divisionSlug: row.divisions.slug,
      divisionName: row.divisions.name,
    }));
}
