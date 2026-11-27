"use client";

import { useState } from "react";
import { ORIENTATION, type Orientation } from "@/constants/print";
import { calculatePrice } from "@/modules/pricing/pricing.engine";
import type { PriceBreakdown } from "@/modules/pricing/pricing.types";
import type { ProductDetail } from "../catalogue.types";
import { validateConfiguration, type ConfigurationIssue, type ProductConfiguration } from "../catalogue.validator";

const DEFAULT_ENGRAVING_CHARACTERS = 40;

/** Puts the long side horizontal for landscape and vertical for portrait. */
export function orient(a: number, b: number, orientation: Orientation): { widthMm: number; heightMm: number } {
  const [short, long] = [Math.min(a, b), Math.max(a, b)];
  return orientation === ORIENTATION.LANDSCAPE ? { widthMm: long, heightMm: short } : { widthMm: short, heightMm: long };
}

function initialState(product: ProductDetail) {
  const { size, orientations, quantity } = product.parameters;
  const orientation = orientations[0];
  const start =
    size.mode === "preset"
      ? size.presets[0]
      : { widthMm: size.widthMm.default, heightMm: size.heightMm.default };
  const dims = size.mode === "preset" ? orient(start.widthMm, start.heightMm, orientation) : start;
  return {
    ...dims,
    orientation,
    materialId: (product.materials.find((m) => m.isDefault) ?? product.materials[0]).id,
    quantity: quantity.default,
    characterCount: product.pricing.rule.strategy === "per_character" ? DEFAULT_ENGRAVING_CHARACTERS : 0,
  };
}

function evaluate(
  product: ProductDetail,
  configuration: ProductConfiguration,
): { issues: ConfigurationIssue[]; price: PriceBreakdown | null } {
  const issues = validateConfiguration(
    product.parameters,
    product.materials.map((m) => m.id),
    configuration,
  );
  if (issues.length > 0) return { issues, price: null };
  const material = product.materials.find((m) => m.id === configuration.materialId)!;
  return {
    issues: [],
    price: calculatePrice({ ...product.pricing, materialFactorBps: material.priceFactorBps, ...configuration }),
  };
}

export type ConfiguratorState = ReturnType<typeof useConfigurator>;

export function useConfigurator(product: ProductDetail) {
  const [state, setState] = useState(() => initialState(product));

  const isCustom = product.parameters.size.mode === "custom";
  // Custom sizes take the orientation of the entered dimensions; presets use the chosen orientation.
  const orientation: Orientation = isCustom
    ? state.widthMm >= state.heightMm
      ? ORIENTATION.LANDSCAPE
      : ORIENTATION.PORTRAIT
    : state.orientation;

  const configuration: ProductConfiguration = { ...state, orientation };

  // Cheap enough to run on every render, which keeps the price exactly in step with the inputs.
  const { issues, price } = evaluate(product, configuration);

  return {
    product,
    configuration,
    issues,
    price,
    isCustom,
    setSize: (widthMm: number, heightMm: number) =>
      setState((s) => ({ ...s, ...(isCustom ? { widthMm, heightMm } : orient(widthMm, heightMm, s.orientation)) })),
    setOrientation: (next: Orientation) =>
      setState((s) => ({ ...s, orientation: next, ...orient(s.widthMm, s.heightMm, next) })),
    setMaterial: (materialId: string) => setState((s) => ({ ...s, materialId })),
    setQuantity: (quantity: number) => setState((s) => ({ ...s, quantity })),
    setCharacterCount: (characterCount: number) => setState((s) => ({ ...s, characterCount })),
  };
}

/** Query string handed to the job start route so the designer opens with this exact configuration. */
export function configurationQuery(productId: string, c: ProductConfiguration, path: "design" | "upload" | "csv") {
  return {
    product: productId,
    path,
    w: String(c.widthMm),
    h: String(c.heightMm),
    o: c.orientation,
    m: c.materialId,
    q: String(c.quantity),
    ...(c.characterCount ? { c: String(c.characterCount) } : {}),
  };
}
