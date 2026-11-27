import "server-only";
import { SECURITY_LIMITS } from "@/constants/limits";
import type { Bucket } from "@/constants/storage";
import type { Json } from "@/lib/supabase/database.types";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabasePublic } from "@/lib/supabase/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProductConfiguration } from "@/modules/catalogue/catalogue.validator";
import type { ArtworkSource, DesignTemplate } from "./designer.types";
import { templateSceneSchema, type Scene } from "./designer.validator";

// All design reads/writes run as the signed-in user, so RLS limits them to the user's organization.

/** Validated domain objects stored in jsonb columns. */
type JsonColumn = NonNullable<Json>;

/**
 * `service` reads bypass RLS. Only order fulfilment and proof generation use them (e.g. inside the Stripe
 * webhook, where no user is signed in), after the order itself has been verified.
 */
type Access = "user" | "service";
async function db(access: Access) {
  return access === "service" ? supabaseAdmin() : await createSupabaseServerClient();
}

export async function findVersion(designId: string, version: number, access: Access = "user") {
  const supabase = await db(access);
  const { data, error } = await supabase
    .from("design_versions")
    .select("version, scene, upload_id, csv_dataset_id, designs(product_id, configuration, organization_id)")
    .eq("design_id", designId)
    .eq("version", version)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function findCsvRowsSource(datasetId: string, access: Access = "user") {
  const supabase = await db(access);
  const { data, error } = await supabase
    .from("csv_datasets")
    .select("id, columns, row_count, mapping, uploads(bucket, path)")
    .eq("id", datasetId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function findUploadAs(id: string, access: Access) {
  const supabase = await db(access);
  const { data, error } = await supabase
    .from("uploads")
    .select("id, bucket, path, original_name, mime_type, size_bytes, width_px, height_px, needs_preflight")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function downloadAs(bucket: Bucket, path: string, access: Access): Promise<Uint8Array | null> {
  const supabase = await db(access);
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

const DESIGN_COLUMNS =
  "id, organization_id, product_id, template_id, name, configuration, source, current_version, is_saved, draft_scene, upload_id, csv_dataset_id, updated_at";

export async function listTemplates(productId: string): Promise<DesignTemplate[]> {
  const { data, error } = await supabasePublic()
    .from("templates")
    .select("id, name, scene, is_default")
    .eq("product_id", productId)
    .order("sort_order");
  if (error) throw error;
  return data.map((t) => ({ id: t.id, name: t.name, scene: templateSceneSchema.parse(t.scene), isDefault: t.is_default }));
}

export async function insertDesign(row: {
  organizationId: string;
  createdBy: string;
  productId: string;
  templateId: string | null;
  name: string;
  configuration: ProductConfiguration;
  source: ArtworkSource;
  scene: Scene;
}): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("designs")
    .insert({
      organization_id: row.organizationId,
      created_by: row.createdBy,
      product_id: row.productId,
      template_id: row.templateId,
      name: row.name,
      configuration: row.configuration as unknown as JsonColumn,
      source: row.source,
      draft_scene: row.scene as unknown as JsonColumn,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function findDesign(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("designs").select(DESIGN_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listDesigns(organizationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("designs")
    .select("id, name, source, current_version, configuration, updated_at, products(name)")
    .eq("organization_id", organizationId)
    .eq("is_saved", true)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function updateDesign(
  id: string,
  patch: Partial<{ name: string; scene: Scene; configuration: ProductConfiguration; uploadId: string | null; csvDatasetId: string | null; templateId: string | null }>,
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("designs")
    .update({
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.scene !== undefined && { draft_scene: patch.scene as unknown as JsonColumn }),
      ...(patch.configuration !== undefined && { configuration: patch.configuration as unknown as JsonColumn }),
      ...(patch.uploadId !== undefined && { upload_id: patch.uploadId }),
      ...(patch.csvDatasetId !== undefined && { csv_dataset_id: patch.csvDatasetId }),
      ...(patch.templateId !== undefined && { template_id: patch.templateId }),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function insertVersion(row: {
  designId: string;
  version: number;
  scene: Scene | null;
  uploadId: string | null;
  csvDatasetId: string | null;
  createdBy: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("design_versions").insert({
    design_id: row.designId,
    version: row.version,
    scene: row.scene as unknown as JsonColumn,
    upload_id: row.uploadId,
    csv_dataset_id: row.csvDatasetId,
    created_by: row.createdBy,
  });
  if (error) throw error;
  const { error: updateError } = await supabase
    .from("designs")
    .update({ current_version: row.version, is_saved: true })
    .eq("id", row.designId);
  if (updateError) throw updateError;
}

export async function insertUpload(row: {
  organizationId: string;
  uploadedBy: string;
  kind: "artwork" | "logo" | "csv";
  bucket: Bucket;
  path: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  widthPx: number | null;
  heightPx: number | null;
  needsPreflight: boolean;
}): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("uploads")
    .insert({
      organization_id: row.organizationId,
      uploaded_by: row.uploadedBy,
      kind: row.kind,
      bucket: row.bucket,
      path: row.path,
      original_name: row.originalName,
      mime_type: row.mimeType,
      size_bytes: row.sizeBytes,
      width_px: row.widthPx,
      height_px: row.heightPx,
      needs_preflight: row.needsPreflight,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function findUpload(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("uploads")
    .select("id, bucket, path, original_name, mime_type, size_bytes, width_px, height_px, needs_preflight")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertCsvDataset(row: {
  organizationId: string;
  uploadId: string;
  columns: string[];
  rowCount: number;
  mapping: Record<string, string>;
}): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("csv_datasets")
    .insert({
      organization_id: row.organizationId,
      upload_id: row.uploadId,
      columns: row.columns,
      row_count: row.rowCount,
      mapping: row.mapping,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function findCsvDataset(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("csv_datasets")
    .select("id, columns, row_count, mapping, uploads(bucket, path)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateCsvMapping(id: string, mapping: Record<string, string>) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("csv_datasets").update({ mapping }).eq("id", id);
  if (error) throw error;
}

/** Downloads a customer-owned object; storage RLS limits this to the user's organization folder. */
export async function downloadObject(bucket: Bucket, path: string): Promise<Uint8Array | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

export async function signedUrls(bucket: Bucket, paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, SECURITY_LIMITS.designerAssetUrlTtlSeconds);
  if (error) throw error;
  return Object.fromEntries(data.filter((d) => d.signedUrl && d.path).map((d) => [d.path!, d.signedUrl!]));
}

export async function removeObject(bucket: Bucket, path: string) {
  const supabase = await createSupabaseServerClient();
  await supabase.storage.from(bucket).remove([path]);
}
