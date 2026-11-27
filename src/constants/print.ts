// All geometry is in millimetres (D-022). Per-product values live in the `print_specs` table; these are fallbacks.
export const PRINT_DEFAULTS = {
  bleedMm: 3,
  safeMarginMm: 3,
  dpi: 300,
} as const;

export const MM_PER_INCH = 25.4;
export const PT_PER_INCH = 72;
export const PT_PER_MM = PT_PER_INCH / MM_PER_INCH;

export const FIT_MODE = {
  NONE: "none",
  SHRINK: "shrink",
  TRACK_THEN_SHRINK: "track_then_shrink",
} as const;

export type FitMode = (typeof FIT_MODE)[keyof typeof FIT_MODE];

export const ORIENTATION = {
  PORTRAIT: "portrait",
  LANDSCAPE: "landscape",
} as const;

export type Orientation = (typeof ORIENTATION)[keyof typeof ORIENTATION];
