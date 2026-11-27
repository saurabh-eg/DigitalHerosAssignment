import "server-only";
import { revalidatePath } from "next/cache";
import { ROUTES } from "@/constants/routes";
import { formDataToObject, handleAction, ok, parseInput, type ActionResult } from "@/lib/action-result";
import * as usersService from "./users.service";
import { setDisabledSchema, setRoleSchema, userSearchSchema } from "./users.validator";

export async function listUsers(query: Record<string, string | string[] | undefined>) {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const { q, page, pageSize } = userSearchSchema.parse({ q: first(query.q), page: first(query.page) });
  const { rows, total } = await usersService.listUsers(q, page, pageSize);
  return { q: q ?? "", users: rows, total, page, pageSize };
}

export async function setRole(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return handleAction(async () => {
    const { userId, role } = parseInput(setRoleSchema, formDataToObject(formData));
    await usersService.setRole(userId, role);
    revalidatePath(ROUTES.admin.users);
    return ok(undefined, role === "admin" ? "Now an admin." : "Now a customer.");
  });
}

export async function setDisabled(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return handleAction(async () => {
    const { userId, disabled } = parseInput(setDisabledSchema, formDataToObject(formData));
    await usersService.setDisabled(userId, disabled);
    revalidatePath(ROUTES.admin.users);
    return ok(undefined, disabled ? "Account disabled and signed out." : "Account enabled.");
  });
}
