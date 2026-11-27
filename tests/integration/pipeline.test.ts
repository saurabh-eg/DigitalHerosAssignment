// Live checks of the pipeline rules (PRD §08 approval gate, §11 transitions) against the Supabase project.
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { transition } from "@/modules/orders/orders.service";
import { updateStatus } from "@/modules/orders/orders.repository";

process.loadEnvFile(".env.local");

const admin = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let orderId: string;

beforeAll(async () => {
  const { data: users } = await admin.from("profiles").select("id, organization_members(organization_id)").eq("email", "demo.customer@example.com").single();
  const { data, error } = await admin
    .from("orders")
    .insert({ organization_id: users!.organization_members[0].organization_id, customer_id: users!.id, status: "proof" })
    .select("id")
    .single();
  if (error) throw error;
  orderId = data.id;
});

afterAll(async () => {
  if (orderId) await admin.from("orders").delete().eq("id", orderId);
});

describe("approval gate", () => {
  it("refuses PROOF → PRODUCTION without an approved proof", async () => {
    await expect(transition(orderId, "production", { actorId: null })).rejects.toThrow(/approved every proof/);
    const { data } = await admin.from("orders").select("status").eq("id", orderId).single();
    expect(data?.status).toBe("proof");
  });

  it("refuses stage skips such as PROOF → COMPLETED", async () => {
    await expect(transition(orderId, "completed", { actorId: null })).rejects.toThrow(/can't move from Proof to Completed/);
  });

  it("allows PROOF → PRODUCTION through an approval and records history", async () => {
    await transition(orderId, "production", { actorId: null, viaApproval: true, notify: false, note: "test approval" });
    const { data: history } = await admin.from("order_status_history").select("from_status, to_status, note").eq("order_id", orderId);
    expect(history).toEqual([{ from_status: "proof", to_status: "production", note: "test approval" }]);
  });

  it("lets only one of two concurrent updates win", async () => {
    const results = await Promise.all([updateStatus(orderId, "production", "completed"), updateStatus(orderId, "production", "completed")]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });
});
