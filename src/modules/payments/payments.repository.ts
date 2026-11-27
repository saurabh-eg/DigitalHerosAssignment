import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function insertPending(row: { orderId: string; sessionId: string; amountMinor: number; currency: string }): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("payments")
    .upsert(
      { order_id: row.orderId, provider: "stripe", provider_session_id: row.sessionId, amount_minor: row.amountMinor, currency: row.currency },
      { onConflict: "provider_session_id", ignoreDuplicates: true },
    );
  if (error) throw error;
}

/**
 * Marks a session paid only if it is still pending. Returns true for the one caller that made the change,
 * so the webhook and the success page can't both fulfil the same payment.
 */
export async function markSucceeded(sessionId: string, paymentIntent: string | null): Promise<boolean> {
  const { data, error } = await supabaseAdmin()
    .from("payments")
    .update({ status: "succeeded", provider_payment_intent: paymentIntent })
    .eq("provider_session_id", sessionId)
    .eq("status", "pending")
    .select("id");
  if (error) throw error;
  return data.length === 1;
}

export async function markFailed(sessionId: string): Promise<void> {
  const { error } = await supabaseAdmin().from("payments").update({ status: "failed" }).eq("provider_session_id", sessionId).eq("status", "pending");
  if (error) throw error;
}

export async function findBySession(sessionId: string) {
  const { data, error } = await supabaseAdmin()
    .from("payments")
    .select("id, order_id, status, amount_minor")
    .eq("provider_session_id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
