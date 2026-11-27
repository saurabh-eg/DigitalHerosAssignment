import * as paymentsController from "@/modules/payments/payments.controller";

// Fulfilment renders proof images, which can take a few seconds per line.
export const maxDuration = 60;

export function POST(request: Request) {
  return paymentsController.webhook(request);
}
