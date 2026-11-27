import * as invoicesController from "@/modules/invoices/invoices.controller";

export async function GET(_request: Request, { params }: RouteContext<"/account/invoices/[orderId]">) {
  const { orderId } = await params;
  return invoicesController.download(orderId);
}
