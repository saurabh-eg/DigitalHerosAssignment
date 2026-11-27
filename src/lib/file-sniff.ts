// Identifies uploaded files by their bytes, never by name or browser-reported type.

export type SniffedType = "png" | "jpeg" | "pdf" | "svg" | "postscript" | "unknown";

export function sniff(bytes: Uint8Array): SniffedType {
  const head = (n: number) => String.fromCharCode(...bytes.slice(0, n));
  if (bytes[0] === 0x89 && head(4).slice(1) === "PNG") return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (head(5) === "%PDF-") return "pdf";
  // Older Illustrator files without PDF compatibility start with a PostScript header (D-008).
  if (head(4) === "%!PS") return "postscript";
  const text = new TextDecoder().decode(bytes.slice(0, 1024)).trimStart().toLowerCase();
  if (text.startsWith("<?xml") || text.startsWith("<svg") || text.includes("<svg")) return "svg";
  return "unknown";
}

/** Pixel dimensions of a PNG or JPEG, or null for other types. */
export function imageSize(bytes: Uint8Array, type: SniffedType): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (type === "png" && bytes.length >= 24) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (type === "jpeg") {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) return null;
      const marker = bytes[offset + 1];
      const length = view.getUint16(offset + 2);
      // SOF0–SOF15 except DHT (C4), JPG (C8) and DAC (CC) carry the frame size.
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) };
      }
      offset += 2 + length;
    }
  }
  return null;
}

/** Scripts and event handlers make an SVG unsafe to display or render. */
export function isUnsafeSvg(text: string): boolean {
  return /<script[\s>]|\son[a-z]+\s*=|javascript:|<foreignObject/i.test(text);
}
