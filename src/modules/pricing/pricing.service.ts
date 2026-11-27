import "server-only";
import { AppError, notFound } from "@/lib/errors";
import type { ProductConfiguration } from "@/modules/catalogue/catalogue.validator";
import { validateConfiguration } from "@/modules/catalogue/catalogue.validator";
import { getProductById } from "@/modules/catalogue/catalogue.service";
import type { ProductDetail } from "@/modules/catalogue/catalogue.types";
import { calculatePrice, deliveryCharge } from "./pricing.engine";
import type { DeliveryMethod, PriceBreakdown } from "./pricing.types";

export type Quote = {
  product: Pick<ProductDetail, "id" | "name" | "productType">;
  configuration: ProductConfiguration;
  price: PriceBreakdown;
  deliveryMinor: number;
  grandTotalMinor: number;
  currency: string;
};

/**
 * Authoritative server-side price. Always re-reads the catalogue and re-validates the configuration,
 * so a price shown in the browser is never trusted at checkout.
 */
export async function quote(
  productId: string,
  configuration: ProductConfiguration,
  deliveryMethod: DeliveryMethod = "delivery",
): Promise<Quote> {
  const product = await getProductById(productId);
  if (!product) throw notFound("That product is not available.");

  const issues = validateConfiguration(
    product.parameters,
    product.materials.map((m) => m.id),
    configuration,
  );
  if (issues.length > 0) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of issues) (fieldErrors[issue.field] ??= []).push(issue.message);
    throw new AppError("VALIDATION", issues[0].message, fieldErrors);
  }

  const material = product.materials.find((m) => m.id === configuration.materialId)!;
  const price = calculatePrice({
    ...product.pricing,
    materialFactorBps: material.priceFactorBps,
    widthMm: configuration.widthMm,
    heightMm: configuration.heightMm,
    quantity: configuration.quantity,
    characterCount: configuration.characterCount,
  });
  const deliveryMinor = deliveryCharge(price.totalMinor, deliveryMethod);

  return {
    product: { id: product.id, name: product.name, productType: product.productType },
    configuration,
    price,
    deliveryMinor,
    grandTotalMinor: price.totalMinor + deliveryMinor,
    currency: product.pricing.tax.currency,
  };
}
