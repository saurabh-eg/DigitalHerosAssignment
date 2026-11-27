import "server-only";
import { revalidatePath } from "next/cache";
import { ROUTES } from "@/constants/routes";
import { formDataToObject, handleAction, ok, parseInput, type ActionResult } from "@/lib/action-result";
import * as accountsService from "./accounts.service";
import type { Profile } from "./accounts.types";
import { updateProfileSchema } from "./accounts.validator";

export async function getMyProfile(): Promise<Profile> {
  return accountsService.getMyProfile();
}

export function missingProfileFields(profile: Profile): string[] {
  return accountsService.missingProfileFields(profile);
}

export async function updateMyProfile(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return handleAction(async () => {
    const input = parseInput(updateProfileSchema, formDataToObject(formData));
    await accountsService.updateMyProfile(input);
    revalidatePath(ROUTES.account.root, "layout");
    return ok(undefined, "Profile saved.");
  });
}
