import { z } from "zod";
import { PAGINATION } from "@/constants/limits";
import { ROLE } from "@/constants/roles";

export const userSearchSchema = z.object({
  q: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(100).optional()),
  page: z.coerce.number().int().min(1).catch(1).default(1),
  pageSize: z.literal(PAGINATION.defaultPageSize).default(PAGINATION.defaultPageSize),
});

export const setRoleSchema = z.object({ userId: z.uuid(), role: z.enum([ROLE.CUSTOMER, ROLE.ADMIN]) });

export const setDisabledSchema = z.object({
  userId: z.uuid(),
  disabled: z.enum(["true", "false"]).transform((v) => v === "true"),
});
