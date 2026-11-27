import "server-only";
import { baseUnitPrice, tierFor } from "@/modules/pricing/pricing.engine";
import type { VolumeTier } from "@/modules/pricing/pricing.types";
import * as catalogueRepository from "./catalogue.repository";
import type { DivisionWithProducts, GalleryItem, ProductDetail } from "./catalogue.types";

type TierRow = VolumeTier & { productId: string | null };

/** A product's own tiers if it has any, otherwise the store-wide defaults. */
function tiersForProduct(all: TierRow[], productId: string): VolumeTier[] {
  const own = all.filter((t) => t.productId === productId);
  const chosen = own.length > 0 ? own : all.filter((t) => t.productId === null);
  return chosen.map(({ minQuantity, discountBps }) => ({ minQuantity, discountBps }));
}

async function loadProducts(
  query: Parameters<typeof catalogueRepository.findProductDetails>[0] = {},
): Promise<ProductDetail[]> {
  const [rows, tiers, tax] = await Promise.all([
    catalogueRepository.findProductDetails(query),
    catalogueRepository.listVolumeTiers(),
    catalogueRepository.listTax(),
  ]);
  // A product without a pricing rule or materials cannot be priced, so it is not sellable.
  return rows
    .filter((row) => row.rule && row.materials.length > 0)
    .map(({ rule, ...product }) => ({ ...product, pricing: { rule: rule!, tiers: tiersForProduct(tiers, product.id), tax } }));
}

/** Lowest per-unit price a customer could reach: smallest size, cheapest material, best volume tier, no setup fee. */
export function fromUnitPrice(product: ProductDetail): number {
  const { size, quantity } = product.parameters;
  const sizes =
    size.mode === "preset"
      ? size.presets.map((p) => ({ w: p.widthMm, h: p.heightMm }))
      : [{ w: size.widthMm.min, h: size.heightMm.min }];
  const smallest = sizes.reduce((a, b) => (a.w * a.h <= b.w * b.h ? a : b));
  const cheapest = Math.min(...product.materials.map((m) => m.priceFactorBps));
  const base = baseUnitPrice({
    rule: product.pricing.rule,
    materialFactorBps: cheapest,
    widthMm: smallest.w,
    heightMm: smallest.h,
    characterCount: 0,
  });
  const best = tierFor(product.pricing.tiers, quantity.max);
  return Math.round((base * (10_000 - (best?.discountBps ?? 0))) / 10_000);
}

export async function getHub(): Promise<DivisionWithProducts[]> {
  const [divisions, products] = await Promise.all([
    catalogueRepository.listDivisionsWithProducts(),
    loadProducts(),
  ]);
  return divisions.map((division) => {
    const prices = products.filter((p) => p.divisionSlug === division.slug).map(fromUnitPrice);
    return { ...division, fromUnitMinor: prices.length ? Math.min(...prices) : null };
  });
}

export async function getDivision(slug: string): Promise<{ division: DivisionWithProducts; products: ProductDetail[] } | null> {
  const hub = await getHub();
  const division = hub.find((d) => d.slug === slug);
  if (!division) return null;
  const products = await loadProducts({ divisionSlug: slug });
  return { division, products };
}

export async function getProduct(divisionSlug: string, productSlug: string): Promise<ProductDetail | null> {
  const [product] = await loadProducts({ divisionSlug, productSlug });
  return product ?? null;
}

export async function getProductById(productId: string): Promise<ProductDetail | null> {
  const [product] = await loadProducts({ productId });
  return product ?? null;
}

export async function listSellableProducts(): Promise<ProductDetail[]> {
  return loadProducts();
}

export async function getGallery(): Promise<GalleryItem[]> {
  return catalogueRepository.listGalleryItems();
}
