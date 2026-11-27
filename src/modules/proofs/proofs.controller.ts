import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ROUTES } from "@/constants/routes";
import { formDataToObject, handleAction, ok, parseInput, type ActionResult } from "@/lib/action-result";
import * as proofsService from "./proofs.service";

const approveSchema = z.object({ proofId: z.uuid(), orderId: z.uuid() });
const changesSchema = z.object({
  proofId: z.uuid(),
  orderId: z.uuid(),
  comment: z.string().trim().min(5, "Tell us what to change (at least a few words).").max(1000),
});
const resubmitSchema = z.object({ orderId: z.uuid(), itemId: z.uuid() });

export async function approve(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return handleAction(async () => {
    const { proofId, orderId } = parseInput(approveSchema, formDataToObject(formData));
    const order = await proofsService.approve(proofId);
    revalidatePath(ROUTES.account.order(orderId));
    return ok(undefined, order.status === "production" ? "Approved. Your job is now in production." : "Approved. Please check the remaining proofs.");
  });
}

export async function requestChanges(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return handleAction(async () => {
    const { proofId, orderId, comment } = parseInput(changesSchema, formDataToObject(formData));
    await proofsService.requestChanges(proofId, comment);
    revalidatePath(ROUTES.account.order(orderId));
    return ok(undefined, "Change request sent. Edit your design, save it, then submit the revision here.");
  });
}

export async function resubmit(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return handleAction(async () => {
    const { orderId, itemId } = parseInput(resubmitSchema, formDataToObject(formData));
    await proofsService.resubmit(orderId, itemId);
    revalidatePath(ROUTES.account.order(orderId));
    return ok(undefined, "Revised proof issued. Please review it.");
  });
}
