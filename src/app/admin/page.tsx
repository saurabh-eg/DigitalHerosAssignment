import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, FilesBadge, StatusBadge } from "@/components/admin/action-form";
import { ORDER_STATUS_LABEL } from "@/constants/pipeline";
import { ROUTES } from "@/constants/routes";
import { formatMoney } from "@/lib/money";
import * as ordersController from "@/modules/orders/orders.controller";
import { runPrintQueueAction } from "./actions";

export const metadata: Metadata = { title: "Production console" };

function Stat({ label, value, href }: { label: string; value: string | number; href?: string }) {
  const body = (
    <>
      <p className="font-display text-3xl font-semibold">{value}</p>
      <p className="text-sm text-ink-muted">{label}</p>
    </>
  );
  return href ? (
    <Link href={href} className="rounded-[var(--radius-card)] border border-line bg-surface p-4 hover:border-ink">
      {body}
    </Link>
  ) : (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4">{body}</div>
  );
}

export default async function AdminOverviewPage() {
  const [{ counts }, queue, recent] = await Promise.all([
    ordersController.pipelineBoard(1),
    ordersController.queueStatus(),
    ordersController.searchJobs({ pageSize: "8" }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold">Production console</h1>
        <p className="mt-1 text-ink-muted">Every job, quote to completed, in one place.</p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Waiting for customer approval" value={counts.proof ?? 0} href={`${ROUTES.admin.jobs}?status=proof`} />
        <Stat label="Waiting for revised artwork" value={counts.artwork ?? 0} href={`${ROUTES.admin.jobs}?status=artwork`} />
        <Stat label="In production" value={counts.production ?? 0} href={`${ROUTES.admin.jobs}?status=production`} />
        <Stat label="Open baskets (quotes)" value={counts.quote ?? 0} />
      </section>

      <section className="flex flex-wrap items-start justify-between gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <div>
          <h2 className="text-lg font-semibold">Print queue</h2>
          <p className="text-sm text-ink-muted">
            {queue.queued} queued, {queue.running} running, {queue.succeeded} done
            {queue.failed > 0 && <span className="font-medium text-danger">, {queue.failed} failed</span>}
          </p>
        </div>
        <ActionForm action={runPrintQueueAction} label="Run print queue now" pendingLabel="Starting…" />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Latest jobs</h2>
          <Link href={ROUTES.admin.jobs} className="text-sm text-accent hover:underline">
            Job database
          </Link>
        </div>
        <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
          {recent.rows.map((j) => (
            <li key={j.id}>
              <Link prefetch={false} href={ROUTES.admin.job(j.id)} className="grid gap-2 p-3 text-sm hover:bg-paper sm:grid-cols-[7rem_1fr_auto_auto_6rem] sm:items-center">
                <span className="font-medium">{j.orderNumber}</span>
                <span className="truncate text-ink-muted">{j.customerName ?? j.customerEmail}</span>
                <StatusBadge status={j.status} label={ORDER_STATUS_LABEL[j.status]} />
                <FilesBadge ready={j.filesReady} status={j.status} />
                <span className="text-right">{formatMoney(j.totalMinor, j.currency)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
