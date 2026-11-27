import "server-only";
import { unstable_cache } from "next/cache";
import * as catalogueService from "./catalogue.service";

export const getHub = catalogueService.getHub;
export const getDivision = catalogueService.getDivision;
export const getProduct = catalogueService.getProduct;
export const listSellableProducts = catalogueService.listSellableProducts;
export const getGallery = catalogueService.getGallery;
export const fromUnitPrice = catalogueService.fromUnitPrice;

/**
 * Product families for the site footer, cached for five minutes so dynamic pages (account, console)
 * don't query the catalogue on every request.
 */
export const footerFamilies = unstable_cache(
  async () => (await catalogueService.getHub()).map((d) => ({ slug: d.slug, name: d.name })),
  ["footer-families"],
  { revalidate: 300 },
);

/** Params for statically generating every division and product page. */
export async function staticProductParams() {
  const products = await catalogueService.listSellableProducts();
  return products.map((p) => ({ division: p.divisionSlug, product: p.slug }));
}

export async function staticDivisionParams() {
  const hub = await catalogueService.getHub();
  return hub.map((d) => ({ division: d.slug }));
}
