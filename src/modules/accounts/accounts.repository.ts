import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "./accounts.types";
import type { UpdateProfileInput } from "./accounts.validator";

const PROFILE_COLUMNS = "id, email, full_name, phone, company_name, vat_number, role, created_at";

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  company_name: string | null;
  vat_number: string | null;
  role: Profile["role"];
  created_at: string;
};

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    companyName: row.company_name,
    vatNumber: row.vat_number,
    role: row.role,
    createdAt: row.created_at,
  };
}

export async function findProfile(userId: string): Promise<Profile | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", userId).maybeSingle();
  if (error) throw error;
  return data ? toProfile(data) : null;
}

// Runs as the user: RLS limits it to their own row and a trigger blocks role/email changes.
export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<Profile> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: input.fullName,
      phone: input.phone,
      company_name: input.companyName,
      vat_number: input.vatNumber?.replace(/\s/g, "").toUpperCase() ?? null,
    })
    .eq("id", userId)
    .select(PROFILE_COLUMNS)
    .single();
  if (error) throw error;
  return toProfile(data);
}
