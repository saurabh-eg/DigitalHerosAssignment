export type DateRange = { from: string; to: string };

export type ExportFile = { fileName: string; contentType: string; body: string; invoiceIds: string[] };

/**
 * PRD §14 accounting integration path (D-018). The CSV provider is live; the Xero API provider implements
 * the same contract and is switched on with FEATURE_XERO_API once OAuth credentials exist.
 */
export interface AccountingProvider {
  readonly id: "xero-csv" | "xero-api";
  readonly label: string;
  readonly enabled: boolean;
  exportInvoices(range: DateRange): Promise<ExportFile>;
}

export type InvoiceForExport = {
  id: string;
  invoiceNumber: string;
  orderNumber: string;
  issuedOn: string;
  dueOn: string;
  currency: string;
  contactName: string;
  contactEmail: string;
  lines: Array<{ description: string; quantity: number; unitAmountMinor: number; accountCode: string; taxType: string }>;
};
