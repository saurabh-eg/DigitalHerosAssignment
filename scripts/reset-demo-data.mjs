// Removes test/demo activity so evaluators start from a clean account:
// orders (with payments, invoices, proofs, print jobs/files), designs, uploads and their storage objects
// for the demo customer, plus e2e-created divisions. Catalogue, templates, gallery and accounts are kept.
//
//   node --env-file=.env.local scripts/reset-demo-data.mjs            # dry run: counts only
//   node --env-file=.env.local scripts/reset-demo-data.mjs --confirm  # delete permanently
import { createClient } from "@supabase/supabase-js";

const confirm = process.argv.includes("--confirm");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const must = (r) => {
  if (r.error) throw r.error;
  return r.data;
};

const customer = must(await db.from("profiles").select("id, organization_members(organization_id)").eq("email", "demo.customer@example.com").single());
const orgId = customer.organization_members[0].organization_id;

const orders = must(await db.from("orders").select("id, order_number").eq("organization_id", orgId));
const orderIds = orders.map((o) => o.id);
const designs = must(await db.from("designs").select("id").eq("organization_id", orgId));
const uploads = must(await db.from("uploads").select("id").eq("organization_id", orgId));
const e2eDivisions = must(await db.from("divisions").select("id, slug").like("slug", "e2e-%"));

async function listAll(bucket, prefix) {
  const out = [];
  const walk = async (path) => {
    const items = must(await db.storage.from(bucket).list(path, { limit: 1000 }));
    for (const item of items) {
      const full = path ? `${path}/${item.name}` : item.name;
      if (item.id === null) await walk(full); // folder
      else out.push(full);
    }
  };
  await walk(prefix);
  return out;
}

// Production and proof files are grouped by order number; only the demo customer's orders are touched.
const demoOrderFolders = new Set(orders.map((o) => `orders/${o.order_number}/`));
const ofDemoOrders = (files) => files.filter((f) => [...demoOrderFolders].some((folder) => f.startsWith(folder)));

const storage = {
  production: ofDemoOrders(await listAll("production", "orders")),
  proofs: ofDemoOrders(await listAll("proofs", "orders")),
  uploads: await listAll("uploads", orgId),
  "design-assets": await listAll("design-assets", orgId),
  "csv-datasets": await listAll("csv-datasets", orgId),
};

console.log(`Demo customer organization ${orgId}`);
console.log(`  orders: ${orders.length}${orders.length ? ` (${orders[0].order_number} …)` : ""}`);
console.log(`  designs: ${designs.length}, uploads: ${uploads.length}`);
console.log(`  e2e divisions: ${e2eDivisions.map((d) => d.slug).join(", ") || "none"}`);
for (const [bucket, files] of Object.entries(storage)) console.log(`  storage ${bucket}: ${files.length} files`);

if (!confirm) {
  console.log("\nDry run only. Re-run with --confirm to delete these permanently.");
  process.exit(0);
}

// Order children with ON DELETE RESTRICT first, then orders (items, history, proofs, jobs, files cascade).
if (orderIds.length) {
  must(await db.from("invoices").delete().in("order_id", orderIds));
  must(await db.from("payments").delete().in("order_id", orderIds));
  // Reorder links point at other orders' rows; clear them so deletes don't trip over each other.
  must(await db.from("orders").update({ reorder_of: null }).in("id", orderIds));
  must(await db.from("orders").delete().in("id", orderIds));
}
must(await db.from("designs").delete().eq("organization_id", orgId));
must(await db.from("csv_datasets").delete().eq("organization_id", orgId));
must(await db.from("uploads").delete().eq("organization_id", orgId));
for (const d of e2eDivisions) {
  must(await db.from("products").delete().eq("division_id", d.id));
  must(await db.from("divisions").delete().eq("id", d.id));
}
for (const [bucket, files] of Object.entries(storage)) {
  for (let i = 0; i < files.length; i += 100) must(await db.storage.from(bucket).remove(files.slice(i, i + 100)));
}
console.log("\nDeleted. Catalogue, templates, gallery and accounts are unchanged.");
