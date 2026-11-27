import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, FilesBadge, StatusBadge } from "@/components/admin/action-form";
import { LinePreview } from "@/components/orders/line-preview";
import { PipelineTracker } from "@/components/orders/pipeline-tracker";
import { ORDER_STATUS_LABEL } from "@/constants/pipeline";
import { ROUTES } from "@/constants/routes";
import { formatMoney } from "@/lib/money";
import * as ordersController from "@/modules/orders/orders.controller";
import { adminTransitionAction, resumeFulfilmentAction, retryPrintJobAction, setArchivedAction } from "../../actions";

export const metadata: Metadata = { title: "Job" };

const KIND_LABEL: Record<string, string> = {
  print_pdf: "Print PDF (vector, with bleed)",
  print_png: "Print PNG",
  merged_pdf: "Merged PDF (all rows)",
  row_pdf: "Row PDF",
  original: "Original upload (needs preflight)",
};
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
const size = (bytes: number | null) => (bytes ? `${Math.max(1, Math.round(bytes / 1024))} KB` : "");

export default async function JobPage({ params }: PageProps<"/admin/jobs/[id]">) {
  const { id } = await params;
  const { order, contact, history, proofs, details, jobs, files, invoice } = await ordersController.getJobDetail(id);
  const stuck = order.status === "order" || (order.status === "artwork" && !history.some((h) => h.toStatus === "proof"));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link href={ROUTES.admin.jobs} className="text-sm text-ink-muted hover:text-ink">
          Job database
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold">{order.orderNumber}</h1>
          <StatusBadge status={order.status} label={ORDER_STATUS_LABEL[order.status]} />
          <FilesBadge ready={order.filesReady} status={order.status} />
          {order.reorderOf && <span className="text-sm text-accent">Reorder</span>}
          {order.archivedAt && <span className="text-sm text-ink-muted">Archived {when(order.archivedAt)}</span>}
        </div>
        <PipelineTracker status={order.status} />
      </header>

      <section className="flex flex-wrap gap-6 rounded-[var(--radius-card)] border border-line bg-surface p-4">
        {order.status === "production" && (
          <ActionForm action={adminTransitionAction} hidden={{ orderId: order.id, to: "completed" }} label="Mark complete" variant="primary" />
        )}
        {(order.status === "completed" || order.status === "cancelled") && (
          <ActionForm action={setArchivedAction} hidden={{ orderId: order.id, archive: order.archivedAt ? "false" : "true" }} label={order.archivedAt ? "Restore from archive" : "Archive"} />
        )}
        {stuck && order.placedAt && (
          <ActionForm action={resumeFulfilmentAction} hidden={{ orderId: order.id }} label="Re-run post-payment steps" pendingLabel="Running…" />
        )}
        {invoice && (
          <a href={ROUTES.account.invoice(order.id)} className="inline-flex h-9 items-center self-start rounded-full border border-line px-4 text-sm font-medium hover:border-ink">
            Invoice {invoice.invoice_number}
          </a>
        )}
        {order.status !== "completed" && order.status !== "cancelled" && order.status !== "quote" && (
          <details className="ml-auto self-start text-sm">
            <summary className="cursor-pointer text-danger">Cancel order…</summary>
            <ActionForm action={adminTransitionAction} hidden={{ orderId: order.id, to: "cancelled" }} label="Cancel order" variant="secondary" confirm="Yes, cancel this order (refunds are made in Stripe)" className="mt-2">
              <input name="note" placeholder="Reason (optional)" className="h-9 w-64 rounded-md border border-line px-2.5 text-sm" maxLength={300} />
            </ActionForm>
          </details>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold">Lines, artwork and configuration</h2>
            {order.items.map((item) => {
              const d = details[item.id];
              const itemProofs = proofs.filter((p) => p.orderItemId === item.id).sort((a, b) => b.version - a.version);
              const job = jobs.find((j) => j.order_item_id === item.id);
              return (
                <article key={item.id} className="grid gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4 md:grid-cols-[12rem_1fr]">
                  <LinePreview preview={d?.preview ?? null} />
                  <div className="flex flex-col gap-2 text-sm">
                    <h3 className="font-display text-lg font-semibold">{item.productName}</h3>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
                      <dt className="text-ink-muted">Size</dt>
                      <dd>
                        {item.configuration.widthMm} × {item.configuration.heightMm} mm, {item.configuration.orientation}
                      </dd>
                      <dt className="text-ink-muted">Material</dt>
                      <dd>{d?.materialName ?? "—"}</dd>
                      <dt className="text-ink-muted">Quantity</dt>
                      <dd>
                        {item.quantity.toLocaleString("en-GB")}
                        {item.csvDatasetId && " (one per spreadsheet row)"}
                      </dd>
                      <dt className="text-ink-muted">Design</dt>
                      <dd>v{item.designVersion}{item.reorderOfItemId && ", reused from an earlier order"}</dd>
                      <dt className="text-ink-muted">Line total</dt>
                      <dd>
                        {formatMoney(item.lineTotalMinor, order.currency)} ({formatMoney(item.unitPriceMinor, order.currency)} each
                        {item.setupFeeMinor ? ` + ${formatMoney(item.setupFeeMinor, order.currency)} setup` : ""})
                      </dd>
                    </dl>
                    <div>
                      <p className="font-medium">Proofs</p>
                      {itemProofs.length === 0 ? (
                        <p className="text-ink-muted">None yet.</p>
                      ) : (
                        <ul className="text-ink-muted">
                          {itemProofs.map((p) => (
                            <li key={p.id}>
                              v{p.version} ({p.status.replace("_", " ")}) from design v{p.designVersion}
                              {p.previewUrl && (
                                <a href={p.previewUrl} target="_blank" rel="noreferrer" className="ml-2 text-accent underline underline-offset-2">
                                  view
                                </a>
                              )}
                              {p.events.filter((e) => e.event !== "issued").map((e, i) => (
                                <span key={i} className="block pl-3 text-xs">
                                  {e.event.replace("_", " ")}
                                  {e.actorName ? ` by ${e.actorName}` : ""}, {when(e.createdAt)}
                                  {e.comment && `: “${e.comment}”`}
                                </span>
                              ))}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {job && (
                      <div className="flex flex-wrap items-center gap-3">
                        <p>
                          <span className="font-medium">Print job:</span> {job.status}
                          {job.progress_total > 1 && ` (${job.progress_done}/${job.progress_total} rows)`}
                          {job.error && <span className="block text-xs text-danger">{job.error}</span>}
                        </p>
                        {(job.status === "failed" || job.status === "queued") && (
                          <ActionForm action={retryPrintJobAction} hidden={{ jobId: job.id, orderId: order.id }} label={job.status === "failed" ? "Retry" : "Run now"} />
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-xl font-semibold">Production files</h2>
              {files.length > 0 && (
                <a href={ROUTES.admin.jobZip(order.id)} className="inline-flex h-9 items-center rounded-full bg-ink px-4 text-sm font-medium text-surface hover:bg-ink/90">
                  Download all ({files.length}) as ZIP
                </a>
              )}
            </div>
            {files.length === 0 ? (
              <p className="text-sm text-ink-muted">
                {order.status === "production" || order.status === "completed"
                  ? "Being generated. They appear here when the print queue finishes."
                  : "Locked until every proof is approved."}
              </p>
            ) : (
              <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface text-sm">
                {files.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                    <span>
                      <span className="font-medium">{f.fileName}</span>
                      <span className="block text-xs text-ink-muted">
                        {KIND_LABEL[f.kind] ?? f.kind}
                        {f.row_index ? ` ${f.row_index}` : ""}, {size(f.size_bytes)}
                      </span>
                    </span>
                    <a href={ROUTES.admin.jobFile(order.id, f.id)} className="text-accent hover:underline">
                      Download
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-[var(--radius-card)] border border-line bg-surface p-4 text-sm">
            <h2 className="mb-2 font-semibold">Customer</h2>
            <p>{contact.full_name ?? "—"}</p>
            {contact.company_name && <p>{contact.company_name}</p>}
            <p className="break-all text-ink-muted">{contact.email}</p>
            {contact.vat_number && <p className="text-ink-muted">VAT {contact.vat_number}</p>}
            <h3 className="mt-3 font-semibold">{order.deliveryMethod === "collection" ? "Collection" : "Delivery"}</h3>
            {order.shippingAddress ? (
              <address className="not-italic text-ink-muted">
                {order.shippingAddress.name}
                <br />
                {order.shippingAddress.line1}
                {order.shippingAddress.line2 && (
                  <>
                    <br />
                    {order.shippingAddress.line2}
                  </>
                )}
                <br />
                {order.shippingAddress.city} {order.shippingAddress.postcode}
              </address>
            ) : (
              <p className="text-ink-muted">Customer collects from the workshop.</p>
            )}
          </section>
          <section className="rounded-[var(--radius-card)] border border-line bg-surface p-4 text-sm">
            <h2 className="mb-2 font-semibold">Payment</h2>
            <dl className="grid grid-cols-[1fr_auto] gap-y-1">
              <dt className="text-ink-muted">Items</dt>
              <dd>{formatMoney(order.itemsTotalMinor, order.currency)}</dd>
              <dt className="text-ink-muted">Delivery</dt>
              <dd>{formatMoney(order.deliveryMinor, order.currency)}</dd>
              <dt className="font-medium">Total</dt>
              <dd className="font-medium">{formatMoney(order.totalMinor, order.currency)}</dd>
              <dt className="text-ink-muted">VAT</dt>
              <dd className="text-ink-muted">{formatMoney(order.taxMinor, order.currency)}</dd>
            </dl>
          </section>
          <section className="rounded-[var(--radius-card)] border border-line bg-surface p-4 text-sm">
            <h2 className="mb-2 font-semibold">Timeline</h2>
            <ol className="flex flex-col gap-2 border-l border-line pl-3">
              {history.map((h, i) => (
                <li key={i}>
                  <span className="font-medium">{ORDER_STATUS_LABEL[h.toStatus]}</span> <span className="text-xs text-ink-muted">{when(h.createdAt)}</span>
                  {h.note && <span className="block text-xs text-ink-muted">{h.note}</span>}
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
