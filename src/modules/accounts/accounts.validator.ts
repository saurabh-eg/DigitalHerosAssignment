import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v));

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name.").max(80),
  phone: optionalText(30).refine((v) => v === null || /^[+\d\s()-]{6,30}$/.test(v), "Enter a valid phone number."),
  companyName: optionalText(120),
  // Printed on invoices for B2B customers (D-006).
  vatNumber: optionalText(20).refine((v) => v === null || /^[A-Z]{2}[A-Z0-9]{2,18}$/i.test(v.replace(/\s/g, "")), {
    message: "Enter a VAT number with its country prefix, e.g. GB123456789.",
  }),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
