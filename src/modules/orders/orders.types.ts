import type { OrderStatus, ProofStatus } from "@/constants/pipeline";
import type { ProductConfiguration } from "@/modules/catalogue/catalogue.validator";
import type { DeliveryMethod } from "@/modules/pricing/pricing.types";

export type ShippingAddress = {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
  country: string;
};

export type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  productType: string;
  configuration: ProductConfiguration;
  quantity: number;
  unitPriceMinor: number;
  discountBps: number;
  discountMinor: number;
  setupFeeMinor: number;
  lineTotalMinor: number;
  taxMinor: number;
  designId: string | null;
  designVersion: number | null;
  csvDatasetId: string | null;
  /** Set on one-click reorders: the earlier line whose approved artwork this line reuses. */
  reorderOfItemId: string | null;
};

export type Order = {
  id: string;
  orderNumber: string;
  organizationId: string;
  customerId: string;
  status: OrderStatus;
  currency: string;
  itemsTotalMinor: number;
  discountTotalMinor: number;
  deliveryMinor: number;
  taxMinor: number;
  totalMinor: number;
  deliveryMethod: DeliveryMethod;
  shippingAddress: ShippingAddress | null;
  filesReady: boolean;
  reorderOf: string | null;
  placedAt: string | null;
  completedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  items: OrderItem[];
};

export type StatusEvent = { toStatus: OrderStatus; fromStatus: OrderStatus | null; note: string | null; createdAt: string };

export type ProofEvent = {
  event: "issued" | "approved" | "changes_requested" | "reorder_reused";
  actorName: string | null;
  comment: string | null;
  createdAt: string;
};

export type Proof = {
  id: string;
  orderItemId: string;
  version: number;
  status: ProofStatus;
  designVersion: number | null;
  previewUrl: string | null;
  createdAt: string;
  events: ProofEvent[];
};
