"use client";

import { useActionState, type ReactNode } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { idle, type ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/cn";

type FormAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

/**
 * A server-action form for the console: hidden fields, optional inputs, one submit button, and the
 * result shown inline. Keeps every admin action's feedback consistent.
 */
export function ActionForm({
  action,
  hidden = {},
  label,
  pendingLabel,
  variant = "secondary",
  size = "sm",
  children,
  className,
  confirm,
}: {
  action: FormAction;
  hidden?: Record<string, string>;
  label: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  children?: ReactNode;
  className?: string;
  /** Text of a required checkbox for destructive actions (no browser dialogs). */
  confirm?: string;
}) {
  const [state, formAction] = useActionState(action, idle as ActionResult);
  return (
    <form action={formAction} className={cn("flex flex-col gap-2", className)}>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {children}
      {confirm && (
        <label className="flex items-center gap-2 text-xs text-ink-muted">
          <input type="checkbox" required className="accent-accent" /> {confirm}
        </label>
      )}
      <SubmitButton variant={variant} size={size} className="self-start" pendingLabel={pendingLabel ?? "Working…"}>
        {label}
      </SubmitButton>
      {!state.ok && state.error && (
        <div className="text-xs text-danger" role="alert">
          <p>{state.error}</p>
          {/* Console forms have no per-field slots, so list the specific reasons here. */}
          {state.fieldErrors && (
            <ul className="mt-1 list-disc pl-4">
              {Object.values(state.fieldErrors)
                .flat()
                .map((message) => (
                  <li key={message}>{message}</li>
                ))}
            </ul>
          )}
        </div>
      )}
      {state.ok && state.message && <p className="text-xs text-success">{state.message}</p>}
    </form>
  );
}

const STATUS_STYLE: Record<string, string> = {
  quote: "bg-paper text-ink-muted",
  order: "bg-[#e6eefc] text-[#1d4ed8]",
  artwork: "bg-warning/10 text-warning",
  proof: "bg-accent-soft text-accent",
  production: "bg-[#e3f4ec] text-success",
  completed: "bg-ink text-surface",
  cancelled: "bg-danger/10 text-danger",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", STATUS_STYLE[status] ?? "bg-paper")}>{label}</span>;
}

export function FilesBadge({ ready, status }: { ready: boolean; status: string }) {
  if (status !== "production" && status !== "completed") return <span className="text-xs text-ink-muted">Locked until approval</span>;
  return ready ? (
    <span className="text-xs font-medium text-success">Files ready</span>
  ) : (
    <span className="text-xs font-medium text-warning">Generating files</span>
  );
}
