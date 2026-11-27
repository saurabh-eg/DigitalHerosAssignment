"use client";

import Link from "next/link";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { formatMoney, formatPercent } from "@/lib/money";
import { AnimatedMoney } from "@/modules/pricing/components/animated-money";
import type { ProductDetail } from "../catalogue.types";
import { useConfigurator } from "./use-configurator";

/** Quantity stops for the slider; snapping to round numbers keeps the price easy to compare. */
function quantityStops(product: ProductDetail): number[] {
  const { min, max } = product.parameters.quantity;
  const stops = [1, 5, 10, 25, 50, 100, 150, 250, 500, 750, 1000, 2500, 5000];
  return [...new Set([min, ...stops.filter((s) => s > min && s <= max)])];
}

function Ticket({ product }: { product: ProductDetail }) {
  const c = useConfigurator(product);
  const stops = quantityStops(product);
  const index = Math.max(0, stops.findIndex((s) => s >= c.configuration.quantity));
  const { price, configuration } = c;
  const currency = product.pricing.tax.currency;
  const material = product.materials.find((m) => m.id === configuration.materialId);

  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-ink-muted">Size</dt>
          <dd className="font-medium">
            {configuration.widthMm} × {configuration.heightMm} mm
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">Material</dt>
          <dd className="font-medium">{material?.name}</dd>
        </div>
      </dl>

      <label className="flex flex-col gap-2">
        <span className="flex items-baseline justify-between text-sm">
          <span className="text-ink-muted">Quantity</span>
          <span className="font-display text-2xl font-semibold">{configuration.quantity.toLocaleString("en-GB")}</span>
        </span>
        <input
          type="range"
          min={0}
          max={stops.length - 1}
          value={index}
          onChange={(e) => c.setQuantity(stops[e.target.valueAsNumber])}
          aria-valuetext={`${configuration.quantity} copies`}
          className="w-full accent-accent"
        />
      </label>

      {price && (
        <div className="flex items-end justify-between gap-4 border-t border-dashed border-ink/40 pt-4">
          <div>
            <AnimatedMoney minor={price.totalMinor} currency={currency} className="block font-display text-4xl font-semibold leading-none" />
            <p className="mt-1.5 text-sm text-ink-muted">
              {formatMoney(price.effectiveUnitMinor, currency)} each, {product.pricing.tax.label} included
            </p>
          </div>
          {price.discountBps > 0 && (
            <p className="rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent">
              {formatPercent(price.discountBps)} off
            </p>
          )}
        </div>
      )}

      <Link href={ROUTES.product(product.divisionSlug, product.slug)} className={buttonClasses({ size: "lg" }, "w-full")}>
        Configure {product.name.toLowerCase()}
      </Link>
    </div>
  );
}

/** The hero's live price demo: pick a product, drag the quantity, watch the price and discount change. */
export function JobTicket({ products }: { products: ProductDetail[] }) {
  const [productId, setProductId] = useState(products[0]?.id);
  const product = products.find((p) => p.id === productId);
  if (!product) return null;

  return (
    <div className="crop-marks">
      <div className="rounded-sm bg-surface p-5 shadow-[0_1px_0_var(--color-line)] sm:p-6">
        <label className="mb-5 flex flex-col gap-1.5 text-sm">
          <span className="text-ink-muted">Job</span>
          <select
            value={product.id}
            onChange={(e) => setProductId(e.target.value)}
            className="h-11 rounded-md border border-line bg-surface px-3 text-base font-medium focus:border-ink focus:outline-none"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        {/* Keyed so each product starts from its own defaults. */}
        <Ticket key={product.id} product={product} />
      </div>
    </div>
  );
}
