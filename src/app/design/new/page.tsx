import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ButtonLink } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { formatMoney } from "@/lib/money";
import * as designerController from "@/modules/designer/designer.controller";
import { StartJobForm } from "@/modules/designer/components/start-job-form";
import * as pricingController from "@/modules/pricing/pricing.controller";
import { startJobAction } from "../actions";

export const metadata: Metadata = { title: "Start your job" };

const PATH_TITLE = { design: "Design it online", upload: "Upload finished artwork", csv: "Merge names and numbers" };

export default async function StartJobPage({ searchParams }: PageProps<"/design/new">) {
  const query = await searchParams;
  const start = await designerController.previewStart(query);

  if (!start) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-bold">Pick a product first</h1>
        <p className="mt-2 text-ink-muted">This link is missing the product details. Choose a product to configure your job.</p>
        <ButtonLink href={ROUTES.products} className="mt-6">
          Browse products
        </ButtonLink>
      </main>
    );
  }

  const { input, product, templates } = start;
  const material = product.materials.find((m) => m.id === input.m);
  const quote = await pricingController
    .quoteFor(product.id, { widthMm: input.w, heightMm: input.h, orientation: input.o, materialId: input.m, quantity: input.q, characterCount: input.c })
    .catch(() => null);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <Breadcrumbs
        items={[
          { href: ROUTES.products, label: "Products" },
          { href: ROUTES.product(product.divisionSlug, product.slug), label: product.name },
          { label: PATH_TITLE[input.path] },
        ]}
      />
      <h1 className="text-4xl font-bold">{PATH_TITLE[input.path]}</h1>
      <p className="mt-2 mb-8 text-lg text-ink-muted">
        {product.name}, {input.w} × {input.h} mm on {material?.name.toLowerCase()},{" "}
        {input.path === "csv" ? "one per spreadsheet row" : `${input.q.toLocaleString("en-GB")} copies`}
        {quote && input.path !== "csv" ? ` for ${formatMoney(quote.price.totalMinor)}` : ""}.
      </p>
      <StartJobForm input={input} templates={templates} action={startJobAction} />
    </main>
  );
}
