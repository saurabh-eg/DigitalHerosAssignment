import "server-only";
import { after } from "next/server";
import { serverEnv } from "@/config/env.server";
import { ROLE } from "@/constants/roles";
import { getSessionUser } from "@/modules/auth/auth.service";
import * as printFilesService from "./print-files.service";

// Leaves headroom under the route's maxDuration (60 s) for the follow-up trigger.
const RUN_BUDGET_MS = 45_000;

async function authorised(request: Request): Promise<boolean> {
  const bearer = request.headers.get("authorization");
  if (bearer && bearer === `Bearer ${serverEnv().CRON_SECRET}`) return true;
  const user = await getSessionUser();
  return user?.role === ROLE.ADMIN;
}

/**
 * GET (Vercel Cron) / POST (internal trigger, admin "Run queue"): answers 202 straight away and works
 * through the queue after the response; if work remains, it re-triggers itself for another run (D-064).
 */
export async function run(request: Request): Promise<Response> {
  if (!(await authorised(request))) return Response.json({ error: "Not allowed." }, { status: 401 });
  after(async () => {
    const result = await printFilesService.processQueue(RUN_BUDGET_MS);
    console.info(`[print] processed ${result.processed} job(s); remaining: ${result.remaining}`);
    if (result.remaining) await printFilesService.triggerWorker();
  });
  return Response.json({ accepted: true }, { status: 202 });
}
