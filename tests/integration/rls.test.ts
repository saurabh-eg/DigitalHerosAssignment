// Live checks of the RLS rules against the Supabase project in .env.local.
// Run with `npm run test:integration` after `db:push` and `db:seed-users`.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";

process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const secret = process.env.SUPABASE_SECRET_KEY!;
const options = { auth: { persistSession: false, autoRefreshToken: false } };

const admin = createClient<Database>(url, secret, options);
const anon = createClient<Database>(url, publishable, options);

async function signedIn(email: string, password: string) {
  const client = createClient<Database>(url, publishable, options);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

let customer: SupabaseClient<Database>;
let outsider: SupabaseClient<Database>;
let adminUser: SupabaseClient<Database>;
let outsiderId: string;
let orderId: string;

const outsiderEmail = `rls.outsider.${Date.now()}@example.com`;
const outsiderPassword = "Outsider#2026-test";

beforeAll(async () => {
  customer = await signedIn("demo.customer@example.com", process.env.SEED_CUSTOMER_PASSWORD ?? "DemoCustomer#2026");
  adminUser = await signedIn("demo.admin@example.com", process.env.SEED_ADMIN_PASSWORD ?? "DemoAdmin#2026");

  const { data: created, error } = await admin.auth.admin.createUser({
    email: outsiderEmail,
    password: outsiderPassword,
    email_confirm: true,
  });
  if (error) throw error;
  outsiderId = created.user.id;
  outsider = await signedIn(outsiderEmail, outsiderPassword);

  const { data: me } = await customer.auth.getUser();
  const { data: membership } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", me.user!.id)
    .single();
  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({ organization_id: membership!.organization_id, customer_id: me.user!.id, status: "order" })
    .select("id")
    .single();
  if (orderError) throw orderError;
  orderId = order.id;
}, 30_000);

afterAll(async () => {
  if (orderId) await admin.from("orders").delete().eq("id", orderId);
  if (outsiderId) await admin.auth.admin.deleteUser(outsiderId);
});

describe("public catalogue", () => {
  it("lets visitors read the six divisions and their products", async () => {
    const { data: divisions } = await anon.from("divisions").select("slug");
    const { data: products } = await anon.from("products").select("slug");
    expect(divisions).toHaveLength(6);
    expect(products!.length).toBeGreaterThanOrEqual(6);
  });

  it("hides private tables from visitors", async () => {
    const { data: profiles } = await anon.from("profiles").select("id");
    const { data: orders } = await anon.from("orders").select("id");
    expect(profiles).toEqual([]);
    expect(orders).toEqual([]);
  });
});

describe("customer isolation", () => {
  it("bootstraps a personal organization and customer role on signup", async () => {
    const { data } = await outsider.from("profiles").select("role, organization_members(organization_id)").single();
    expect(data?.role).toBe("customer");
    expect(data?.organization_members).toHaveLength(1);
  });

  it("shows a customer their own order", async () => {
    const { data } = await customer.from("orders").select("id").eq("id", orderId);
    expect(data).toHaveLength(1);
  });

  it("hides that order from other customers", async () => {
    const { data } = await outsider.from("orders").select("id").eq("id", orderId);
    expect(data).toEqual([]);
  });

  it("does not let a customer change an order's status", async () => {
    await customer.from("orders").update({ status: "production" }).eq("id", orderId);
    const { data } = await admin.from("orders").select("status").eq("id", orderId).single();
    expect(data?.status).toBe("order");
  });

  it("does not let a customer make themselves an admin", async () => {
    const { data: me } = await outsider.auth.getUser();
    const { error } = await outsider.from("profiles").update({ role: "admin" }).eq("id", me.user!.id);
    expect(error).not.toBeNull();
  });

  it("lets a customer update their own profile details", async () => {
    const { data: me } = await outsider.auth.getUser();
    const { error } = await outsider.from("profiles").update({ full_name: "Rls Outsider" }).eq("id", me.user!.id);
    expect(error).toBeNull();
  });
});

describe("administrator", () => {
  it("can see every profile and order", async () => {
    const { data: profiles } = await adminUser.from("profiles").select("id");
    const { data: orders } = await adminUser.from("orders").select("id").eq("id", orderId);
    expect(profiles!.length).toBeGreaterThanOrEqual(3);
    expect(orders).toHaveLength(1);
  });
});
