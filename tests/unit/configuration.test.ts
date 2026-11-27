import { describe, expect, it } from "vitest";
import {
  productParametersSchema,
  validateConfiguration,
  type ProductConfiguration,
} from "@/modules/catalogue/catalogue.validator";

const MATERIAL = "6f1d0c2e-8a5b-4c3d-9e7f-1a2b3c4d5e6f";

const custom = productParametersSchema.parse({
  size: { mode: "custom", widthMm: { min: 20, max: 300, step: 1, default: 75 }, heightMm: { min: 20, max: 200, step: 1, default: 50 } },
  orientations: ["landscape", "portrait"],
  quantity: { min: 10, max: 50000, step: 1, default: 100 },
});

const preset = productParametersSchema.parse({
  size: { mode: "preset", presets: [{ label: "38 × 14", widthMm: 38, heightMm: 14 }] },
  orientations: ["landscape"],
  quantity: { min: 1, max: 500, step: 1, default: 1 },
});

const config = (overrides: Partial<ProductConfiguration> = {}): ProductConfiguration => ({
  widthMm: 75, heightMm: 50, orientation: "landscape", materialId: MATERIAL, quantity: 100, characterCount: 0, ...overrides,
});

const fields = (issues: { field: string }[]) => issues.map((i) => i.field);

describe("validateConfiguration", () => {
  it("accepts a valid custom size", () => {
    expect(validateConfiguration(custom, [MATERIAL], config())).toEqual([]);
  });

  it("accepts a rotated size within the limits", () => {
    expect(validateConfiguration(custom, [MATERIAL], config({ widthMm: 50, heightMm: 250, orientation: "portrait" }))).toEqual([]);
  });

  it("rejects sizes outside the range", () => {
    expect(fields(validateConfiguration(custom, [MATERIAL], config({ widthMm: 400 })))).toEqual(["widthMm"]);
    expect(fields(validateConfiguration(custom, [MATERIAL], config({ widthMm: 10 })))).toEqual(["widthMm"]);
  });

  it("only accepts listed preset sizes", () => {
    expect(validateConfiguration(preset, [MATERIAL], config({ widthMm: 38, heightMm: 14, quantity: 1 }))).toEqual([]);
    expect(fields(validateConfiguration(preset, [MATERIAL], config({ widthMm: 40, heightMm: 14, quantity: 1 })))).toEqual(["widthMm"]);
  });

  it("rejects unknown materials, unavailable orientations and out-of-range quantities", () => {
    expect(fields(validateConfiguration(preset, ["other"], config({ widthMm: 38, heightMm: 14, quantity: 1 })))).toEqual(["materialId"]);
    expect(fields(validateConfiguration(preset, [MATERIAL], config({ widthMm: 14, heightMm: 38, orientation: "portrait", quantity: 1 })))).toEqual(["orientation"]);
    expect(fields(validateConfiguration(custom, [MATERIAL], config({ quantity: 5 })))).toEqual(["quantity"]);
    expect(fields(validateConfiguration(custom, [MATERIAL], config({ quantity: 50001 })))).toEqual(["quantity"]);
  });
});
