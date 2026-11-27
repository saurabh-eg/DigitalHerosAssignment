"use server";

import * as authController from "@/modules/auth/auth.controller";
import type { ActionResult } from "@/lib/action-result";

export async function signUpAction(prev: ActionResult, formData: FormData) {
  return authController.signUp(prev, formData);
}

export async function signInAction(prev: ActionResult, formData: FormData) {
  return authController.signIn(prev, formData);
}

export async function signOutAction() {
  return authController.signOut();
}

export async function requestPasswordResetAction(prev: ActionResult, formData: FormData) {
  return authController.requestPasswordReset(prev, formData);
}

export async function updatePasswordAction(prev: ActionResult, formData: FormData) {
  return authController.updatePassword(prev, formData);
}
