import type { Metadata } from "next";
import Link from "next/link";
import { LinePreview } from "@/components/orders/line-preview";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { DELIVERY_CONFIG, TAX_CONFIG } from "@/constants/site-config";
import { formatMoney, formatPercent } from "@/lib/money";
import * as authController from "@/modules/auth/auth.controller";
import * as cartController from "@/modules/cart/cart.controller";
import { CheckoutButton, DeliveryForm, QuantityForm } from "@/modules/cart/components/cart-forms";
import { checkoutAction, removeItemAction, setDeliveryAction, updateQuantityAction } from "./actions";

export const metadata: Metadata = { title: "Basket" };

export default async function CartPage({ searchParams }: PageProps<"/cart">) {
  await authController.requirePageUser(ROUTES.cart);
  const [{ cancelled }, { cart, details }] = await Promise.all([searchParams, cartController.getCartPage()]);

  if (!cart || cart.items.length === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-4xl font-bold">Your basket is empty</h1>
        <p className="mt-2 text-ink-muted">Configure a product, design it and save it, then add it here.</p>
        <ButtonLink href={ROUTES.products} className="mt-6">
          Browse products
        </ButtonLink>
      </main>
    );
  }

  const needsAddress = cart.deliveryMethod === "delivery" && !cart.shippingAddress;
  const toFreeDelivery = DELIVERY_CONFIG.freeThresholdMinor - cart.itemsTotalMinor;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-bold">Basket</h1>
      <p className="mt-2 mb-8 text-ink-muted">Quote {cart.orderNumber}. Prices include {TAX_CONFIG.rateBps / 100}% VAT and are checked again when you pay.</p>
      {cancelled && (
        <div className="mb-6">
          <Alert>Payment was cancelled. Your basket is just as you left it.</Alert>
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-10">
          <ul className="flex flex-col divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
            {cart.items.map((item) => {
              const d = details[item.id];
              const rows = d?.preview?.kind === "svg" ? d.preview.rows : null;
              return (
                <li key={item.id} className="grid gap-4 p-4 sm:grid-cols-[9rem_1fr_auto]">
                  <LinePreview preview={d?.preview ?? null} />
                  <div className="flex flex-col gap-1 text-sm">
                    <h2 className="font-display text-lg font-semibold">{item.productName}</h2>
                    <p className="text-ink-muted">
                      {item.configuration.widthMm} × {item.configuration.heightMm} mm{d?.materialName ? `, ${d.materialName}` : ""}
                    </p>
                    <p className="text-ink-muted">
                      {formatMoney(item.unitPriceMinor)} each
                      {item.discountBps > 0 && <span className="text-success"> ({formatPercent(item.discountBps)} volume discount)</span>}
                      {item.setupFeeMinor > 0 && `, plus ${formatMoney(item.setupFeeMinor)} setup`}
                    </p>
                    {item.designId && (
                      <Link href={ROUTES.designer(item.designId)} className="text-accent underline-offset-4 hover:underline">
                        Edit design (v{item.designVersion})
                      </Link>
                    )}
                    <div className="mt-2 flex flex-wrap items-end gap-4">
                      {rows !== null || item.csvDatasetId ? (
                        <p>{item.quantity.toLocaleString("en-GB")} copies, one per spreadsheet row</p>
                      ) : (
                        <QuantityForm itemId={item.id} quantity={item.quantity} action={updateQuantityAction} />
                      )}
                      <form action={removeItemAction}>
                        <input type="hidden" name="itemId" value={item.id} />
                        <button type="submit" className="h-9 text-sm text-danger underline-offset-4 hover:underline">
                          Remove
                        </button>
                      </form>
                    </div>
                  </div>
                  <p className="font-display text-xl font-semibold sm:text-right">{formatMoney(item.lineTotalMinor)}</p>
                </li>
              );
            })}
          </ul>

          <section>
            <h2 className="mb-4 text-2xl font-bold">Delivery</h2>
            <DeliveryForm method={cart.deliveryMethod} address={cart.shippingAddress} action={setDeliveryAction} />
          </section>
        </div>

        <aside className="flex h-fit flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5 lg:sticky lg:top-20">
          <h2 className="font-display text-lg font-semibold">Summary</h2>
          <dl className="grid grid-cols-[1fr_auto] gap-y-2 text-sm">
            <dt className="text-ink-muted">Items</dt>
            <dd className="text-right">{formatMoney(cart.itemsTotalMinor)}</dd>
            {cart.discountTotalMinor > 0 && (
              <>
                <dt className="text-success">Volume discounts</dt>
                <dd className="text-right text-success">−{formatMoney(cart.discountTotalMinor)}</dd>
              </>
            )}
            <dt className="text-ink-muted">{cart.deliveryMethod === "collection" ? "Collection" : "Delivery"}</dt>
            <dd className="text-right">{cart.deliveryMinor === 0 ? "Free" : formatMoney(cart.deliveryMinor)}</dd>
            <dt className="border-t border-line pt-3 font-semibold">Total</dt>
            <dd className="border-t border-line pt-3 text-right font-display text-2xl font-semibold">{formatMoney(cart.totalMinor)}</dd>
            <dt className="text-ink-muted">Includes VAT</dt>
            <dd className="text-right text-ink-muted">{formatMoney(cart.taxMinor)}</dd>
          </dl>
          {cart.deliveryMethod === "delivery" && toFreeDelivery > 0 && (
            <p className="rounded-md bg-accent-soft px-3 py-2 text-sm text-accent">Add {formatMoney(toFreeDelivery)} more for free delivery.</p>
          )}
          {needsAddress && <p className="text-sm text-warning">Add a delivery address or choose collection to continue.</p>}
          <CheckoutButton action={checkoutAction} disabled={needsAddress} />
          <p className="text-xs text-ink-muted">You&apos;ll approve a proof of every item before anything is printed.</p>
        </aside>
      </div>
    </main>
  );
}
