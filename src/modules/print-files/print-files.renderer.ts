import "server-only";
import { Resvg } from "@resvg/resvg-js";
import { BUCKET } from "@/constants/storage";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Scene } from "@/modules/designer/designer.validator";
import { loadServerFontSet } from "@/modules/designer/render/fonts.server";
import { renderSceneSvg } from "@/modules/designer/render/scene-svg";

/** Inlines image elements as data URLs; the rasteriser can't fetch remote or private URLs. */
async function embeddedImages(scene: Scene): Promise<Record<string, string>> {
  const paths = [...new Set(scene.elements.flatMap((el) => (el.type === "image" ? [el.assetPath] : [])))];
  const entries = await Promise.all(
    paths.map(async (path) => {
      const { data } = await supabaseAdmin().storage.from(BUCKET.DESIGN_ASSETS).download(path);
      if (!data) return [path, ""] as const;
      const buffer = Buffer.from(await data.arrayBuffer());
      return [path, `data:${data.type || "image/png"};base64,${buffer.toString("base64")}`] as const;
    }),
  );
  return Object.fromEntries(entries.filter(([, url]) => url));
}

/** The scene as SVG with images embedded, ready for rasterising or PDF conversion. */
export async function sceneSvg(scene: Scene, options: { includeBleed: boolean; values?: Record<string, string> }): Promise<string> {
  const [fonts, images] = await Promise.all([loadServerFontSet(), embeddedImages(scene)]);
  return renderSceneSvg(scene, { fonts, values: options.values, imageHref: (el) => images[el.assetPath] ?? null }, { includeBleed: options.includeBleed });
}

/** Rasterises a scene to PNG at a given width (proof previews) or DPI (print files). */
export async function scenePng(
  scene: Scene,
  options: { includeBleed: boolean; values?: Record<string, string>; widthPx?: number; dpi?: number },
): Promise<Buffer> {
  const svg = await sceneSvg(scene, options);
  const widthMm = scene.widthMm + (options.includeBleed ? 2 * scene.bleedMm : 0);
  const widthPx = options.widthPx ?? Math.round((widthMm / 25.4) * (options.dpi ?? 300));
  // Text is already outlined, so no system fonts are needed (and none are loaded).
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: widthPx }, font: { loadSystemFonts: false }, background: "#ffffff" });
  return resvg.render().asPng();
}
