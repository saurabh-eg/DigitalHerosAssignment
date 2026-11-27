// Pure pricing maths shared by the browser (instant price) and the server (authoritative price).
// All money is integer minor units; rates are basis points (10000 = 100%).
import { DELIVERY_CONFIG } from "@/constants/site-config";
import type { DeliveryMethod, PriceBreakdown, PriceInput, TaxSettings, VolumeTier } from "./pricing.types";

const BPS = 10_000;

export function areaCm2(widthMm: number, heightMm: number): number {
  return (widthMm * heightMm) / 100;
}

/** Highest tier whose floor the quantity has reached; tiers need not be sorted. */
export function tierFor(tiers: readonly VolumeTier[], quantity: number): VolumeTier | null {
  return tiers.reduce<VolumeTier | null>(
    (best, tier) => (quantity >= tier.minQuantity && (!best || tier.minQuantity > best.minQuantity) ? tier : best),
    null,
  );
}

export function nextTierAfter(tiers: readonly VolumeTier[], quantity: number): VolumeTier | null {
  return tiers.reduce<VolumeTier | null>(
    (next, tier) => (tier.minQuantity > quantity && (!next || tier.minQuantity < next.minQuantity) ? tier : next),
    null,
  );
}

/** Splits tax out of (or adds tax onto) an amount, rounding once at line level. */
export function applyTax(amountMinor: number, tax: TaxSettings): { totalMinor: number; taxMinor: number; netMinor: number } {
  if (tax.pricesIncludeTax) {
    const taxMinor = Math.round((amountMinor * tax.rateBps) / (BPS + tax.rateBps));
    return { totalMinor: amountMinor, taxMinor, netMinor: amountMinor - taxMinor };
  }
  const taxMinor = Math.round((amountMinor * tax.rateBps) / BPS);
  return { totalMinor: amountMinor + taxMinor, taxMinor, netMinor: amountMinor };
}

function discounted(unitMinor: number, discountBps: number): number {
  return Math.round((unitMinor * (BPS - discountBps)) / BPS);
}

export function baseUnitPrice(input: Omit<PriceInput, "tiers" | "tax" | "quantity">): number {
  const { rule } = input;
  const characters = rule.strategy === "per_character" ? (input.characterCount ?? 0) : 0;
  const raw =
    (rule.unitBaseMinor +
      areaCm2(input.widthMm, input.heightMm) * rule.areaRateMinorPerCm2 +
      characters * rule.perCharacterMinor) *
    (input.materialFactorBps / BPS);
  return Math.max(Math.round(raw), rule.minUnitMinor);
}

export function calculatePrice(input: PriceInput): PriceBreakdown {
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    throw new RangeError("Quantity must be a positive integer.");
  }

  const baseUnitMinor = baseUnitPrice(input);
  const tier = tierFor(input.tiers, input.quantity);
  const discountBps = tier?.discountBps ?? 0;
  const unitMinor = discounted(baseUnitMinor, discountBps);

  const itemsMinor = unitMinor * input.quantity;
  const discountMinor = baseUnitMinor * input.quantity - itemsMinor;
  const setupFeeMinor = input.rule.setupFeeMinor;
  const { totalMinor, taxMinor, netMinor } = applyTax(itemsMinor + setupFeeMinor, input.tax);

  const next = nextTierAfter(input.tiers, input.quantity);

  return {
    quantity: input.quantity,
    baseUnitMinor,
    discountBps,
    unitMinor,
    itemsMinor,
    discountMinor,
    setupFeeMinor,
    totalMinor,
    taxMinor,
    netMinor,
    effectiveUnitMinor: Math.round(totalMinor / input.quantity),
    nextTier: next
      ? {
          minQuantity: next.minQuantity,
          discountBps: next.discountBps,
          unitsToGo: next.minQuantity - input.quantity,
          unitMinor: discounted(baseUnitMinor, next.discountBps),
        }
      : null,
  };
}

/** Rows for a "price breaks" table: list price, then one row per volume tier. */
export function priceBreaks(baseUnitMinor: number, tiers: readonly VolumeTier[], minQuantity: number) {
  const sorted = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);
  return [
    { minQuantity: minQuantity, discountBps: 0, unitMinor: baseUnitMinor },
    ...sorted.map((t) => ({ minQuantity: t.minQuantity, discountBps: t.discountBps, unitMinor: discounted(baseUnitMinor, t.discountBps) })),
  ];
}

/** D-013: flat fee, free over the threshold, free for collection. Amounts are tax-inclusive. */
export function deliveryCharge(itemsTotalMinor: number, method: DeliveryMethod): number {
  if (method === "collection") return 0;
  return itemsTotalMinor >= DELIVERY_CONFIG.freeThresholdMinor ? 0 : DELIVERY_CONFIG.flatFeeMinor;
}
