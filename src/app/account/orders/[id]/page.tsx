import type { Metadata } from "next";
import { LinePreview } from "@/components/orders/line-preview";
import { PipelineTracker } from "@/components/orders/pipeline-tracker";
import { Alert } from "@/components/ui/alert";
import { ORDER_STATUS_LABEL } from "@/constants/pipeline";
import { ROUTES } from "@/constants/routes";
import { ReorderButton } from "@/modules/cart/components/reorder-button";
import { reorderAction } from "../../../cart/actions";
import { formatMoney } from "@/lib/money";
import * as ordersController from "@/modules/orders/orders.controller";
import { ProofPanel } from "@/modules/proofs/components/proof-panel";
import { approveProofAction, requestChangesAction, resubmitDesignAction } from "../actions";

export const metadata: Metadata = { title: "Order" };

export default async function OrderPage({ params, searchParams }: PageProps<"/account/orders/[id]">) {
  const [{ id }, { placed }] = await Promise.all([params, searchParams]);
  const { order, proofs, history, details, latestVersions } = await ordersController.getOrderPage(id);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-3xl font-bold">Order {order.orderNumber}</h1>
          {order.placedAt && (
            <p className="text-sm text-ink-muted">Placed {new Date(order.placedAt).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })}</p>
          )}
        </div>
        {placed && order.status !== "production" && (
          <Alert tone="success">Payment received, thank you. Your proofs are below: please review and approve them.</Alert>
        )}
        {placed && order.status === "production" && (
          <Alert tone="success">Payment received, thank you. This reorder reuses your approved artwork, so it&apos;s gone straight to production.</Alert>
        )}
        <PipelineTracker status={order.status} />
        <div className="flex flex-wrap items-center gap-3">
          {(order.status === "production" || order.status === "completed") && <ReorderButton orderId={order.id} action={reorderAction} />}
          {order.placedAt && (
            <a href={ROUTES.account.invoice(order.id)} className="inline-flex h-11 items-center rounded-full border border-line bg-surface px-5 text-sm font-medium hover:border-ink" download>
              Download invoice
            </a>
          )}
        </div>
      </header>

      <section className="flex flex-col gap-6">
        <h2 className="text-2xl font-bold">Items and proofs</h2>
        {order.items.map((item) => {
          const d = details[item.id];
          const artworkUrl = d?.preview?.kind === "file" && d.preview.mimeType.startsWith("image/") ? d.preview.url : null;
          return (
            <article key={item.id} className="grid gap-6 rounded-[var(--radius-card)] border border-line bg-surface p-5 lg:grid-cols-[14rem_1fr]">
              <div className="flex flex-col gap-2 text-sm">
                <LinePreview preview={d?.preview ?? null} />
                <h3 className="font-display text-lg font-semibold">{item.productName}</h3>
                <p className="text-ink-muted">
                  {item.quantity.toLocaleString("en-GB")} × {item.configuration.widthMm} × {item.configuration.heightMm} mm
                  {d?.materialName ? `, ${d.materialName}` : ""}
                </p>
                <p className="font-semibold">{formatMoney(item.lineTotalMinor, order.currency)}</p>
              </div>
              <ProofPanel
                orderId={order.id}
                orderStatus={order.status}
                item={item}
                proofs={proofs.filter((p) => p.orderItemId === item.id)}
                latestDesignVersion={latestVersions[item.id] ?? null}
                artworkUrl={artworkUrl}
                actions={{ approve: approveProofAction, requestChanges: requestChangesAction, resubmit: resubmitDesignAction }}
              />
            </article>
          );
        })}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <h2 className="mb-3 text-lg font-semibold">Payment</h2>
          <dl className="grid grid-cols-[1fr_auto] gap-y-1.5 text-sm">
            <dt className="text-ink-muted">Items</dt>
            <dd className="text-right">{formatMoney(order.itemsTotalMinor, order.currency)}</dd>
            {order.discountTotalMinor > 0 && (
              <>
                <dt className="text-success">Volume discounts</dt>
                <dd className="text-right text-success">−{formatMoney(order.discountTotalMinor, order.currency)}</dd>
              </>
            )}
            <dt className="text-ink-muted">{order.deliveryMethod === "collection" ? "Collection" : "Delivery"}</dt>
            <dd className="text-right">{order.deliveryMinor ? formatMoney(order.deliveryMinor, order.currency) : "Free"}</dd>
            <dt className="font-semibold">Total paid</dt>
            <dd className="text-right font-semibold">{formatMoney(order.totalMinor, order.currency)}</dd>
            <dt className="text-ink-muted">Includes VAT</dt>
            <dd className="text-right text-ink-muted">{formatMoney(order.taxMinor, order.currency)}</dd>
          </dl>
          {order.shippingAddress && (
            <address className="mt-4 text-sm not-italic text-ink-muted">
              {order.shippingAddress.name}, {order.shippingAddress.line1}
              {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}, {order.shippingAddress.city} {order.shippingAddress.postcode}
            </address>
          )}
        </section>
        <section className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <h2 className="mb-3 text-lg font-semibold">Timeline</h2>
          <ol className="flex flex-col gap-2 border-l border-line pl-4 text-sm">
            {history.map((h, i) => (
              <li key={i}>
                <span className="font-medium">{ORDER_STATUS_LABEL[h.toStatus]}</span>{" "}
                <span className="text-ink-muted">{new Date(h.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
                {h.note && <span className="block text-ink-muted">{h.note}</span>}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
