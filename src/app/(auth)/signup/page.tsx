import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { SignUpForm } from "@/modules/auth/components/auth-forms";
import { signUpAction } from "../actions";

export const metadata: Metadata = { title: "Create account" };

export default async function SignUpPage({ searchParams }: PageProps<"/signup">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" ? next : undefined;

  return (
    <>
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="mt-1 mb-6 text-sm text-ink-muted">Save designs, approve proofs and reorder in one click.</p>
      <SignUpForm action={signUpAction} next={nextPath} />
      <p className="mt-6 text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href={ROUTES.login} className="font-medium text-ink underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </>
  );
}
