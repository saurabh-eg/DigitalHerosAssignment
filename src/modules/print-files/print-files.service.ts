import "server-only";
import { PDFDocument } from "pdf-lib";
import { publicEnv } from "@/config/env.public";
import { serverEnv } from "@/config/env.server";
import { PRINT_JOB_LIMITS } from "@/constants/limits";
import { PT_PER_MM } from "@/constants/print";
import { productionFilePath, PRODUCTION_OUTPUT, type Bucket } from "@/constants/storage";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getProductById } from "@/modules/catalogue/catalogue.service";
import { loadSavedVersion } from "@/modules/designer/designer.orders";
import { downloadAs, findUploadAs } from "@/modules/designer/designer.repository";
import { valuesForRow } from "@/modules/designer/render/validate";
import * as ordersRepository from "@/modules/orders/orders.repository";
import type { Order, OrderItem } from "@/modules/orders/orders.types";
import * as repo from "./print-files.repository";
import { printWidthPx, scenePdf, scenePng } from "./print-files.renderer";
import { Resvg } from "@resvg/resvg-js";
import { zipSync } from "fflate";
import { ROLE } from "@/constants/roles";
import { AppError, notFound } from "@/lib/errors";
import { requireRole } from "@/modules/auth/auth.service";

const SAFETY_MARGIN_MS = 8_000;

/** Queues print-file generation for every line of an order once all proofs are approved (PRD §07/§08). */
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

/** Fire-and-forget kick of the worker endpoint (D-064); the daily cron is the safety net. */
export async function triggerWorker(): Promise<void> {
  try {
    await fetch(`${publicEnv().NEXT_PUBLIC_SITE_URL}/api/v1/print-jobs/run`, {
      method: "POST",
      headers: { authorization: `Bearer ${serverEnv().CRON_SECRET}` },
      cache: "no-store",
    });
  } catch (error) {
    console.warn("Print worker trigger failed", error instanceof Error ? error.message : error);
  }
}

type Output = { kind: "print_pdf" | "print_png" | "row_pdf" | "merged_pdf" | "original"; output: string; ext: "pdf" | "png" | "ai"; bytes: Uint8Array; rowIndex?: number };

async function store(job: repo.PrintJobRow, order: Order, item: OrderItem, out: Output) {
  const path = productionFilePath({
    orderNumber: order.orderNumber,
    productType: item.productType,
    date: new Date(order.placedAt ?? order.createdAt),
    output: out.output,
    extension: out.ext,
  });
  const contentType = out.ext === "png" ? "image/png" : out.ext === "ai" ? "application/postscript" : "application/pdf";
  await repo.uploadProductionFile(path, out.bytes, contentType);
  await repo.recordPrintFile({ orderId: order.id, orderItemId: item.id, printJobId: job.id, kind: out.kind, path, rowIndex: out.rowIndex, sizeBytes: out.bytes.byteLength });
}

/** A single-page PDF at trim + bleed with a raster image placed to fill it (uploaded PNG/SVG artwork). */
async function pdfFromRaster(png: Uint8Array, widthMm: number, heightMm: number, bleedMm: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const [w, h] = [(widthMm + 2 * bleedMm) * PT_PER_MM, (heightMm + 2 * bleedMm) * PT_PER_MM];
  const page = doc.addPage([w, h]);
  page.setBleedBox(0, 0, w, h);
  page.setTrimBox(bleedMm * PT_PER_MM, bleedMm * PT_PER_MM, widthMm * PT_PER_MM, heightMm * PT_PER_MM);
  const image = await doc.embedPng(png);
  const scale = Math.min(w / image.width, h / image.height);
  page.drawImage(image, { x: (w - image.width * scale) / 2, y: (h - image.height * scale) / 2, width: image.width * scale, height: image.height * scale });
  return doc.save();
}

/**
 * Generates one line's production files. CSV merges are processed in batches so a run never exceeds the
 * time budget; returns false when the job should continue in the next run.
 */
