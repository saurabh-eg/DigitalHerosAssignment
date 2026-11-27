import { z } from "zod";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

/** Defaults to the last 30 days; the range can't run backwards or exceed two years. */
export const reportRangeSchema = z
  .object({
    // Function defaults: evaluated per request, not once when the server starts.
    from: z.preprocess((v) => (v ? v : undefined), z.iso.date().default(() => daysAgo(29))),
    to: z.preprocess((v) => (v ? v : undefined), z.iso.date().default(() => daysAgo(0))),
  })
  .refine((r) => r.from <= r.to, { message: "The start date must be before the end date.", path: ["from"] })
  .refine((r) => (Date.parse(r.to) - Date.parse(r.from)) / 86_400_000 <= 731, { message: "Choose a range of two years or less.", path: ["from"] });
