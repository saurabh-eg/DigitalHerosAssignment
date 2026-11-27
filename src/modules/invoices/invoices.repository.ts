import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type InvoiceLineWrite = {
  description: string;
  quantity: number;
  unitAmountMinor: number;
  accountCode: string;
  taxType: string;
  lineAmountMinor: number;
  taxMinor: number;
};

export async function findInvoiceByOrder(orderId: string) {
  const { data, error } = await supabaseAdmin()
    .from("invoices")
    .select(
      "id, invoice_number, contact_name, contact_email, issued_on, due_on, currency, line_amount_type, net_minor, tax_minor, total_minor, invoice_lines(description, quantity, unit_amount_minor, account_code, tax_type, line_amount_minor, tax_minor, sort_order)",
    )
    .eq("order_id", orderId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertInvoice(row: {
  orderId: string;
  contactName: string;
  contactEmail: string;
  currency: string;
  netMinor: number;
  taxMinor: number;
  totalMinor: number;
  lines: InvoiceLineWrite[];
}): Promise<void> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("invoices")
    .insert({
      order_id: row.orderId,
      contact_name: row.contactName,
      contact_email: row.contactEmail,
      currency: row.currency,
      net_minor: row.netMinor,
      tax_minor: row.taxMinor,
      total_minor: row.totalMinor,
    })
    .select("id")
    .single();
  // Unique order_id: a concurrent fulfilment already created it.
  if (error?.code === "23505") return;
  if (error) throw error;
  const { error: linesError } = await db.from("invoice_lines").insert(
    row.lines.map((l, i) => ({
      invoice_id: data.id,
      description: l.description,
      quantity: l.quantity,
      unit_amount_minor: l.unitAmountMinor,
      account_code: l.accountCode,
      tax_type: l.taxType,
      line_amount_minor: l.lineAmountMinor,
      tax_minor: l.taxMinor,
      sort_order: i,
    })),
  );
  if (linesError) throw linesError;
}
