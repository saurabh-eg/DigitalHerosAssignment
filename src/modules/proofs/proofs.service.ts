import "server-only";
import { EMAIL_TEMPLATE } from "@/constants/email";
import { ORDER_STATUS, PROOF_STATUS } from "@/constants/pipeline";
import { AppError, conflict, notFound } from "@/lib/errors";
import { requireUser } from "@/modules/auth/auth.service";
import type { SessionUser } from "@/modules/auth/auth.types";
import { currentVersionOf, loadSavedVersion } from "@/modules/designer/designer.orders";
import { valuesForRow } from "@/modules/designer/render/validate";
import { sendOrderEmail } from "@/modules/notifications/notifications.service";
import * as ordersRepository from "@/modules/orders/orders.repository";
import { getOrderForUser, transition } from "@/modules/orders/orders.service";
import type { Order, OrderItem, Proof } from "@/modules/orders/orders.types";
import { scenePng } from "@/modules/print-files/print-files.renderer";
import { enqueueForOrder } from "@/modules/print-files/print-files.service";
import * as proofsRepository from "./proofs.repository";

const PREVIEW_WIDTH_PX = 1400;

/** Renders the proof image from the item's saved design version, with the first CSV row filled in. */
async function renderPreview(order: Order, item: OrderItem, version: number): Promise<string | null> {
  if (!item.designId || item.designVersion === null) return null;
  const saved = await loadSavedVersion(item.designId, item.designVersion, "service");
  if (!saved.scene) return null; // Uploaded artwork: the proof is the customer's own file.
  const values = saved.csvRows?.[0] ? valuesForRow(saved.csvRows[0], saved.csvMapping) : undefined;
  const png = await scenePng(saved.scene, { includeBleed: false, values, widthPx: PREVIEW_WIDTH_PX });
  const path = `orders/${order.orderNumber}/proofs/${item.id}-v${version}.png`;
  await proofsRepository.uploadPreview(path, png);
  return path;
}

/** Issues the next proof version for one line (v1, v2 …), superseding any open one (PRD §08). */
async function issueProof(order: Order, item: OrderItem, actorId: string | null): Promise<void> {
  const existing = (await proofsRepository.listProofs(order.id)).filter((p) => p.order_item_id === item.id);
  const version = Math.max(0, ...existing.map((p) => p.version)) + 1;
  await proofsRepository.supersedePending(item.id);
  const previewPath = await renderPreview(order, item, version);
  const proofId = await proofsRepository.insertProof({
    orderId: order.id,
    orderItemId: item.id,
    version,
    designVersion: item.designVersion,
    previewPath,
    createdBy: actorId,
  });
  await proofsRepository.insertEvent({ proofId, orderId: order.id, event: "issued", actorId });
}

/** Called after payment: issues v1 for every line that has no proof yet. Safe to call repeatedly. */
export async function issueInitialProofs(order: Order): Promise<void> {
  const proofs = await proofsRepository.listProofs(order.id);
  for (const item of order.items) {
    if (!proofs.some((p) => p.order_item_id === item.id)) await issueProof(order, item, null);
  }
}

