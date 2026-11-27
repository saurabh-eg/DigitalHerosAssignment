import { z } from "zod";
import { PAGINATION } from "@/constants/limits";
import { ORDER_STATUS } from "@/constants/pipeline";

const statuses = Object.values(ORDER_STATUS) as [string, ...string[]];
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" || v === undefined ? undefined : v), schema.optional());

/** PRD §11 searchable job database: filter by status, customer, date and product type. */
export const jobSearchSchema = z.object({
  q: optional(z.string().trim().max(100)),
  status: optional(z.enum(statuses)),
  division: optional(z.string().max(60)),
  from: optional(z.iso.date()),
  to: optional(z.iso.date()),
  archived: z.enum(["exclude", "only", "include"]).default("exclude"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(PAGINATION.maxPageSize).default(PAGINATION.defaultPageSize),
});

export type JobSearch = z.infer<typeof jobSearchSchema>;

export const adminTransitionSchema = z.object({
  orderId: z.uuid(),
  to: z.enum([ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED]),
  note: optional(z.string().trim().max(300)),
});

export const archiveSchema = z.object({ orderId: z.uuid(), archive: z.enum(["true", "false"]).transform((v) => v === "true") });
export const orderIdSchema = z.object({ orderId: z.uuid() });
