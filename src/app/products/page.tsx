import type { Metadata } from "next";
import * as catalogueController from "@/modules/catalogue/catalogue.controller";
import { DivisionHub } from "@/modules/catalogue/components/division-hub";

export const revalidate = 300;
export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage() {
  const hub = await catalogueController.getHub();
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-bold sm:text-5xl">Products</h1>
      <p className="mt-3 mb-10 max-w-2xl text-lg text-ink-muted">
        Choose a range to configure a job and get an instant price.
      </p>
      <DivisionHub divisions={hub} />
    </main>
  );
}
