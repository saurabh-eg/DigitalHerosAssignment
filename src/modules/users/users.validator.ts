import { z } from "zod";
import { ROLE } from "@/constants/roles";

export const userSearchSchema = z.object({
  q: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(100).optional()),
});

export const setRoleSchema = z.object({ userId: z.uuid(), role: z.enum([ROLE.CUSTOMER, ROLE.ADMIN]) });

export const setDisabledSchema = z.object({
  userId: z.uuid(),
  disabled: z.enum(["true", "false"]).transform((v) => v === "true"),
});
