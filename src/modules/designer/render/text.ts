// Text measurement, fitting and outlining. Pure functions over an opentype Font, shared by browser and server.
import type { Font, Glyph } from "opentype.js";
import { FIT_MODE, PT_PER_MM } from "@/constants/print";
import type { FitRule } from "../designer.validator";

export const LINE_HEIGHT = 1.2;
const TRACKING_STEP_EM = 0.005;
const SIZE_STEP_PT = 0.25;

export const ptToMm = (pt: number) => pt / PT_PER_MM;

export function splitLines(text: string): string[] {
  return text.replace(/\r\n?/g, "\n").split("\n");
}

type PlacedGlyph = { glyph: Glyph; x: number };

/**
 * Lays out one line glyph by glyph: advance widths, pair kerning and tracking between glyphs.
 * Deliberately skips OpenType shaping (opentype.js v2 throws on some GSUB lookups in these fonts),
 * which also keeps names and race numbers exactly as typed.
 */
function layoutLine(font: Font, line: string, sizeMm: number, trackingEm: number): { glyphs: PlacedGlyph[]; width: number } {
  const scale = sizeMm / font.unitsPerEm;
  const glyphs: PlacedGlyph[] = [];
  let x = 0;
  let previous: Glyph | null = null;
  for (const char of Array.from(line)) {
    const glyph = font.charToGlyph(char);
    if (previous) x += font.getKerningValue(previous, glyph) * scale + trackingEm * sizeMm;
    glyphs.push({ glyph, x });
    x += (glyph.advanceWidth ?? 0) * scale;
    previous = glyph;
  }
  return { glyphs, width: x };
}

/** Width of one line in mm. */
export function lineWidthMm(font: Font, line: string, sizePt: number, trackingEm: number): number {
  return line.length === 0 ? 0 : layoutLine(font, line, ptToMm(sizePt), trackingEm).width;
}

export function blockSizeMm(font: Font, text: string, sizePt: number, trackingEm: number) {
  const lines = splitLines(text);
  const width = Math.max(0, ...lines.map((l) => lineWidthMm(font, l, sizePt, trackingEm)));
  const height = lines.length * ptToMm(sizePt) * LINE_HEIGHT;
  return { width, height };
}

export type FitResult = {
  fontSizePt: number;
  trackingEm: number;
  /** False when the text cannot fit even at the minimum size and tightest tracking. */
  fits: boolean;
};

/**
 * PRD §04/§07 per-placeholder fitting: tighten tracking first (track_then_shrink), then step the
 * size down towards the minimum. Starts from the designer's chosen size, capped at the rule's maximum.
 */
export function fitText(
  font: Font,
  text: string,
  box: { widthMm: number; heightMm: number },
  requested: { fontSizePt: number; trackingEm: number },
  rule: FitRule,
): FitResult {
  const fitsAt = (size: number, tracking: number) => {
    const { width, height } = blockSizeMm(font, text, size, tracking);
    return width <= box.widthMm + 1e-6 && height <= box.heightMm + 1e-6;
  };

  const startSize = Math.min(requested.fontSizePt, rule.maxPt);
  if (rule.mode === FIT_MODE.NONE) {
    return { fontSizePt: requested.fontSizePt, trackingEm: requested.trackingEm, fits: fitsAt(requested.fontSizePt, requested.trackingEm) };
  }
  if (fitsAt(startSize, requested.trackingEm)) {
    return { fontSizePt: startSize, trackingEm: requested.trackingEm, fits: true };
  }

  let tracking = requested.trackingEm;
  if (rule.mode === FIT_MODE.TRACK_THEN_SHRINK) {
    while (tracking - TRACKING_STEP_EM >= rule.minTrackingEm - 1e-9) {
      tracking = Math.round((tracking - TRACKING_STEP_EM) * 1000) / 1000;
      if (fitsAt(startSize, tracking)) return { fontSizePt: startSize, trackingEm: tracking, fits: true };
    }
  }

  // Binary search for the largest size that fits, on a 0.25 pt grid.
  let lo = Math.ceil(rule.minPt / SIZE_STEP_PT);
  let hi = Math.floor(startSize / SIZE_STEP_PT);
  if (!fitsAt(lo * SIZE_STEP_PT, tracking)) return { fontSizePt: rule.minPt, trackingEm: tracking, fits: false };
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (fitsAt(mid * SIZE_STEP_PT, tracking)) lo = mid;
    else hi = mid - 1;
  }
  return { fontSizePt: lo * SIZE_STEP_PT, trackingEm: tracking, fits: true };
}

/** SVG path data (mm units) for a text block laid out inside a box at the origin, vertically centred. */
export function textBlockPath(
  font: Font,
  text: string,
  box: { widthMm: number; heightMm: number },
  sizePt: number,
  trackingEm: number,
  align: "left" | "center" | "right",
): string {
  const sizeMm = ptToMm(sizePt);
  const lines = splitLines(text);
  const lineHeight = sizeMm * LINE_HEIGHT;
  const blockHeight = lines.length * lineHeight;
  // Centre the block; place each baseline so ascender and descender share the leading evenly.
  const ascent = (font.ascender / font.unitsPerEm) * sizeMm;
  const descent = (-font.descender / font.unitsPerEm) * sizeMm;
  const firstBaseline = (box.heightMm - blockHeight) / 2 + (lineHeight - (ascent + descent)) / 2 + ascent;

  return lines
    .flatMap((line, i) => {
      if (!line) return [];
      const { glyphs, width } = layoutLine(font, line, sizeMm, trackingEm);
      const x0 = align === "left" ? 0 : align === "right" ? box.widthMm - width : (box.widthMm - width) / 2;
      const baseline = firstBaseline + i * lineHeight;
      // flipY must be off: v2's toPathData flips by default, which would print glyphs upside down.
      return glyphs.map(({ glyph, x }) => glyph.getPath(x0 + x, baseline, sizeMm).toPathData({ decimalPlaces: 3, flipY: false }));
    })
    .filter(Boolean)
    .join(" ");
}
