"use server";

import type { ActionResult } from "@/lib/action-result";
import * as cartController from "@/modules/cart/cart.controller";
import * as paymentsController from "@/modules/payments/payments.controller";

export async function addToCartAction(input: unknown) {
  return cartController.addToCart(input);
}

export async function updateQuantityAction(prev: ActionResult, formData: FormData) {
  return cartController.updateQuantity(prev, formData);
}

export async function removeItemAction(formData: FormData) {
  return cartController.removeItem(formData);
}

export async function setDeliveryAction(prev: ActionResult, formData: FormData) {
  return cartController.setDelivery(prev, formData);
}

export async function reorderAction(prev: ActionResult, formData: FormData) {
  return cartController.reorder(prev, formData);
}

export async function checkoutAction() {
  return paymentsController.startCheckout();
}
