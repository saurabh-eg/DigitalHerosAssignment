"use server";

import type { ActionResult } from "@/lib/action-result";
import * as designerController from "@/modules/designer/designer.controller";

export async function startJobAction(prev: ActionResult, formData: FormData) {
  return designerController.startJob(prev, formData);
}

export async function saveDraftAction(input: unknown) {
  return designerController.saveDraft(input);
}

export async function registerAssetAction(input: unknown) {
  return designerController.registerAsset(input);
}

export async function saveCsvMappingAction(input: unknown) {
  return designerController.saveCsvMapping(input);
}

export async function saveVersionAction(input: unknown) {
  return designerController.saveVersion(input);
}
