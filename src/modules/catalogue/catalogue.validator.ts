import { z } from "zod";
import { ORDER_LIMITS } from "@/constants/limits";
import { ORIENTATION } from "@/constants/print";

const range = z.object({
  min: z.number().positive(),
  max: z.number().positive(),
  step: z.number().positive(),
  default: z.number().positive(),
});

const preset = z.object({
  label: z.string(),
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
});

/** Shape of `products.parameters` (PRD §04: size, orientation and quantity are configured, not pre-listed). */
export const productParametersSchema = z.object({
  size: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("custom"), widthMm: range, heightMm: range, presets: z.array(preset).default([]) }),
    z.object({ mode: z.literal("preset"), presets: z.array(preset).min(1) }),
  ]),
  orientations: z.array(z.enum([ORIENTATION.PORTRAIT, ORIENTATION.LANDSCAPE])).min(1),
  quantity: z.object({
    min: z.number().int().min(ORDER_LIMITS.minQuantity),
    max: z.number().int().max(ORDER_LIMITS.maxQuantity),
    step: z.number().int().positive(),
    default: z.number().int().positive(),
  }),
});

export type ProductParameters = z.infer<typeof productParametersSchema>;

/** A customer's chosen configuration. Width/height are as printed (orientation already applied). */
export const productConfigurationSchema = z.object({
  widthMm: z.coerce.number().positive(),
  heightMm: z.coerce.number().positive(),
  orientation: z.enum([ORIENTATION.PORTRAIT, ORIENTATION.LANDSCAPE]),
  materialId: z.uuid(),
  quantity: z.coerce.number().int().positive(),
  // Only used by per-character pricing (engraving); replaced by the real count from the design at checkout.
  characterCount: z.coerce.number().int().min(0).max(500).default(0),
});

export type ProductConfiguration = z.infer<typeof productConfigurationSchema>;

export type ConfigurationIssue = { field: keyof ProductConfiguration; message: string };

/**
 * Checks a configuration against the product's own rules. Used by the configurator for inline
 * messages and by the server before pricing, so a tampered request can never be priced.
 */
export function validateConfiguration(
  params: ProductParameters,
  materialIds: readonly string[],
  config: ProductConfiguration,
): ConfigurationIssue[] {
  const issues: ConfigurationIssue[] = [];
  const { size, quantity } = params;

  if (!params.orientations.includes(config.orientation)) {
    issues.push({ field: "orientation", message: "That orientation isn't available for this product." });
  }
  if (!materialIds.includes(config.materialId)) {
    issues.push({ field: "materialId", message: "Choose one of the listed materials." });
  }

  // Compare against the unrotated size so portrait and landscape share the same limits.
  const [short, long] = [Math.min(config.widthMm, config.heightMm), Math.max(config.widthMm, config.heightMm)];
  if (size.mode === "preset") {
    const match = size.presets.some(
      (p) => Math.min(p.widthMm, p.heightMm) === short && Math.max(p.widthMm, p.heightMm) === long,
    );
    if (!match) issues.push({ field: "widthMm", message: "Choose one of the available sizes." });
  } else {
    const fits = (w: number, h: number) =>
      w >= size.widthMm.min && w <= size.widthMm.max && h >= size.heightMm.min && h <= size.heightMm.max;
    if (!fits(config.widthMm, config.heightMm) && !fits(config.heightMm, config.widthMm)) {
      issues.push({
        field: "widthMm",
        message: `Size must be between ${size.widthMm.min}–${size.widthMm.max} mm wide and ${size.heightMm.min}–${size.heightMm.max} mm high.`,
      });
    }
  }

  if (config.quantity < quantity.min || config.quantity > quantity.max) {
    issues.push({
      field: "quantity",
      message: `Quantity must be between ${quantity.min.toLocaleString("en-GB")} and ${quantity.max.toLocaleString("en-GB")}.`,
    });
  } else if ((config.quantity - quantity.min) % quantity.step !== 0) {
    issues.push({ field: "quantity", message: `Quantity must go up in steps of ${quantity.step}.` });
  }

  return issues;
}
