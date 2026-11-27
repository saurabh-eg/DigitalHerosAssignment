import "server-only";
import { z } from "zod";
import { AppError, HTTP_STATUS } from "@/lib/errors";
import * as invoicesService from "./invoices.service";

export const listMyInvoices = invoicesService.listMyInvoices;

/** GET /account/invoices/[orderId] — downloads the invoice PDF. */
export async function download(orderId: string): Promise<Response> {
  if (!z.uuid().safeParse(orderId).success) return new Response("Not found", { status: 404 });
  try {
    const { fileName, bytes } = await invoicesService.invoicePdf(orderId);
    return new Response(Buffer.from(bytes), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${fileName}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof AppError) return new Response(error.message, { status: HTTP_STATUS[error.code] });
    throw error;
  }
}
