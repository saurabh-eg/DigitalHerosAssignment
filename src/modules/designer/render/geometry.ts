// Print-area geometry (PRD §06: editing is locked to defined print areas). All values in mm.
import type { PrintArea, SceneElement } from "../designer.validator";

type Box = Pick<SceneElement, "xMm" | "yMm" | "widthMm" | "heightMm" | "rotation">;
export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

const EPSILON = 0.01;

export function rotatedBounds(el: Box): Bounds {
  const cx = el.xMm + el.widthMm / 2;
  const cy = el.yMm + el.heightMm / 2;
  const rad = (el.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  // Half-extents of the axis-aligned box around the rotated rectangle.
  const hw = (el.widthMm * cos + el.heightMm * sin) / 2;
  const hh = (el.widthMm * sin + el.heightMm * cos) / 2;
  return { minX: cx - hw, minY: cy - hh, maxX: cx + hw, maxY: cy + hh };
}

export function isWithinArea(el: Box, area: PrintArea): boolean {
  const b = rotatedBounds(el);
  return (
    b.minX >= area.xMm - EPSILON &&
    b.minY >= area.yMm - EPSILON &&
    b.maxX <= area.xMm + area.widthMm + EPSILON &&
    b.maxY <= area.yMm + area.heightMm + EPSILON
  );
}

/**
 * Returns the element moved (and, if it is bigger than the area once rotated, scaled down about its centre)
 * so that it sits entirely inside the print area. Unprintable placements are therefore impossible.
 */
export function constrainToArea<T extends Box>(el: T, area: PrintArea, options: { keepAspect: boolean } = { keepAspect: true }): T {
  let next = { ...el };
  const quarterTurns = ((Math.round(next.rotation / 90) % 4) + 4) % 4;
  const axisAligned = Math.abs(next.rotation - Math.round(next.rotation / 90) * 90) < 0.01;

  // Text and boxes at right angles: clamp only the dimension that overflows, so widening a text box
  // doesn't also flatten it. Images and freely rotated elements scale uniformly instead.
  if (!options.keepAspect && axisAligned) {
    const [maxW, maxH] = quarterTurns % 2 === 0 ? [area.widthMm, area.heightMm] : [area.heightMm, area.widthMm];
    if (next.widthMm > maxW || next.heightMm > maxH) {
      const cx = next.xMm + next.widthMm / 2;
      const cy = next.yMm + next.heightMm / 2;
      const widthMm = Math.min(next.widthMm, maxW);
      const heightMm = Math.min(next.heightMm, maxH);
      next = { ...next, widthMm, heightMm, xMm: cx - widthMm / 2, yMm: cy - heightMm / 2 };
    }
  }

  const b = rotatedBounds(next);
  const scale = Math.min(1, area.widthMm / (b.maxX - b.minX), area.heightMm / (b.maxY - b.minY));
  if (scale < 1) {
    const cx = next.xMm + next.widthMm / 2;
    const cy = next.yMm + next.heightMm / 2;
    const widthMm = next.widthMm * scale;
    const heightMm = next.heightMm * scale;
    next = { ...next, widthMm, heightMm, xMm: cx - widthMm / 2, yMm: cy - heightMm / 2 };
  }

  const nb = rotatedBounds(next);
  let dx = 0;
  let dy = 0;
  if (nb.minX < area.xMm) dx = area.xMm - nb.minX;
  else if (nb.maxX > area.xMm + area.widthMm) dx = area.xMm + area.widthMm - nb.maxX;
  if (nb.minY < area.yMm) dy = area.yMm - nb.minY;
  else if (nb.maxY > area.yMm + area.heightMm) dy = area.yMm + area.heightMm - nb.maxY;
  return { ...next, xMm: next.xMm + dx, yMm: next.yMm + dy };
}

/** Effective print resolution of a raster image at its placed size. */
export function effectiveDpi(pixelWidth: number, pixelHeight: number, widthMm: number, heightMm: number): number {
  const inches = (mm: number) => mm / 25.4;
  return Math.min(pixelWidth / inches(widthMm), pixelHeight / inches(heightMm));
}
