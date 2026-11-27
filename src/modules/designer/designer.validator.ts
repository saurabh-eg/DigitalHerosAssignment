import { z } from "zod";
import { DESIGN_LIMITS } from "@/constants/limits";
import { FIT_MODE } from "@/constants/print";
import { FONT_FAMILY_IDS } from "./render/fonts";

const mm = z.number().finite();
const positiveMm = z.number().finite().positive();
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #1a2030.");
const id = z.string().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/);

/** PRD §04/§07 per-placeholder fitting rules. */
export const fitRuleSchema = z
  .object({
    mode: z.enum([FIT_MODE.NONE, FIT_MODE.SHRINK, FIT_MODE.TRACK_THEN_SHRINK]),
    minPt: z.number().min(DESIGN_LIMITS.minFontSizePt),
    maxPt: z.number().max(DESIGN_LIMITS.maxFontSizePt),
    /** Tightest letter spacing allowed, in em (negative = tighter). */
    minTrackingEm: z.number().min(-0.2).max(0),
  })
  .refine((r) => r.minPt <= r.maxPt, { message: "Minimum size must not exceed the maximum." });

const elementBase = {
  id,
  /** Box position from the trim's top-left corner, in mm. */
  xMm: mm,
  yMm: mm,
  widthMm: positiveMm,
  heightMm: positiveMm,
  /** Degrees clockwise around the box centre. */
  rotation: z.number().min(-360).max(360).default(0),
  printAreaId: id,
  locked: z.boolean().default(false),
};

export const textElementSchema = z.object({
  ...elementBase,
  type: z.literal("text"),
  text: z.string().max(DESIGN_LIMITS.maxTextLength),
  fontFamily: z.enum(FONT_FAMILY_IDS),
  fontWeight: z.union([z.literal(400), z.literal(700)]),
  fontSizePt: z.number().min(DESIGN_LIMITS.minFontSizePt).max(DESIGN_LIMITS.maxFontSizePt),
  trackingEm: z.number().min(-0.2).max(1).default(0),
  color: hexColor,
  align: z.enum(["left", "center", "right"]),
  fit: fitRuleSchema,
  /** CSV column key this text is filled from in variable-data jobs (PRD §07). */
  placeholder: z.string().max(40).optional(),
});

export const imageElementSchema = z.object({
  ...elementBase,
  type: z.literal("image"),
  /** Storage path in the design-assets bucket: `<organization_id>/<file>`. */
  assetPath: z.string().min(1).max(300),
  mimeType: z.enum(["image/png", "image/jpeg", "image/svg+xml"]),
  /** Intrinsic pixel size, used for the effective-DPI check. */
  pixelWidth: z.number().int().positive(),
  pixelHeight: z.number().int().positive(),
});

export const shapeElementSchema = z.object({
  ...elementBase,
  type: z.literal("rect"),
  fill: hexColor,
  cornerRadiusMm: z.number().min(0).max(100).default(0),
});

export const sceneElementSchema = z.discriminatedUnion("type", [textElementSchema, imageElementSchema, shapeElementSchema]);

export const printAreaSchema = z.object({
  id,
  name: z.string().max(40),
  xMm: mm,
  yMm: mm,
  widthMm: positiveMm,
  heightMm: positiveMm,
});

export const sceneSchema = z.object({
  version: z.literal(1),
  /** Trim (finished) size. */
  widthMm: positiveMm,
  heightMm: positiveMm,
  bleedMm: z.number().min(0).max(20),
  safeMarginMm: z.number().min(0).max(50),
  background: hexColor,
  printAreas: z.array(printAreaSchema).min(1).max(4),
  elements: z.array(sceneElementSchema).max(DESIGN_LIMITS.maxElements),
});

export type FitRule = z.infer<typeof fitRuleSchema>;
export type TextElement = z.infer<typeof textElementSchema>;
export type ImageElement = z.infer<typeof imageElementSchema>;
export type ShapeElement = z.infer<typeof shapeElementSchema>;
export type SceneElement = z.infer<typeof sceneElementSchema>;
export type PrintArea = z.infer<typeof printAreaSchema>;
export type Scene = z.infer<typeof sceneSchema>;

// ─── Templates ──────────────────────────────────────────────────────────────
// Templates are size-independent: positions and sizes are fractions of the print area,
// so one template fits every size of a parameter-driven product.

const fraction = z.number().min(0).max(1);

const templateBase = {
  id,
  x: fraction,
  y: fraction,
  width: fraction,
  height: fraction,
  rotation: z.number().default(0),
};

export const templateElementSchema = z.discriminatedUnion("type", [
  z.object({
    ...templateBase,
    type: z.literal("text"),
    text: z.string().max(DESIGN_LIMITS.maxTextLength),
    fontFamily: z.enum(FONT_FAMILY_IDS),
    fontWeight: z.union([z.literal(400), z.literal(700)]),
    color: hexColor,
    align: z.enum(["left", "center", "right"]),
    fitMode: z.enum([FIT_MODE.NONE, FIT_MODE.SHRINK, FIT_MODE.TRACK_THEN_SHRINK]).default(FIT_MODE.TRACK_THEN_SHRINK),
    minTrackingEm: z.number().min(-0.2).max(0).default(-0.05),
    placeholder: z.string().max(40).optional(),
  }),
  z.object({ ...templateBase, type: z.literal("rect"), fill: hexColor, cornerRadius: fraction.default(0) }),
]);

export const templateSceneSchema = z.object({
  background: hexColor,
  elements: z.array(templateElementSchema),
});

export type TemplateScene = z.infer<typeof templateSceneSchema>;
export type TemplateElement = z.infer<typeof templateElementSchema>;

// ─── Requests ───────────────────────────────────────────────────────────────

export const startJobSchema = z.object({
  product: z.uuid(),
  path: z.enum(["design", "upload", "csv"]).default("design"),
  w: z.coerce.number().positive(),
  h: z.coerce.number().positive(),
  o: z.enum(["portrait", "landscape"]),
  m: z.uuid(),
  q: z.coerce.number().int().positive(),
  c: z.coerce.number().int().min(0).max(500).default(0),
  template: z.uuid().optional(),
});

export const saveDraftSchema = z.object({
  designId: z.uuid(),
  name: z.string().trim().min(1).max(80),
  scene: sceneSchema,
});

export const csvMappingSchema = z.record(z.string().max(40), z.string().max(120));

export type StartJobInput = z.infer<typeof startJobSchema>;
