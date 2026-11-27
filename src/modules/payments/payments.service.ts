import "server-only";
import { createHash } from "node:crypto";
import { publicEnv } from "@/config/env.public";
import { serverEnv } from "@/config/env.server";
import { EMAIL_TEMPLATE } from "@/constants/email";
import { ORDER_STATUS } from "@/constants/pipeline";
import { ROUTES } from "@/constants/routes";
import { SITE_CONFIG } from "@/constants/site-config";
import { AppError, forbidden, notFound } from "@/lib/errors";
import { formatMoney } from "@/lib/money";
import { stripe, type Stripe } from "@/lib/stripe";
import { requireUser } from "@/modules/auth/auth.service";
import { refreshForCheckout } from "@/modules/cart/cart.service";
import { getProductById } from "@/modules/catalogue/catalogue.service";
import { createInvoiceForOrder } from "@/modules/invoices/invoices.service";
import { sendOrderEmail } from "@/modules/notifications/notifications.service";
import * as ordersRepository from "@/modules/orders/orders.repository";
import { transition } from "@/modules/orders/orders.service";
import type { Order } from "@/modules/orders/orders.types";
import { enqueueForOrder, triggerWorker } from "@/modules/print-files/print-files.service";
import { allProofsApproved, issueInitialProofs } from "@/modules/proofs/proofs.service";
import * as paymentsRepository from "./payments.repository";

/** PRD §05: one-off Stripe Checkout for the basket (no subscriptions). Returns the hosted payment page URL. */
export async function createCheckout(): Promise<string> {
  const user = await requireUser();
  const order = await refreshForCheckout(user);
  const contact = await ordersRepository.findCustomerContact(user.id);

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  for (const item of order.items) {
    const product = await getProductById(item.productId);
    const material = product?.materials.find((m) => m.id === item.configuration.materialId)?.name;
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: order.currency.toLowerCase(),
        // Line totals already include VAT, the volume discount and any setup fee (D-039).
        unit_amount: item.lineTotalMinor,
        product_data: {
          name: `${item.productName} × ${item.quantity.toLocaleString("en-GB")}`,
          description: `${item.configuration.widthMm} × ${item.configuration.heightMm} mm${material ? `, ${material}` : ""}. Includes VAT.`,
        },
      },
    });
  }
  if (order.deliveryMinor > 0) {
    lineItems.push({ quantity: 1, price_data: { currency: order.currency.toLowerCase(), unit_amount: order.deliveryMinor, product_data: { name: "Delivery" } } });
  }

  // Same basket contents → same idempotency key, so a double-click can't open two sessions.
  const fingerprint = createHash("sha256")
    .update(JSON.stringify([order.id, order.totalMinor, order.deliveryMethod, order.items.map((i) => [i.id, i.designVersion, i.quantity, i.lineTotalMinor])]))
    .digest("hex")
    .slice(0, 32);
  const site = publicEnv().NEXT_PUBLIC_SITE_URL;
  const session = await stripe().checkout.sessions.create(
    {
      mode: "payment",
      line_items: lineItems,
      customer_email: contact.email,
      client_reference_id: order.id,
      metadata: { order_id: order.id, order_number: order.orderNumber },
      payment_intent_data: { description: `${SITE_CONFIG.name} order ${order.orderNumber}`, metadata: { order_id: order.id } },
      success_url: `${site}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}${ROUTES.cart}?cancelled=1`,
    },
    { idempotencyKey: `checkout-${fingerprint}` },
  );
  if (!session.url) throw new AppError("INTERNAL", "Stripe didn't return a payment page.");
  await paymentsRepository.insertPending({ orderId: order.id, sessionId: session.id, amountMinor: order.totalMinor, currency: order.currency });
  return session.url;
}

/**
 * Moves a paid order forward: ORDER → ARTWORK → PROOF, writing the invoice and issuing proofs on the way.
 * Each step checks where the order is, so a retry after a partial failure simply continues (D-058).
 */
