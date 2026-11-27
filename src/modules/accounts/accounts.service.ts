import "server-only";
import { requireUser } from "@/modules/auth/auth.service";
import { notFound } from "@/lib/errors";
import * as accountsRepository from "./accounts.repository";
import type { Profile } from "./accounts.types";
import type { UpdateProfileInput } from "./accounts.validator";

export async function getMyProfile(): Promise<Profile> {
  const user = await requireUser();
  const profile = await accountsRepository.findProfile(user.id);
  if (!profile) throw notFound("Profile not found.");
  return profile;
}

export async function updateMyProfile(input: UpdateProfileInput): Promise<Profile> {
  const user = await requireUser();
  return accountsRepository.updateProfile(user.id, input);
}

/** Fields a customer should complete before checkout; shown as account status on the dashboard (PRD §10). */
export function missingProfileFields(profile: Profile): string[] {
  const missing: string[] = [];
  if (!profile.fullName) missing.push("name");
  if (!profile.phone) missing.push("phone number");
  return missing;
}
