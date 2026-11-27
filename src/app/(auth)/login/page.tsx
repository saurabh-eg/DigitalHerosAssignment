import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { ROUTES } from "@/constants/routes";
import { SignInForm } from "@/modules/auth/components/auth-forms";
import { signInAction } from "../actions";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  const nextPath = typeof next === "string" ? next : undefined;

  return (
    <>
      <h1 className="text-2xl font-bold">Welcome back</h1>
      <p className="mt-1 mb-6 text-sm text-ink-muted">Sign in to track orders, approve proofs and reorder.</p>
      {error === "link_expired" && (
        <div className="mb-4">
          <Alert tone="error">That link has expired or was already used. Please try again.</Alert>
        </div>
      )}
      <SignInForm action={signInAction} next={nextPath} />
      <p className="mt-6 text-center text-sm text-ink-muted">
        New here?{" "}
        <Link
          href={nextPath ? `${ROUTES.signup}?next=${encodeURIComponent(nextPath)}` : ROUTES.signup}
          className="font-medium text-ink underline underline-offset-4"
        >
          Create an account
        </Link>
      </p>
    </>
  );
}
