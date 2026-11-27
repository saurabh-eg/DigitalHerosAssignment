import "server-only";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ROUTES } from "@/constants/routes";
import { formDataToObject, handleAction, ok, parseInput, type ActionResult } from "@/lib/action-result";
import { AppError } from "@/lib/errors";
import * as service from "./catalogue.admin.service";
import { divisionActiveSchema, divisionCreateSchema, galleryCreateSchema, galleryUpdateSchema, pricingRuleSchema, productCreateSchema, productMaterialsSchema, productUpdateSchema, templateDeleteSchema, templateSaveSchema, tiersSchema, } from "./catalogue.admin.validator";

/** Catalogue pages are statically generated; refresh them all after any change (D-041). */
function refreshStorefront(productId?: string) {
  revalidatePath("/", "layout");
  if (productId) revalidatePath(ROUTES.admin.catalogueProduct(productId));
}

export const overview = service.overview;
export const listGallery = service.listGallery;

export async function productDetail(productId: string) {
  if (!z.uuid().safeParse(productId).success) notFound();
  try {
    return await service.productDetail(productId);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}

/** Repeated form fields (materialIds, tier rows) that formDataToObject would collapse. */
function tierRows(formData: FormData) {
  const quantities = formData.getAll("minQuantity").map(String);
  const discounts = formData.getAll("discountPct").map(String);
  return quantities.map((q, i) => ({ minQuantity: q, discountBps: discounts[i] })).filter((t) => t.minQuantity !== "" && t.discountBps !== "");
}

export async function updateProduct(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return handleAction(async () => {
    const input = parseInput(productUpdateSchema, formDataToObject(formData));
    await service.updateProduct(input);
    refreshStorefront(input.productId);
    return ok(undefined, "Product saved. The storefront is updated.");
  });
}

export async function updatePricing(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return handleAction(async () => {
    const input = parseInput(pricingRuleSchema, formDataToObject(formData));
    await service.updatePricing(input);
    refreshStorefront(input.productId);
    return ok(undefined, "Pricing saved. New quotes use it immediately; paid orders keep their price.");
  });
}

export async function updateMaterials(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return handleAction(async () => {
    const input = parseInput(productMaterialsSchema, {
      productId: formData.get("productId"),
      materialIds: formData.getAll("materialIds"),
      defaultMaterialId: formData.get("defaultMaterialId"),
    });
    await service.updateMaterials(input.productId, input.materialIds, input.defaultMaterialId);
    refreshStorefront(input.productId);
    return ok(undefined, "Materials saved.");
  });
}

export async function updateTiers(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return handleAction(async () => {
    const productId = formData.get("productId");
    const input = parseInput(tiersSchema, { productId: productId ? String(productId) : null, tiers: tierRows(formData) });
    await service.updateTiers(input.productId, input.tiers);
    refreshStorefront(input.productId ?? undefined);
    return ok(undefined, input.productId ? "Volume discounts saved for this product." : "Default volume discounts saved.");
  });
}

export async function createDivision(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return handleAction(async () => {
    const input = parseInput(divisionCreateSchema, formDataToObject(formData));
    await service.createDivision(input);
    refreshStorefront();
    return ok(undefined, `Division "${input.name}" created. Add a product to make it sellable.`);
  });
}

export async function setDivisionActive(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return handleAction(async () => {
    const input = parseInput(divisionActiveSchema, formDataToObject(formData));
    await service.setDivisionActive(input.divisionId, input.isActive);
    refreshStorefront();
    return ok(undefined, input.isActive ? "Division shown on the storefront." : "Division hidden from the storefront.");
  });
}

export async function createProduct(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return handleAction(async () => {
    const input = parseInput(productCreateSchema, formDataToObject(formData));
    const productId = await service.createProduct(input);
    redirect(ROUTES.admin.catalogueProduct(productId));
  });
}

export async function saveTemplate(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return handleAction(async () => {
    const input = parseInput(templateSaveSchema, formDataToObject(formData));
    await service.saveTemplate(input);
    refreshStorefront(input.productId);
    return ok(undefined, "Template saved.");
  });
}

export async function deleteTemplate(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return handleAction(async () => {
    const input = parseInput(templateDeleteSchema, formDataToObject(formData));
    await service.deleteTemplate(input.productId, input.templateId);
    refreshStorefront(input.productId);
    return ok(undefined, "Template deleted.");
  });
}

export async function addGalleryItem(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return handleAction(async () => {
    const input = parseInput(galleryCreateSchema, formDataToObject(formData));
    const file = formData.get("photo");
    if (!(file instanceof File)) throw new AppError("VALIDATION", "Choose a photo to upload.");
    await service.addGalleryItem(input, file);
    refreshStorefront();
    revalidatePath(ROUTES.admin.gallery);
    return ok(undefined, "Added to the gallery.");
  });
}

export async function updateGalleryItem(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return handleAction(async () => {
    const input = parseInput(galleryUpdateSchema, formDataToObject(formData));
    await service.updateGalleryItem(input.itemId, input.action);
    refreshStorefront();
    revalidatePath(ROUTES.admin.gallery);
    return ok(undefined, input.action === "delete" ? "Removed." : input.action === "publish" ? "Published." : "Hidden.");
  });
}
