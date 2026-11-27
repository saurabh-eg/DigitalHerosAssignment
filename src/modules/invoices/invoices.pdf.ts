import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { ACCOUNTING_CONFIG, SITE_CONFIG, TAX_CONFIG } from "@/constants/site-config";
import { formatMoney } from "@/lib/money";

export type InvoiceDocument = {
  invoiceNumber: string;
  orderNumber: string;
  issuedOn: string;
  currency: string;
  contactName: string;
  contactEmail: string;
  vatNumber: string | null;
  address: string | null;
  lines: Array<{ description: string; quantity: number; unitAmountMinor: number; lineAmountMinor: number; taxMinor: number }>;
  netMinor: number;
  taxMinor: number;
  totalMinor: number;
};

const INK = rgb(0.1, 0.125, 0.19);
const MUTED = rgb(0.35, 0.38, 0.44);
const ACCENT = rgb(0.784, 0, 0.416);
const A4: [number, number] = [595.28, 841.89];
const MARGIN = 48;

/** Fits text into a column by trimming with an ellipsis (standard fonts have no wrapping). */
function clip(font: PDFFont, text: string, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && font.widthOfTextAtSize(`${out}...`, size) > maxWidth) out = out.slice(0, -1);
  return `${out}...`;
}

/** VAT invoice / receipt for a paid order (PRD §10 downloadable invoices). Uses built-in PDF fonts only. */
export async function renderInvoicePdf(invoice: InvoiceDocument): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Invoice ${invoice.invoiceNumber}`);
  doc.setProducer(SITE_CONFIG.name);
  const page: PDFPage = doc.addPage(A4);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  // The built-in Helvetica uses WinAnsi encoding, which includes £ and ×.
  const money = (minor: number) => formatMoney(minor, invoice.currency);
  let y = A4[1] - MARGIN;

  const text = (value: string, x: number, size = 10, font = regular, color = INK) => page.drawText(value, { x, y, size, font, color });
  const right = (value: string, xRight: number, size = 10, font = regular, color = INK) =>
    page.drawText(value, { x: xRight - font.widthOfTextAtSize(value, size), y, size, font, color });

  text(SITE_CONFIG.name, MARGIN, 20, bold);
  right("VAT INVOICE / RECEIPT", A4[0] - MARGIN, 11, bold, ACCENT);
  y -= 16;
  text(`by ${SITE_CONFIG.company}`, MARGIN, 9, regular, MUTED);
  y -= 36;

  const meta: Array<[string, string]> = [
    ["Invoice number", invoice.invoiceNumber],
    ["Order", invoice.orderNumber],
    ["Date", new Date(invoice.issuedOn).toLocaleDateString("en-GB", { dateStyle: "long" })],
    ["Status", "Paid in full by card"],
  ];
  const billTo = [invoice.contactName, invoice.contactEmail, invoice.address, invoice.vatNumber ? `VAT no. ${invoice.vatNumber}` : null].filter(Boolean) as string[];
  const top = y;
  for (const [label, value] of meta) {
    text(label, MARGIN, 9, regular, MUTED);
    text(value, MARGIN + 95, 9, bold);
    y -= 14;
  }
  y = top;
  text("Bill to", 330, 9, regular, MUTED);
  y -= 14;
  for (const line of billTo) {
    text(clip(regular, line, 9, A4[0] - MARGIN - 330), 330, 9);
    y -= 13;
  }
  y = Math.min(y, top - meta.length * 14) - 28;

  // Line items: Quantity × Unit = Line amount, VAT shown per line (Xero-shaped, D-018).
  const cols = { desc: MARGIN, qty: 340, unit: 420, amount: A4[0] - MARGIN };
  text("Description", cols.desc, 9, bold, MUTED);
  right("Qty", cols.qty + 20, 9, bold, MUTED);
  right("Unit", cols.unit + 30, 9, bold, MUTED);
  right("Amount", cols.amount, 9, bold, MUTED);
  y -= 8;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: A4[0] - MARGIN, y }, thickness: 0.5, color: MUTED });
  y -= 16;
  for (const line of invoice.lines) {
    text(clip(regular, line.description, 9, cols.qty - cols.desc - 30), cols.desc, 9);
    right(line.quantity.toLocaleString("en-GB"), cols.qty + 20, 9);
    right(money(line.unitAmountMinor), cols.unit + 30, 9);
    right(money(line.lineAmountMinor), cols.amount, 9);
    y -= 18;
  }
  y -= 4;
  page.drawLine({ start: { x: 330, y }, end: { x: A4[0] - MARGIN, y }, thickness: 0.5, color: MUTED });
  y -= 18;

  const totals: Array<[string, number, boolean]> = [
    ["Subtotal excluding VAT", invoice.netMinor, false],
    [`${TAX_CONFIG.label} at ${TAX_CONFIG.rateBps / 100}%`, invoice.taxMinor, false],
    ["Total paid", invoice.totalMinor, true],
  ];
  for (const [label, minor, strong] of totals) {
    text(label, 330, strong ? 11 : 9, strong ? bold : regular, strong ? INK : MUTED);
    right(money(minor), A4[0] - MARGIN, strong ? 11 : 9, strong ? bold : regular);
    y -= strong ? 20 : 16;
  }

  y = MARGIN + 24;
  text(`Prices include ${TAX_CONFIG.rateBps / 100}% ${TAX_CONFIG.label}. Account code ${ACCOUNTING_CONFIG.salesAccountCode}.`, MARGIN, 8, regular, MUTED);
  y -= 12;
  text(`${SITE_CONFIG.name} by ${SITE_CONFIG.company} · ${SITE_CONFIG.supportEmail}`, MARGIN, 8, regular, MUTED);

  return doc.save();
}
