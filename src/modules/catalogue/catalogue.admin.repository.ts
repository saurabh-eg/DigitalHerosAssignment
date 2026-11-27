import "server-only";
import { BUCKET } from "@/constants/storage";
import type { Database, Json } from "@/lib/supabase/database.types";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { publicImageUrl } from "@/lib/supabase/public";

// Catalogue writes for the production console; the admin service authorises every call.

type JsonColumn = NonNullable<Json>;
const db = () => supabaseAdmin();

export async function listDivisions() {
  const { data, error } = await db()
    .from("divisions")
    .select("id, slug, name, tagline, description, sort_order, is_active, products(id, slug, name, product_type, is_active, sort_order)")
    .order("sort_order");
  if (error) throw error;
  return data;
}

export async function findProduct(productId: string) {
  const { data, error } = await db()
    .from("products")
    .select(
      `id, slug, name, summary, description, product_type, parameters, bleed_mm, safe_margin_mm, dpi, supports_designer,
       supports_upload, supports_variable_data, is_active, divisions(id, slug, name),
       pricing_rules(strategy, setup_fee_minor, unit_base_minor, area_rate_minor_per_cm2, per_character_minor, min_unit_minor),
       product_materials(material_id, is_default),
       templates(id, name, scene, is_default, is_active, sort_order)`,
    )
    .eq("id", productId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listMaterials() {
  const { data, error } = await db().from("materials").select("id, slug, name, price_factor_bps, is_active").order("name");
  if (error) throw error;
  return data;
}

export async function listTiers(productId: string | null) {
  const query = db().from("volume_tiers").select("min_quantity, discount_bps").order("min_quantity");
  const { data, error } = await (productId ? query.eq("product_id", productId) : query.is("product_id", null));
  if (error) throw error;
  return data;
}

export async function updateProduct(productId: string, patch: Database["public"]["Tables"]["products"]["Update"]) {
  const { error } = await db().from("products").update(patch).eq("id", productId);
  if (error) throw error;
}

export async function upsertPricingRule(row: {
  product_id: string;
  strategy: "area" | "per_unit" | "per_character";
  setup_fee_minor: number;
  unit_base_minor: number;
  area_rate_minor_per_cm2: number;
  per_character_minor: number;
  min_unit_minor: number;
}) {
  const { error } = await db().from("pricing_rules").upsert(row, { onConflict: "product_id" });
  if (error) throw error;
}

export async function replaceProductMaterials(productId: string, materialIds: string[], defaultId: string) {
  const { error: delError } = await db().from("product_materials").delete().eq("product_id", productId);
  if (delError) throw delError;
  const { error } = await db()
    .from("product_materials")
    .insert(materialIds.map((id) => ({ product_id: productId, material_id: id, is_default: id === defaultId })));
  if (error) throw error;
}

export async function replaceTiers(productId: string | null, tiers: Array<{ minQuantity: number; discountBps: number }>) {
  const del = db().from("volume_tiers").delete();
  const { error: delError } = await (productId ? del.eq("product_id", productId) : del.is("product_id", null));
  if (delError) throw delError;
  if (tiers.length === 0) return;
  const { error } = await db()
    .from("volume_tiers")
    .insert(tiers.map((t) => ({ product_id: productId, min_quantity: t.minQuantity, discount_bps: t.discountBps })));
  if (error) throw error;
}

export async function insertDivision(row: { slug: string; name: string; tagline: string; description: string; sort_order: number }) {
  const { error } = await db().from("divisions").insert(row);
  if (error) throw error;
}

export async function setDivisionActive(divisionId: string, isActive: boolean) {
  const { error } = await db().from("divisions").update({ is_active: isActive }).eq("id", divisionId);
  if (error) throw error;
}

export async function insertProduct(row: { division_id: string; slug: string; name: string; product_type: string; parameters: JsonColumn; is_active: boolean }) {
  const { data, error } = await db().from("products").insert(row).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function saveTemplate(row: { id?: string; product_id: string; name: string; scene: JsonColumn; is_default: boolean; is_active: boolean }) {
  if (row.is_default) {
    const { error } = await db().from("templates").update({ is_default: false }).eq("product_id", row.product_id);
    if (error) throw error;
  }
  const { error } = row.id
    ? await db().from("templates").update({ name: row.name, scene: row.scene, is_default: row.is_default, is_active: row.is_active }).eq("id", row.id).eq("product_id", row.product_id)
    : await db().from("templates").insert(row);
  if (error) throw error;
}

export async function deleteTemplate(productId: string, templateId: string) {
  const { error } = await db().from("templates").delete().eq("id", templateId).eq("product_id", productId);
  if (error) throw error;
}

export async function listGallery() {
  const { data, error } = await db()
    .from("gallery_items")
    .select("id, title, description, image_path, is_published, sort_order, divisions(name, slug)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((g) => ({ ...g, imageUrl: publicImageUrl(g.image_path)! }));
}

export async function uploadGalleryImage(path: string, bytes: Uint8Array, contentType: string) {
  const { error } = await db().storage.from(BUCKET.GALLERY).upload(path, bytes, { contentType, upsert: false });
  if (error) throw error;
}

export async function insertGalleryItem(row: { division_id: string; title: string; description: string; image_path: string }) {
  const { error } = await db().from("gallery_items").insert(row);
  if (error) throw error;
}

export async function updateGalleryItem(itemId: string, patch: { is_published: boolean }) {
  const { error } = await db().from("gallery_items").update(patch).eq("id", itemId);
  if (error) throw error;
}

export async function deleteGalleryItem(itemId: string) {
  const { data } = await db().from("gallery_items").select("image_path").eq("id", itemId).maybeSingle();
  const { error } = await db().from("gallery_items").delete().eq("id", itemId);
  if (error) throw error;
  // Uploaded photos live in the bucket as "gallery/<file>"; bundled samples (/gallery/…) are left alone.
  if (data?.image_path.startsWith(`${BUCKET.GALLERY}/`)) {
    await db().storage.from(BUCKET.GALLERY).remove([data.image_path.slice(BUCKET.GALLERY.length + 1)]);
  }
}
