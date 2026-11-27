import "server-only";
import { Resvg } from "@resvg/resvg-js";
import { PDFDocument } from "pdf-lib";
import { BUCKET } from "@/constants/storage";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Scene } from "@/modules/designer/designer.validator";
import { loadServerFontSet } from "@/modules/designer/render/fonts.server";
import { renderSceneSvg } from "@/modules/designer/render/scene-svg";
import { addScenePage, type PdfImages } from "./print-files.pdf";

// PNG outputs are capped so very large pieces stay within serverless memory (D-063). PDFs are vector.
export const MAX_PNG_EDGE_PX = 8000;

type Asset = { bytes: Uint8Array; mimeType: string };

async function loadAssets(scene: Scene): Promise<Map<string, Asset>> {
  const paths = [...new Set(scene.elements.flatMap((el) => (el.type === "image" ? [el.assetPath] : [])))];
  const entries = await Promise.all(
    paths.map(async (path) => {
      const { data } = await supabaseAdmin().storage.from(BUCKET.DESIGN_ASSETS).download(path);
      return data ? ([path, { bytes: new Uint8Array(await data.arrayBuffer()), mimeType: data.type }] as const) : null;
    }),
  );
  return new Map(entries.filter((e) => e !== null));
}

function dataUrl(asset: Asset): string {
  return `data:${asset.mimeType || "image/png"};base64,${Buffer.from(asset.bytes).toString("base64")}`;
}

/** The scene as SVG with images inlined, ready for rasterising. */
export async function sceneSvg(scene: Scene, options: { includeBleed: boolean; values?: Record<string, string> }): Promise<string> {
  const [fonts, assets] = await Promise.all([loadServerFontSet(), loadAssets(scene)]);
  return renderSceneSvg(
    scene,
    { fonts, values: options.values, imageHref: (el) => (assets.has(el.assetPath) ? dataUrl(assets.get(el.assetPath)!) : null) },
    { includeBleed: options.includeBleed },
  );
}

function rasterise(svg: string, widthPx: number): Buffer {
  // Text is already outlined, so no system fonts are needed (and none are loaded).
  return new Resvg(svg, { fitTo: { mode: "width", value: Math.round(widthPx) }, font: { loadSystemFonts: false }, background: "#ffffff" }).render().asPng();
}

/** Pixel width for a print PNG at the product DPI, capped on the long edge. */
export function printWidthPx(widthMm: number, heightMm: number, dpi: number): number {
  const scale = Math.min(1, MAX_PNG_EDGE_PX / ((Math.max(widthMm, heightMm) / 25.4) * dpi));
  return (widthMm / 25.4) * dpi * scale;
}

/** Rasterises a scene to PNG at a given width (proof previews) or DPI (print files). */
export async function scenePng(
  scene: Scene,
  options: { includeBleed: boolean; values?: Record<string, string>; widthPx?: number; dpi?: number },
): Promise<Buffer> {
  const svg = await sceneSvg(scene, options);
  const b = options.includeBleed ? scene.bleedMm : 0;
  const widthPx = options.widthPx ?? printWidthPx(scene.widthMm + 2 * b, scene.heightMm + 2 * b, options.dpi ?? 300);
  return rasterise(svg, widthPx);
}

/** Embeds every image in a scene once per document; SVG logos are rasterised at high resolution first. */
async function embedImages(doc: PDFDocument, scene: Scene): Promise<PdfImages> {
  const assets = await loadAssets(scene);
  const images: PdfImages = new Map();
  for (const el of scene.elements) {
    if (el.type !== "image" || images.has(el.assetPath)) continue;
    const asset = assets.get(el.assetPath);
    if (!asset) continue;
    if (el.mimeType === "image/png") images.set(el.assetPath, await doc.embedPng(asset.bytes));
    else if (el.mimeType === "image/jpeg") images.set(el.assetPath, await doc.embedJpg(asset.bytes));
    else {
      const svg = Buffer.from(asset.bytes).toString("utf8");
      const px = Math.min(4000, (el.widthMm / 25.4) * 600);
      images.set(el.assetPath, await doc.embedPng(rasterise(svg, px)));
    }
  }
  return images;
}

/**
 * Vector print PDF for a scene: one page, or one page per row for a CSV merge. Pages include the bleed,
 * with TrimBox/BleedBox set so imposition and RIP software trim correctly.
 */
export async function scenePdf(scene: Scene, rows: Array<Record<string, string> | undefined> = [undefined]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setProducer("Makeready");
  doc.setCreator("Makeready print-file engine");
  const [fonts, images] = await Promise.all([loadServerFontSet(), embedImages(doc, scene)]);
  for (const values of rows) addScenePage(doc, scene, fonts, images, values);
  return doc.save();
}
