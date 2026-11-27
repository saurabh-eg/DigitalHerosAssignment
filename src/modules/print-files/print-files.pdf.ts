// Scene → vector PDF page (D-062). Text arrives as outlines from the shared renderer, boxes are paths,
// images are embedded; the page is trim + bleed with TrimBox/BleedBox set for the print workflow.
import {
  appendBezierCurve,
  closePath,
  concatTransformationMatrix,
  drawObject,
  fill,
  lineTo,
  moveTo,
  popGraphicsState,
  pushGraphicsState,
  setFillingRgbColor,
  type PDFDocument,
  type PDFImage,
  type PDFOperator,
} from "pdf-lib";
import { PT_PER_MM } from "@/constants/print";
import type { Scene, SceneElement } from "@/modules/designer/designer.validator";
import type { FontSet } from "@/modules/designer/render/fonts";
import { layoutText } from "@/modules/designer/render/scene-svg";
import { textBlockPath } from "@/modules/designer/render/text";

const KAPPA = 0.5522847498; // control-point ratio for a quarter circle

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * Converts the absolute M/L/Q/C/Z path data our renderer emits into PDF path operators.
 * PDF has no quadratic curves (pdf-lib's appendQuadraticCurve emits `v`, which is a different curve),
 * so TrueType quadratics are degree-elevated to the exactly equivalent cubic.
 */
export function pathOperators(d: string): PDFOperator[] {
  const tokens = d.match(/[MLQCZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  const ops: PDFOperator[] = [];
  let i = 0;
  let command = "";
  let [cx, cy] = [0, 0]; // current point
  let [sx, sy] = [0, 0]; // start of the current subpath
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    if (/^[MLQCZ]$/i.test(tokens[i])) command = tokens[i++].toUpperCase();
    switch (command) {
      case "M":
        [cx, cy] = [num(), num()];
        [sx, sy] = [cx, cy];
        ops.push(moveTo(cx, cy));
        command = "L"; // implicit lineto after the first pair, as in SVG
        break;
      case "L":
        [cx, cy] = [num(), num()];
        ops.push(lineTo(cx, cy));
        break;
      case "Q": {
        const [qx, qy, x, y] = [num(), num(), num(), num()];
        ops.push(appendBezierCurve(cx + (2 / 3) * (qx - cx), cy + (2 / 3) * (qy - cy), x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y), x, y));
        [cx, cy] = [x, y];
        break;
      }
      case "C": {
        const [x1, y1, x2, y2, x, y] = [num(), num(), num(), num(), num(), num()];
        ops.push(appendBezierCurve(x1, y1, x2, y2, x, y));
        [cx, cy] = [x, y];
        break;
      }
      case "Z":
        ops.push(closePath());
        [cx, cy] = [sx, sy];
        break;
      default:
        throw new Error(`Unsupported path command "${command}"`);
    }
  }
  return ops;
}

function roundedRect(w: number, h: number, r: number): PDFOperator[] {
  const rr = Math.min(r, w / 2, h / 2);
  if (rr <= 0) return [moveTo(0, 0), lineTo(w, 0), lineTo(w, h), lineTo(0, h), closePath()];
  const k = rr * KAPPA;
  return [
    moveTo(rr, 0),
    lineTo(w - rr, 0),
    appendBezierCurve(w - rr + k, 0, w, rr - k, w, rr),
    lineTo(w, h - rr),
    appendBezierCurve(w, h - rr + k, w - rr + k, h, w - rr, h),
    lineTo(rr, h),
    appendBezierCurve(rr - k, h, 0, h - rr + k, 0, h - rr),
    lineTo(0, rr),
    appendBezierCurve(0, rr - k, rr - k, 0, rr, 0),
    closePath(),
  ];
}

/** Same transform as the SVG renderer: translate to the box, rotate about its centre (y-down space). */
function elementTransform(el: SceneElement): PDFOperator[] {
  const ops = [concatTransformationMatrix(1, 0, 0, 1, el.xMm, el.yMm)];
  if (el.rotation) {
    const rad = (el.rotation * Math.PI) / 180;
    const [cx, cy] = [el.widthMm / 2, el.heightMm / 2];
    ops.push(
      concatTransformationMatrix(1, 0, 0, 1, cx, cy),
      concatTransformationMatrix(Math.cos(rad), Math.sin(rad), -Math.sin(rad), Math.cos(rad), 0, 0),
      concatTransformationMatrix(1, 0, 0, 1, -cx, -cy),
    );
  }
  return ops;
}

export type PdfImages = Map<string, PDFImage>;

/** Adds one scene (optionally filled with a CSV row) as a page of `doc`. */
export function addScenePage(doc: PDFDocument, scene: Scene, fonts: FontSet, images: PdfImages, values?: Record<string, string>) {
  const b = scene.bleedMm;
  const pageW = (scene.widthMm + 2 * b) * PT_PER_MM;
  const pageH = (scene.heightMm + 2 * b) * PT_PER_MM;
  const page = doc.addPage([pageW, pageH]);
  page.setBleedBox(0, 0, pageW, pageH);
  page.setTrimBox(b * PT_PER_MM, b * PT_PER_MM, scene.widthMm * PT_PER_MM, scene.heightMm * PT_PER_MM);

  // Work in the scene's own units: millimetres from the trim's top-left corner, y pointing down.
  const ops: PDFOperator[] = [
    pushGraphicsState(),
    concatTransformationMatrix(PT_PER_MM, 0, 0, -PT_PER_MM, b * PT_PER_MM, pageH - b * PT_PER_MM),
    // Background runs into the bleed, so it starts at (-b, -b).
    pushGraphicsState(),
    concatTransformationMatrix(1, 0, 0, 1, -b, -b),
    setFillingRgbColor(...rgb(scene.background)),
    ...roundedRect(scene.widthMm + 2 * b, scene.heightMm + 2 * b, 0),
    fill(),
    popGraphicsState(),
  ];

  for (const el of scene.elements) {
    ops.push(pushGraphicsState(), ...elementTransform(el));
    if (el.type === "text") {
      const layout = layoutText(el, { fonts, values });
      const d = textBlockPath(fonts(el.fontFamily, el.fontWeight), layout.text, el, layout.fontSizePt, layout.trackingEm, el.align);
      if (d) ops.push(setFillingRgbColor(...rgb(el.color)), ...pathOperators(d), fill());
    } else if (el.type === "rect") {
      ops.push(setFillingRgbColor(...rgb(el.fill)), ...roundedRect(el.widthMm, el.heightMm, el.cornerRadiusMm), fill());
    } else {
      const image = images.get(el.assetPath);
      if (image) {
        // Fit inside the box keeping aspect ratio (like preserveAspectRatio="xMidYMid meet").
        const scale = Math.min(el.widthMm / image.width, el.heightMm / image.height);
        const [dw, dh] = [image.width * scale, image.height * scale];
        const [ox, oy] = [(el.widthMm - dw) / 2, (el.heightMm - dh) / 2];
        const name = page.node.newXObject("Image", image.ref);
        // Image space is y-up; flip it back inside our y-down frame.
        ops.push(concatTransformationMatrix(dw, 0, 0, -dh, ox, oy + dh), drawObject(name));
      }
    }
    ops.push(popGraphicsState());
  }
  ops.push(popGraphicsState());
  page.pushOperators(...ops);
  return page;
}
