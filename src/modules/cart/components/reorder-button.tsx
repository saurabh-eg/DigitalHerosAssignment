"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { idle, type ActionResult } from "@/lib/action-result";

type FormAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

/** PRD §09/§10 one-click reorder: same approved artwork and quantity, straight into the basket. */
export function ReorderButton({ orderId, action, size = "md" }: { orderId: string; action: FormAction; size?: "sm" | "md" }) {
  const [state, formAction] = useActionState(action, idle as ActionResult);
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="orderId" value={orderId} />
      <SubmitButton size={size} pendingLabel="Adding to basket…">
        Reorder
      </SubmitButton>
      {!state.ok && state.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}
