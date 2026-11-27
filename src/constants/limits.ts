const MB = 1024 * 1024;

export const UPLOAD_LIMITS = {
  artworkMaxBytes: 25 * MB,
  logoMaxBytes: 5 * MB,
  csvMaxBytes: 2 * MB,
  // Uploaded through a server action, so it must stay under Vercel's 4.5 MB request body limit.
  galleryImageMaxBytes: 4 * MB,
} as const;

// D-010
export const CSV_LIMITS = {
  maxRows: 2000,
  maxColumns: 20,
  maxCellLength: 120,
  previewRows: 5,
} as const;

export const ORDER_LIMITS = {
  minQuantity: 1,
  maxQuantity: 100_000,
  maxItemsPerCart: 25,
} as const;

export const DESIGN_LIMITS = {
  maxElements: 60,
  maxTextLength: 500,
  minFontSizePt: 4,
  maxFontSizePt: 400,
  // Below this effective DPI an uploaded image is rejected; below `warnDpi` the user is warned.
  minImageDpi: 150,
  warnImageDpi: 300,
  autosaveDebounceMs: 1500,
} as const;

export const PRINT_JOB_LIMITS = {
  rowsPerBatch: 25,
  maxAttempts: 3,
  staleAfterMinutes: 10,
} as const;

export const SECURITY_LIMITS = {
  passwordMinLength: 8,
  signedUrlTtlSeconds: 300,
  // Longer-lived links for images shown inside an open designer session.
  designerAssetUrlTtlSeconds: 3600,
} as const;

export const PAGINATION = {
  defaultPageSize: 20,
  maxPageSize: 100,
} as const;
