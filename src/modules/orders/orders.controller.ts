import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { lineDetails } from "@/modules/cart/cart.controller";
import { currentVersionOf } from "@/modules/designer/designer.orders";
import { listForOrder } from "@/modules/proofs/proofs.service";
import * as ordersService from "./orders.service";

export const listMyOrders = ordersService.listMyOrders;

/** Everything the customer's order page needs: lines, proofs with their logs, and the status timeline. */
export async function getOrderPage(orderId: string) {
  if (!z.uuid().safeParse(orderId).success) notFound();
  try {
    const order = await ordersService.getOrderForUser(orderId);
    const [proofs, history, details, latestVersions] = await Promise.all([
      listForOrder(order),
      ordersService.listStatusHistory(order.id),
      lineDetails(order),
      Promise.all(
        order.items.map(async (i) => [i.id, i.designId ? await currentVersionOf(i.designId).catch(() => null) : null] as const),
      ),
    ]);
    return { order, proofs, history, details, latestVersions: Object.fromEntries(latestVersions) };
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}
