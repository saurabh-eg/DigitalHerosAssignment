"use server";

import type { ActionResult } from "@/lib/action-result";
import * as proofsController from "@/modules/proofs/proofs.controller";

export async function approveProofAction(prev: ActionResult, formData: FormData) {
  return proofsController.approve(prev, formData);
}

export async function requestChangesAction(prev: ActionResult, formData: FormData) {
  return proofsController.requestChanges(prev, formData);
}

export async function resubmitDesignAction(prev: ActionResult, formData: FormData) {
  return proofsController.resubmit(prev, formData);
}
