// PRD §06 upload path. `.ai` files report as PDF or PostScript depending on how they were saved (D-008).
export const ARTWORK_UPLOAD_TYPES = {
  "application/pdf": [".pdf", ".ai"],
  "application/postscript": [".ai"],
  "application/illustrator": [".ai"],
  "image/svg+xml": [".svg"],
  "image/png": [".png"],
} as const;

export const LOGO_UPLOAD_TYPES = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/svg+xml": [".svg"],
} as const;

export const CSV_UPLOAD_TYPES = {
  "text/csv": [".csv"],
  "application/vnd.ms-excel": [".csv"],
} as const;

export const GALLERY_UPLOAD_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
} as const;

export function acceptAttribute(types: Record<string, readonly string[]>): string {
  return [...new Set(Object.values(types).flat())].join(",");
}
