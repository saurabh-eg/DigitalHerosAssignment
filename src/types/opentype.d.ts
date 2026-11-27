// Minimal typings for the parts of opentype.js v2 we use (the published @types target v1).
declare module "opentype.js" {
  export interface Path {
    toPathData(options?: { decimalPlaces?: number; optimize?: boolean; flipY?: boolean }): string;
  }

  export interface Glyph {
    index: number;
    advanceWidth?: number;
    getPath(x: number, y: number, fontSize: number): Path;
  }

  export interface Font {
    unitsPerEm: number;
    ascender: number;
    descender: number;
    charToGlyph(char: string): Glyph;
    getKerningValue(left: Glyph, right: Glyph): number;
  }

  export function parse(buffer: ArrayBuffer): Font;
}
