import { describe, expect, it } from "vitest";
import { calculatePrice, deliveryCharge, priceBreaks, tierFor } from "@/modules/pricing/pricing.engine";
import type { PricingRule, TaxSettings, VolumeTier } from "@/modules/pricing/pricing.types";

const VAT: TaxSettings = { label: "VAT", rateBps: 2000, pricesIncludeTax: true, currency: "GBP" };
const DEFAULT_TIERS: VolumeTier[] = [
  { minQuantity: 250, discountBps: 1500 },
  { minQuantity: 100, discountBps: 1000 },
  { minQuantity: 1000, discountBps: 2500 },
  { minQuantity: 500, discountBps: 2000 },
];
const labels: PricingRule = {
  strategy: "area",
  setupFeeMinor: 500,
  unitBaseMinor: 5,
  areaRateMinorPerCm2: 0.9,
  perCharacterMinor: 0,
  minUnitMinor: 8,
};

const labelPrice = (quantity: number, widthMm = 75, heightMm = 50) =>
  calculatePrice({ rule: labels, materialFactorBps: 10000, tiers: DEFAULT_TIERS, tax: VAT, widthMm, heightMm, quantity });

describe("calculatePrice", () => {
  it("prices by area: 75×50 mm = 37.5 cm² → 5p + 33.75p = 39p", () => {
    const p = labelPrice(99);
    expect(p.baseUnitMinor).toBe(39);
    expect(p.discountBps).toBe(0);
    expect(p.itemsMinor).toBe(39 * 99);
    expect(p.totalMinor).toBe(3861 + 500);
  });

  it("extracts 20% VAT from an inclusive total (1/6 of gross)", () => {
    const p = labelPrice(99);
    expect(p.taxMinor).toBe(727); // 4361 × 2000 / 12000 = 726.8
    expect(p.netMinor + p.taxMinor).toBe(p.totalMinor);
  });

  it("applies the volume discount exactly at the floor of 100 units", () => {
    expect(labelPrice(99).discountBps).toBe(0);
    const p = labelPrice(100);
    expect(p.discountBps).toBe(1000);
    expect(p.unitMinor).toBe(35); // 39 × 0.9 = 35.1
    expect(p.discountMinor).toBe(400);
    expect(p.totalMinor).toBe(3500 + 500);
  });

  it("picks the highest tier reached regardless of tier order", () => {
    expect(labelPrice(249).discountBps).toBe(1000);
    expect(labelPrice(250).discountBps).toBe(1500);
    expect(labelPrice(5000).discountBps).toBe(2500);
  });

  it("reports how many more units reach the next tier", () => {
    const p = labelPrice(80);
    expect(p.nextTier).toEqual({ minQuantity: 100, discountBps: 1000, unitsToGo: 20, unitMinor: 35 });
    expect(labelPrice(1000).nextTier).toBeNull();
  });

  it("never prices a unit below the product minimum", () => {
    expect(labelPrice(10, 20, 20).baseUnitMinor).toBe(9); // 5 + 3.6 = 8.6 → 9
    const tiny = calculatePrice({
      rule: { ...labels, unitBaseMinor: 0 },
      materialFactorBps: 10000,
      tiers: [],
      tax: VAT,
      widthMm: 20,
      heightMm: 20,
      quantity: 10,
    });
    expect(tiny.baseUnitMinor).toBe(8);
  });

  it("applies the material factor and per-character engraving", () => {
    const p = calculatePrice({
      rule: { strategy: "per_character", setupFeeMinor: 0, unitBaseMinor: 900, areaRateMinorPerCm2: 5, perCharacterMinor: 8, minUnitMinor: 900 },
      materialFactorBps: 11000,
      tiers: [],
      tax: VAT,
      widthMm: 70,
      heightMm: 20,
      quantity: 1,
      characterCount: 40,
    });
    expect(p.baseUnitMinor).toBe(1419); // (900 + 70 + 320) × 1.1
  });

  it("ignores character count for non-engraving products", () => {
    const withChars = calculatePrice({
      rule: labels, materialFactorBps: 10000, tiers: [], tax: VAT, widthMm: 75, heightMm: 50, quantity: 1, characterCount: 100,
    });
    expect(withChars.baseUnitMinor).toBe(39);
  });

  it("adds tax on top when prices exclude tax", () => {
    const p = calculatePrice({
      rule: labels, materialFactorBps: 10000, tiers: [], tax: { ...VAT, pricesIncludeTax: false }, widthMm: 75, heightMm: 50, quantity: 100,
    });
    expect(p.netMinor).toBe(3900 + 500);
    expect(p.taxMinor).toBe(880);
    expect(p.totalMinor).toBe(5280);
  });

  it("rejects non-integer or zero quantities", () => {
    expect(() => labelPrice(0)).toThrow(RangeError);
    expect(() => labelPrice(1.5)).toThrow(RangeError);
  });
});

describe("helpers", () => {
  it("tierFor returns null below every floor", () => {
    expect(tierFor(DEFAULT_TIERS, 10)).toBeNull();
  });

  it("priceBreaks lists list price then each tier in order", () => {
    expect(priceBreaks(100, DEFAULT_TIERS, 10).map((r) => [r.minQuantity, r.unitMinor])).toEqual([
      [10, 100], [100, 90], [250, 85], [500, 80], [1000, 75],
    ]);
  });

  it("charges flat delivery under £75, free above, free for collection", () => {
    expect(deliveryCharge(7499, "delivery")).toBe(495);
    expect(deliveryCharge(7500, "delivery")).toBe(0);
    expect(deliveryCharge(100, "collection")).toBe(0);
  });
});
