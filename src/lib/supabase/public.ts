import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/config/env.public";
import type { Database } from "./database.types";

let client: ReturnType<typeof createClient<Database>> | undefined;

/** Cookie-free client for public catalogue reads, so those pages can be statically generated. Anonymous RLS applies. */
export function supabasePublic() {
  const env = publicEnv();
  client ??= createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** Public URL for an image path: app-relative paths are served from /public, others from the public gallery bucket. */
export function publicImageUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("/") || path.startsWith("http")) return path;
  return `${publicEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${path}`;
}
