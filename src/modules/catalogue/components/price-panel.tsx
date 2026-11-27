"use client";

import { DELIVERY_CONFIG } from "@/constants/site-config";
import { cn } from "@/lib/cn";
import { formatMoney, formatPercent } from "@/lib/money";
import { AnimatedMoney } from "@/modules/pricing/components/animated-money";
import { priceBreaks } from "@/modules/pricing/pricing.engine";
import type { ConfiguratorState } from "./use-configurator";

export function PricePanel({ configurator }: { configurator: ConfiguratorState }) {
  const { price, issues, product, setQuantity, configuration } = configurator;
  const { tax, tiers } = product.pricing;

  if (!price) {
    return (
      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <p className="font-display text-lg font-semibold">No price yet</p>
        <p className="mt-1 text-sm text-ink-muted">{issues[0]?.message}</p>
      </div>
    );
  }

  const breaks = priceBreaks(price.baseUnitMinor, tiers, product.parameters.quantity.min);
  const freeDelivery = price.totalMinor >= DELIVERY_CONFIG.freeThresholdMinor;

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <p className="text-sm text-ink-muted">
        {configuration.quantity.toLocaleString("en-GB")} {configuration.quantity === 1 ? "copy" : "copies"},{" "}
        {configuration.widthMm} × {configuration.heightMm} mm
      </p>
      <AnimatedMoney minor={price.totalMinor} currency={tax.currency} className="mt-1 block font-display text-4xl font-semibold" />
      <p className="mt-1 text-sm text-ink-muted">
        {formatMoney(price.effectiveUnitMinor, tax.currency)} each, including {formatMoney(price.taxMinor, tax.currency)} {tax.label}
      </p>

      <dl className="mt-4 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 border-t border-line pt-4 text-sm">
        <dt className="text-ink-muted">Unit price</dt>
        <dd className="text-right">
          {price.discountBps > 0 && (
            <s className="mr-1.5 text-ink-muted">{formatMoney(price.baseUnitMinor, tax.currency)}</s>
          )}
          {formatMoney(price.unitMinor, tax.currency)}
        </dd>
        {price.discountMinor > 0 && (
          <>
            <dt className="text-success">Volume discount ({formatPercent(price.discountBps)})</dt>
            <dd className="text-right text-success">−{formatMoney(price.discountMinor, tax.currency)}</dd>
          </>
        )}
        {price.setupFeeMinor > 0 && (
          <>
            <dt className="text-ink-muted">One-off setup</dt>
            <dd className="text-right">{formatMoney(price.setupFeeMinor, tax.currency)}</dd>
          </>
        )}
        <dt className="text-ink-muted">Delivery</dt>
        <dd className="text-right">
          {freeDelivery ? "Free" : `${formatMoney(DELIVERY_CONFIG.flatFeeMinor, tax.currency)} or free collection`}
        </dd>
      </dl>

      {price.nextTier && (
        <button
          type="button"
          onClick={() => setQuantity(price.nextTier!.minQuantity)}
          className="mt-4 w-full rounded-md bg-accent-soft px-3 py-2.5 text-left text-sm text-accent transition-colors hover:bg-accent hover:text-accent-ink"
        >
          Order {price.nextTier.unitsToGo.toLocaleString("en-GB")} more and pay{" "}
          {formatMoney(price.nextTier.unitMinor, tax.currency)} each ({formatPercent(price.nextTier.discountBps)} off)
        </button>
      )}

      {breaks.length > 1 && (
        <table className="mt-4 w-full text-sm">
          <caption className="mb-1.5 text-left font-medium">Price breaks</caption>
          <thead className="sr-only">
            <tr>
              <th>Quantity</th>
              <th>Unit price</th>
            </tr>
          </thead>
          <tbody>
            {breaks.map((row, i) => {
              const upper = breaks[i + 1]?.minQuantity;
              const active = configuration.quantity >= row.minQuantity && (!upper || configuration.quantity < upper);
              return (
                <tr key={row.minQuantity} className={cn("border-t border-line", active && "font-semibold")}>
                  <td className="py-1.5">
                    <button type="button" onClick={() => setQuantity(row.minQuantity)} className="hover:text-accent">
                      {row.minQuantity.toLocaleString("en-GB")}
                      {upper ? `–${(upper - 1).toLocaleString("en-GB")}` : "+"}
                    </button>
                  </td>
                  <td className="py-1.5 text-right">
                    {formatMoney(row.unitMinor, tax.currency)}
                    {row.discountBps > 0 && <span className="ml-2 text-success">−{formatPercent(row.discountBps)}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
