import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-4 py-20 sm:px-6">
      <p className="font-display text-7xl font-bold text-ink-muted">404</p>
      <h1 className="text-3xl font-bold">This page isn&apos;t in the print run</h1>
      <p className="text-ink-muted">The link may be old, or the page may have moved. Start from the product range or the price calculator.</p>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href={ROUTES.products}>Browse products</ButtonLink>
        <ButtonLink href={ROUTES.calculator} variant="secondary">
          Price calculator
        </ButtonLink>
      </div>
      <p className="text-sm text-ink-muted">
        Looking for an order? <Link href={ROUTES.account.orders} className="text-accent underline underline-offset-4">Go to your orders</Link>.
      </p>
    </main>
  );
}
