import { PDFDocument, PDFName, PDFArray, PDFNumber } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { PT_PER_MM } from "@/constants/print";
import { templateSceneSchema } from "@/modules/designer/designer.validator";
import { instantiateTemplate } from "@/modules/designer/render/template";
import { pathOperators } from "@/modules/print-files/print-files.pdf";
import { MAX_PNG_EDGE_PX, printWidthPx, scenePdf, scenePng } from "@/modules/print-files/print-files.renderer";

const bib = instantiateTemplate(
  templateSceneSchema.parse({
    background: "#ffffff",
    elements: [
      { id: "band", type: "rect", x: 0, y: 0, width: 1, height: 0.2, fill: "#0d5c75" },
      { id: "number", type: "text", x: 0.05, y: 0.25, width: 0.9, height: 0.5, text: "1042", fontFamily: "archivo-black", fontWeight: 400, color: "#13212b", align: "center", placeholder: "number" },
    ],
  }),
  { widthMm: 210, heightMm: 148, bleedMm: 3, safeMarginMm: 5 },
);

const box = (page: ReturnType<PDFDocument["getPage"]>, key: string) =>
  (page.node.lookup(PDFName.of(key), PDFArray).asArray() as PDFNumber[]).map((n) => Math.round(n.asNumber() * 100) / 100);

describe("vector print PDF", () => {
  it("is sized to trim + bleed with TrimBox and BleedBox set", async () => {
    const pdf = await PDFDocument.load(await scenePdf(bib));
    const page = pdf.getPage(0);
    expect(pdf.getPageCount()).toBe(1);
    expect(page.getWidth()).toBeCloseTo(216 * PT_PER_MM, 3);
    expect(page.getHeight()).toBeCloseTo(154 * PT_PER_MM, 3);
    const r = (n: number) => Math.round(n * PT_PER_MM * 100) / 100;
    expect(box(page, "TrimBox")).toEqual([r(3), r(3), r(213), r(151)]);
    expect(box(page, "BleedBox")).toEqual([0, 0, r(216), r(154)]);
  });

  it("writes one page per CSV row for a merged file", async () => {
    const pdf = await PDFDocument.load(await scenePdf(bib, [{ number: "1" }, { number: "2" }, { number: "3" }]));
    expect(pdf.getPageCount()).toBe(3);
  });

  it("keeps text as vector outlines, not embedded fonts or images", async () => {
    const bytes = await scenePdf(bib);
    const text = Buffer.from(bytes).toString("latin1");
    expect(text).not.toContain("/FontFile");
    expect(text).not.toContain("/Subtype /Image");
  });

  it("converts quadratic curves to the exactly equivalent cubic", () => {
    const ops = pathOperators("M0 0Q3 6 6 0Z").map((op) => op.toString().trim());
    expect(ops[0]).toBe("0 0 m");
    // Control points: P0 + 2/3(Q - P0) = (2, 4); P + 2/3(Q - P) = (4, 4).
    expect(ops[1]).toBe("2 4 4 4 6 0 c");
    expect(ops[2]).toBe("h");
  });

  it("treats coordinates after M as implicit line-tos", () => {
    expect(pathOperators("M1 1 2 2 3 3").map((op) => op.toString().trim().split(" ").pop())).toEqual(["m", "l", "l"]);
  });
});

describe("print PNG", () => {
  it("renders at the product DPI including bleed", async () => {
    const png = await scenePng(bib, { includeBleed: true, dpi: 300 });
    const width = png.readUInt32BE(16);
    expect(width).toBe(Math.round((216 / 25.4) * 300));
  });

  it("caps very large pieces at the maximum edge", () => {
    expect(Math.round(printWidthPx(600, 600, 600))).toBe(MAX_PNG_EDGE_PX);
  });
});
