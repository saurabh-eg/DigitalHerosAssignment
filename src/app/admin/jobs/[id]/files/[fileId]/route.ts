import * as ordersController from "@/modules/orders/orders.controller";

export async function GET(_request: Request, { params }: RouteContext<"/admin/jobs/[id]/files/[fileId]">) {
  const { id, fileId } = await params;
  return ordersController.downloadFile(id, fileId);
}
