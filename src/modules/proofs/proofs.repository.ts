import "server-only";
import { SECURITY_LIMITS } from "@/constants/limits";
import type { ProofStatus } from "@/constants/pipeline";
import { BUCKET } from "@/constants/storage";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Proof writes and reads use the service client; the proofs service checks order ownership first.

export async function listProofs(orderId: string) {
  const { data, error } = await supabaseAdmin()
    .from("proofs")
    .select("id, order_item_id, version, status, design_version, preview_path, created_at, proof_events(event, comment, created_at, profiles(full_name, email))")
    .eq("order_id", orderId)
    .order("version");
  if (error) throw error;
  return data;
}

export async function findProof(proofId: string) {
  const { data, error } = await supabaseAdmin().from("proofs").select("id, order_id, order_item_id, version, status").eq("id", proofId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertProof(row: {
  orderId: string;
  orderItemId: string;
  version: number;
  designVersion: number | null;
  previewPath: string | null;
  createdBy: string | null;
}): Promise<string> {
  const { data, error } = await supabaseAdmin()
    .from("proofs")
    .insert({
      order_id: row.orderId,
      order_item_id: row.orderItemId,
      version: row.version,
      design_version: row.designVersion,
      preview_path: row.previewPath,
      created_by: row.createdBy,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/** Changes a proof's status only if it is still `from`, so a proof can't be approved twice or after supersession. */
export async function updateProofStatus(proofId: string, from: ProofStatus, to: ProofStatus): Promise<boolean> {
  const { data, error } = await supabaseAdmin().from("proofs").update({ status: to }).eq("id", proofId).eq("status", from).select("id");
  if (error) throw error;
  return data.length === 1;
}

export async function supersedePending(orderItemId: string): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("proofs")
    .update({ status: "superseded" })
    .eq("order_item_id", orderItemId)
    .in("status", ["pending", "changes_requested"]);
  if (error) throw error;
}

export async function insertEvent(row: {
  proofId: string;
  orderId: string;
  event: "issued" | "approved" | "changes_requested" | "reorder_reused";
  actorId: string | null;
  comment?: string | null;
}): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("proof_events")
    .insert({ proof_id: row.proofId, order_id: row.orderId, event: row.event, actor_id: row.actorId, comment: row.comment ?? null });
  if (error) throw error;
}

export async function uploadPreview(path: string, png: Buffer): Promise<void> {
  const { error } = await supabaseAdmin().storage.from(BUCKET.PROOFS).upload(path, png, { contentType: "image/png", upsert: true });
  if (error) throw error;
}

export async function signedPreviewUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabaseAdmin().storage.from(BUCKET.PROOFS).createSignedUrls(paths, SECURITY_LIMITS.designerAssetUrlTtlSeconds);
  if (error) throw error;
  return Object.fromEntries(data.filter((d) => d.path && d.signedUrl).map((d) => [d.path!, d.signedUrl!]));
}
