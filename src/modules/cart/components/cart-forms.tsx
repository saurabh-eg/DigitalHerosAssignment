"use client";

import { useActionState, useState } from "react";
import { ActionMessage } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { DELIVERY_CONFIG } from "@/constants/site-config";
import { idle, type ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import type { ShippingAddress } from "@/modules/orders/orders.types";

type FormAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

export function QuantityForm({ itemId, quantity, action }: { itemId: string; quantity: number; action: FormAction }) {
  const [state, formAction] = useActionState(action, idle as ActionResult);
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="itemId" value={itemId} />
      <div className="flex items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Quantity</span>
          <input
            name="quantity"
            type="number"
            inputMode="numeric"
            defaultValue={quantity}
            min={1}
            className="h-10 w-28 rounded-md border border-line bg-surface px-2.5 focus:border-ink focus:outline-none"
          />
        </label>
        <SubmitButton variant="secondary" size="sm" pendingLabel="Updating…">
          Update
        </SubmitButton>
      </div>
      {!state.ok && state.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}

export function DeliveryForm({
  method,
  address,
  action,
}: {
  method: "delivery" | "collection";
  address: ShippingAddress | null;
  action: FormAction;
}) {
  const [state, formAction] = useActionState(action, idle as ActionResult);
  const [choice, setChoice] = useState(method);
  const errors = (name: string) => (state.ok ? undefined : state.fieldErrors?.[name]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <ActionMessage state={state} />
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="sr-only">Delivery method</legend>
        {(["delivery", "collection"] as const).map((m) => (
          <label
            key={m}
            className={cn(
              "flex cursor-pointer flex-col rounded-md border p-3 text-sm",
              choice === m ? "border-ink bg-ink text-surface" : "border-line bg-surface hover:border-ink",
            )}
          >
            <input type="radio" name="deliveryMethod" value={m} checked={choice === m} onChange={() => setChoice(m)} className="sr-only" />
            <span className="font-medium">{m === "delivery" ? "UK delivery" : "Collect from the workshop"}</span>
            <span className="opacity-75">
              {m === "delivery"
                ? `${formatMoney(DELIVERY_CONFIG.flatFeeMinor)}, free over ${formatMoney(DELIVERY_CONFIG.freeThresholdMinor)}`
                : "Free"}
            </span>
          </label>
        ))}
      </fieldset>
      {choice === "delivery" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Recipient name" name="name" autoComplete="name" defaultValue={address?.name} errors={errors("name")} className="sm:col-span-2" />
          <Field label="Address line 1" name="line1" autoComplete="address-line1" defaultValue={address?.line1} errors={errors("line1")} className="sm:col-span-2" />
          <Field label="Address line 2 (optional)" name="line2" autoComplete="address-line2" defaultValue={address?.line2} errors={errors("line2")} className="sm:col-span-2" />
          <Field label="Town or city" name="city" autoComplete="address-level2" defaultValue={address?.city} errors={errors("city")} />
          <Field label="Postcode" name="postcode" autoComplete="postal-code" defaultValue={address?.postcode} errors={errors("postcode")} />
        </div>
      )}
      <SubmitButton variant="secondary" className="self-start" pendingLabel="Saving…">
        {choice === "delivery" ? "Save address" : "Choose collection"}
      </SubmitButton>
    </form>
  );
}

export function CheckoutButton({ action, disabled }: { action: () => Promise<ActionResult>; disabled: boolean }) {
  const [state, formAction] = useActionState(async () => action(), idle as ActionResult);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <ActionMessage state={state} />
      <SubmitButton size="lg" className="w-full" disabled={disabled} pendingLabel="Opening secure payment…">
        Pay securely with Stripe
      </SubmitButton>
    </form>
  );
}
