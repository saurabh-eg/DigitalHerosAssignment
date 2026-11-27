import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import * as accountsController from "@/modules/accounts/accounts.controller";

export const metadata: Metadata = { title: "My account" };

export default async function AccountOverviewPage() {
  const profile = await accountsController.getMyProfile();
  const missing = accountsController.missingProfileFields(profile);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold">Hello, {profile.fullName?.split(" ")[0] ?? "there"}</h1>
        <p className="mt-1 text-ink-muted">Your orders, proofs and saved designs live here.</p>
      </header>

      <section className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-ink-muted">Account status</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-ink-muted">Email</dt>
            <dd className="font-medium break-all">{profile.email}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Member since</dt>
            <dd className="font-medium">
              {new Date(profile.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Profile</dt>
            <dd className="font-medium">
              {missing.length === 0 ? (
                <span className="text-success">Complete</span>
              ) : (
                <Link href={ROUTES.account.settings} className="text-warning underline underline-offset-4">
                  Add your {missing.join(" and ")}
                </Link>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section className="flex flex-col items-start gap-3 rounded-[var(--radius-card)] border border-dashed border-line p-6">
        <h2 className="text-lg font-semibold">Start a new job</h2>
        <p className="text-sm text-ink-muted">Pick a product, configure it and get an instant price.</p>
        <ButtonLink href={ROUTES.products}>Browse products</ButtonLink>
      </section>
    </div>
  );
}
