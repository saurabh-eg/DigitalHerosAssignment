"use client";

import type { Bucket } from "@/constants/storage";
import { supabaseBrowser } from "@/lib/supabase/browser";

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  ai: "application/illustrator",
  csv: "text/csv",
};

export function extensionOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

/**
 * Uploads straight from the browser into the customer's own folder (`<org>/<design>/…`); storage RLS
 * rejects any other path. The server then re-checks the bytes before the file is used.
 */
export async function uploadToStorage(bucket: Bucket, organizationId: string, designId: string, file: File): Promise<string> {
  // Let the server refresh the session first (D-073): a long designer session may have an expired token,
  // and the browser client is configured not to refresh it itself.
  await fetch("/api/v1/me", { cache: "no-store" });
  const ext = extensionOf(file.name);
  const path = `${organizationId}/${designId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabaseBrowser()
    .storage.from(bucket)
    .upload(path, file, { contentType: CONTENT_TYPES[ext] ?? file.type, upsert: false });
  if (error) {
    throw new Error(error.message.includes("mime") || error.message.includes("type") ? "That file type isn't accepted here." : "The upload failed. Please try again.");
  }
  return path;
}