async function processJob(job: repo.PrintJobRow, deadline: number): Promise<boolean> {
  const order = await ordersRepository.findOrder(job.order_id);
  const item = order?.items.find((i) => i.id === job.order_item_id);
  if (!order || !item?.designId || item.designVersion === null) throw new Error("Order line or design not found.");
  const product = await getProductById(item.productId);
  const dpi = product?.dpi ?? 300;
  const saved = await loadSavedVersion(item.designId, item.designVersion, "service");

  if (saved.scene) {
    const scene = saved.scene;
    if (saved.csvRows?.length) {
      // PRD §07: one artwork file per row, then one merged file for the press.
      const rows = saved.csvRows;
      let done = job.progress_done;
      while (done < rows.length) {
        if (Date.now() > deadline - SAFETY_MARGIN_MS) {
          await repo.updateJob(job.id, { progress_done: done });
          return false;
        }
        const batch = rows.slice(done, done + PRINT_JOB_LIMITS.rowsPerBatch);
        for (const [offset, row] of batch.entries()) {
          const index = done + offset;
          const bytes = await scenePdf(scene, [valuesForRow(row, saved.csvMapping)]);
          await store(job, order, item, { kind: "row_pdf", output: `${PRODUCTION_OUTPUT.ROW}-${String(index + 1).padStart(4, "0")}`, ext: "pdf", bytes, rowIndex: index + 1 });
        }
        done += batch.length;
        await repo.updateJob(job.id, { progress_done: done });
      }
      const merged = await scenePdf(scene, rows.map((row) => valuesForRow(row, saved.csvMapping)));
      await store(job, order, item, { kind: "merged_pdf", output: PRODUCTION_OUTPUT.MERGED, ext: "pdf", bytes: merged });
      return true;
    }
    await store(job, order, item, { kind: "print_pdf", output: PRODUCTION_OUTPUT.PRINT, ext: "pdf", bytes: await scenePdf(scene) });
    await store(job, order, item, { kind: "print_png", output: PRODUCTION_OUTPUT.PRINT, ext: "png", bytes: await scenePng(scene, { includeBleed: true, dpi }) });
    return true;
  }

  // Uploaded artwork: pass through what's print-ready, convert what isn't.
  if (!saved.uploadId) throw new Error("Design version has neither a scene nor an upload.");
  const upload = await findUploadAs(saved.uploadId, "service");
  const bytes = upload ? await downloadAs(upload.bucket as Bucket, upload.path, "service") : null;
  if (!upload || !bytes) throw new Error("Uploaded artwork not found in storage.");
  const { widthMm, heightMm } = item.configuration;
  const bleed = product?.bleedMm ?? 0;

  if (upload.mime_type === "application/pdf") {
    await store(job, order, item, { kind: "print_pdf", output: PRODUCTION_OUTPUT.PRINT, ext: "pdf", bytes });
  } else if (upload.mime_type === "image/png") {
    await store(job, order, item, { kind: "print_png", output: PRODUCTION_OUTPUT.PRINT, ext: "png", bytes });
    await store(job, order, item, { kind: "print_pdf", output: PRODUCTION_OUTPUT.PRINT, ext: "pdf", bytes: await pdfFromRaster(bytes, widthMm, heightMm, bleed) });
  } else if (upload.mime_type === "image/svg+xml") {
    const png = new Resvg(Buffer.from(bytes).toString("utf8"), {
      fitTo: { mode: "width", value: Math.round(printWidthPx(widthMm + 2 * bleed, heightMm + 2 * bleed, dpi)) },
      font: { loadSystemFonts: false },
      background: "#ffffff",
    }).render().asPng();
    await store(job, order, item, { kind: "print_png", output: PRODUCTION_OUTPUT.PRINT, ext: "png", bytes: png });
    await store(job, order, item, { kind: "print_pdf", output: PRODUCTION_OUTPUT.PRINT, ext: "pdf", bytes: await pdfFromRaster(png, widthMm, heightMm, bleed) });
  } else {
    // Legacy PostScript-based .ai: hand over the original for manual preflight (D-008).
    await store(job, order, item, { kind: "original", output: "Original", ext: "ai", bytes });
  }
  return true;
}

