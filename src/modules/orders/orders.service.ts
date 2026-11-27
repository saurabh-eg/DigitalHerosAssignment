import "server-only";
import { ALLOWED_TRANSITIONS, ORDER_STATUS, ORDER_STATUS_LABEL, type OrderStatus } from "@/constants/pipeline";
import { EMAIL_TEMPLATE } from "@/constants/email";
import { ROLE } from "@/constants/roles";
import { conflict, notFound } from "@/lib/errors";
import { requireUser } from "@/modules/auth/auth.service";
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
