import { beforeAll, describe, expect, it } from "vitest";
import { FIT_MODE } from "@/constants/print";
import type { FitRule, Scene, TextElement } from "@/modules/designer/designer.validator";
import { sceneSchema, templateSceneSchema } from "@/modules/designer/designer.validator";
import type { FontSet } from "@/modules/designer/render/fonts";
import { loadServerFontSet } from "@/modules/designer/render/fonts.server";
import { constrainToArea, effectiveDpi, isWithinArea, rotatedBounds } from "@/modules/designer/render/geometry";
import { renderSceneSvg } from "@/modules/designer/render/scene-svg";
import { instantiateTemplate } from "@/modules/designer/render/template";
import { blockSizeMm, fitText, textBlockPath } from "@/modules/designer/render/text";
import { validateRows, validateScene } from "@/modules/designer/render/validate";

let fonts: FontSet;
beforeAll(async () => {
  fonts = await loadServerFontSet();
});

const area = { id: "main", name: "Print area", xMm: 5, yMm: 5, widthMm: 100, heightMm: 50 };

describe("geometry", () => {
  it("computes the bounds of a rotated box", () => {
    const b = rotatedBounds({ xMm: 0, yMm: 0, widthMm: 20, heightMm: 10, rotation: 90 });
    expect(b.maxX - b.minX).toBeCloseTo(10);
    expect(b.maxY - b.minY).toBeCloseTo(20);
  });

  it("pulls an element back inside the print area", () => {
    const el = constrainToArea({ xMm: 95, yMm: -10, widthMm: 20, heightMm: 10, rotation: 0 }, area);
    expect(el).toMatchObject({ xMm: 85, yMm: 5 });
    expect(isWithinArea(el, area)).toBe(true);
  });

  it("shrinks an element that is too big once rotated", () => {
    const el = constrainToArea({ xMm: 5, yMm: 5, widthMm: 100, heightMm: 20, rotation: 90 }, area);
    expect(isWithinArea(el, area)).toBe(true);
    expect(el.widthMm).toBeLessThan(100);
  });

  it("clamps only the overflowing side of text boxes so they don't flatten", () => {
    const el = constrainToArea({ xMm: 10, yMm: 10, widthMm: 500, heightMm: 12, rotation: 0 }, area, { keepAspect: false });
    expect(el.widthMm).toBe(100);
    expect(el.heightMm).toBe(12);
    expect(isWithinArea(el, area)).toBe(true);
  });

  it("calculates effective dpi", () => {
    expect(effectiveDpi(1181, 1181, 100, 100)).toBeCloseTo(300, 0);
  });
});

describe("text outlines", () => {
  const yValues = (d: string) => {
    // Path data alternates x y pairs after each command letter.
    const numbers = d.replace(/[A-Za-z]/g, " ").trim().split(/[\s,]+/).map(Number);
    return numbers.filter((_, i) => i % 2 === 1);
  };

  it("draws glyphs the right way up (a T's crossbar is at the top, not the bottom)", () => {
    const box = { widthMm: 40, heightMm: 20 };
    for (const family of ["inter", "oswald", "archivo-black"] as const) {
      const ys = yValues(textBlockPath(fonts(family, 400), "T", box, 36, 0, "center"));
      const mid = (Math.min(...ys) + Math.max(...ys)) / 2;
      const mean = ys.reduce((a, b) => a + b, 0) / ys.length;
      // Most outline points belong to the crossbar, so in SVG (y down) their mean sits above the middle.
      expect(mean).toBeLessThan(mid);
    }
  });
});

