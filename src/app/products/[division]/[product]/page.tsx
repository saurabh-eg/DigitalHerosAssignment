import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ROUTES } from "@/constants/routes";
import * as catalogueController from "@/modules/catalogue/catalogue.controller";
import { ProductConfigurator } from "@/modules/catalogue/components/product-configurator";

export const revalidate = 300;

export async function generateStaticParams() {
  return catalogueController.staticProductParams();
}

export async function generateMetadata({ params }: PageProps<"/products/[division]/[product]">): Promise<Metadata> {
  const { division, product } = await params;
  const found = await catalogueController.getProduct(division, product);
  return found ? { title: found.name, description: found.summary } : {};
}

export default async function ProductPage({ params }: PageProps<"/products/[division]/[product]">) {
  const { division, product: slug } = await params;
  const product = await catalogueController.getProduct(division, slug);
  if (!product) notFound();

  const specs = [
    { label: "Print resolution", value: `${product.dpi} dpi` },
    { label: "Bleed", value: product.bleedMm > 0 ? `${product.bleedMm} mm on each edge` : "None needed" },
    { label: "Safe area", value: `${product.safeMarginMm} mm inside the edge` },
    { label: "Artwork", value: product.supportsUpload ? "Design online, or upload PDF, SVG, AI or PNG" : "Design online" },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <Breadcrumbs
        items={[
          { href: ROUTES.products, label: "Products" },
          { href: ROUTES.division(product.divisionSlug), label: product.divisionName },
          { label: product.name },
        ]}
      />
      <header className="mb-10 max-w-3xl">
        <h1 className="text-4xl font-bold sm:text-5xl">{product.name}</h1>
        <p className="mt-3 text-lg text-ink-muted">{product.summary}</p>
      </header>

      <ProductConfigurator product={product} />

      <section className="mt-16 max-w-3xl">
        <h2 className="mb-4 text-2xl font-bold">Print specification</h2>
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-[12rem_1fr]">
          {specs.map((s) => (
            <div key={s.label} className="contents">
              <dt className="text-ink-muted">{s.label}</dt>
              <dd className="font-medium">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
