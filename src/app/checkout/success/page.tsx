import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import * as paymentsController from "@/modules/payments/payments.controller";

export const metadata: Metadata = { title: "Payment received" };
export const maxDuration = 60;

export default async function CheckoutSuccessPage({ searchParams }: PageProps<"/checkout/success">) {
  const { session_id: sessionId } = await searchParams;
  if (typeof sessionId !== "string" || !sessionId.startsWith("cs_")) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-bold">Payment link not recognised</h1>
        <ButtonLink href={ROUTES.account.orders} className="mt-6">
          Go to your orders
        </ButtonLink>
      </main>
    );
  }

  const result = await paymentsController.confirmCheckout(sessionId);
  if ("orderId" in result) paymentsController.successRedirect(result.orderId);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold">We&apos;re confirming your payment</h1>
      <p className="mt-2 text-ink-muted">{"error" in result ? result.error : ""}</p>
      <div className="mt-6 flex gap-3">
        <ButtonLink href={`/checkout/success?session_id=${encodeURIComponent(sessionId)}`}>Check again</ButtonLink>
        <ButtonLink href={ROUTES.account.orders} variant="secondary">
          Your orders
        </ButtonLink>
      </div>
    </main>
  );
}
