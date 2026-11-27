export const BUCKET = {
  UPLOADS: "uploads",
  DESIGN_ASSETS: "design-assets",
  CSV: "csv-datasets",
  PROOFS: "proofs",
  PRODUCTION: "production",
  INVOICES: "invoices",
  GALLERY: "gallery",
} as const;

export type Bucket = (typeof BUCKET)[keyof typeof BUCKET];

// Only the gallery is public; everything else is served through short-lived signed URLs.
export const PUBLIC_BUCKETS: readonly Bucket[] = [BUCKET.GALLERY];

export const PRODUCTION_OUTPUT = {
  PRINT: "Print",
  MERGED: "Merged",
  ROW: "Row",
  BUNDLE: "Bundle",
} as const;

function yyyymmdd(date: Date): string {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function slug(value: string): string {
  return value.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** PRD 07 naming: `OrderID_ProductType_Date_Output`, grouped in an order folder. */
export function productionFilePath(params: { orderNumber: string; productType: string; date: Date; output: string; extension: "pdf" | "png" | "zip" | "ai"; }): string {
  const name = [slug(params.orderNumber), slug(params.productType), yyyymmdd(params.date), slug(params.output),].join("_");
  return `orders/${slug(params.orderNumber)}/${name}.${params.extension}`;
}
