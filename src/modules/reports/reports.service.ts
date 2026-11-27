import "server-only";
import { ROLE } from "@/constants/roles";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireRole } from "@/modules/auth/auth.service";

export type Report = {
  orders: number;
  revenue_minor: number;
  tax_minor: number;
  delivery_minor: number;
  units: number;
  reorders: number;
  by_division: Array<{ slug: string; name: string; orders: number; units: number; revenue_minor: number }>;
  by_status: Record<string, number>;
  daily: Array<{ day: string; orders: number; revenue_minor: number }>;
};

/** PRD §11 reports: orders, revenue and product-family throughput for paid orders in a date range. */
export async function getReport(from: string, to: string): Promise<Report> {
  await requireRole(ROLE.ADMIN);
  const { data, error } = await supabaseAdmin().rpc("admin_report", { p_from: `${from}T00:00:00Z`, p_to: `${to}T23:59:59.999Z` });
  if (error) throw error;
  return data as unknown as Report;
}
