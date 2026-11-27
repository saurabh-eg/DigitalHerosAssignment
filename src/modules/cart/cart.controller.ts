import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { formDataToObject, handleAction, ok, parseInput, type ActionResult } from "@/lib/action-result";
import { getProductById } from "@/modules/catalogue/catalogue.service";
import { previewSavedVersion, type ItemPreview } from "@/modules/designer/designer.orders";
import type { Order } from "@/modules/orders/orders.types";
import * as cartService from "./cart.service";
import { addToCartSchema, deliverySchema, removeItemSchema, reorderSchema, updateQuantitySchema } from "./cart.validator";

export type LineDetails = { preview: ItemPreview | null; materialName: string | null; productPath: string | null };

/** Preview, material and product link for each line of an order or basket. */
export async function lineDetails(order: Order, access: "user" | "service" = "user"): Promise<Record<string, LineDetails>> {
  const entries = await Promise.all(
    order.items.map(async (item) => {
      const [product, preview] = await Promise.all([
        getProductById(item.productId),
        item.designId && item.designVersion !== null ? previewSavedVersion(item.designId, item.designVersion, access) : null,
      ]);
      return [
        item.id,
        {
          preview,
          materialName: product?.materials.find((m) => m.id === item.configuration.materialId)?.name ?? null,
          productPath: product ? ROUTES.product(product.divisionSlug, product.slug) : null,
        },
      ] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export async function getCartPage() {
  const cart = await cartService.getCart();
  return { cart, details: cart ? await lineDetails(cart) : {} };
}

export async function addToCart(input: unknown): Promise<ActionResult> {
  return handleAction(async () => {
    const { designId } = parseInput(addToCartSchema, input);
    await cartService.addDesign(designId);
    revalidatePath(ROUTES.cart);
    redirect(ROUTES.cart);
  });
}

export async function reorder(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return handleAction(async () => {
    const { orderId } = parseInput(reorderSchema, formDataToObject(formData));
    await cartService.reorder(orderId);
    revalidatePath(ROUTES.cart);
    redirect(ROUTES.cart);
  });
}

export async function updateQuantity(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return handleAction(async () => {
    const { itemId, quantity } = parseInput(updateQuantitySchema, formDataToObject(formData));
    await cartService.updateQuantity(itemId, quantity);
    revalidatePath(ROUTES.cart);
    return ok(undefined, "Quantity updated.");
  });
}

export async function removeItem(formData: FormData): Promise<void> {
  const { itemId } = parseInput(removeItemSchema, formDataToObject(formData));
  await cartService.removeItem(itemId);
  revalidatePath(ROUTES.cart);
}

export async function setDelivery(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return handleAction(async () => {
    const input = parseInput(deliverySchema, formDataToObject(formData));
    if (input.deliveryMethod === "delivery") {
      const { deliveryMethod, ...address } = input;
      await cartService.setDelivery(deliveryMethod, address);
    } else {
      await cartService.setDelivery("collection", null);
    }
    revalidatePath(ROUTES.cart);
    return ok(undefined, input.deliveryMethod === "delivery" ? "Delivery address saved." : "Free collection selected.");
  });
}
