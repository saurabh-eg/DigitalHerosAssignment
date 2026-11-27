import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Order } from "@/modules/orders/orders.types";

/**
 * Queues server-side print-file generation for every line of an order once all proofs are approved
 * (PRD §07/§08). The worker that processes the queue arrives in P7.
 */
export async function enqueueForOrder(order: Order): Promise<void> {
  const rows = order.items.map((item) => ({
    order_id: order.id,
    order_item_id: item.id,
    status: "queued" as const,
    progress_total: item.csvDatasetId ? item.quantity : 1,
  }));
  if (rows.length === 0) return;
  const { error } = await supabaseAdmin().from("print_jobs").insert(rows);
  if (error) throw error;
}
