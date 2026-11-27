import type { Metadata } from "next";
import Link from "next/link";
import * as accountsController from "@/modules/accounts/accounts.controller";
import { ProfileForm } from "@/modules/accounts/components/profile-form";
import { ROUTES } from "@/constants/routes";
import { updateProfileAction } from "../actions";

export const metadata: Metadata = { title: "Profile & settings" };

export default async function AccountSettingsPage() {
  const profile = await accountsController.getMyProfile();
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold">Profile & settings</h1>
        <p className="mt-1 text-ink-muted">Details used on your orders and invoices.</p>
      </header>
      <ProfileForm profile={profile} action={updateProfileAction} />
      <p className="text-sm text-ink-muted">
        Need a new password?{" "}
        <Link href={ROUTES.resetPassword} className="font-medium text-ink underline underline-offset-4">
          Send a reset link
        </Link>
      </p>
    </div>
  );
}
