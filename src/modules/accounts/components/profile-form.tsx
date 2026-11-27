"use client";

import { useActionState } from "react";
import { ActionMessage } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { idle, type ActionResult } from "@/lib/action-result";
import type { Profile } from "../accounts.types";

type FormAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

export function ProfileForm({ profile, action: submit }: { profile: Profile; action: FormAction }) {
  const [state, action] = useActionState(submit, idle as ActionResult);
  const errors = (name: string) => (state.ok ? undefined : state.fieldErrors?.[name]);

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4" noValidate>
      <ActionMessage state={state} />
      <Field label="Email" value={profile.email} disabled readOnly hint="Your sign-in email can't be changed here." />
      <Field
        label="Full name"
        name="fullName"
        defaultValue={profile.fullName ?? ""}
        autoComplete="name"
        required
        errors={errors("fullName")}
      />
      <Field
        label="Phone"
        name="phone"
        type="tel"
        defaultValue={profile.phone ?? ""}
        autoComplete="tel"
        hint="Used only if we need to check something about your order."
        errors={errors("phone")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Company (optional)"
          name="companyName"
          defaultValue={profile.companyName ?? ""}
          autoComplete="organization"
          errors={errors("companyName")}
        />
        <Field
          label="VAT number (optional)"
          name="vatNumber"
          defaultValue={profile.vatNumber ?? ""}
          hint="Shown on your invoices."
          errors={errors("vatNumber")}
        />
      </div>
      <SubmitButton className="self-start" pendingLabel="Saving…">
        Save profile
      </SubmitButton>
    </form>
  );
}
