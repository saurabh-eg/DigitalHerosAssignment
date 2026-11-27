import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { ORDER_STATUS_LABEL } from "@/constants/pipeline";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import * as accountsController from "@/modules/accounts/accounts.controller";
import { ReorderButton } from "@/modules/cart/components/reorder-button";
import { reorderAction } from "../cart/actions";

export const metadata: Metadata = { title: "My account" };

const PROOF_STATE: Record<string, string> = {
  pending: "waiting for your approval",
  approved: "approved",
  changes_requested: "changes requested",
  superseded: "replaced",
};

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default async function AccountOverviewPage() {
  const { profile, missing, activeProofs, recentOrders, designCount, recentDesigns } = await accountsController.getDashboard();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold">Hello, {profile.fullName?.split(" ")[0] ?? "there"}</h1>
        <p className="mt-1 text-ink-muted">Your orders, proofs and saved designs.</p>
      </header>

      {activeProofs.length > 0 && (
        <section className="flex flex-col gap-3 rounded-[var(--radius-card)] border-2 border-accent bg-surface p-5">
          <h2 className="text-lg font-semibold">Waiting for you</h2>
          <ul className="flex flex-col gap-3">
            {activeProofs.map(({ order, lines }) => (
              <li key={order.id} className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm">
                  <p className="font-medium">
                    Order {order.orderNumber}: {order.status === "proof" ? "proof ready to review" : "revised artwork needed"}
                  </p>
                  <p className="text-ink-muted">
                    {lines.map((l) => `${l.item.productName} ${l.version ? `v${l.version} ${PROOF_STATE[l.status ?? ""] ?? ""}` : "being prepared"}`).join("; ")}
                  </p>
                </div>
                <ButtonLink href={ROUTES.account.order(order.id)} size="sm">
                  {order.status === "proof" ? "Review proofs" : "Revise artwork"}
                </ButtonLink>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Account status" action={<Link href={ROUTES.account.settings} className="text-sm text-accent hover:underline">Edit</Link>}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-ink-muted">Email</dt>
            <dd className="break-all">{profile.email}</dd>
            <dt className="text-ink-muted">Member since</dt>
            <dd>{new Date(profile.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</dd>
            <dt className="text-ink-muted">Profile</dt>
            <dd className={missing.length ? "text-warning" : "text-success"}>{missing.length ? `Add your ${missing.join(" and ")}` : "Complete"}</dd>
            {profile.companyName && (
              <>
                <dt className="text-ink-muted">Company</dt>
                <dd>{profile.companyName}</dd>
              </>
            )}
          </dl>
        </Card>

        <Card title="Saved designs" action={<Link href={ROUTES.account.designs} className="text-sm text-accent hover:underline">All {designCount}</Link>}>
          {recentDesigns.length === 0 ? (
            <p className="text-sm text-ink-muted">Designs you save appear here, ready to reuse.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {recentDesigns.map((d) => (
                <li key={d.id} className="flex justify-between gap-3">
                  <Link href={ROUTES.designer(d.id)} className="truncate hover:text-accent">
                    {d.name}
                  </Link>
                  <span className="shrink-0 text-ink-muted">v{d.currentVersion}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Recent orders" action={<Link href={ROUTES.account.orders} className="text-sm text-accent hover:underline">All orders</Link>}>
        {recentOrders.length === 0 ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-ink-muted">No orders yet.</p>
            <ButtonLink href={ROUTES.products}>Browse products</ButtonLink>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {recentOrders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <Link href={ROUTES.account.order(o.id)} className="text-sm">
                  <span className="font-medium">{o.orderNumber}</span>{" "}
                  <span className="text-ink-muted">{o.items.map((i) => i.productName).join(", ")}</span>
                </Link>
                <div className="flex items-center gap-3">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs", o.status === "proof" || o.status === "artwork" ? "bg-accent-soft text-accent" : "bg-paper")}>
                    {ORDER_STATUS_LABEL[o.status]}
                  </span>
                  <span className="text-sm font-medium">{formatMoney(o.totalMinor, o.currency)}</span>
                  {(o.status === "production" || o.status === "completed") && <ReorderButton orderId={o.id} action={reorderAction} size="sm" />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="text-sm text-ink-muted">
        Need a receipt? <Link href={ROUTES.account.invoices} className="text-accent hover:underline">Download invoices</Link>.
      </p>
    </div>
  );
}
