import * as printFilesController from "@/modules/print-files/print-files.controller";

export const maxDuration = 60;

export function GET(request: Request) {
  return printFilesController.run(request);
}

export function POST(request: Request) {
  return printFilesController.run(request);
}
