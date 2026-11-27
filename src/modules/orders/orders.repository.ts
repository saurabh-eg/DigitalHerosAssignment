import "server-only";
import type { OrderStatus } from "@/constants/pipeline";
import type { Json } from "@/lib/supabase/database.types";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { productConfigurationSchema } from "@/modules/catalogue/catalogue.validator";
import type { Order, OrderItem, ShippingAddress, StatusEvent } from "./orders.types";

// Writes use the secret-key client after the calling service has authorised the actor (D-031).
// Customer-facing reads go through the user's RLS-scoped client as a second line of defence.

type JsonColumn = NonNullable<Json>;

const ORDER_COLUMNS = `
  id, order_number, organization_id, customer_id, status, currency, items_total_minor, discount_total_minor,
  delivery_minor, tax_minor, total_minor, delivery_method, shipping_address, files_ready, reorder_of,
  placed_at, completed_at, archived_at, created_at,
  order_items(id, product_id, product_name, product_type, configuration, quantity, unit_price_minor, discount_bps,
    discount_minor, setup_fee_minor, line_total_minor, tax_minor, design_id, design_version, csv_dataset_id, reorder_of_item_id, created_at)
`;

type OrderRow = {
  id: string;
  order_number: string;
  organization_id: string;
  customer_id: string;
  status: OrderStatus;
  currency: string;
  items_total_minor: number;
  discount_total_minor: number;
  delivery_minor: number;
  tax_minor: number;
  total_minor: number;
  delivery_method: "delivery" | "collection";
  shipping_address: Json | null;
  files_ready: boolean;
  reorder_of: string | null;
  placed_at: string | null;
  completed_at: string | null;
  archived_at: string | null;
  created_at: string;
  order_items: Array<{
    id: string;
    product_id: string;
    product_name: string;
    product_type: string;
    configuration: Json;
    quantity: number;
    unit_price_minor: number;
    discount_bps: number;
    discount_minor: number;
    setup_fee_minor: number;
    line_total_minor: number;
    tax_minor: number;
    design_id: string | null;
    design_version: number | null;
    csv_dataset_id: string | null;
    reorder_of_item_id: string | null;
    created_at: string;
  }>;
};

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    organizationId: row.organization_id,
    customerId: row.customer_id,
    status: row.status,
    currency: row.currency,
    itemsTotalMinor: row.items_total_minor,
    discountTotalMinor: row.discount_total_minor,
    deliveryMinor: row.delivery_minor,
    taxMinor: row.tax_minor,
    totalMinor: row.total_minor,
    deliveryMethod: row.delivery_method,
    shippingAddress: (row.shipping_address as ShippingAddress | null) ?? null,
    filesReady: row.files_ready,
    reorderOf: row.reorder_of,
    placedAt: row.placed_at,
    completedAt: row.completed_at,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    items: [...row.order_items]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(
        (i): OrderItem => ({
          id: i.id,
          productId: i.product_id,
          productName: i.product_name,
          productType: i.product_type,
          configuration: productConfigurationSchema.parse(i.configuration),
          quantity: i.quantity,
          unitPriceMinor: i.unit_price_minor,
          discountBps: i.discount_bps,
          discountMinor: i.discount_minor,
          setupFeeMinor: i.setup_fee_minor,
          lineTotalMinor: i.line_total_minor,
          taxMinor: i.tax_minor,
          designId: i.design_id,
          designVersion: i.design_version,
          csvDatasetId: i.csv_dataset_id,
          reorderOfItemId: i.reorder_of_item_id,
        }),
      ),
  };
}

/** Any order by id (service role). Callers must check ownership before exposing it. */
export async function findOrder(orderId: string): Promise<Order | null> {
  const { data, error } = await supabaseAdmin().from("orders").select(ORDER_COLUMNS).eq("id", orderId).maybeSingle();
  if (error) throw error;
  return data ? toOrder(data as unknown as OrderRow) : null;
}

