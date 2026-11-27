import "server-only";
import { ALLOWED_TRANSITIONS, ORDER_STATUS, ORDER_STATUS_LABEL, type OrderStatus } from "@/constants/pipeline";
import { EMAIL_TEMPLATE } from "@/constants/email";
import { ROLE } from "@/constants/roles";
import { conflict, notFound } from "@/lib/errors";
import { requireRole, requireUser } from "@/modules/auth/auth.service";
import type { JobSearch } from "./orders.validator";
import type { SessionUser } from "@/modules/auth/auth.types";
import { sendOrderEmail } from "@/modules/notifications/notifications.service";
import * as ordersRepository from "./orders.repository";
import type { Order } from "./orders.types";

// Statuses the customer is emailed about; other moves are internal steps of a bigger event.
const CUSTOMER_UPDATES: Partial<Record<OrderStatus, (typeof EMAIL_TEMPLATE)[keyof typeof EMAIL_TEMPLATE]>> = {
  production: EMAIL_TEMPLATE.STATUS_CHANGED,
  completed: EMAIL_TEMPLATE.ORDER_COMPLETED,
};

/**
 * The only way an order changes status (PRD §11). Enforces the allowed transitions, records history,
 * and keeps the approval gate: PROOF → PRODUCTION happens only through an approved proof (PRD §08).
 */
export async function transition(
  orderId: string,
  to: OrderStatus,
  options: { actorId: string | null; note?: string; viaApproval?: boolean; notify?: boolean } = { actorId: null },
): Promise<Order> {
  const order = await ordersRepository.findOrder(orderId);
  if (!order) throw notFound("Order not found.");
  const from = order.status;
  if (from === to) return order;
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw conflict(`An order can't move from ${ORDER_STATUS_LABEL[from]} to ${ORDER_STATUS_LABEL[to]}.`);
  }
  if (from === ORDER_STATUS.PROOF && to === ORDER_STATUS.PRODUCTION && !options.viaApproval) {
    throw conflict("Production starts only when the customer has approved every proof.");
  }

  const moved = await ordersRepository.updateStatus(orderId, from, to);
  if (!moved) throw conflict("This order was updated by someone else. Refresh and try again.");
  await ordersRepository.insertStatusHistory(orderId, from, to, options.actorId, options.note ?? null);

  const template = CUSTOMER_UPDATES[to];
  if (template && options.notify !== false) {
    const contact = await ordersRepository.findCustomerContact(order.customerId);
    await sendOrderEmail(template, contact.email, {
      orderId,
      orderNumber: order.orderNumber,
      customerName: contact.full_name,
      statusLabel: ORDER_STATUS_LABEL[to],
    });
  }
  return { ...order, status: to };
}

/** Loads an order the current user may see: their own organization's, or any order for an admin. */
export async function getOrderForUser(orderId: string, user?: SessionUser): Promise<Order> {
  const actor = user ?? (await requireUser());
  const order = await ordersRepository.findOrder(orderId);
  if (!order || (actor.role !== ROLE.ADMIN && order.organizationId !== actor.organizationId)) {
    throw notFound("That order doesn't exist or isn't yours.");
  }
  return order;
}

export async function listMyOrders(): Promise<Order[]> {
  await requireUser();
  return ordersRepository.listOrdersForCustomer();
}

export const listStatusHistory = ordersRepository.listStatusHistory;

// ─── Admin (PRD §11) ────────────────────────────────────────────────────────

export async function searchJobs(filters: JobSearch) {
  await requireRole(ROLE.ADMIN);
  return ordersRepository.searchJobs(filters);
}

const BOARD_STAGES = [ORDER_STATUS.ORDER, ORDER_STATUS.ARTWORK, ORDER_STATUS.PROOF, ORDER_STATUS.PRODUCTION, ORDER_STATUS.COMPLETED];

/** Pipeline board: the most recent jobs per stage plus open-basket (quote) count. */
export async function pipelineBoard(perStage = 12) {
  await requireRole(ROLE.ADMIN);
  const [columns, counts] = await Promise.all([
    Promise.all(
      BOARD_STAGES.map(async (status) => ({
        status,
        ...(await ordersRepository.searchJobs({ status, archived: "exclude", page: 1, pageSize: perStage })),
      })),
    ),
    ordersRepository.countByStatus(),
  ]);
  return { columns, openQuotes: counts.quote ?? 0, counts };
}

/**
 * Staff moves (PRD §11 "advance the pipeline"). Earlier stages advance automatically on payment,
 * proofs and approval; staff complete production or cancel. PROOF → PRODUCTION stays approval-only.
 */
export async function adminTransition(orderId: string, to: "completed" | "cancelled", note?: string): Promise<Order> {
  const admin = await requireRole(ROLE.ADMIN);
  const order = await getOrderForUser(orderId, admin);
  if (to === ORDER_STATUS.COMPLETED && !order.filesReady) {
    throw conflict("Print files aren't ready yet. Wait for the print queue (or retry failed jobs) before completing.");
  }
  return transition(orderId, to, { actorId: admin.id, note: note ?? (to === "completed" ? "Marked complete by staff." : "Cancelled by staff.") });
}

/** PRD §11 archive: completed or cancelled work is filed away but stays searchable for repeat orders. */
export async function setArchived(orderId: string, archive: boolean): Promise<void> {
  const admin = await requireRole(ROLE.ADMIN);
  const order = await getOrderForUser(orderId, admin);
  if (archive && order.status !== ORDER_STATUS.COMPLETED && order.status !== ORDER_STATUS.CANCELLED) {
    throw conflict("Only completed or cancelled orders can be archived.");
  }
  await ordersRepository.updateOrder(orderId, { archivedAt: archive ? new Date().toISOString() : null });
}

export async function getCustomerContact(customerId: string) {
  await requireRole(ROLE.ADMIN);
  return ordersRepository.findCustomerContact(customerId);
}