describe("fitText", () => {
  const rule: FitRule = { mode: FIT_MODE.TRACK_THEN_SHRINK, minPt: 8, maxPt: 72, minTrackingEm: -0.05 };
  const box = { widthMm: 60, heightMm: 25 };

  it("keeps the requested size when the text already fits", () => {
    const font = fonts("oswald", 700);
    const result = fitText(font, "42", box, { fontSizePt: 48, trackingEm: 0 }, rule);
    expect(result).toEqual({ fontSizePt: 48, trackingEm: 0, fits: true });
  });

  it("tightens tracking before shrinking", () => {
    const font = fonts("oswald", 700);
    const natural = blockSizeMm(font, "ALEXANDRA", 48, 0).width;
    const tight = { widthMm: natural * 0.97, heightMm: 25 };
    const result = fitText(font, "ALEXANDRA", tight, { fontSizePt: 48, trackingEm: 0 }, rule);
    expect(result.fits).toBe(true);
    expect(result.fontSizePt).toBe(48);
    expect(result.trackingEm).toBeLessThan(0);
  });

  it("shrinks long names to fit and never exceeds the box", () => {
    const font = fonts("oswald", 700);
    const result = fitText(font, "BARTHOLOMEW-WHITTINGTON", box, { fontSizePt: 48, trackingEm: 0 }, rule);
    expect(result.fits).toBe(true);
    expect(result.fontSizePt).toBeLessThan(48);
    expect(result.fontSizePt).toBeGreaterThanOrEqual(8);
    expect(blockSizeMm(font, "BARTHOLOMEW-WHITTINGTON", result.fontSizePt, result.trackingEm).width).toBeLessThanOrEqual(60);
  });

  it("reports text that cannot fit even at the minimum size", () => {
    const font = fonts("inter", 400);
    const result = fitText(font, "x".repeat(300), box, { fontSizePt: 48, trackingEm: 0 }, rule);
    expect(result.fits).toBe(false);
  });
});

const bibTemplate = templateSceneSchema.parse({
  background: "#ffffff",
  elements: [
    { id: "number", type: "text", x: 0.05, y: 0.2, width: 0.9, height: 0.5, text: "123", fontFamily: "archivo-black", fontWeight: 400, color: "#13212b", align: "center", placeholder: "number" },
    { id: "name", type: "text", x: 0.1, y: 0.75, width: 0.8, height: 0.2, text: "NAME", fontFamily: "oswald", fontWeight: 700, color: "#13212b", align: "center", placeholder: "name" },
  ],
});

describe("templates and rendering", () => {
  const scene: Scene = instantiateTemplate(bibTemplate, { widthMm: 210, heightMm: 148, bleedMm: 3, safeMarginMm: 5 });

  it("instantiates a valid scene inside the print area", () => {
    expect(sceneSchema.safeParse(scene).success).toBe(true);
    expect(validateScene(scene, fonts)).toEqual([]);
  });

  it("renders outlined text with bleed for print and without bleed for proofs", () => {
    const ctx = { fonts, imageHref: () => null };
    const print = renderSceneSvg(scene, ctx, { includeBleed: true });
    const proof = renderSceneSvg(scene, ctx, { includeBleed: false });
    expect(print).toContain('width="216mm"');
    expect(print).toContain('viewBox="-3 -3 216 154"');
    expect(proof).toContain('viewBox="0 0 210 148"');
    expect(print).toMatch(/<path d="M[\d. -]/);
    expect(print).not.toContain("<text");
  });

  it("substitutes CSV values into placeholders", () => {
    const ctx = { fonts, imageHref: () => null };
    const a = renderSceneSvg(scene, { ...ctx, values: { number: "1042", name: "PRIYA" } }, { includeBleed: true });
    const b = renderSceneSvg(scene, { ...ctx, values: { number: "7", name: "TOM" } }, { includeBleed: true });
    expect(a).not.toEqual(b);
  });

  it("flags only the CSV rows that cannot fit", () => {
    const issues = validateRows(scene, fonts, [{ n: "1", who: "ANA" }, { n: "2", who: "X".repeat(400) }], { number: "n", name: "who" });
    expect(issues.map((i) => i.row)).toEqual([2]);
  });

  it("flags elements dragged outside the print area", () => {
    const text = scene.elements[0] as TextElement;
    const moved: Scene = { ...scene, elements: [{ ...text, xMm: -20 }] };
    expect(validateScene(moved, fonts)[0]).toMatchObject({ severity: "error", elementId: "number" });
  });
});
