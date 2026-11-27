import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const tones = {
  error: "border-danger/30 bg-danger/5 text-danger",
  success: "border-success/30 bg-success/5 text-success",
  info: "border-line bg-surface text-ink",
} as const;

export function Alert({ tone = "info", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-lg border px-4 py-3 text-sm", tones[tone])}>
      {children}
    </div>
  );
}

/** Renders the top-level message of an ActionResult, if any. */
export function ActionMessage({ state }: { state: { ok: boolean; error?: string; message?: string } }) {
  if (!state.ok && state.error) return <Alert tone="error">{state.error}</Alert>;
  if (state.ok && state.message) return <Alert tone="success">{state.message}</Alert>;
  return null;
}
