import "server-only";
import { AppError, HTTP_STATUS } from "@/lib/errors";
import { exportInvoices, providers } from "@/modules/accounting/accounting.service";
import { reportRangeSchema } from "./reports.validator";
import * as reportsService from "./reports.service";

function range(query: Record<string, string | string[] | undefined>) {
  const pick = (k: string) => (Array.isArray(query[k]) ? query[k]![0] : (query[k] as string | undefined));
  const parsed = reportRangeSchema.safeParse({ from: pick("from"), to: pick("to") });
  return parsed.success ? { ...parsed.data, error: null } : { ...reportRangeSchema.parse({}), error: parsed.error.issues[0].message };
}

export async function getReportPage(query: Record<string, string | string[] | undefined>) {
  const r = range(query);
  return {
    from: r.from,
    to: r.to,
    error: r.error,
    report: await reportsService.getReport(r.from, r.to),
    accounting: providers().map((p) => ({ id: p.id, label: p.label, enabled: p.enabled })),
  };
}

/** GET /admin/reports/xero?from&to → Xero sales-invoice CSV for the range. */
export async function xeroExport(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const r = range(Object.fromEntries(url.searchParams));
    if (r.error) return new Response(r.error, { status: 422 });
    const file = await exportInvoices({ from: r.from, to: r.to });
    return new Response(file.body, {
      headers: { "content-type": file.contentType, "content-disposition": `attachment; filename="${file.fileName}"`, "cache-control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof AppError) return new Response(error.message, { status: HTTP_STATUS[error.code] });
    throw error;
  }
}
