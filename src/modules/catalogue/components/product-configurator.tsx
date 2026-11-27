"use client";

import Link from "next/link";
import { useId } from "react";
import { buttonClasses } from "@/components/ui/button";
import { ORIENTATION, type Orientation } from "@/constants/print";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/cn";
import { formatMoney, formatPercent } from "@/lib/money";
import { AnimatedMoney } from "@/modules/pricing/components/animated-money";
import type { ProductDetail } from "../catalogue.types";
import { PricePanel } from "./price-panel";
import { configurationQuery, orient, useConfigurator, type ConfiguratorState } from "./use-configurator";

const ORIENTATION_LABEL: Record<Orientation, string> = { portrait: "Portrait", landscape: "Landscape" };

function Choice({
  selected,
  onSelect,
  children,
  className,
}: {
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "rounded-md border px-3 py-2 text-left text-sm transition-colors",
        selected ? "border-ink bg-ink text-surface" : "border-line bg-surface hover:border-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

function Section({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="mb-2.5 font-display text-base font-semibold">{title}</legend>
      {children}
      {hint && <p className="text-sm text-ink-muted">{hint}</p>}
    </fieldset>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm">
      <span className="text-ink-muted">{label}</span>
      <span className="flex items-center rounded-md border border-line bg-surface focus-within:border-ink">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(e.target.valueAsNumber)}
          className="h-11 w-full min-w-0 bg-transparent px-3 text-base outline-none"
        />
        {suffix && <span className="pr-3 text-ink-muted">{suffix}</span>}
      </span>
    </label>
  );
}

function SizeControls({ c }: { c: ConfiguratorState }) {
  const { size, orientations } = c.product.parameters;
  const { widthMm, heightMm, orientation } = c.configuration;
  const isPreset = (w: number, h: number) =>
    Math.min(w, h) === Math.min(widthMm, heightMm) && Math.max(w, h) === Math.max(widthMm, heightMm);

  return (
    <Section
      title="Size"
      hint={
        size.mode === "custom"
          ? `Any size from ${size.widthMm.min} to ${size.widthMm.max} mm wide and ${size.heightMm.min} to ${size.heightMm.max} mm high.`
          : undefined
      }
    >
      {size.presets.length > 0 && (
        <div role="radiogroup" aria-label="Common sizes" className="flex flex-wrap gap-2">
          {size.presets.map((p) => (
            <Choice key={p.label} selected={isPreset(p.widthMm, p.heightMm)} onSelect={() => c.setSize(p.widthMm, p.heightMm)}>
              {p.label}
            </Choice>
          ))}
        </div>
      )}
      {size.mode === "custom" && (
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <NumberInput label="Width" suffix="mm" value={widthMm} min={size.widthMm.min} max={size.widthMm.max} onChange={(w) => c.setSize(w, heightMm)} />
          <button
            type="button"
            onClick={() => c.setSize(heightMm, widthMm)}
            className="mb-1 grid size-9 place-items-center rounded-md border border-line bg-surface text-ink-muted hover:border-ink hover:text-ink"
            aria-label="Swap width and height"
            title="Swap width and height"
          >
            ⇄
          </button>
          <NumberInput label="Height" suffix="mm" value={heightMm} min={size.heightMm.min} max={size.heightMm.max} onChange={(h) => c.setSize(widthMm, h)} />
        </div>
      )}
      {size.mode === "preset" && orientations.length > 1 && (
        <div role="radiogroup" aria-label="Orientation" className="flex gap-2">
          {orientations.map((o) => (
            <Choice key={o} selected={orientation === o} onSelect={() => c.setOrientation(o)}>
              {ORIENTATION_LABEL[o]} ({orient(widthMm, heightMm, o).widthMm} × {orient(widthMm, heightMm, o).heightMm} mm)
            </Choice>
          ))}
        </div>
      )}
      {size.mode === "custom" && orientations.length === 1 && (
        <p className="text-sm text-ink-muted">Printed {ORIENTATION_LABEL[orientations[0]].toLowerCase()} only.</p>
      )}
    </Section>
  );
}

function MaterialControls({ c }: { c: ConfiguratorState }) {
  const base = c.product.materials.find((m) => m.isDefault)?.priceFactorBps ?? 10_000;
  return (
    <Section title="Material">
      <div role="radiogroup" aria-label="Material" className="grid gap-2 sm:grid-cols-2">
        {c.product.materials.map((m) => {
          const diff = Math.round(((m.priceFactorBps - base) / base) * 10_000);
          return (
            <Choice key={m.id} selected={c.configuration.materialId === m.id} onSelect={() => c.setMaterial(m.id)} className="flex flex-col gap-0.5">
              <span className="flex justify-between gap-2 font-medium">
                {m.name}
                <span className="shrink-0 font-normal opacity-75">
                  {diff === 0 ? "" : diff > 0 ? `+${formatPercent(diff)}` : `−${formatPercent(-diff)}`}
                </span>
              </span>
              <span className="opacity-75">{m.description}</span>
            </Choice>
          );
        })}
      </div>
    </Section>
  );
}

function QuantityControls({ c }: { c: ConfiguratorState }) {
  const { quantity } = c.product.parameters;
  const picks = [...new Set([quantity.min, quantity.default, ...c.product.pricing.tiers.map((t) => t.minQuantity)])]
    .filter((q) => q >= quantity.min && q <= quantity.max)
    .sort((a, b) => a - b);

  return (
    <Section
      title="Quantity"
      hint={`From ${quantity.min.toLocaleString("en-GB")} to ${quantity.max.toLocaleString("en-GB")}. Volume discounts apply automatically.`}
    >
      <div className="grid grid-cols-[minmax(0,10rem)_1fr] items-end gap-3">
        <NumberInput label="Copies" value={c.configuration.quantity} min={quantity.min} max={quantity.max} step={quantity.step} onChange={c.setQuantity} />
        <div role="radiogroup" aria-label="Common quantities" className="flex flex-wrap gap-2">
          {picks.map((q) => (
            <Choice key={q} selected={c.configuration.quantity === q} onSelect={() => c.setQuantity(q)}>
              {q.toLocaleString("en-GB")}
            </Choice>
          ))}
        </div>
      </div>
      {c.product.pricing.rule.strategy === "per_character" && (
        <div className="mt-2 max-w-[14rem]">
          <NumberInput
            label="Engraved characters per item (estimate)"
            value={c.configuration.characterCount}
            min={0}
            max={500}
            onChange={c.setCharacterCount}
          />
        </div>
      )}
    </Section>
  );
}

function StartJob({ c }: { c: ConfiguratorState }) {
  const { product, configuration, price } = c;
  const disabled = !price;
  const link = (path: "design" | "upload" | "csv") => ROUTES.startJob(configurationQuery(product.id, configuration, path));
  const cls = (variant: "primary" | "secondary") =>
    buttonClasses({ variant, size: "lg" }, cn("w-full", disabled && "pointer-events-none opacity-50"));

  return (
    <div className="flex flex-col gap-2">
      {product.supportsDesigner && (
        <Link href={link("design")} className={cls("primary")} aria-disabled={disabled}>
          Design it online
        </Link>
      )}
      {product.supportsUpload && (
        <Link href={link("upload")} className={cls("secondary")} aria-disabled={disabled}>
          Upload finished artwork
        </Link>
      )}
      {product.supportsVariableData && (
        <Link href={link("csv")} className={cls("secondary")} aria-disabled={disabled}>
          Merge names and numbers from a spreadsheet
        </Link>
      )}
      <p className="text-sm text-ink-muted">You&apos;ll approve a proof before anything is printed.</p>
    </div>
  );
}

export function ProductConfigurator({ product, showActions = true }: { product: ProductDetail; showActions?: boolean }) {
  const c = useConfigurator(product);
  const orientationNote =
    c.isCustom && product.parameters.orientations.length > 1
      ? ` · ${ORIENTATION_LABEL[c.configuration.orientation === ORIENTATION.LANDSCAPE ? "landscape" : "portrait"]}`
      : "";

  return (
    <div className="grid gap-8 pb-16 lg:grid-cols-[1fr_22rem] lg:items-start lg:pb-0">
      <form className="flex flex-col gap-8" onSubmit={(e) => e.preventDefault()} aria-label={`Configure ${product.name}${orientationNote}`}>
        <SizeControls c={c} />
        <MaterialControls c={c} />
        <QuantityControls c={c} />
      </form>
      <aside id="price" className="flex scroll-mt-24 flex-col gap-4 lg:sticky lg:top-20">
        <PricePanel configurator={c} />
        {showActions && <StartJob c={c} />}
      </aside>
      <MobilePriceBar c={c} />
    </div>
  );
}

/** On phones the price panel sits below the form, so keep the live total in view while choosing options. */
function MobilePriceBar({ c }: { c: ConfiguratorState }) {
  const currency = c.product.pricing.tax.currency;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        {c.price ? (
          <p className="text-sm">
            <AnimatedMoney minor={c.price.totalMinor} currency={currency} className="font-display text-xl font-semibold" />
            <span className="ml-2 text-ink-muted">{formatMoney(c.price.effectiveUnitMinor, currency)} each</span>
          </p>
        ) : (
          <p className="text-sm text-danger">{c.issues[0]?.message}</p>
        )}
        <a href="#price" className={buttonClasses({ size: "sm" }, "shrink-0")}>
          See breakdown
        </a>
      </div>
    </div>
  );
}
