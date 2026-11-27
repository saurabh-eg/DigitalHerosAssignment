"use client";

import { useState } from "react";
import type { ProductDetail } from "../catalogue.types";
import { ProductConfigurator } from "./product-configurator";

/** Standalone instant price calculator, open to visitors (PRD §03). */
export function Calculator({ products }: { products: ProductDetail[] }) {
  const [productId, setProductId] = useState(products[0]?.id);
  const product = products.find((p) => p.id === productId);

  return (
    <div className="flex flex-col gap-8">
      <label className="flex max-w-md flex-col gap-1.5">
        <span className="font-display text-base font-semibold">Product</span>
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="h-12 rounded-md border border-line bg-surface px-3 text-base focus:border-ink focus:outline-none"
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.divisionName}: {p.name}
            </option>
          ))}
        </select>
      </label>
      {product && <ProductConfigurator key={product.id} product={product} />}
    </div>
  );
}
