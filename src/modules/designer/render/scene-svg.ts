// Scene → SVG. The single renderer behind the editor, the proof and the print file (D-047).
import type { ImageElement, Scene, SceneElement, TextElement } from "../designer.validator";
import type { FontSet } from "./fonts";
import { fitText, textBlockPath, type FitResult } from "./text";

export type RenderContext = {
  fonts: FontSet;
  /** Resolves an image element to a URL or data URL; null skips the image. */
  imageHref: (el: ImageElement) => string | null;
  /** Variable-data values for one CSV row, keyed by placeholder (PRD §07). */
  values?: Record<string, string>;
};

const r = (n: number) => Math.round(n * 1000) / 1000;

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function resolvedText(el: TextElement, values?: Record<string, string>): string {
  if (el.placeholder && values && el.placeholder in values) return values[el.placeholder];
  return el.text;
}

export function layoutText(el: TextElement, ctx: Pick<RenderContext, "fonts" | "values">): FitResult & { text: string } {
  const text = resolvedText(el, ctx.values);
  const font = ctx.fonts(el.fontFamily, el.fontWeight);
  const fit = fitText(font, text, el, { fontSizePt: el.fontSizePt, trackingEm: el.trackingEm }, el.fit);
  return { ...fit, text };
}

function transform(el: SceneElement): string {
  const t = `translate(${r(el.xMm)} ${r(el.yMm)})`;
  return el.rotation ? `${t} rotate(${r(el.rotation)} ${r(el.widthMm / 2)} ${r(el.heightMm / 2)})` : t;
}

/** Markup for one element, positioned in trim coordinates (mm). */
export function elementSvg(el: SceneElement, ctx: RenderContext): string {
  let body = "";
  if (el.type === "text") {
    const layout = layoutText(el, ctx);
    const d = textBlockPath(ctx.fonts(el.fontFamily, el.fontWeight), layout.text, el, layout.fontSizePt, layout.trackingEm, el.align);
    body = d ? `<path d="${d}" fill="${el.color}"/>` : "";
  } else if (el.type === "image") {
    const href = ctx.imageHref(el);
    body = href
      ? `<image href="${escapeAttr(href)}" width="${r(el.widthMm)}" height="${r(el.heightMm)}" preserveAspectRatio="xMidYMid meet"/>`
      : "";
  } else {
    body = `<rect width="${r(el.widthMm)}" height="${r(el.heightMm)}" rx="${r(el.cornerRadiusMm)}" fill="${el.fill}"/>`;
  }
  return `<g transform="${transform(el)}">${body}</g>`;
}

export type SvgOptions = {
  /** Print files include the bleed; proofs show the trimmed piece. */
  includeBleed: boolean;
};

export function renderSceneSvg(scene: Scene, ctx: RenderContext, options: SvgOptions): string {
  const b = options.includeBleed ? scene.bleedMm : 0;
  const w = scene.widthMm + 2 * b;
  const h = scene.heightMm + 2 * b;
  const clipId = "trim";
  const elements = scene.elements.map((el) => elementSvg(el, ctx)).join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${r(w)}mm" height="${r(h)}mm" viewBox="${r(-b)} ${r(-b)} ${r(w)} ${r(h)}">`,
    `<defs><clipPath id="${clipId}"><rect x="${r(-b)}" y="${r(-b)}" width="${r(w)}" height="${r(h)}"/></clipPath></defs>`,
    `<g clip-path="url(#${clipId})">`,
    // The background runs into the bleed so trimming never leaves a white edge.
    `<rect x="${r(-b)}" y="${r(-b)}" width="${r(w)}" height="${r(h)}" fill="${scene.background}"/>`,
    elements,
    `</g></svg>`,
  ].join("");
}
