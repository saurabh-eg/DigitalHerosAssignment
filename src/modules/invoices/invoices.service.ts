import "server-only";
import { ACCOUNTING_CONFIG, TAX_CONFIG } from "@/constants/site-config";
import { getProductById, getTaxSettings } from "@/modules/catalogue/catalogue.service";
import * as ordersRepository from "@/modules/orders/orders.repository";
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
