import type { Metadata } from "next";
import * as authController from "@/modules/auth/auth.controller";
import { UpdatePasswordForm } from "@/modules/auth/components/auth-forms";
import { updatePasswordAction } from "../actions";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function UpdatePasswordPage() {
  // The reset link signs the user in via /auth/callback before landing here.
  await authController.requirePageUser("/update-password");
  return (
    <>
      <h1 className="text-2xl font-bold">Choose a new password</h1>
      <p className="mt-1 mb-6 text-sm text-ink-muted">You&apos;ll stay signed in on this device.</p>
      <UpdatePasswordForm action={updatePasswordAction} />
    </>
  );
}
