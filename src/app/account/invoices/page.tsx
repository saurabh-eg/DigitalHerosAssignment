import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { formatMoney } from "@/lib/money";
import * as invoicesController from "@/modules/invoices/invoices.controller";

export const metadata: Metadata = { title: "Invoices" };

export default async function InvoicesPage() {
  const invoices = await invoicesController.listMyInvoices();
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold">Invoices and receipts</h1>
        <p className="mt-1 text-ink-muted">VAT invoices for every paid order, as PDF.</p>
      </header>
      {invoices.length === 0 ? (
        <p className="text-ink-muted">Invoices appear here once an order is paid.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
          {invoices.map((inv) => (
            <li key={inv.invoiceNumber} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <div>
                <p className="font-medium">{inv.invoiceNumber}</p>
                <p className="text-ink-muted">
                  <Link href={ROUTES.account.order(inv.orderId)} className="hover:text-ink">
                    Order {inv.orderNumber}
                  </Link>
                  , {new Date(inv.issuedOn).toLocaleDateString("en-GB", { dateStyle: "medium" })}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-semibold">{formatMoney(inv.totalMinor, inv.currency)}</span>
                <a href={ROUTES.account.invoice(inv.orderId)} className="inline-flex h-9 items-center rounded-full border border-line px-4 font-medium hover:border-ink" download>
                  Download PDF
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
