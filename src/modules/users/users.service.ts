import "server-only";
import { ROLE, type Role } from "@/constants/roles";
import { conflict, notFound } from "@/lib/errors";
import { requireRole } from "@/modules/auth/auth.service";
import * as usersRepository from "./users.repository";

/** PRD §03 admin: manage users. */
export async function listUsers(q?: string) {
  await requireRole(ROLE.ADMIN);
  return usersRepository.listUsers(q);
}

/** Guards against an admin locking everyone (or themselves) out of the console. */
async function assertKeepsAnAdmin(actorId: string, userId: string, losingAdmin: boolean) {
  if (!losingAdmin) return;
  if (actorId === userId) throw conflict("You can't remove your own admin access. Ask another admin.");
  if ((await usersRepository.countActiveAdmins()) <= 1) throw conflict("At least one active admin is required.");
}

export async function setRole(userId: string, role: Role): Promise<void> {
  const admin = await requireRole(ROLE.ADMIN);
  const user = await usersRepository.findUser(userId);
  if (!user) throw notFound("User not found.");
  await assertKeepsAnAdmin(admin.id, userId, user.role === ROLE.ADMIN && role !== ROLE.ADMIN);
  await usersRepository.updateUser(userId, { role });
}

/**
 * Disabled accounts can't sign in: the profile flag blocks our session lookup immediately (D-032) and an
 * Auth ban stops sign-in and session refresh at Supabase itself.
 */
export async function setDisabled(userId: string, disabled: boolean): Promise<void> {
  const admin = await requireRole(ROLE.ADMIN);
  const user = await usersRepository.findUser(userId);
  if (!user) throw notFound("User not found.");
  await assertKeepsAnAdmin(admin.id, userId, disabled && user.role === ROLE.ADMIN && !user.is_disabled);
  await usersRepository.updateUser(userId, { is_disabled: disabled });
  await usersRepository.setAuthBan(userId, disabled);
}
