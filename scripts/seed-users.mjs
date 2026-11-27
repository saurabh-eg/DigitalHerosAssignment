// Creates (or resets) the test customer and admin accounts handed to evaluators (PRD §15).
// Idempotent. Override credentials with SEED_* variables in .env.local.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local");
  process.exit(1);
}

const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

const accounts = [
  {
    email: process.env.SEED_CUSTOMER_EMAIL ?? "demo.customer@example.com",
    password: process.env.SEED_CUSTOMER_PASSWORD ?? "DemoCustomer#2026",
    fullName: "Demo Customer",
    role: "customer",
  },
  {
    email: process.env.SEED_ADMIN_EMAIL ?? "demo.admin@example.com",
    password: process.env.SEED_ADMIN_PASSWORD ?? "DemoAdmin#2026",
    fullName: "Demo Admin",
    role: "admin",
  },
];

async function findUserByEmail(email) {
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match || data.users.length < 200) return match;
  }
}

for (const account of accounts) {
  let user = await findUserByEmail(account.email);
  if (user) {
    const { error } = await supabase.auth.admin.updateUserById(user.id, { password: account.password });
    if (error) throw error;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { full_name: account.fullName },
    });
    if (error) throw error;
    user = data.user;
  }

  const { error } = await supabase.from("profiles").update({ role: account.role }).eq("id", user.id);
  if (error) throw error;
  console.log(`${account.role.padEnd(8)} ${account.email} / ${account.password}`);
}
