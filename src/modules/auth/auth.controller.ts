import "server-only";
import { notFound, redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { ROLE } from "@/constants/roles";
import { formDataToObject, handleAction, ok, parseInput, type ActionResult } from "@/lib/action-result";
import * as authService from "./auth.service";
import type { SessionUser } from "./auth.types";
import {
  requestPasswordResetSchema,
  safeNextPath,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
} from "./auth.validator";

export async function signUp(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return handleAction(async () => {
    const input = parseInput(signUpSchema, formDataToObject(formData));
    const { needsConfirmation } = await authService.signUp(input);
    if (needsConfirmation) {
      return ok(undefined, "Almost there — check your inbox to confirm your email address.");
    }
    redirect(input.next ?? ROUTES.account.root);
  });
}

export async function signIn(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return handleAction(async () => {
    const input = parseInput(signInSchema, formDataToObject(formData));
    const user = await authService.signIn(input);
    redirect(input.next ?? (user.role === ROLE.ADMIN ? ROUTES.admin.root : ROUTES.account.root));
  });
}

export async function signOut(): Promise<void> {
  await authService.signOut();
  redirect(ROUTES.home);
}

export async function requestPasswordReset(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return handleAction(async () => {
    const input = parseInput(requestPasswordResetSchema, formDataToObject(formData));
    await authService.requestPasswordReset(input);
    return ok(undefined, "If an account exists for that email, a reset link is on its way.");
  });
}

export async function updatePassword(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return handleAction(async () => {
    const input = parseInput(updatePasswordSchema, formDataToObject(formData));
    await authService.updatePassword(input.password);
    return ok(undefined, "Password updated.");
  });
}

/** GET /auth/callback — finishes email confirmation and password-reset links. */
export async function emailCallback(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath.parse(url.searchParams.get("next") ?? undefined) ?? ROUTES.account.root;

  if (code && (await authService.completeEmailCallback(code))) {
    return Response.redirect(new URL(next, url.origin), 303);
  }
  return Response.redirect(new URL(`${ROUTES.login}?error=link_expired`, url.origin), 303);
}

/** For layouts/pages: signed-in user, or a redirect to login. */
export async function requirePageUser(nextPath: string): Promise<SessionUser> {
  const user = await authService.getSessionUser();
  if (!user) redirect(`${ROUTES.login}?next=${encodeURIComponent(nextPath)}`);
  return user;
}

/** For admin layouts/pages: hides the admin area entirely from everyone else. */
export async function requirePageAdmin(): Promise<SessionUser> {
  const user = await authService.getSessionUser();
  if (!user) redirect(`${ROUTES.login}?next=${encodeURIComponent(ROUTES.admin.root)}`);
  if (user.role !== ROLE.ADMIN) notFound();
  return user;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  return authService.getSessionUser();
}
