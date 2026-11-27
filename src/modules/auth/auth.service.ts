import "server-only";
import { cache } from "react";
import { publicEnv } from "@/config/env.public";
import { ROUTES } from "@/constants/routes";
import type { Role } from "@/constants/roles";
import { AppError, forbidden, unauthenticated } from "@/lib/errors";
import * as authRepository from "./auth.repository";
import type { SessionUser } from "./auth.types";
import type { RequestPasswordResetInput, SignInInput, SignUpInput } from "./auth.validator";

/** Current user for this request, or null. Cached per request so layouts and pages share one lookup. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const userId = await authRepository.getAuthenticatedUserId();
  if (!userId) return null;

  const profile = await authRepository.findSessionProfile(userId);
  const organizationId = profile?.organization_members[0]?.organization_id;
  if (!profile || profile.is_disabled || !organizationId) return null;

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
    organizationId,
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw unauthenticated();
  return user;
}

export async function requireRole(role: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== role) throw forbidden();
  return user;
}

function callbackUrl(next: string): string {
  return `${publicEnv().NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`;
}

/** Returns whether the user still has to confirm their email before signing in. */
export async function signUp(input: SignUpInput): Promise<{ needsConfirmation: boolean }> {
  const { data, error } = await authRepository.signUp({
    email: input.email,
    password: input.password,
    fullName: input.fullName,
    redirectTo: callbackUrl(input.next ?? ROUTES.account.root),
  });
  if (error) {
    if (error.code === "user_already_exists") throw new AppError("CONFLICT", "An account with this email already exists.");
    if (error.code === "weak_password") {
      throw new AppError("VALIDATION", "Choose a stronger password.", { password: [error.message] });
    }
    throw error;
  }
  // Supabase returns a user with no identities (and no session) when the email is already registered.
  if (data.user && data.user.identities?.length === 0) {
    throw new AppError("CONFLICT", "An account with this email already exists.");
  }
  return { needsConfirmation: !data.session };
}

export async function signIn(input: SignInInput): Promise<SessionUser> {
  const { error } = await authRepository.signInWithPassword(input.email, input.password);
  if (error) {
    if (error.code === "email_not_confirmed") {
      throw new AppError("FORBIDDEN", "Please confirm your email address first — check your inbox.");
    }
    if (error.status === 429) {
      throw new AppError("CONFLICT", "Too many sign-in attempts. Please wait a minute and try again.");
    }
    if (error.code === "invalid_credentials") {
      throw new AppError("UNAUTHENTICATED", "Email or password is incorrect.");
    }
    throw error;
  }

  const user = await getSessionUser();
  if (!user) {
    // Profile missing or account disabled by an administrator.
    await authRepository.signOut();
    throw forbidden("This account is disabled. Please contact support.");
  }
  return user;
}

export async function signOut(): Promise<void> {
  await authRepository.signOut();
}

/** Always succeeds from the caller's view so the form cannot be used to discover registered emails. */
export async function requestPasswordReset(input: RequestPasswordResetInput): Promise<void> {
  const { error } = await authRepository.sendPasswordResetEmail(input.email, callbackUrl("/update-password"));
  if (error && error.status !== 429) console.error("Password reset email failed", error.code);
  if (error?.status === 429) throw new AppError("CONFLICT", "Too many requests. Please wait a minute and try again.");
}

export async function updatePassword(password: string): Promise<void> {
  await requireUser();
  const { error } = await authRepository.updatePassword(password);
  if (error) {
    if (error.code === "same_password") {
      throw new AppError("VALIDATION", "Choose a different password.", { password: [error.message] });
    }
    throw error;
  }
}

export async function completeEmailCallback(code: string): Promise<boolean> {
  const { error } = await authRepository.exchangeCodeForSession(code);
  return !error;
}
