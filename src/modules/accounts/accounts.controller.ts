import "server-only";
import { revalidatePath } from "next/cache";
import { ROUTES } from "@/constants/routes";
import { formDataToObject, handleAction, ok, parseInput, type ActionResult } from "@/lib/action-result";
import { listMyDesigns } from "@/modules/designer/designer.service";
import { listMyOrders } from "@/modules/orders/orders.service";
import { listForOrder } from "@/modules/proofs/proofs.service";
import * as accountsService from "./accounts.service";
import type { Profile } from "./accounts.types";
import { updateProfileSchema } from "./accounts.validator";

export async function getMyProfile(): Promise<Profile> {
  return accountsService.getMyProfile();
}

/** PRD §10: everything the customer overview shows, gathered from the orders, proofs and designer modules. */
export async function getDashboard() {
  const [profile, orders, designs] = await Promise.all([accountsService.getMyProfile(), listMyOrders(), listMyDesigns()]);
  const awaiting = orders.filter((o) => o.status === "proof" || o.status === "artwork");
  const activeProofs = await Promise.all(
    awaiting.map(async (order) => {
      const proofs = await listForOrder(order);
      return {
        order,
        lines: order.items.map((item) => {
          const latest = proofs.filter((p) => p.orderItemId === item.id).sort((a, b) => b.version - a.version)[0];
          return { item, version: latest?.version ?? null, status: latest?.status ?? null };
        }),
      };
    }),
  );
  return {
    profile,
    missing: accountsService.missingProfileFields(profile),
    activeProofs,
    recentOrders: orders.slice(0, 5),
    designCount: designs.length,
    recentDesigns: designs.slice(0, 3),
  };
}

export function missingProfileFields(profile: Profile): string[] {
  return accountsService.missingProfileFields(profile);
}

export async function updateMyProfile(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return handleAction(async () => {
    const input = parseInput(updateProfileSchema, formDataToObject(formData));
    await accountsService.updateMyProfile(input);
    revalidatePath(ROUTES.account.root, "layout");
    return ok(undefined, "Profile saved.");
  });
}
