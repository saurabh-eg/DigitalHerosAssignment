import type { Metadata } from "next";
import * as catalogueController from "@/modules/catalogue/catalogue.controller";
import { Calculator } from "@/modules/catalogue/components/calculator";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Price calculator",
  description: "Instant prices for every product, with volume discounts and VAT shown up front.",
};

export default async function CalculatorPage() {
  const products = await catalogueController.listSellableProducts();
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-bold sm:text-5xl">Price calculator</h1>
      <p className="mt-3 mb-10 max-w-2xl text-lg text-ink-muted">
        Every price includes VAT. Volume discounts start at 100 copies and apply automatically.
      </p>
      <Calculator products={products} />
    </main>
  );
}
