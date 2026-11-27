import * as reportsController from "@/modules/reports/reports.controller";

export function GET(request: Request) {
  return reportsController.xeroExport(request);
}
