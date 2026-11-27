import "server-only";
import { serverEnv } from "@/config/env.server";
import { ROLE } from "@/constants/roles";
import { AppError } from "@/lib/errors";
import { requireRole } from "@/modules/auth/auth.service";
import * as repo from "./accounting.repository";
import type { AccountingProvider, DateRange, ExportFile, InvoiceForExport } from "./accounting.types";

// Xero's sales-invoice import template (required columns are starred). Amounts are VAT-inclusive, so the
// file must be imported with "Amounts are: Tax inclusive" (shown next to the export button).
const XERO_COLUMNS = ["*ContactName", "EmailAddress", "*InvoiceNumber", "Reference", "*InvoiceDate", "*DueDate", "*Description", "*Quantity", "*UnitAmount", "*AccountCode", "*TaxType", "Currency"];

function csvCell(value: string | number): string {
  const text = String(value);
  // Quote anything with separators/quotes, and neutralise spreadsheet formula injection.
  const safe = /^[=+\-@]/.test(text) && typeof value === "string" ? `'${text}` : text;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const ukDate = (iso: string) => iso.split("-").reverse().join("/");

/** One CSV row per invoice line; Xero groups rows into invoices by *InvoiceNumber. */
export function xeroCsv(invoices: InvoiceForExport[]): string {
  const rows = invoices.flatMap((inv) =>
    inv.lines.map((line) =>
      [
        inv.contactName,
        inv.contactEmail,
        inv.invoiceNumber,
        inv.orderNumber,
        ukDate(inv.issuedOn),
        ukDate(inv.dueOn),
        line.description,
        line.quantity,
        (line.unitAmountMinor / 100).toFixed(2),
        line.accountCode,
        line.taxType,
        inv.currency,
      ]
        .map(csvCell)
        .join(","),
    ),
  );
  return [XERO_COLUMNS.join(","), ...rows].join("\r\n") + "\r\n";
}

const csvProvider: AccountingProvider = {
  id: "xero-csv",
  label: "Xero CSV import",
  enabled: true,
  async exportInvoices(range: DateRange): Promise<ExportFile> {
    const invoices = await repo.listInvoices(range);
    return {
      fileName: `xero-invoices-${range.from}-to-${range.to}.csv`,
      contentType: "text/csv; charset=utf-8",
      body: xeroCsv(invoices),
      invoiceIds: invoices.map((i) => i.id),
    };
  },
};

/**
 * Placeholder for the direct Xero API integration (PRD §14). Switching it on needs a Xero OAuth 2.0 app
 * (client id/secret, tenant id, refresh-token storage) and would POST the same invoice shape to
 * /api.xro/2.0/Invoices with LineAmountTypes "Inclusive".
 */
const xeroApiProvider: AccountingProvider = {
  id: "xero-api",
  label: "Xero API (direct)",
  get enabled() {
    return serverEnv().FEATURE_XERO_API;
  },
  async exportInvoices(): Promise<ExportFile> {
    throw new AppError("CONFLICT", "The direct Xero API integration isn't configured yet. Use the CSV export.");
  },
};

export function providers(): AccountingProvider[] {
  return [csvProvider, xeroApiProvider];
}

export async function exportInvoices(range: DateRange): Promise<ExportFile> {
  await requireRole(ROLE.ADMIN);
  const file = await csvProvider.exportInvoices(range);
  await repo.markExported(file.invoiceIds);
  return file;
}