/** Marks the order's files ready (PRD §11 ready-for-production indicator) once every job has succeeded. */
async function markReadyIfComplete(orderId: string) {
  const jobs = await repo.listJobs(orderId);
  if (jobs.length > 0 && jobs.every((j) => j.status === "succeeded")) {
    await ordersRepository.updateOrder(orderId, { filesReady: true });
  }
}

/** Processes queued jobs until the queue is empty or the time budget is spent. */
export async function processQueue(budgetMs: number): Promise<{ processed: number; remaining: boolean }> {
  const deadline = Date.now() + budgetMs;
  let processed = 0;
  while (Date.now() < deadline - SAFETY_MARGIN_MS) {
    const job = await repo.claimNextJob();
    if (!job) return { processed, remaining: false };
    try {
      const finished = await processJob(job, deadline);
      if (finished) {
        await repo.updateJob(job.id, { status: "succeeded", error: null, locked_at: null });
        await markReadyIfComplete(job.order_id);
        processed += 1;
      } else {
        // Out of time mid-merge: release without counting it as a failed attempt.
        await repo.updateJob(job.id, { status: "queued", locked_at: null, attempts: job.attempts - 1 });
        return { processed, remaining: true };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[print] job ${job.id} failed:`, message);
      await repo.updateJob(job.id, {
        status: job.attempts >= PRINT_JOB_LIMITS.maxAttempts ? "failed" : "queued",
        error: message.slice(0, 500),
        locked_at: null,
      });
    }
  }
  return { processed, remaining: await repo.hasPendingJobs() };
}

// ─── Admin (PRD §11 ready indicators and production downloads) ─────────────

export async function listJobsForOrder(orderId: string) {
  await requireRole(ROLE.ADMIN);
  return repo.listJobs(orderId);
}

export async function listFilesForOrder(orderId: string) {
  await requireRole(ROLE.ADMIN);
  const files = await repo.listPrintFiles(orderId);
  return files.map((f) => ({ ...f, fileName: f.path.split("/").pop()! }));
}

/** Puts a failed (or stuck) job back in the queue with a fresh set of attempts. */
export async function retryJob(jobId: string): Promise<void> {
  await requireRole(ROLE.ADMIN);
  await repo.updateJob(jobId, { status: "queued", attempts: 0, error: null, locked_at: null });
}

export async function requireAdmin(): Promise<void> {
  await requireRole(ROLE.ADMIN);
}

/** Short-lived download link for one production file of an order (admin only; D-003). */
export async function fileDownloadUrl(orderId: string, fileId: string): Promise<string> {
  await requireRole(ROLE.ADMIN);
  const file = (await repo.listPrintFiles(orderId)).find((f) => f.id === fileId);
  if (!file) throw notFound("File not found.");
  const url = await repo.signedProductionUrl(file.path, file.path.split("/").pop());
  if (!url) throw notFound("File not found in storage.");
  return url;
}

const MAX_ZIP_BYTES = 200 * 1024 * 1024;

/** All production files of an order as one ZIP, built on demand (D-064). */
export async function zipOrderFiles(orderId: string): Promise<{ fileName: string; bytes: Uint8Array }> {
  await requireRole(ROLE.ADMIN);
  const files = await repo.listPrintFiles(orderId);
  if (files.length === 0) throw notFound("No production files yet.");
  if (files.reduce((s, f) => s + (f.size_bytes ?? 0), 0) > MAX_ZIP_BYTES) {
    throw new AppError("VALIDATION", "These files are too large to zip in one go. Download the merged PDF or individual files instead.");
  }
  const entries: Record<string, Uint8Array> = {};
  // Download in small parallel batches to keep memory and connections bounded.
  for (let i = 0; i < files.length; i += 10) {
    const batch = await Promise.all(files.slice(i, i + 10).map(async (f) => [f.path.split("/").pop()!, await repo.downloadProductionFile(f.path)] as const));
    for (const [name, bytes] of batch) if (bytes) entries[name] = bytes;
  }
  const folder = files[0].path.split("/")[1];
  // PDFs and PNGs are already compressed, so store them as-is.
  return { fileName: `${folder}.zip`, bytes: zipSync(entries, { level: 0 }) };
}

export async function queueStatus() {
  await requireRole(ROLE.ADMIN);
  return repo.queueCounts();
}
