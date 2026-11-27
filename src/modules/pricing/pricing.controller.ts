import "server-only";
import { parseInput } from "@/lib/action-result";
import { apiHandler, readJson } from "@/lib/api-response";
import * as pricingService from "./pricing.service";
import { quoteRequestSchema } from "./pricing.validator";

/** Server-side quote for pages; throws AppError on an invalid configuration. */
export const quoteFor = pricingService.quote;

/** POST /api/v1/pricing/quote — public, so the calculator can be used before signing in (PRD §03). */
export async function quote(request: Request): Promise<Response> {
  return apiHandler(async () => {
    const input = parseInput(quoteRequestSchema, await readJson(request));
    return pricingService.quote(input.productId, input.configuration, input.deliveryMethod);
  });
}
