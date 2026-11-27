import "server-only";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ROUTES } from "@/constants/routes";
import { formDataToObject, handleAction, ok, parseInput, type ActionResult } from "@/lib/action-result";
import { AppError } from "@/lib/errors";
import { previewSavedVersion } from "./designer.orders";
import * as designerService from "./designer.service";
import type { CsvData, DesignView, UploadedArtwork } from "./designer.types";
import { csvMappingSchema, saveDraftSchema, startJobSchema } from "./designer.validator";

export async function startJob(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return handleAction(async () => {
    const input = parseInput(startJobSchema, formDataToObject(formData));
    const designId = await designerService.startJob(input);
    redirect(input.path === "csv" ? `${ROUTES.designer(designId)}?panel=data` : ROUTES.designer(designId));
  });
}

/** Template previews for /design/new; null when the query string isn't a valid configuration. */
export async function previewStart(query: Record<string, string | string[] | undefined>) {
  const parsed = startJobSchema.safeParse(query);
  if (!parsed.success) return null;
  const preview = await designerService.previewTemplates(parsed.data.product, parsed.data.w, parsed.data.h).catch(() => null);
  return preview ? { input: parsed.data, ...preview } : null;
}

/** The product's default template rendered at its default size, for the product page hero (null if none). */
export async function productPreview(productId: string, widthMm: number, heightMm: number): Promise<{ svg: string; name: string } | null> {
  const preview = await designerService.previewTemplates(productId, widthMm, heightMm).catch(() => null);
  const template = preview?.templates.find((t) => t.isDefault) ?? preview?.templates[0];
  return template ? { svg: template.svg, name: template.name } : null;
}

export async function getDesignForPage(designId: string): Promise<DesignView> {
  if (!z.uuid().safeParse(designId).success) notFound();
  try {
    return await designerService.getDesign(designId);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}

export const listMyDesigns = designerService.listMyDesigns;

/** Saved designs with a rendered thumbnail of their latest version (PRD §09 saved designs). */
export async function listMyDesignsWithPreviews() {
  const designs = await designerService.listMyDesigns();
  return Promise.all(designs.map(async (d) => ({ ...d, preview: await previewSavedVersion(d.id, d.currentVersion, "user") })));
}

export async function saveDraft(input: unknown): Promise<ActionResult<{ savedAt: string }>> {
  return handleAction(async () => {
    const { designId, name, scene } = parseInput(saveDraftSchema, input);
    await designerService.saveDraft(designId, name, scene);
    return ok({ savedAt: new Date().toISOString() });
  });
}

const registerAssetSchema = z.object({
  designId: z.uuid(),
  kind: z.enum(["logo", "artwork", "csv"]),
  path: z.string().min(1).max(400),
  originalName: z.string().min(1).max(255),
});

export type RegisteredAsset =
  | { kind: "logo"; logo: designerService.RegisteredLogo }
  | { kind: "artwork"; artwork: UploadedArtwork }
  | { kind: "csv"; csv: CsvData };

export async function registerAsset(input: unknown): Promise<ActionResult<RegisteredAsset>> {
  return handleAction(async () => {
    const { designId, kind, path, originalName } = parseInput(registerAssetSchema, input);
    return ok(await designerService.registerAsset(designId, kind, path, originalName));
  });
}

export async function saveCsvMapping(input: unknown): Promise<ActionResult> {
  return handleAction(async () => {
    const { designId, mapping } = parseInput(z.object({ designId: z.uuid(), mapping: csvMappingSchema }), input);
    await designerService.saveCsvMapping(designId, mapping);
    return ok(undefined);
  });
}

export async function saveVersion(input: unknown): Promise<ActionResult<{ version: number }>> {
  return handleAction(async () => {
    const { designId } = parseInput(z.object({ designId: z.uuid() }), input);
    const result = await designerService.saveVersion(designId);
    return ok(result, `Saved as version ${result.version}.`);
  });
}
