"use server";

import * as accountsController from "@/modules/accounts/accounts.controller";
import type { ActionResult } from "@/lib/action-result";

export async function updateProfileAction(prev: ActionResult, formData: FormData) {
  return accountsController.updateMyProfile(prev, formData);
}