async function advanceAfterPayment(order: Order, sendEmails: boolean): Promise<void> {
  let current = order;
  const log = (step: string) => console.info(`[fulfil] ${order.orderNumber}: ${step}`);
  const contact = await ordersRepository.findCustomerContact(order.customerId);

  if (current.status === ORDER_STATUS.ORDER) {
    log("creating invoice");
    await createInvoiceForOrder(current);
    log("invoice ready, moving to artwork");
    current = await transition(current.id, ORDER_STATUS.ARTWORK, {
      actorId: null,
      note: `Artwork attached: ${current.items.length} saved design${current.items.length === 1 ? "" : "s"}.`,
    });
    log("in artwork");
    if (sendEmails) {
      await sendOrderEmail(EMAIL_TEMPLATE.ORDER_CONFIRMED, contact.email, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: contact.full_name,
        totalMinor: order.totalMinor,
        items: order.items.map((i) => ({ name: i.productName, quantity: i.quantity })),
      });
    }
  }
  if (current.status === ORDER_STATUS.ARTWORK) {
    log("issuing proofs");
    await issueInitialProofs(current);
    log("proofs issued, moving to proof");
    current = await transition(current.id, ORDER_STATUS.PROOF, { actorId: null, note: "Proofs issued (v1)." });
    // A pure reorder reuses approved proofs, so it can pass the approval gate straight away.
    if (await allProofsApproved(current)) {
      log("all proofs already approved (reorder), moving to production");
      await transition(current.id, ORDER_STATUS.PRODUCTION, {
        actorId: null,
        note: "Reorder: approved artwork reused, no new approval needed.",
        viaApproval: true,
      });
      await enqueueForOrder(current);
      await triggerWorker();
      return;
    }
    if (sendEmails) {
      await sendOrderEmail(EMAIL_TEMPLATE.PROOF_READY, contact.email, { orderId: order.id, orderNumber: order.orderNumber, customerName: contact.full_name });
    }
  }
}

/** Shared by the Stripe webhook and the success page; whichever arrives first does the work. */
export async function fulfilSession(session: Stripe.Checkout.Session): Promise<string | null> {
  const orderId = session.metadata?.order_id;
  if (!orderId || session.payment_status !== "paid") return orderId ?? null;

  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);
  const firstTime = await paymentsRepository.markSucceeded(session.id, paymentIntent);
  let order = await ordersRepository.findOrder(orderId);
  if (!order) throw notFound("Order not found for this payment.");

  if (firstTime && order.status === ORDER_STATUS.QUOTE) {
    const paid = session.amount_total ?? 0;
    const note =
      paid === order.totalMinor
        ? `Paid ${formatMoney(paid, order.currency)} by card (Stripe).`
        : `Paid ${formatMoney(paid, order.currency)} by card; order total was ${formatMoney(order.totalMinor, order.currency)}. Check before production.`;
    order = await transition(order.id, ORDER_STATUS.ORDER, { actorId: null, note });
  }
  // Resume (or start) the post-payment steps; harmless when they're already done.
  if (order.status === ORDER_STATUS.ORDER || order.status === ORDER_STATUS.ARTWORK) {
    const hasProofHistory = order.status === ORDER_STATUS.ARTWORK && (await ordersRepository.listStatusHistory(order.id)).some((h) => h.toStatus === ORDER_STATUS.PROOF);
    // An order back in ARTWORK after a change request is waiting on the customer, not on fulfilment.
    if (!hasProofHistory) await advanceAfterPayment(order, firstTime);
  }
  return order.id;
}

/** Success page: confirms the session belongs to the signed-in customer, then fulfils it if needed. */
export async function confirmCheckout(sessionId: string): Promise<string> {
  const user = await requireUser();
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  const orderId = session.metadata?.order_id;
  if (!orderId) throw notFound("We couldn't find that payment.");
  const order = await ordersRepository.findOrder(orderId);
  if (!order || order.customerId !== user.id) throw forbidden("That payment belongs to a different account.");
  if (session.payment_status !== "paid") throw new AppError("CONFLICT", "Your payment hasn't completed yet. If you were charged, refresh in a moment.");
  await fulfilSession(session);
  return orderId;
}

/** POST /api/v1/webhooks/stripe — signature-verified; unknown events are acknowledged and ignored. */
export async function handleWebhook(rawBody: string, signature: string | null): Promise<{ received: true }> {
  if (!signature) throw new AppError("VALIDATION", "Missing Stripe signature.");
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(rawBody, signature, serverEnv().STRIPE_WEBHOOK_SECRET);
  } catch {
    throw new AppError("VALIDATION", "Invalid Stripe signature.");
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await fulfilSession(event.data.object);
      break;
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed":
      await paymentsRepository.markFailed(event.data.object.id);
      break;
  }
  return { received: true };
}
