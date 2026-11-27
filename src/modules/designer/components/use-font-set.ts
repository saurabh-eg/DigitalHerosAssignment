"use client";

import { parse, type Font } from "opentype.js";
import { useEffect, useState } from "react";
import { FONT_FAMILIES, FONTS_PUBLIC_PATH, fontFile, type FontFamilyId, type FontSet, type FontWeight } from "../render/fonts";

let loading: Promise<FontSet> | null = null;

/** Loads every designer font once per page; the same files the server uses for print output. */
function loadAll(): Promise<FontSet> {
  loading ??= (async () => {
    const files = [...new Set(Object.values(FONT_FAMILIES).flatMap((f) => Object.values(f.files)))];
    const fonts = new Map<string, Font>();
    await Promise.all(
      files.map(async (file) => {
        const response = await fetch(`${FONTS_PUBLIC_PATH}/${file}`);
        if (!response.ok) throw new Error(`Font ${file} failed to load`);
        fonts.set(file, parse(await response.arrayBuffer()));
      }),
    );
    return (family: FontFamilyId, weight: FontWeight) => fonts.get(fontFile(family, weight))!;
  })();
  return loading;
}

export function useFontSet(): { fonts: FontSet | null; error: boolean } {
  const [fonts, setFonts] = useState<FontSet | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    loadAll()
      .then((set) => alive && setFonts(() => set))
      .catch(() => {
        loading = null;
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, []);
  return { fonts, error };
}
