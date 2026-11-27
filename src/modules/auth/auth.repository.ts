import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
}

export async function findSessionProfile(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_disabled, organization_members(organization_id, created_at)")
    .eq("id", userId)
    .order("created_at", { referencedTable: "organization_members", ascending: true })
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function signUp(params: { email: string; password: string; fullName: string; redirectTo: string }) {
  const supabase = await createSupabaseServerClient();
  return supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: { data: { full_name: params.fullName }, emailRedirectTo: params.redirectTo },
  });
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = await createSupabaseServerClient();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  return supabase.auth.signOut();
}

export async function sendPasswordResetEmail(email: string, redirectTo: string) {
  const supabase = await createSupabaseServerClient();
  return supabase.auth.resetPasswordForEmail(email, { redirectTo });
}

export async function updatePassword(password: string) {
  const supabase = await createSupabaseServerClient();
  return supabase.auth.updateUser({ password });
}

export async function exchangeCodeForSession(code: string) {
  const supabase = await createSupabaseServerClient();
  return supabase.auth.exchangeCodeForSession(code);
}
