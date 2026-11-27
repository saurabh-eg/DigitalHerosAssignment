import Link from "next/link";
import { FilesBadge, StatusBadge } from "@/components/admin/action-form";
import { ORDER_STATUS_LABEL, PIPELINE_STAGES } from "@/constants/pipeline";
import { ROUTES } from "@/constants/routes";
import { formatMoney } from "@/lib/money";
import type { JobRow } from "../orders.repository";
import type { JobSearch } from "../orders.validator";

const input = "h-10 rounded-md border border-line bg-surface px-2.5 text-sm focus:border-ink focus:outline-none";

/** GET form: filters live in the URL, so searches can be bookmarked and shared between staff. */
export function JobFilters({ filters, divisions, basePath }: { filters: JobSearch; divisions: Array<{ slug: string; name: string }>; basePath: string }) {
  return (
    <form method="get" action={basePath} className="grid gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] lg:items-end">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Order number, customer or company</span>
        <input name="q" defaultValue={filters.q ?? ""} placeholder="MR-001001 or jane@…" className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Status</span>
        <select name="status" defaultValue={filters.status ?? ""} className={input}>
          <option value="">Any (except quotes)</option>
          {[...PIPELINE_STAGES, "cancelled" as const].map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Product family</span>
        <select name="division" defaultValue={filters.division ?? ""} className={input}>
          <option value="">All</option>
          {divisions.map((d) => (
            <option key={d.slug} value={d.slug}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Placed from</span>
        <input type="date" name="from" defaultValue={filters.from ?? ""} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Placed to</span>
        <input type="date" name="to" defaultValue={filters.to ?? ""} className={input} />
      </label>
      <div className="flex gap-2">
        <button type="submit" className="h-10 rounded-full bg-ink px-5 text-sm font-medium text-surface hover:bg-ink/90">
          Search
        </button>
        <Link href={basePath} className="inline-flex h-10 items-center rounded-full px-3 text-sm text-ink-muted hover:text-ink">
          Clear
        </Link>
      </div>
    </form>
  );
}

export function JobTable({ rows, total, filters, basePath }: { rows: JobRow[]; total: number; filters: JobSearch; basePath: string }) {
  const pages = Math.max(1, Math.ceil(total / filters.pageSize));
  const pageHref = (page: number) => {
    const params = new URLSearchParams(Object.entries({ ...filters, page: String(page) }).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]));
    return `${basePath}?${params.toString()}`;
  };

  if (rows.length === 0) return <p className="rounded-[var(--radius-card)] border border-dashed border-line p-6 text-ink-muted">No jobs match these filters.</p>;

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-surface">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-line text-left text-ink-muted">
            <tr>
              <th className="p-3 font-medium">Order</th>
              <th className="p-3 font-medium">Customer</th>
              <th className="p-3 font-medium">Products</th>
              <th className="p-3 font-medium">Placed</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Production files</th>
              <th className="p-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((j) => (
              <tr key={j.id} className="hover:bg-paper">
                <td className="p-3">
                  <Link href={ROUTES.admin.job(j.id)} className="font-medium hover:text-accent">
                    {j.orderNumber}
                  </Link>
                  {j.isReorder && <span className="ml-1.5 text-xs text-accent">reorder</span>}
                </td>
                <td className="max-w-[14rem] p-3">
                  <span className="block truncate">{j.companyName ?? j.customerName ?? "—"}</span>
                  <span className="block truncate text-xs text-ink-muted">{j.customerEmail}</span>
                </td>
                <td className="p-3">
                  {j.productTypes.join(", ")} <span className="text-ink-muted">({j.units.toLocaleString("en-GB")})</span>
                </td>
                <td className="p-3 whitespace-nowrap">{j.placedAt ? new Date(j.placedAt).toLocaleDateString("en-GB", { dateStyle: "medium" }) : "—"}</td>
                <td className="p-3">
                  <StatusBadge status={j.status} label={ORDER_STATUS_LABEL[j.status]} />
                  {j.archivedAt && <span className="ml-1.5 text-xs text-ink-muted">archived</span>}
                </td>
                <td className="p-3">
                  <FilesBadge ready={j.filesReady} status={j.status} />
                </td>
                <td className="p-3 text-right font-medium">{formatMoney(j.totalMinor, j.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav aria-label="Pagination" className="flex items-center justify-between text-sm text-ink-muted">
        <span>
          {total.toLocaleString("en-GB")} {total === 1 ? "job" : "jobs"}, page {filters.page} of {pages}
        </span>
        <span className="flex gap-2">
          {filters.page > 1 && (
            <Link href={pageHref(filters.page - 1)} className="rounded-full border border-line px-3 py-1.5 hover:border-ink">
              Previous
            </Link>
          )}
          {filters.page < pages && (
            <Link href={pageHref(filters.page + 1)} className="rounded-full border border-line px-3 py-1.5 hover:border-ink">
              Next
            </Link>
          )}
        </span>
      </nav>
    </div>
  );
}
