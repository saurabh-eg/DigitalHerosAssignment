import { describe, expect, it } from "vitest";
import { xeroCsv } from "@/modules/accounting/accounting.service";

const invoice = {
  id: "i1",
  invoiceNumber: "MR-INV-001001",
  orderNumber: "MR-001001",
  issuedOn: "2026-11-27",
  dueOn: "2026-11-27",
  currency: "GBP",
  contactName: "Ashdown Studio, Ltd",
  contactEmail: "jo@example.com",
  lines: [
    { description: "Custom Labels & Stickers, 75 × 50 mm", quantity: 100, unitAmountMinor: 35, accountCode: "200", taxType: "OUTPUT2" },
    { description: "Setup: Custom Labels & Stickers", quantity: 1, unitAmountMinor: 500, accountCode: "200", taxType: "OUTPUT2" },
  ],
};

describe("Xero CSV export", () => {
  const lines = xeroCsv([invoice]).trim().split("\r\n");

  it("uses Xero's import header with required columns starred", () => {
    expect(lines[0]).toBe("*ContactName,EmailAddress,*InvoiceNumber,Reference,*InvoiceDate,*DueDate,*Description,*Quantity,*UnitAmount,*AccountCode,*TaxType,Currency");
  });

  it("writes one row per line with UK dates, pounds and quoted commas", () => {
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe('"Ashdown Studio, Ltd",jo@example.com,MR-INV-001001,MR-001001,27/11/2026,27/11/2026,"Custom Labels & Stickers, 75 × 50 mm",100,0.35,200,OUTPUT2,GBP');
    expect(lines[2]).toContain(",1,5.00,200,OUTPUT2,GBP");
  });

  it("neutralises spreadsheet formulas in customer-supplied text", () => {
    const csv = xeroCsv([{ ...invoice, contactName: "=HYPERLINK(\"http://x\")" }]);
    expect(csv).toContain(`"'=HYPERLINK(""http://x"")"`);
  });
});
