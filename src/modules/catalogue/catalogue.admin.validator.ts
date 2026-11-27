import { z } from "zod";
import { templateSceneSchema } from "@/modules/designer/designer.validator";
import { productParametersSchema } from "./catalogue.validator";

const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens.").max(60);
/** Pounds as typed in a form → integer pence. */
const pounds = z.coerce.number().min(0).max(100_000).transform((v) => Math.round(v * 100));

const jsonOf = <S extends z.ZodType>(schema: S, label: string) =>
  z.string().transform((text, ctx): z.infer<S> => {
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch {
      ctx.addIssue({ code: "custom", message: `${label} isn't valid JSON.` });
      return z.NEVER;
    }
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      ctx.addIssue({ code: "custom", message: `${label}: ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}`.trim() });
      return z.NEVER;
    }
    return parsed.data;
  });

export const productUpdateSchema = z.object({
  productId: z.uuid(),
  name: z.string().trim().min(2).max(80),
  summary: z.string().trim().max(200),
  description: z.string().trim().max(2000).default(""),
  isActive: checkbox,
  bleedMm: z.coerce.number().min(0).max(20),
  safeMarginMm: z.coerce.number().min(0).max(50),
  dpi: z.coerce.number().int().min(72).max(1200),
  supportsDesigner: checkbox,
  supportsUpload: checkbox,
  supportsVariableData: checkbox,
  parameters: jsonOf(productParametersSchema, "Parameters"),
});

export const pricingRuleSchema = z.object({
  productId: z.uuid(),
  strategy: z.enum(["area", "per_unit", "per_character"]),
  setupFee: pounds,
  unitBase: pounds,
  // Pence per cm², kept as a decimal.
  areaRate: z.coerce.number().min(0).max(1000),
  perCharacter: pounds,
  minUnit: pounds,
});

export const productMaterialsSchema = z.object({
  productId: z.uuid(),
  materialIds: z.array(z.uuid()).min(1, "Choose at least one material."),
  defaultMaterialId: z.uuid(),
}).refine((v) => v.materialIds.includes(v.defaultMaterialId), { message: "The default material must be one of the selected materials.", path: ["defaultMaterialId"] });

export const tiersSchema = z.object({
  productId: z.uuid().nullable(),
  tiers: z
    .array(z.object({ minQuantity: z.coerce.number().int().min(2).max(1_000_000), discountBps: z.coerce.number().min(0.01).max(90).transform((pct) => Math.round(pct * 100)) }))
    .max(10)
    .refine((t) => new Set(t.map((x) => x.minQuantity)).size === t.length, "Each quantity break must be different."),
});

export const divisionCreateSchema = z.object({
  slug,
  name: z.string().trim().min(2).max(60),
  tagline: z.string().trim().max(80).default(""),
  description: z.string().trim().max(400).default(""),
  sortOrder: z.coerce.number().int().min(0).max(999).default(99),
});

export const divisionActiveSchema = z.object({ divisionId: z.uuid(), isActive: z.enum(["true", "false"]).transform((v) => v === "true") });

export const productCreateSchema = z.object({
  divisionId: z.uuid(),
  slug,
  name: z.string().trim().min(2).max(80),
  productType: z.string().trim().regex(/^[A-Za-z0-9]+$/, "Letters and numbers only (used in file names).").max(30),
});

export const templateSaveSchema = z.object({
  productId: z.uuid(),
  templateId: z.preprocess((v) => (v === "" ? undefined : v), z.uuid().optional()),
  name: z.string().trim().min(2).max(60),
  isDefault: checkbox,
  isActive: checkbox,
  scene: jsonOf(templateSceneSchema, "Template"),
});

export const templateDeleteSchema = z.object({ productId: z.uuid(), templateId: z.uuid() });

export const galleryCreateSchema = z.object({
  divisionId: z.uuid(),
  title: z.string().trim().min(2).max(80),
  description: z.string().trim().max(200).default(""),
});

export const galleryUpdateSchema = z.object({
  itemId: z.uuid(),
  action: z.enum(["publish", "unpublish", "delete"]),
});
