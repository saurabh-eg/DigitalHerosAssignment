"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ActionMessage } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { SECURITY_LIMITS } from "@/constants/limits";
import { ROUTES } from "@/constants/routes";
import { idle, type ActionResult } from "@/lib/action-result";

const initial: ActionResult = idle;

type FormAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

function fieldErrors(state: ActionResult, name: string) {
  return state.ok ? undefined : state.fieldErrors?.[name];
}

export function SignInForm({ action: submit, next }: { action: FormAction; next?: string }) {
  const [state, action] = useActionState(submit, initial);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <ActionMessage state={state} />
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="Email" name="email" type="email" autoComplete="email" required errors={fieldErrors(state, "email")} />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        errors={fieldErrors(state, "password")}
      />
      <Link href={ROUTES.resetPassword} className="-mt-2 self-end text-sm text-ink-muted underline-offset-4 hover:underline">
        Forgot password?
      </Link>
      <SubmitButton size="lg" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}

export function SignUpForm({ action: submit, next }: { action: FormAction; next?: string }) {
  const [state, action] = useActionState(submit, initial);
  if (state.ok) return <ActionMessage state={state} />;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <ActionMessage state={state} />
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="Full name" name="fullName" autoComplete="name" required errors={fieldErrors(state, "fullName")} />
      <Field label="Email" name="email" type="email" autoComplete="email" required errors={fieldErrors(state, "email")} />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={SECURITY_LIMITS.passwordMinLength}
        required
        hint={`At least ${SECURITY_LIMITS.passwordMinLength} characters.`}
        errors={fieldErrors(state, "password")}
      />
      <SubmitButton size="lg" pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}

export function RequestResetForm({ action: submit }: { action: FormAction }) {
  const [state, action] = useActionState(submit, initial);
  if (state.ok) return <ActionMessage state={state} />;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <ActionMessage state={state} />
      <Field label="Email" name="email" type="email" autoComplete="email" required errors={fieldErrors(state, "email")} />
      <SubmitButton size="lg" pendingLabel="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}

export function UpdatePasswordForm({ action: submit }: { action: FormAction }) {
  const [state, action] = useActionState(submit, initial);
  if (state.ok) {
    return (
      <div className="flex flex-col gap-4">
        <ActionMessage state={state} />
        <Link href={ROUTES.account.root} className="text-sm font-medium underline underline-offset-4">
          Go to your account
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <ActionMessage state={state} />
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        errors={fieldErrors(state, "password")}
      />
      <Field
        label="Confirm new password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        errors={fieldErrors(state, "confirmPassword")}
      />
      <SubmitButton size="lg" pendingLabel="Saving…">
        Update password
      </SubmitButton>
    </form>
  );
}
