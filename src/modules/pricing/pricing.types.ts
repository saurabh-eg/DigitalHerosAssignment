export type PricingStrategy = "area" | "per_unit" | "per_character";

export type PricingRule = {
  strategy: PricingStrategy;
  setupFeeMinor: number;
  unitBaseMinor: number;
  areaRateMinorPerCm2: number;
  perCharacterMinor: number;
  minUnitMinor: number;
};

export type VolumeTier = { minQuantity: number; discountBps: number };

export type TaxSettings = {
  label: string;
  rateBps: number;
  pricesIncludeTax: boolean;
  currency: string;
};

export type PriceInput = {
  rule: PricingRule;
  materialFactorBps: number;
  /** Product-specific tiers if it has any, otherwise the defaults. */
  tiers: readonly VolumeTier[];
  tax: TaxSettings;
  widthMm: number;
  heightMm: number;
  quantity: number;
  characterCount?: number;
};

export type PriceBreakdown = {
  quantity: number;
  /** Per-unit price before any volume discount. */
  baseUnitMinor: number;
  discountBps: number;
  /** Per-unit price after the volume discount. */
  unitMinor: number;
  itemsMinor: number;
  discountMinor: number;
  setupFeeMinor: number;
  /** Line total the customer pays (tax-inclusive when prices include tax). */
  totalMinor: number;
  taxMinor: number;
  netMinor: number;
  /** totalMinor / quantity, including the setup fee — the honest "per unit" figure. */
  effectiveUnitMinor: number;
  nextTier: { minQuantity: number; discountBps: number; unitsToGo: number; unitMinor: number } | null;
};

export type DeliveryMethod = "delivery" | "collection";
