import "server-only";
import { ORDER_LIMITS } from "@/constants/limits";
import { AppError, notFound } from "@/lib/errors";
import { requireUser } from "@/modules/auth/auth.service";
import { getTaxSettings } from "@/modules/catalogue/catalogue.service";
import type { SessionUser } from "@/modules/auth/auth.types";
import { engravedCharacters, loadLatestForOrder, loadSavedVersion, type SavedVersion } from "@/modules/designer/designer.orders";
import * as ordersRepository from "@/modules/orders/orders.repository";
import { getOrderForUser } from "@/modules/orders/orders.service";
import type { Order, ShippingAddress } from "@/modules/orders/orders.types";
import { applyTax, deliveryCharge } from "@/modules/pricing/pricing.engine";
import { quote } from "@/modules/pricing/pricing.service";
import type { DeliveryMethod } from "@/modules/pricing/pricing.types";

type ItemWrite = ordersRepository.ItemWrite;

/** Prices one saved design version on the server from the current catalogue (never from the browser). */
async function priceSaved(saved: SavedVersion, quantity: number, reorderOfItemId: string | null = null): Promise<ItemWrite> {
  const configuration = { ...saved.configuration, quantity, characterCount: engravedCharacters(saved) };
  const result = await quote(saved.productId, configuration);
  return {
    productId: saved.productId,
    productName: result.product.name,
    productType: result.product.productType,
    configuration,
    quantity,
    unitPriceMinor: result.price.unitMinor,
    discountBps: result.price.discountBps,
    discountMinor: result.price.discountMinor,
    setupFeeMinor: result.price.setupFeeMinor,
    lineTotalMinor: result.price.totalMinor,
    taxMinor: result.price.taxMinor,
    designId: saved.designId,
    designVersion: saved.version,
    csvDatasetId: saved.csvDatasetId,
    reorderOfItemId,
  };
}

/** Recomputes the order totals from its lines plus delivery (D-013). Tax is extracted per line. */
export async function recalculateTotals(orderId: string): Promise<Order> {
  const order = await ordersRepository.findOrder(orderId);
  if (!order) throw notFound("Order not found.");
  const items = order.items.reduce((sum, i) => sum + i.lineTotalMinor, 0);
  const itemsTax = order.items.reduce((sum, i) => sum + i.taxMinor, 0);
  const discounts = order.items.reduce((sum, i) => sum + i.discountMinor, 0);
  const delivery = order.items.length > 0 ? deliveryCharge(items, order.deliveryMethod) : 0;
  const deliveryTax = applyTax(delivery, await getTaxSettings()).taxMinor;
  await ordersRepository.updateOrder(orderId, {
    itemsTotalMinor: items,
    discountTotalMinor: discounts,
    deliveryMinor: delivery,
    taxMinor: itemsTax + deliveryTax,
    totalMinor: items + delivery,
  });
  return (await ordersRepository.findOrder(orderId))!;
}

async function openQuote(user: SessionUser): Promise<Order | null> {
  return ordersRepository.findOpenQuote(user.id);
}

async function ownedQuote(user: SessionUser): Promise<Order> {
  const quoteOrder = await openQuote(user);
  if (!quoteOrder) throw notFound("Your basket is empty.");
  return quoteOrder;
}

export async function getCart(): Promise<Order | null> {
  const user = await requireUser();
  return openQuote(user);
}

/** PRD §01: a saved design goes into the basket at its saved quantity; re-adding updates that line. */
export async function addDesign(designId: string): Promise<Order> {
  const user = await requireUser();
  const saved = await loadLatestForOrder(designId);
  const item = await priceSaved(saved, saved.configuration.quantity);

  const existing = await openQuote(user);
  if (existing && existing.items.length >= ORDER_LIMITS.maxItemsPerCart && !existing.items.some((i) => i.designId === designId)) {
    throw new AppError("VALIDATION", `A basket can hold up to ${ORDER_LIMITS.maxItemsPerCart} items.`);
  }
  const orderId = existing?.id ?? (await ordersRepository.createQuote(user.organizationId, user.id));
  const line = existing?.items.find((i) => i.designId === designId);
  if (line) await ordersRepository.updateItem(line.id, orderId, item);
  else await ordersRepository.insertItem(orderId, item);
  return recalculateTotals(orderId);
}

export async function updateQuantity(itemId: string, quantity: number): Promise<Order> {
  const user = await requireUser();
  const cart = await ownedQuote(user);
  const line = cart.items.find((i) => i.id === itemId);
  if (!line?.designId || line.designVersion === null) throw notFound("That item isn't in your basket.");
  if (line.csvDatasetId) throw new AppError("VALIDATION", "Spreadsheet jobs are priced by row count. Change the spreadsheet to change the quantity.");
  const saved = await loadSavedVersion(line.designId, line.designVersion, "user");
  await ordersRepository.updateItem(itemId, cart.id, await priceSaved(saved, quantity, line.reorderOfItemId));
  return recalculateTotals(cart.id);
}

export async function removeItem(itemId: string): Promise<Order> {
  const user = await requireUser();
  const cart = await ownedQuote(user);
  await ordersRepository.deleteItem(itemId, cart.id);
  return recalculateTotals(cart.id);
}

export async function setDelivery(method: DeliveryMethod, address: ShippingAddress | null): Promise<Order> {
  const user = await requireUser();
  const cart = await ownedQuote(user);
  await ordersRepository.updateOrder(cart.id, { deliveryMethod: method, shippingAddress: method === "delivery" ? address : null });
  return recalculateTotals(cart.id);
}

/**
 * Re-prices every line from the current catalogue right before payment, so the amount charged is
 * always the server's own figure. Returns the refreshed order.
 */
export async function refreshForCheckout(user: SessionUser): Promise<Order> {
  const cart = await ownedQuote(user);
  if (cart.items.length === 0) throw new AppError("VALIDATION", "Your basket is empty.");
  if (cart.deliveryMethod === "delivery" && !cart.shippingAddress) {
    throw new AppError("VALIDATION", "Add a delivery address, or choose free collection.");
  }
  for (const line of cart.items) {
    if (!line.designId || line.designVersion === null) throw new AppError("VALIDATION", "An item in your basket has no saved design.");
    const saved = await loadSavedVersion(line.designId, line.designVersion, "user");
    const quantity = saved.csvRows ? saved.csvRows.length : line.quantity;
    await ordersRepository.updateItem(line.id, cart.id, await priceSaved(saved, quantity, line.reorderOfItemId));
  }
  return recalculateTotals(cart.id);
}

/**
 * PRD §09 one-click reorder: puts every line of a past order back in the basket with the same approved
 * artwork version and quantity, priced at today's rates (D-007, D-065).
 */
export async function reorder(orderId: string): Promise<Order> {
  const user = await requireUser();
  const source = await getOrderForUser(orderId, user);
  if (source.status !== "production" && source.status !== "completed") {
    throw new AppError("VALIDATION", "Only orders with approved artwork can be reordered.");
  }
  const existing = await openQuote(user);
  const quoteId = existing?.id ?? (await ordersRepository.createQuote(user.organizationId, user.id, source.id));
  for (const line of source.items) {
    if (!line.designId || line.designVersion === null) continue;
    const saved = await loadSavedVersion(line.designId, line.designVersion, "user");
    const already = existing?.items.find((i) => i.reorderOfItemId === line.id);
    const priced = await priceSaved(saved, line.quantity, line.id);
    if (already) await ordersRepository.updateItem(already.id, quoteId, priced);
    else await ordersRepository.insertItem(quoteId, priced);
  }
  return recalculateTotals(quoteId);
}
