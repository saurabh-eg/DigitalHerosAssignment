import "server-only";
import * as catalogueService from "./catalogue.service";

export const getHub = catalogueService.getHub;
export const getDivision = catalogueService.getDivision;
export const getProduct = catalogueService.getProduct;
export const listSellableProducts = catalogueService.listSellableProducts;
export const getGallery = catalogueService.getGallery;
export const fromUnitPrice = catalogueService.fromUnitPrice;

/** Params for statically generating every division and product page. */
export async function staticProductParams() {
  const products = await catalogueService.listSellableProducts();
  return products.map((p) => ({ division: p.divisionSlug, product: p.slug }));
}

export async function staticDivisionParams() {
  const hub = await catalogueService.getHub();
  return hub.map((d) => ({ division: d.slug }));
}
