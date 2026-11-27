import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/config/env.public";
import type { Database } from "./database.types";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function supabaseBrowser() {
  const env = publicEnv();
  client ??= createBrowserClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  return client;
}
