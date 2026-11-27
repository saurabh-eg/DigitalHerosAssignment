import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/config/env.public";
import type { Database } from "./database.types";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function supabaseBrowser() {
  const env = publicEnv();
  // The server (proxy.ts) is the only place that refreshes sessions (D-073). A browser-side refresh racing
  // it would reuse the same single-use refresh token, which Supabase treats as theft and signs the user out.
  client ??= createBrowserClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false },
  });
  return client;
}
