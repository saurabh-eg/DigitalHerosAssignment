import * as ordersController from "@/modules/orders/orders.controller";

export const maxDuration = 60;

export async function GET(_request: Request, { params }: RouteContext<"/admin/jobs/[id]/files/zip">) {
  const { id } = await params;
  return ordersController.downloadZip(id);
}
