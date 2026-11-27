import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, FilesBadge } from "@/components/admin/action-form";
import { ORDER_STATUS_LABEL } from "@/constants/pipeline";
import { ROUTES } from "@/constants/routes";
import { formatMoney } from "@/lib/money";
import * as ordersController from "@/modules/orders/orders.controller";
import { adminTransitionAction } from "../actions";

export const metadata: Metadata = { title: "Pipeline" };

const HINT: Record<string, string> = {
  order: "Paid; invoice and proofs being prepared",
  artwork: "Waiting for the customer's revision",
  proof: "Waiting for the customer's approval",
  production: "Approved; print files generated",
  completed: "Finished",
};

const age = (iso: string | null) => {
  if (!iso) return "";
  const hours = Math.round((Date.now() - Date.parse(iso)) / 3_600_000);
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
};

/** PRD §11 pipeline: QUOTE → ORDER → ARTWORK → PROOF → PRODUCTION → COMPLETED. */
export default async function PipelinePage() {
  const { columns, openQuotes, counts } = await ordersController.pipelineBoard(15);
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold">Pipeline</h1>
        <p className="mt-1 text-ink-muted">
          {openQuotes} open {openQuotes === 1 ? "basket" : "baskets"} at the quote stage. Proof approval moves jobs into production
          automatically; staff complete them once printed.
        </p>
      </header>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {columns.map((col) => (
          <section key={col.status} className="flex w-64 shrink-0 flex-col gap-2 rounded-[var(--radius-card)] bg-[#e2e5ea] p-2">
            <header className="px-1 pt-1">
              <h2 className="font-display font-semibold">
                {ORDER_STATUS_LABEL[col.status]} <span className="font-sans text-sm font-normal text-ink-muted">{counts[col.status] ?? 0}</span>
              </h2>
              <p className="text-xs text-ink-muted">{HINT[col.status]}</p>
            </header>
            {col.rows.length === 0 && <p className="px-1 py-3 text-sm text-ink-muted">Nothing here.</p>}
            {col.rows.map((j) => (
              <article key={j.id} className="flex flex-col gap-1.5 rounded-md bg-surface p-3 text-sm shadow-[0_1px_0_var(--color-line)]">
                <Link href={ROUTES.admin.job(j.id)} className="flex items-baseline justify-between gap-2 hover:text-accent">
                  <span className="font-semibold">{j.orderNumber}</span>
                  <span className="text-xs text-ink-muted">{age(j.placedAt)}</span>
                </Link>
                <p className="truncate text-ink-muted">{j.companyName ?? j.customerName ?? j.customerEmail}</p>
                <p className="truncate">
                  {j.units.toLocaleString("en-GB")} × {j.productTypes.join(", ")}
                  {j.isReorder && <span className="ml-1 text-xs text-accent">reorder</span>}
                </p>
                <div className="flex items-center justify-between">
                  <FilesBadge ready={j.filesReady} status={j.status} />
                  <span className="font-medium">{formatMoney(j.totalMinor, j.currency)}</span>
                </div>
                {col.status === "production" && j.filesReady && (
                  <ActionForm action={adminTransitionAction} hidden={{ orderId: j.id, to: "completed" }} label="Mark complete" />
                )}
              </article>
            ))}
            {(counts[col.status] ?? 0) > col.rows.length && (
              <Link href={`${ROUTES.admin.jobs}?status=${col.status}`} className="px-1 py-1 text-sm text-accent hover:underline">
                See all {counts[col.status]}
              </Link>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