export async function listForOrder(order: Order): Promise<Proof[]> {
  const rows = await proofsRepository.listProofs(order.id);
  const urls = await proofsRepository.signedPreviewUrls(rows.flatMap((r) => (r.preview_path ? [r.preview_path] : [])));
  return rows.map((r) => ({
    id: r.id,
    orderItemId: r.order_item_id,
    version: r.version,
    status: r.status,
    designVersion: r.design_version,
    previewUrl: r.preview_path ? (urls[r.preview_path] ?? null) : null,
    createdAt: r.created_at,
    events: r.proof_events
      .map((e) => ({
        event: e.event,
        actorName: e.profiles ? e.profiles.full_name || e.profiles.email : null,
        comment: e.comment,
        createdAt: e.created_at,
      }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  }));
}

function latestPerItem(order: Order, proofs: Proof[]): Map<string, Proof | undefined> {
  return new Map(
    order.items.map((item) => [
      item.id,
      proofs.filter((p) => p.orderItemId === item.id).sort((a, b) => b.version - a.version)[0],
    ]),
  );
}

/** The proof plus its order, which getOrderForUser restricts to the user's organization (or an admin). */
async function loadProofForUser(proofId: string, user: SessionUser) {
  const proof = await proofsRepository.findProof(proofId);
  if (!proof) throw notFound("That proof doesn't exist.");
  return { proof, order: await getOrderForUser(proof.order_id, user) };
}

/**
 * Customer approves a proof. The approval log records who approved which version and when; once every
 * line's latest proof is approved the order passes the approval gate into production and print files are queued.
 */
export async function approve(proofId: string): Promise<Order> {
  const user = await requireUser();
  const { order } = await loadProofForUser(proofId, user);
  if (order.status !== ORDER_STATUS.PROOF) throw conflict("This order isn't waiting for proof approval.");
  if (!(await proofsRepository.updateProofStatus(proofId, PROOF_STATUS.PENDING, PROOF_STATUS.APPROVED))) {
    throw conflict("This proof has already been answered or replaced by a newer version.");
  }
  await proofsRepository.insertEvent({ proofId, orderId: order.id, event: "approved", actorId: user.id });

  const latest = latestPerItem(order, await listForOrder(order));
  const allApproved = [...latest.values()].every((p) => p?.status === PROOF_STATUS.APPROVED);
  if (!allApproved) return order;

  const moved = await transition(order.id, ORDER_STATUS.PRODUCTION, {
    actorId: user.id,
    note: `All proofs approved (${[...latest.values()].map((p) => `v${p!.version}`).join(", ")}).`,
    viaApproval: true,
    notify: false,
  });
  await enqueueForOrder(order);
  await ordersRepository.updateOrder(order.id, { filesReady: false });
  const contact = await ordersRepository.findCustomerContact(order.customerId);
  await sendOrderEmail(EMAIL_TEMPLATE.PROOF_APPROVED, contact.email, { orderId: order.id, orderNumber: order.orderNumber, customerName: contact.full_name });
  return moved;
}

/** Customer asks for changes before approving (PRD §08). The order returns to the ARTWORK stage. */
export async function requestChanges(proofId: string, comment: string): Promise<Order> {
  const user = await requireUser();
  const { order } = await loadProofForUser(proofId, user);
  if (order.status !== ORDER_STATUS.PROOF) throw conflict("This order isn't waiting for proof approval.");
  if (!(await proofsRepository.updateProofStatus(proofId, PROOF_STATUS.PENDING, PROOF_STATUS.CHANGES_REQUESTED))) {
    throw conflict("This proof has already been answered or replaced by a newer version.");
  }
  await proofsRepository.insertEvent({ proofId, orderId: order.id, event: "changes_requested", actorId: user.id, comment });
  const moved = await transition(order.id, ORDER_STATUS.ARTWORK, { actorId: user.id, note: `Changes requested: ${comment}`, notify: false });
  const contact = await ordersRepository.findCustomerContact(order.customerId);
  await sendOrderEmail(EMAIL_TEMPLATE.PROOF_CHANGES_REQUESTED, contact.email, {
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerName: contact.full_name,
    comment,
  });
  return moved;
}

/**
 * After a change request the customer edits the design, saves a new version and resubmits it.
 * The price was fixed at payment, so the quantity (and CSV row count) must stay the same (D-057).
 */
export async function resubmit(orderId: string, itemId: string): Promise<Order> {
  const user = await requireUser();
  const order = await getOrderForUser(orderId, user);
  if (order.status !== ORDER_STATUS.ARTWORK) throw conflict("This order isn't waiting for revised artwork.");
  const item = order.items.find((i) => i.id === itemId);
  if (!item?.designId || item.designVersion === null) throw notFound("That item isn't on this order.");

  const latestVersion = await currentVersionOf(item.designId);
  if (latestVersion <= item.designVersion) {
    throw new AppError("VALIDATION", "Edit your design and save it first. The revision becomes a new version.");
  }
  const saved = await loadSavedVersion(item.designId, latestVersion, "user");
  const quantity = saved.csvRows ? saved.csvRows.length : item.quantity;
  if (quantity !== item.quantity) {
    throw new AppError("VALIDATION", `The revised spreadsheet has ${quantity} rows but the order was for ${item.quantity}. Keep the same number of rows.`);
  }

  await ordersRepository.updateItem(item.id, order.id, { ...item, designVersion: latestVersion, csvDatasetId: saved.csvDatasetId });
  const updated = (await ordersRepository.findOrder(order.id))!;
  await issueProof(updated, updated.items.find((i) => i.id === itemId)!, user.id);

  // Back to PROOF once no line is still waiting on changes.
  const latest = latestPerItem(updated, await listForOrder(updated));
  const waiting = [...latest.values()].some((p) => p?.status === PROOF_STATUS.CHANGES_REQUESTED);
  if (waiting) return updated;
  const moved = await transition(order.id, ORDER_STATUS.PROOF, { actorId: user.id, note: `Revised proof issued for ${item.productName}.`, notify: false });
  const contact = await ordersRepository.findCustomerContact(order.customerId);
  await sendOrderEmail(EMAIL_TEMPLATE.PROOF_READY, contact.email, { orderId: order.id, orderNumber: order.orderNumber, customerName: contact.full_name });
  return moved;
}
