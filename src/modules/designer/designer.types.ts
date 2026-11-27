import type { ProductDetail } from "@/modules/catalogue/catalogue.types";
import type { ProductConfiguration } from "@/modules/catalogue/catalogue.validator";
import type { Scene, TemplateScene } from "./designer.validator";

export type ArtworkSource = "designer" | "upload";

export type DesignTemplate = { id: string; name: string; scene: TemplateScene; isDefault: boolean };

export type UploadedArtwork = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  needsPreflight: boolean;
  /** Human-readable checks shown next to the upload (page size, resolution, preflight). */
  notes: string[];
};

export type CsvData = {
  id: string;
  columns: string[];
  rowCount: number;
  rows: Array<Record<string, string>>;
  /** placeholder → column */
  mapping: Record<string, string>;
};

export type DesignView = {
  id: string;
  name: string;
  source: ArtworkSource;
  configuration: ProductConfiguration;
  product: ProductDetail;
  scene: Scene;
  currentVersion: number;
  isSaved: boolean;
  organizationId: string;
  templates: DesignTemplate[];
  /** Signed URLs for image elements, keyed by storage path. */
  assetUrls: Record<string, string>;
  upload: UploadedArtwork | null;
  csv: CsvData | null;
};

export type DesignSummary = {
  id: string;
  name: string;
  productName: string;
  source: ArtworkSource;
  currentVersion: number;
  configuration: ProductConfiguration;
  updatedAt: string;
};
