import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { ORDER_STATUS_LABEL, PIPELINE_STAGES, type OrderStatus } from "@/constants/pipeline";
import { ROUTES } from "@/constants/routes";
import { formatMoney } from "@/lib/money";
import { DailyRevenueChart } from "@/modules/reports/components/daily-revenue-chart";
import * as reportsController from "@/modules/reports/reports.controller";

export const metadata: Metadata = { title: "Reports" };

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
      <p className="font-display text-3xl font-semibold">{value}</p>
      <p className="text-sm text-ink-muted">{label}</p>
      {note && <p className="mt-1 text-xs text-ink-muted">{note}</p>}
    </div>
  );
}

/** PRD §11 reports & analytics: orders, revenue and product-family throughput. */
export default async function ReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  const { from, to, error, report, accounting } = await reportsController.getReportPage(await searchParams);
  const aov = report.orders ? Math.round(report.revenue_minor / report.orders) : 0;
  const maxDivision = Math.max(1, ...report.by_division.map((d) => d.revenue_minor));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="mt-1 text-ink-muted">Paid orders placed in the selected range.</p>
        </div>
        <form method="get" className="flex flex-wrap items-end gap-2 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-ink-muted">From</span>
            <input type="date" name="from" defaultValue={from} className="h-9 rounded-md border border-line bg-surface px-2" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-ink-muted">To</span>
            <input type="date" name="to" defaultValue={to} className="h-9 rounded-md border border-line bg-surface px-2" />
          </label>
          <button type="submit" className="h-9 rounded-full bg-ink px-4 font-medium text-surface">
            Update
          </button>
        </form>
      </header>
      {error && <Alert tone="error">{error} Showing the last 30 days.</Alert>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Orders" value={report.orders.toLocaleString("en-GB")} note={report.reorders ? `${report.reorders} reorders` : undefined} />
        <Tile label="Revenue (incl. VAT)" value={formatMoney(report.revenue_minor)} note={`VAT ${formatMoney(report.tax_minor)}`} />
        <Tile label="Average order" value={formatMoney(aov)} />
        <Tile label="Items produced" value={report.units.toLocaleString("en-GB")} />
      </section>

      <section className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
        <h2 className="mb-2 text-lg font-semibold">Revenue over time</h2>
        {report.orders === 0 ? <p className="text-sm text-ink-muted">No paid orders in this range.</p> : <DailyRevenueChart from={from} to={to} days={report.daily} />}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <section className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
          <h2 className="mb-3 text-lg font-semibold">Throughput by product family</h2>
          {report.by_division.length === 0 ? (
            <p className="text-sm text-ink-muted">Nothing produced in this range.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-ink-muted">
                <tr>
                  <th className="pb-2 font-medium">Family</th>
                  <th className="pb-2 text-right font-medium">Orders</th>
                  <th className="pb-2 text-right font-medium">Items</th>
                  <th className="w-2/5 pb-2 pl-4 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {report.by_division.map((d) => (
                  <tr key={d.slug} className="border-t border-line">
                    <td className="py-2">{d.name}</td>
                    <td className="py-2 text-right">{d.orders}</td>
                    <td className="py-2 text-right">{Number(d.units).toLocaleString("en-GB")}</td>
                    <td className="py-2 pl-4">
                      <span className="flex items-center gap-2">
                        <span className="h-2 rounded-r-[4px] bg-ink/80" style={{ width: `${(d.revenue_minor / maxDivision) * 70}%` }} aria-hidden />
                        <span className="whitespace-nowrap">{formatMoney(d.revenue_minor)}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4 text-sm">
            <h2 className="mb-2 text-lg font-semibold">Where they are now</h2>
            <dl className="grid grid-cols-[1fr_auto] gap-y-1">
              {[...PIPELINE_STAGES, "cancelled" as const]
                .filter((s) => report.by_status[s])
                .map((s) => [s, report.by_status[s]] as const)
                .map(([status, n]) => (
                <div key={status} className="contents">
                  <dt className="text-ink-muted">{ORDER_STATUS_LABEL[status as OrderStatus] ?? status}</dt>
                  <dd>{n}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4 text-sm">
            <h2 className="mb-1 text-lg font-semibold">Accounting export</h2>
            <p className="mb-3 text-ink-muted">
              Invoices issued in this range, in Xero&apos;s sales-invoice import format. Import with &ldquo;Amounts are tax inclusive&rdquo;.
            </p>
            <a
              href={`${ROUTES.admin.xeroExport}?from=${from}&to=${to}`}
              className="inline-flex h-9 items-center rounded-full bg-ink px-4 font-medium text-surface hover:bg-ink/90"
              download
            >
              Download Xero CSV
            </a>
            <ul className="mt-3 text-xs text-ink-muted">
              {accounting.map((p) => (
                <li key={p.id}>
                  {p.label}: {p.enabled ? "on" : "ready to switch on (FEATURE_XERO_API)"}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
