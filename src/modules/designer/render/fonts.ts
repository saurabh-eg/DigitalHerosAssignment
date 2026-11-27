import type { Font } from "opentype.js";

// Open Font Licence families bundled in /public/fonts. The same files are used by the
// browser editor and the server print renderer, so text measures identically in both.
export const FONT_FAMILIES = {
  inter: { label: "Inter", files: { 400: "inter-latin-400-normal.woff", 700: "inter-latin-700-normal.woff" } },
  oswald: { label: "Oswald (condensed)", files: { 400: "oswald-latin-400-normal.woff", 700: "oswald-latin-700-normal.woff" } },
  "roboto-slab": { label: "Roboto Slab", files: { 400: "roboto-slab-latin-400-normal.woff", 700: "roboto-slab-latin-700-normal.woff" } },
  "playfair-display": {
    label: "Playfair Display",
    files: { 400: "playfair-display-latin-400-normal.woff", 700: "playfair-display-latin-700-normal.woff" },
  },
  "archivo-black": {
    label: "Archivo Black",
    // Single-weight display face: both weights map to the same file.
    files: { 400: "archivo-black-latin-400-normal.woff", 700: "archivo-black-latin-400-normal.woff" },
  },
} as const;

export type FontFamilyId = keyof typeof FONT_FAMILIES;
export type FontWeight = 400 | 700;

export const FONT_FAMILY_IDS = Object.keys(FONT_FAMILIES) as [FontFamilyId, ...FontFamilyId[]];

export const FONTS_PUBLIC_PATH = "/fonts";

export function fontFile(family: FontFamilyId, weight: FontWeight): string {
  return FONT_FAMILIES[family].files[weight];
}

/** Resolves an already-loaded font. Rendering is synchronous, so fonts are loaded up front. */
export type FontSet = (family: FontFamilyId, weight: FontWeight) => Font;

export function fontKey(family: FontFamilyId, weight: FontWeight): string {
  return fontFile(family, weight);
}
