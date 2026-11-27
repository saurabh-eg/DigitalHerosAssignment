import { DESIGN_LIMITS } from "@/constants/limits";
import { FIT_MODE, PT_PER_MM } from "@/constants/print";
import type { PrintArea, Scene, SceneElement, TemplateScene } from "../designer.validator";

export const MAIN_AREA_ID = "main";

/** The printable area: the trim inset by the product's safe margin. */
export function defaultPrintArea(widthMm: number, heightMm: number, safeMarginMm: number): PrintArea {
  const inset = Math.min(safeMarginMm, widthMm / 4, heightMm / 4);
  return { id: MAIN_AREA_ID, name: "Print area", xMm: inset, yMm: inset, widthMm: widthMm - 2 * inset, heightMm: heightMm - 2 * inset };
}

const clampPt = (pt: number) => Math.min(DESIGN_LIMITS.maxFontSizePt, Math.max(DESIGN_LIMITS.minFontSizePt, pt));
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Turns a size-independent template into a concrete scene for the chosen size. */
export function instantiateTemplate(
  template: TemplateScene,
  size: { widthMm: number; heightMm: number; bleedMm: number; safeMarginMm: number },
): Scene {
  const area = defaultPrintArea(size.widthMm, size.heightMm, size.safeMarginMm);
  const place = (t: { x: number; y: number; width: number; height: number }) => ({
    xMm: round2(area.xMm + t.x * area.widthMm),
    yMm: round2(area.yMm + t.y * area.heightMm),
    widthMm: round2(Math.max(1, t.width * area.widthMm)),
    heightMm: round2(Math.max(1, t.height * area.heightMm)),
  });

  const elements: SceneElement[] = template.elements.map((t) => {
    const box = place(t);
    if (t.type === "rect") {
      return {
        ...box,
        id: t.id,
        type: "rect",
        rotation: t.rotation,
        printAreaId: MAIN_AREA_ID,
        locked: false,
        fill: t.fill,
        cornerRadiusMm: round2(t.cornerRadius * Math.min(box.widthMm, box.heightMm)),
      };
    }
    // Start at a size where one line fills ~80% of the box height; fitting shrinks it if the text is wider.
    const sizePt = clampPt(Math.floor(box.heightMm * 0.8 * PT_PER_MM));
    return {
      ...box,
      id: t.id,
      type: "text",
      rotation: t.rotation,
      printAreaId: MAIN_AREA_ID,
      locked: false,
      text: t.text,
      fontFamily: t.fontFamily,
      fontWeight: t.fontWeight,
      fontSizePt: sizePt,
      trackingEm: 0,
      color: t.color,
      align: t.align,
      fit: {
        mode: t.fitMode,
        minPt: clampPt(Math.min(sizePt, Math.max(DESIGN_LIMITS.minFontSizePt, sizePt * 0.35))),
        maxPt: sizePt,
        minTrackingEm: t.fitMode === FIT_MODE.TRACK_THEN_SHRINK ? t.minTrackingEm : 0,
      },
      ...(t.placeholder ? { placeholder: t.placeholder } : {}),
    };
  });

  return {
    version: 1,
    widthMm: size.widthMm,
    heightMm: size.heightMm,
    bleedMm: size.bleedMm,
    safeMarginMm: size.safeMarginMm,
    background: template.background,
    printAreas: [area],
    elements,
  };
}

/** A blank scene for uploads or products without a template. */
export function blankScene(size: { widthMm: number; heightMm: number; bleedMm: number; safeMarginMm: number }): Scene {
  return instantiateTemplate({ background: "#ffffff", elements: [] }, size);
}
