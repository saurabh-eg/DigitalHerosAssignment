import "server-only";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { ROUTES } from "@/constants/routes";
import { formDataToObject, handleAction, ok, parseInput, type ActionResult } from "@/lib/action-result";
import { AppError, HTTP_STATUS } from "@/lib/errors";
import { lineDetails } from "@/modules/cart/cart.controller";
import { currentVersionOf } from "@/modules/designer/designer.orders";
import { findInvoiceByOrder } from "@/modules/invoices/invoices.service";
import { resumeFulfilment } from "@/modules/payments/payments.service";
import * as printFiles from "@/modules/print-files/print-files.service";
import { listForOrder } from "@/modules/proofs/proofs.service";
import * as ordersService from "./orders.service";
import { adminTransitionSchema, archiveSchema, jobSearchSchema, orderIdSchema } from "./orders.validator";

export const listMyOrders = ordersService.listMyOrders;

const ORDERS_PAGE_SIZE = 10;

/** Customer order history, ten per page (?page=). */
export async function listMyOrdersPage(query: Record<string, string | string[] | undefined>) {
  const raw = Array.isArray(query.page) ? query.page[0] : query.page;
  const page = z.coerce.number().int().min(1).catch(1).parse(raw ?? 1);
  const { rows, total } = await ordersService.listMyOrdersPage(page, ORDERS_PAGE_SIZE);
  return { orders: rows, total, page, pageSize: ORDERS_PAGE_SIZE };
}

function asPage<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((error) => {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  });
}

/** Everything the customer's order page needs: lines, proofs with their logs, and the status timeline. */
export async function getOrderPage(orderId: string) {
  if (!z.uuid().safeParse(orderId).success) notFound();
  return asPage(async () => {
    const order = await ordersService.getOrderForUser(orderId);
    const [proofs, history, details, latestVersions] = await Promise.all([
      listForOrder(order),
      ordersService.listStatusHistory(order.id),
      lineDetails(order),
      Promise.all(order.items.map(async (i) => [i.id, i.designId ? await currentVersionOf(i.designId).catch(() => null) : null] as const)),
    ]);
    return { order, proofs, history, details, latestVersions: Object.fromEntries(latestVersions) };
  });
}

// ─── Admin ──────────────────────────────────────────────────────────────────

export async function searchJobs(query: Record<string, string | string[] | undefined>) {
  const filters = jobSearchSchema.parse(Object.fromEntries(Object.entries(query).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])));
  return { filters, ...(await ordersService.searchJobs(filters)) };
}

export const pipelineBoard = ordersService.pipelineBoard;

/** Admin job record: artwork and configuration attached, proofs, print jobs and production files (PRD §11). */
export async function getJobDetail(orderId: string) {
  if (!z.uuid().safeParse(orderId).success) notFound();
  return asPage(async () => {
    await printFiles.requireAdmin();
    const order = await ordersService.getOrderForUser(orderId);
    const [contact, history, proofs, details, jobs, files, invoice] = await Promise.all([
      ordersService.getCustomerContact(order.customerId),
      ordersService.listStatusHistory(order.id),
      listForOrder(order),
      lineDetails(order, "service"),
      printFiles.listJobsForOrder(order.id),
      printFiles.listFilesForOrder(order.id),
      findInvoiceByOrder(order.id),
    ]);
    return { order, contact, history, proofs, details, jobs, files, invoice };
  });
}

export async function adminTransition(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return handleAction(async () => {
    const { orderId, to, note } = parseInput(adminTransitionSchema, formDataToObject(formData));
    await ordersService.adminTransition(orderId, to, note);
    revalidatePath(ROUTES.admin.job(orderId));
    revalidatePath(ROUTES.admin.pipeline);
    return ok(undefined, to === "completed" ? "Order marked complete. The customer has been emailed." : "Order cancelled.");
  });
}

export async function setArchived(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return handleAction(async () => {
    const { orderId, archive } = parseInput(archiveSchema, formDataToObject(formData));
    await ordersService.setArchived(orderId, archive);
    revalidatePath(ROUTES.admin.job(orderId));
    return ok(undefined, archive ? "Archived. It stays searchable under Archive." : "Restored from the archive.");
  });
}

export async function resume(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return handleAction(async () => {
    const { orderId } = parseInput(orderIdSchema, formDataToObject(formData));
    await resumeFulfilment(orderId);
    revalidatePath(ROUTES.admin.job(orderId));
    return ok(undefined, "Post-payment steps re-run.");
  });
}

export async function retryPrintJob(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return handleAction(async () => {
    const { jobId, orderId } = parseInput(z.object({ jobId: z.uuid(), orderId: z.uuid() }), formDataToObject(formData));
    await printFiles.retryJob(jobId);
    after(printFiles.triggerWorker);
    revalidatePath(ROUTES.admin.job(orderId));
    return ok(undefined, "Job re-queued. Files will appear here when it finishes.");
  });
}

export async function runPrintQueue(): Promise<ActionResult> {
  return handleAction(async () => {
    await printFiles.requireAdmin();
    after(printFiles.triggerWorker);
    return ok(undefined, "Print queue started.");
  });
}

export const queueStatus = printFiles.queueStatus;

/** GET /admin/jobs/[id]/files/[fileId] → redirect to a short-lived signed download URL. */
export async function downloadFile(orderId: string, fileId: string): Promise<Response> {
  try {
    if (!z.uuid().safeParse(orderId).success || !z.uuid().safeParse(fileId).success) return new Response("Not found", { status: 404 });
    return Response.redirect(await printFiles.fileDownloadUrl(orderId, fileId), 302);
  } catch (error) {
    if (error instanceof AppError) return new Response(error.message, { status: HTTP_STATUS[error.code] });
    throw error;
  }
}

/** GET /admin/jobs/[id]/files/zip → every production file of the order in one ZIP. */
export async function downloadZip(orderId: string): Promise<Response> {
  try {
    if (!z.uuid().safeParse(orderId).success) return new Response("Not found", { status: 404 });
    const { fileName, bytes } = await printFiles.zipOrderFiles(orderId);
    return new Response(Buffer.from(bytes), {
      headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${fileName}"`, "cache-control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof AppError) return new Response(error.message, { status: HTTP_STATUS[error.code] });
    throw error;
  }
}
