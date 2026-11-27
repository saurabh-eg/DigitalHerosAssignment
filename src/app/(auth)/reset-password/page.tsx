import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { RequestResetForm } from "@/modules/auth/components/auth-forms";
import { requestPasswordResetAction } from "../actions";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Reset your password</h1>
      <p className="mt-1 mb-6 text-sm text-ink-muted">We&apos;ll email you a link to choose a new one.</p>
      <RequestResetForm action={requestPasswordResetAction} />
      <p className="mt-6 text-center text-sm text-ink-muted">
        <Link href={ROUTES.login} className="font-medium text-ink underline underline-offset-4">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
