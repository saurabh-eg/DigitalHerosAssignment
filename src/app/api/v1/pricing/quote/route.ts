import * as pricingController from "@/modules/pricing/pricing.controller";

export function POST(request: Request) {
  return pricingController.quote(request);
}
