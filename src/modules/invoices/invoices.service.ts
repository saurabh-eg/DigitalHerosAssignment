import "server-only";
import { ACCOUNTING_CONFIG, TAX_CONFIG } from "@/constants/site-config";
import { getProductById, getTaxSettings } from "@/modules/catalogue/catalogue.service";
import { notFound } from "@/lib/errors";
import * as ordersRepository from "@/modules/orders/orders.repository";
import { getOrderForUser, listMyOrders } from "@/modules/orders/orders.service";
import { renderInvoicePdf } from "./invoices.pdf";
import type { Order } from "@/modules/orders/orders.types";
import { applyTax } from "@/modules/pricing/pricing.engine";
import * as invoicesRepository from "./invoices.repository";

/**
 * Writes the Xero-shaped invoice for a paid order (PRD §05, D-018). Lines keep Quantity × UnitAmount =
 * LineAmount exactly, so the volume-discounted unit price and the setup fee are separate lines.
 * Idempotent: a second call for the same order does nothing.
 */
export async function createInvoiceForOrder(order: Order): Promise<void> {
  if (await invoicesRepository.findInvoiceByOrder(order.id)) return;
  const [contact, tax] = await Promise.all([ordersRepository.findCustomerContact(order.customerId), getTaxSettings()]);

  const lines: invoicesRepository.InvoiceLineWrite[] = [];
  const addLine = (description: string, quantity: number, unitAmountMinor: number, accountCode: string) => {
    const lineAmountMinor = quantity * unitAmountMinor;
    lines.push({
      description,
      quantity,
      unitAmountMinor,
      accountCode,
      taxType: TAX_CONFIG.xeroTaxType,
      lineAmountMinor,
      taxMinor: applyTax(lineAmountMinor, tax).taxMinor,
    });
  };

  for (const item of order.items) {
    const product = await getProductById(item.productId);
    const material = product?.materials.find((m) => m.id === item.configuration.materialId)?.name;
    const size = `${item.configuration.widthMm} × ${item.configuration.heightMm} mm`;
    addLine([item.productName, size, material].filter(Boolean).join(", "), item.quantity, item.unitPriceMinor, ACCOUNTING_CONFIG.salesAccountCode);
    if (item.setupFeeMinor > 0) addLine(`Setup: ${item.productName}`, 1, item.setupFeeMinor, ACCOUNTING_CONFIG.salesAccountCode);
  }
  if (order.deliveryMinor > 0) addLine("Delivery", 1, order.deliveryMinor, ACCOUNTING_CONFIG.deliveryAccountCode);

  const totalMinor = lines.reduce((s, l) => s + l.lineAmountMinor, 0);
  const taxMinor = lines.reduce((s, l) => s + l.taxMinor, 0);
  await invoicesRepository.insertInvoice({
    orderId: order.id,
    contactName: contact.company_name || contact.full_name || contact.email,
    contactEmail: contact.email,
    currency: order.currency,
    netMinor: totalMinor - taxMinor,
    taxMinor,
    totalMinor,
    lines,
  });
}

export const findInvoiceByOrder = invoicesRepository.findInvoiceByOrder;

/** Invoices for the signed-in customer's paid orders, newest first. */
export async function listMyInvoices() {
  const orders = await listMyOrders();
  const invoices = await Promise.all(
    orders.map(async (o) => {
      const invoice = await invoicesRepository.findInvoiceByOrder(o.id);
      return invoice ? { orderId: o.id, orderNumber: o.orderNumber, invoiceNumber: invoice.invoice_number, issuedOn: invoice.issued_on, totalMinor: invoice.total_minor, currency: invoice.currency } : null;
    }),
  );
  return invoices.filter((i) => i !== null);
}

/** PDF of an invoice the current user may see (their own organization's, or any for an admin). */
export async function invoicePdf(orderId: string): Promise<{ fileName: string; bytes: Uint8Array }> {
  const order = await getOrderForUser(orderId);
  const invoice = await invoicesRepository.findInvoiceByOrder(order.id);
  if (!invoice) throw notFound("There is no invoice for this order yet.");
  const contact = await ordersRepository.findCustomerContact(order.customerId);
  const a = order.shippingAddress;
  const bytes = await renderInvoicePdf({
    invoiceNumber: invoice.invoice_number,
    orderNumber: order.orderNumber,
    issuedOn: invoice.issued_on,
    currency: invoice.currency,
    contactName: invoice.contact_name,
    contactEmail: invoice.contact_email,
    vatNumber: contact.vat_number,
    address: a ? [a.line1, a.line2, a.city, a.postcode].filter(Boolean).join(", ") : null,
    lines: [...invoice.invoice_lines]
      .sort((x, y) => x.sort_order - y.sort_order)
      .map((l) => ({ description: l.description, quantity: l.quantity, unitAmountMinor: l.unit_amount_minor, lineAmountMinor: l.line_amount_minor, taxMinor: l.tax_minor })),
    netMinor: invoice.net_minor,
    taxMinor: invoice.tax_minor,
    totalMinor: invoice.total_minor,
  });
  return { fileName: `${invoice.invoice_number}.pdf`, bytes };
}
