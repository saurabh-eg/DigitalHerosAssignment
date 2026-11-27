import type { PricingRule, TaxSettings, VolumeTier } from "@/modules/pricing/pricing.types";
import type { ProductParameters } from "./catalogue.validator";

export type Division = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  imageUrl: string | null;
  sortOrder: number;
};

export type Material = {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceFactorBps: number;
  isDefault: boolean;
};

export type ProductSummary = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  divisionSlug: string;
};

export type ProductPricing = {
  rule: PricingRule;
  tiers: VolumeTier[];
  tax: TaxSettings;
};

export type ProductDetail = ProductSummary & {
  description: string;
  divisionName: string;
  productType: string;
  parameters: ProductParameters;
  bleedMm: number;
  safeMarginMm: number;
  dpi: number;
  supportsDesigner: boolean;
  supportsUpload: boolean;
  supportsVariableData: boolean;
  materials: Material[];
  pricing: ProductPricing;
};

export type DivisionWithProducts = Division & {
  products: ProductSummary[];
  /** Lowest possible per-unit price across the division (smallest size, cheapest material, best tier). */
  fromUnitMinor: number | null;
};

export type GalleryItem = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  divisionSlug: string;
  divisionName: string;
};