/** Orders visible to the signed-in customer through RLS (their organization only). */
export async function listOrdersForCustomer(): Promise<Order[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .neq("status", "quote")
    .order("placed_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as OrderRow[]).map(toOrder);
}

export async function findOpenQuote(customerId: string): Promise<Order | null> {
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("customer_id", customerId)
    .eq("status", "quote")
    .maybeSingle();
  if (error) throw error;
  return data ? toOrder(data as unknown as OrderRow) : null;
}

export async function createQuote(organizationId: string, customerId: string, reorderOf: string | null = null): Promise<string> {
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .insert({ organization_id: organizationId, customer_id: customerId, status: "quote", reorder_of: reorderOf })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export type ItemWrite = Omit<OrderItem, "id">;

function itemRow(orderId: string, item: ItemWrite) {
  return {
    order_id: orderId,
    product_id: item.productId,
    product_name: item.productName,
    product_type: item.productType,
    configuration: item.configuration as unknown as JsonColumn,
    quantity: item.quantity,
    unit_price_minor: item.unitPriceMinor,
    discount_bps: item.discountBps,
    discount_minor: item.discountMinor,
    setup_fee_minor: item.setupFeeMinor,
    line_total_minor: item.lineTotalMinor,
    tax_minor: item.taxMinor,
    design_id: item.designId,
    design_version: item.designVersion,
    csv_dataset_id: item.csvDatasetId,
    reorder_of_item_id: item.reorderOfItemId,
  };
}

export async function insertItem(orderId: string, item: ItemWrite): Promise<string> {
  const { data, error } = await supabaseAdmin().from("order_items").insert(itemRow(orderId, item)).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function updateItem(itemId: string, orderId: string, item: ItemWrite): Promise<void> {
  const { error } = await supabaseAdmin().from("order_items").update(itemRow(orderId, item)).eq("id", itemId).eq("order_id", orderId);
  if (error) throw error;
}

export async function deleteItem(itemId: string, orderId: string): Promise<void> {
  const { error } = await supabaseAdmin().from("order_items").delete().eq("id", itemId).eq("order_id", orderId);
  if (error) throw error;
}

export async function updateOrder(
  orderId: string,
  patch: Partial<{
    itemsTotalMinor: number;
    discountTotalMinor: number;
    deliveryMinor: number;
    taxMinor: number;
    totalMinor: number;
    deliveryMethod: "delivery" | "collection";
    shippingAddress: ShippingAddress | null;
    filesReady: boolean;
    archivedAt: string | null;
  }>,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("orders")
    .update({
      ...(patch.itemsTotalMinor !== undefined && { items_total_minor: patch.itemsTotalMinor }),
      ...(patch.discountTotalMinor !== undefined && { discount_total_minor: patch.discountTotalMinor }),
      ...(patch.deliveryMinor !== undefined && { delivery_minor: patch.deliveryMinor }),
      ...(patch.taxMinor !== undefined && { tax_minor: patch.taxMinor }),
      ...(patch.totalMinor !== undefined && { total_minor: patch.totalMinor }),
      ...(patch.deliveryMethod !== undefined && { delivery_method: patch.deliveryMethod }),
      ...(patch.shippingAddress !== undefined && { shipping_address: patch.shippingAddress as unknown as JsonColumn }),
      ...(patch.filesReady !== undefined && { files_ready: patch.filesReady }),
      ...(patch.archivedAt !== undefined && { archived_at: patch.archivedAt }),
    })
    .eq("id", orderId);
  if (error) throw error;
}

/**
 * Moves an order from one status to another only if it is still in `from`, so two concurrent
 * requests (e.g. Stripe webhook and success page) can't both advance it.
 */
export async function updateStatus(orderId: string, from: OrderStatus, to: OrderStatus): Promise<boolean> {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .update({
      status: to,
      ...(to === "order" && { placed_at: now }),
      ...(to === "completed" && { completed_at: now }),
    })
    .eq("id", orderId)
    .eq("status", from)
    .select("id");
  if (error) throw error;
  return data.length === 1;
}

export async function insertStatusHistory(orderId: string, from: OrderStatus | null, to: OrderStatus, changedBy: string | null, note: string | null) {
  const { error } = await supabaseAdmin()
    .from("order_status_history")
    .insert({ order_id: orderId, from_status: from, to_status: to, changed_by: changedBy, note });
  if (error) throw error;
}

export async function listStatusHistory(orderId: string): Promise<StatusEvent[]> {
  const { data, error } = await supabaseAdmin()
    .from("order_status_history")
    .select("from_status, to_status, note, created_at")
    .eq("order_id", orderId)
    .order("created_at");
  if (error) throw error;
  return data.map((h) => ({ fromStatus: h.from_status, toStatus: h.to_status, note: h.note, createdAt: h.created_at }));
}

export type JobRow = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  placedAt: string | null;
  createdAt: string;
  archivedAt: string | null;
  totalMinor: number;
  currency: string;
  filesReady: boolean;
  isReorder: boolean;
  customerEmail: string;
  customerName: string | null;
  companyName: string | null;
  productTypes: string[];
  divisionSlugs: string[];
  itemCount: number;
  units: number;
};

/** Admin job database over the `admin_order_search` view (service role only). */
export async function searchJobs(filters: {
  q?: string;
  status?: string;
  division?: string;
  from?: string;
  to?: string;
  archived: "exclude" | "only" | "include";
  page: number;
  pageSize: number;
  statuses?: OrderStatus[];
}): Promise<{ rows: JobRow[]; total: number }> {
  let query = supabaseAdmin().from("admin_order_search").select("*", { count: "exact" });
  if (filters.status) query = query.eq("status", filters.status as OrderStatus);
  else if (filters.statuses) query = query.in("status", filters.statuses);
  else query = query.neq("status", "quote");
  if (filters.division) query = query.contains("division_slugs", [filters.division]);
  if (filters.from) query = query.gte("placed_at", `${filters.from}T00:00:00Z`);
  if (filters.to) query = query.lte("placed_at", `${filters.to}T23:59:59Z`);
  if (filters.archived === "exclude") query = query.is("archived_at", null);
  if (filters.archived === "only") query = query.not("archived_at", "is", null);
  if (filters.q) {
    // PostgREST `or` syntax: commas and parentheses would break the filter, so they're stripped.
    const term = filters.q.replace(/[,()%*]/g, " ").trim();
    if (term) query = query.or(`order_number.ilike.%${term}%,customer_email.ilike.%${term}%,customer_name.ilike.%${term}%,company_name.ilike.%${term}%`);
  }
  const fromRow = (filters.page - 1) * filters.pageSize;
  const { data, error, count } = await query
    .order("placed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(fromRow, fromRow + filters.pageSize - 1);
  if (error) throw error;
  return {
    total: count ?? 0,
    rows: data.map((r) => ({
      id: r.id!,
      orderNumber: r.order_number!,
      status: r.status!,
      placedAt: r.placed_at,
      createdAt: r.created_at!,
      archivedAt: r.archived_at,
      totalMinor: r.total_minor!,
      currency: r.currency!,
      filesReady: r.files_ready!,
      isReorder: r.reorder_of !== null,
      customerEmail: r.customer_email!,
      customerName: r.customer_name,
      companyName: r.company_name,
      productTypes: r.product_types ?? [],
      divisionSlugs: r.division_slugs ?? [],
      itemCount: r.item_count ?? 0,
      units: r.units ?? 0,
    })),
  };
}

export async function countByStatus(): Promise<Record<string, number>> {
  const { data, error } = await supabaseAdmin().from("orders").select("status").is("archived_at", null);
  if (error) throw error;
  return data.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});
}

export async function findCustomerContact(customerId: string) {
  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("email, full_name, company_name, vat_number")
    .eq("id", customerId)
    .single();
  if (error) throw error;
  return data;
}
