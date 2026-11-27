import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/config/env.public";
import { serverEnv } from "@/config/env.server";
import type { Database } from "./database.types";

let client: ReturnType<typeof createClient<Database>> | undefined;

/**
 * Secret-key client that bypasses RLS. Only repositories may use it, and only after the
 * calling service has authorised the actor.
 */
export function supabaseAdmin() {
  client ??= createClient<Database>(publicEnv().NEXT_PUBLIC_SUPABASE_URL, serverEnv().SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
