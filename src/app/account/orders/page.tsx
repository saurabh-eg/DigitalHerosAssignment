import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { ORDER_STATUS_LABEL } from "@/constants/pipeline";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import * as ordersController from "@/modules/orders/orders.controller";

export const metadata: Metadata = { title: "Orders" };

const ACTION_NEEDED = new Set(["proof", "artwork"]);

export default async function OrdersPage({ searchParams }: PageProps<"/account/orders">) {
  const { orders, total, page, pageSize } = await ordersController.listMyOrdersPage(await searchParams);
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="mt-1 text-ink-muted">Every order, where it is now, and anything waiting for you.</p>
      </header>
      {orders.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-[var(--radius-card)] border border-dashed border-line p-6">
          <p>You haven&apos;t placed an order yet.</p>
          <ButtonLink href={ROUTES.products}>Browse products</ButtonLink>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
          {orders.map((o) => (
            <li key={o.id}>
              <Link prefetch={false} href={ROUTES.account.order(o.id)} className="grid gap-2 p-4 hover:bg-paper sm:grid-cols-[8rem_1fr_auto_auto] sm:items-center sm:gap-6">
                <span className="font-display font-semibold">{o.orderNumber}</span>
                <span className="text-sm text-ink-muted">
                  {o.items.map((i) => `${i.quantity.toLocaleString("en-GB")} × ${i.productName}`).join(", ")}
                  {o.placedAt && <span className="block">{new Date(o.placedAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}</span>}
                </span>
                <span
                  className={cn(
                    "w-fit rounded-full px-2.5 py-1 text-xs font-medium",
                    ACTION_NEEDED.has(o.status) ? "bg-accent-soft text-accent" : "bg-paper text-ink",
                  )}
                >
                  {o.status === "proof" ? "Proof to approve" : o.status === "artwork" ? "Revision needed" : ORDER_STATUS_LABEL[o.status]}
                </span>
                <span className="font-semibold sm:text-right">{formatMoney(o.totalMinor, o.currency)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {total > 0 && <Pagination basePath={ROUTES.account.orders} page={page} pageSize={pageSize} total={total} noun={["order", "orders"]} />}
    </div>
  );
}
