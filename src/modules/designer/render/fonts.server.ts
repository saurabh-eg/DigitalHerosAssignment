import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse, type Font } from "opentype.js";
import { FONT_FAMILIES, fontFile, type FontFamilyId, type FontSet, type FontWeight } from "./fonts";

const cache = new Map<string, Font>();

// Fonts ship in public/fonts; next.config traces them into the server bundle.
async function loadFont(file: string): Promise<Font> {
  const cached = cache.get(file);
  if (cached) return cached;
  const buffer = await readFile(path.join(process.cwd(), "public", "fonts", file));
  const font = parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer);
  cache.set(file, font);
  return font;
}

/** Loads every designer font once per server instance and returns a synchronous lookup. */
export async function loadServerFontSet(): Promise<FontSet> {
  const files = new Set(Object.values(FONT_FAMILIES).flatMap((f) => Object.values(f.files)));
  await Promise.all([...files].map(loadFont));
  return (family: FontFamilyId, weight: FontWeight) => cache.get(fontFile(family, weight))!;
}
