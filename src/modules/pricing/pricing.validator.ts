import { z } from "zod";
import { productConfigurationSchema } from "@/modules/catalogue/catalogue.validator";

export const quoteRequestSchema = z.object({
  productId: z.uuid(),
  configuration: productConfigurationSchema,
  deliveryMethod: z.enum(["delivery", "collection"]).default("delivery"),
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
