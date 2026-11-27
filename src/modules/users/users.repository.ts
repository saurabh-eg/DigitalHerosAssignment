import "server-only";
import type { Role } from "@/constants/roles";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type AdminUserRow = {
  id: string;
  email: string;
  fullName: string | null;
  companyName: string | null;
  role: Role;
  isDisabled: boolean;
  createdAt: string;
  orders: number;
  spentMinor: number;
};

export async function listUsers(q: string | undefined, page: number, pageSize: number): Promise<{ rows: AdminUserRow[]; total: number }> {
  let query = supabaseAdmin()
    .from("profiles")
    .select("id, email, full_name, company_name, role, is_disabled, created_at, orders!orders_customer_id_fkey(status, total_minor)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (q) {
    const term = q.replace(/[,()%*]/g, " ").trim();
    if (term) query = query.or(`email.ilike.%${term}%,full_name.ilike.%${term}%,company_name.ilike.%${term}%`);
  }
  const { data, error, count } = await query;
  if (error) throw error;
  return { total: count ?? 0, rows: data.map((p) => {
    const paid = p.orders.filter((o) => o.status !== "quote" && o.status !== "cancelled");
    return {
      id: p.id,
      email: p.email,
      fullName: p.full_name,
      companyName: p.company_name,
      role: p.role,
      isDisabled: p.is_disabled,
      createdAt: p.created_at,
      orders: paid.length,
      spentMinor: paid.reduce((s, o) => s + o.total_minor, 0),
    };
  }) };
}

export async function countActiveAdmins(): Promise<number> {
  const { count, error } = await supabaseAdmin()
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("is_disabled", false);
  if (error) throw error;
  return count ?? 0;
}

export async function findUser(userId: string) {
  const { data, error } = await supabaseAdmin().from("profiles").select("id, role, is_disabled").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateUser(userId: string, patch: { role?: Role; is_disabled?: boolean }): Promise<void> {
  const { error } = await supabaseAdmin().from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}

/**
 * Mirrors the disabled flag in Supabase Auth: a banned user can't sign in or refresh a session,
 * so existing sessions end when their access token expires.
 */
export async function setAuthBan(userId: string, banned: boolean): Promise<void> {
  const { error } = await supabaseAdmin().auth.admin.updateUserById(userId, { ban_duration: banned ? "876000h" : "none" });
  if (error) throw error;
}
