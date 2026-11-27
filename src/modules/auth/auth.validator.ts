import { z } from "zod";
import { SECURITY_LIMITS } from "@/constants/limits";

const email = z.email("Enter a valid email address.").trim().toLowerCase();

// bcrypt (used by Supabase Auth) ignores bytes beyond 72.
const password = z
  .string()
  .min(SECURITY_LIMITS.passwordMinLength, `Use at least ${SECURITY_LIMITS.passwordMinLength} characters.`)
  .max(72, "Use 72 characters or fewer.");

/** Only same-site relative paths, so `?next=` cannot be used as an open redirect. */
export const safeNextPath = z
  .string()
  .optional()
  .transform((value) => (value && value.startsWith("/") && !value.startsWith("//") ? value : undefined));

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name.").max(80),
  email,
  password,
  next: safeNextPath,
});

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
  next: safeNextPath,
});

export const requestPasswordResetSchema = z.object({ email });

export const updatePasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
