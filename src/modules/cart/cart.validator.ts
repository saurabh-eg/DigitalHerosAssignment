import { z } from "zod";
import { ORDER_LIMITS } from "@/constants/limits";

// D-056: delivery is UK-only, matching GBP pricing and UK VAT.
const ukPostcode = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;

export const shippingAddressSchema = z.object({
  name: z.string().trim().min(2, "Enter the recipient's name.").max(80),
  line1: z.string().trim().min(3, "Enter the first line of the address.").max(120),
  line2: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => v || undefined),
  city: z.string().trim().min(2, "Enter the town or city.").max(60),
  postcode: z
    .string()
    .trim()
    .regex(ukPostcode, "Enter a valid UK postcode.")
    .transform((v) => v.toUpperCase().replace(/\s+/g, "").replace(/(\d[A-Z]{2})$/, " $1")),
  country: z.literal("GB").default("GB"),
});

export const deliverySchema = z.discriminatedUnion("deliveryMethod", [
  z.object({ deliveryMethod: z.literal("collection") }),
  z.object({ deliveryMethod: z.literal("delivery"), ...shippingAddressSchema.shape }),
]);

export const addToCartSchema = z.object({ designId: z.uuid() });

export const updateQuantitySchema = z.object({
  itemId: z.uuid(),
  quantity: z.coerce.number().int().min(ORDER_LIMITS.minQuantity).max(ORDER_LIMITS.maxQuantity),
});

export const removeItemSchema = z.object({ itemId: z.uuid() });

export const reorderSchema = z.object({ orderId: z.uuid() });
