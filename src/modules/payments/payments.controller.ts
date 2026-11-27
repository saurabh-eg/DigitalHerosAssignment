import "server-only";
import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { handleAction, type ActionResult } from "@/lib/action-result";
import { AppError, HTTP_STATUS } from "@/lib/errors";
import * as paymentsService from "./payments.service";

export async function startCheckout(): Promise<ActionResult> {
  return handleAction(async () => {
    const url = await paymentsService.createCheckout();
    redirect(url);
  });
}

/** Success page: returns the order id once the payment is confirmed, or an error message to show. */
export async function confirmCheckout(sessionId: string): Promise<{ orderId: string } | { error: string }> {
  try {
    return { orderId: await paymentsService.confirmCheckout(sessionId) };
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    console.error(error);
    return { error: "We couldn't confirm your payment yet. Please refresh in a moment." };
  }
}

export async function webhook(request: Request): Promise<Response> {
  try {
    // The signature covers the exact bytes, so the body must be read raw, not parsed.
    const body = await request.text();
    return Response.json(await paymentsService.handleWebhook(body, request.headers.get("stripe-signature")));
  } catch (error) {
    if (error instanceof AppError) return Response.json({ error: error.message }, { status: HTTP_STATUS[error.code] });
    console.error("Stripe webhook failed", error);
    // 500 makes Stripe retry later; fulfilment is idempotent.
    return Response.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

export function successRedirect(orderId: string): never {
  redirect(`${ROUTES.account.order(orderId)}?placed=1`);
}
