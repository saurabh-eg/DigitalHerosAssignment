import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { AppError } from "@/lib/errors";

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export const idle = { ok: false, error: "" } as const satisfies ActionResult;

export function ok<T>(data: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}

/** Parses input with a zod schema, throwing a VALIDATION AppError with per-field messages. */
export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const { fieldErrors } = z.flattenError(result.error);
    throw new AppError("VALIDATION", "Please check the highlighted fields.", fieldErrors as Record<string, string[]>);
  }
  return result.data;
}

/** Controller wrapper: maps AppErrors to a result and hides unexpected errors. Redirects pass through. */
export async function handleAction<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof AppError) {
      return { ok: false, error: error.message, fieldErrors: error.fieldErrors };
    }
    console.error(error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

export function formDataToObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}
