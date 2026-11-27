import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { DateRange, InvoiceForExport } from "./accounting.types";

export async function listInvoices(range: DateRange): Promise<InvoiceForExport[]> {
  const { data, error } = await supabaseAdmin()
    .from("invoices")
    .select("id, invoice_number, issued_on, due_on, currency, contact_name, contact_email, orders(order_number), invoice_lines(description, quantity, unit_amount_minor, account_code, tax_type, sort_order)")
    .gte("issued_on", range.from)
    .lte("issued_on", range.to)
    .order("invoice_number");
  if (error) throw error;
  return data.map((i) => ({
    id: i.id,
    invoiceNumber: i.invoice_number,
    orderNumber: i.orders?.order_number ?? "",
    issuedOn: i.issued_on,
    dueOn: i.due_on,
    currency: i.currency,
    contactName: i.contact_name,
    contactEmail: i.contact_email,
    lines: [...i.invoice_lines]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((l) => ({ description: l.description, quantity: l.quantity, unitAmountMinor: l.unit_amount_minor, accountCode: l.account_code, taxType: l.tax_type })),
  }));
}

export async function markExported(invoiceIds: string[]): Promise<void> {
  if (invoiceIds.length === 0) return;
  const { error } = await supabaseAdmin().from("invoices").update({ exported_at: new Date().toISOString() }).in("id", invoiceIds);
  if (error) throw error;
}
