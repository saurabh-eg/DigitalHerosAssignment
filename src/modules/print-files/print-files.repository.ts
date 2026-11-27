import "server-only";
import { PRINT_JOB_LIMITS } from "@/constants/limits";
import { BUCKET } from "@/constants/storage";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type PrintJobRow = {
  id: string;
  order_id: string;
  order_item_id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  attempts: number;
  progress_done: number;
  progress_total: number;
  locked_at: string | null;
};

const JOB_COLUMNS = "id, order_id, order_item_id, status, attempts, progress_done, progress_total, locked_at";

/**
 * Claims the oldest runnable job: queued, or running but abandoned (locked longer than the stale window,
 * e.g. a function that timed out). The conditional update makes the claim safe against parallel workers.
 */
export async function claimNextJob(): Promise<PrintJobRow | null> {
  const db = supabaseAdmin();
  const staleBefore = new Date(Date.now() - PRINT_JOB_LIMITS.staleAfterMinutes * 60_000).toISOString();
  const { data: candidates, error } = await db
    .from("print_jobs")
    .select(JOB_COLUMNS)
    .or(`status.eq.queued,and(status.eq.running,locked_at.lt.${staleBefore})`)
    .order("created_at")
    .limit(5);
  if (error) throw error;

  for (const job of candidates as PrintJobRow[]) {
    let claim = db
      .from("print_jobs")
      .update({ status: "running", locked_at: new Date().toISOString(), attempts: job.attempts + 1 })
      .eq("id", job.id)
      .eq("status", job.status);
    claim = job.locked_at ? claim.eq("locked_at", job.locked_at) : claim.is("locked_at", null);
    const { data, error: claimError } = await claim.select(JOB_COLUMNS);
    if (claimError) throw claimError;
    if (data.length === 1) return data[0] as PrintJobRow;
  }
  return null;
}

export async function updateJob(id: string, patch: Partial<{ status: PrintJobRow["status"]; progress_done: number; error: string | null; locked_at: string | null; attempts: number }>) {
  const { error } = await supabaseAdmin().from("print_jobs").update(patch).eq("id", id);
  if (error) throw error;
}

export async function listJobs(orderId: string) {
  const { data, error } = await supabaseAdmin()
    .from("print_jobs")
    .select("id, order_item_id, status, attempts, progress_done, progress_total, error, updated_at")
    .eq("order_id", orderId)
    .order("created_at");
  if (error) throw error;
  return data;
}

export async function queueCounts(): Promise<Record<PrintJobRow["status"], number>> {
  const { data, error } = await supabaseAdmin().from("print_jobs").select("status");
  if (error) throw error;
  const counts = { queued: 0, running: 0, succeeded: 0, failed: 0 };
  for (const j of data) counts[j.status] += 1;
  return counts;
}

export async function hasPendingJobs(): Promise<boolean> {
  const { count, error } = await supabaseAdmin().from("print_jobs").select("id", { count: "exact", head: true }).in("status", ["queued", "running"]);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function uploadProductionFile(path: string, bytes: Uint8Array, contentType: string): Promise<void> {
  const { error } = await supabaseAdmin().storage.from(BUCKET.PRODUCTION).upload(path, bytes, { contentType, upsert: true });
  if (error) throw error;
}

export async function recordPrintFile(row: {
  orderId: string;
  orderItemId: string;
  printJobId: string;
  kind: "print_pdf" | "print_png" | "merged_pdf" | "row_pdf" | "original";
  path: string;
  rowIndex?: number;
  sizeBytes: number;
}): Promise<void> {
  const { error } = await supabaseAdmin().from("print_files").upsert(
    {
      order_id: row.orderId,
      order_item_id: row.orderItemId,
      print_job_id: row.printJobId,
      kind: row.kind,
      path: row.path,
      row_index: row.rowIndex ?? null,
      size_bytes: row.sizeBytes,
    },
    { onConflict: "path" },
  );
  if (error) throw error;
}

export async function listPrintFiles(orderId: string) {
  const { data, error } = await supabaseAdmin()
    .from("print_files")
    .select("id, order_item_id, kind, path, row_index, size_bytes, created_at")
    .eq("order_id", orderId)
    .order("kind")
    .order("row_index", { nullsFirst: true });
  if (error) throw error;
  return data;
}

export async function signedProductionUrl(path: string, downloadName?: string): Promise<string | null> {
  const { data } = await supabaseAdmin().storage.from(BUCKET.PRODUCTION).createSignedUrl(path, 300, downloadName ? { download: downloadName } : undefined);
  return data?.signedUrl ?? null;
}

export async function downloadProductionFile(path: string): Promise<Uint8Array | null> {
  const { data } = await supabaseAdmin().storage.from(BUCKET.PRODUCTION).download(path);
  return data ? new Uint8Array(await data.arrayBuffer()) : null;
}

export { PRINT_JOB_LIMITS };
