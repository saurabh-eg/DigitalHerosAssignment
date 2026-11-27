import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ButtonLink } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { TAX_CONFIG } from "@/constants/site-config";
import { formatMoney, formatPercent } from "@/lib/money";
import * as catalogueController from "@/modules/catalogue/catalogue.controller";
import type { ProductDetail } from "@/modules/catalogue/catalogue.types";
import { GalleryGrid } from "@/modules/catalogue/components/gallery-grid";
import { ProductConfigurator } from "@/modules/catalogue/components/product-configurator";
import * as designerController from "@/modules/designer/designer.controller";

export const revalidate = 300;

export async function generateStaticParams() {
  return catalogueController.staticProductParams();
}

export async function generateMetadata({ params }: PageProps<"/products/[division]/[product]">): Promise<Metadata> {
  const { division, product } = await params;
  const found = await catalogueController.getProduct(division, product);
  return found ? { title: found.name, description: found.summary } : {};
}

/** The size the configurator starts at, oriented the way the product is first offered. */
function defaultSize(product: ProductDetail) {
  const { size, orientations } = product.parameters;
  if (size.mode === "custom") return { widthMm: size.widthMm.default, heightMm: size.heightMm.default };
  const p = size.presets[0];
  const [short, long] = [Math.min(p.widthMm, p.heightMm), Math.max(p.widthMm, p.heightMm)];
  return orientations[0] === "landscape" ? { widthMm: long, heightMm: short } : { widthMm: short, heightMm: long };
}

function sizeFact(product: ProductDetail): string {
  const { size } = product.parameters;
  if (size.mode === "custom") return `Any size from ${size.widthMm.min} × ${size.heightMm.min} to ${size.widthMm.max} × ${size.heightMm.max} mm`;
  return `${size.presets.length} sizes, ${size.presets.map((p) => p.label).join(", ")}`;
}

function quantityFact(product: ProductDetail): string {
  const { quantity } = product.parameters;
  const first = [...product.pricing.tiers].sort((a, b) => a.minQuantity - b.minQuantity)[0];
  const range = `${quantity.min.toLocaleString("en-GB")} to ${quantity.max.toLocaleString("en-GB")}`;
  return first ? `${range}; ${formatPercent(first.discountBps)} off from ${first.minQuantity.toLocaleString("en-GB")}` : range;
}

export default async function ProductPage({ params }: PageProps<"/products/[division]/[product]">) {
  const { division, product: slug } = await params;
  const product = await catalogueController.getProduct(division, slug);
  if (!product) notFound();

  const size = defaultSize(product);
  const [preview, gallery] = await Promise.all([
    designerController.productPreview(product.id, size.widthMm, size.heightMm),
    catalogueController.getGallery(),
  ]);
  const work = gallery.filter((g) => g.divisionSlug === product.divisionSlug);
  const ways = [
    product.supportsDesigner && "Design online from a template",
    product.supportsUpload && "Upload finished PDF, SVG, AI or PNG",
    product.supportsVariableData && "Merge names and numbers from a spreadsheet",
  ].filter(Boolean) as string[];

  const facts = [
    { label: "Price", value: `From ${formatMoney(catalogueController.fromUnitPrice(product))} each, ${TAX_CONFIG.label} included` },
    { label: "Size", value: sizeFact(product) },
    { label: "Quantity", value: quantityFact(product) },
    { label: "Materials", value: product.materials.map((m) => m.name).join(", ") },
  ];

  const specs = [
    { label: "Print resolution", value: `${product.dpi} dpi` },
    { label: "Bleed", value: product.bleedMm > 0 ? `${product.bleedMm} mm on each edge` : "None needed" },
    { label: "Safe area", value: `Keep text ${product.safeMarginMm} mm inside the edge` },
    { label: "Proofing", value: "You approve a proof before anything is printed" },
    { label: "Print files", value: "Vector PDF with bleed, generated automatically" },
  ];

  const steps = [
    { title: "Configure", body: "Pick the size, material and quantity. The price updates as you go." },
    { title: product.supportsVariableData ? "Design, upload or merge" : "Design or upload", body: ways.join(". ") + "." },
    { title: "Approve the proof", body: "Check it on screen and ask for changes until it's right." },
    { title: "We print it", body: "Track the job from your account and reorder in one click." },
  ];

  return (
    <main className="flex flex-col">
      <section className="border-b border-line bg-surface/60">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 pt-8 pb-12 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:pt-10 lg:pb-16">
          <div className="flex flex-col gap-6">
            <Breadcrumbs
              items={[
                { href: ROUTES.products, label: "Products" },
                { href: ROUTES.division(product.divisionSlug), label: product.divisionName },
                { label: product.name },
              ]}
            />
            <div>
              <h1 className="text-4xl font-bold sm:text-5xl">{product.name}</h1>
              <p className="mt-3 max-w-xl text-lg text-ink-muted">{product.summary}</p>
              {product.description && <p className="mt-2 max-w-xl text-ink-muted">{product.description}</p>}
            </div>
            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {facts.map((f) => (
                <div key={f.label} className="border-t border-line pt-3">
                  <dt className="text-sm text-ink-muted">{f.label}</dt>
                  <dd className="mt-0.5 font-medium">{f.value}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="#configure" size="lg">
                Configure and price
              </ButtonLink>
              {work.length > 0 && (
                <ButtonLink href="#work" size="lg" variant="secondary">
                  See examples
                </ButtonLink>
              )}
            </div>
          </div>

          {preview && (
            <figure className="flex flex-col gap-3">
              <div className="crop-marks mx-auto w-full max-w-md">
                <div
                  className="grid place-items-center rounded-sm bg-[#e2e5ea] p-6 sm:p-8 [&>svg]:h-auto [&>svg]:max-h-80 [&>svg]:w-full [&>svg]:shadow-[0_14px_30px_rgba(26,32,48,0.22)]"
                  role="img"
                  aria-label={`${preview.name} template for ${product.name}`}
                  // Rendered on the server from our own template data with outlined text.
                  dangerouslySetInnerHTML={{ __html: preview.svg }}
                />
              </div>
              <figcaption className="text-center text-sm text-ink-muted">
                Starter template, {size.widthMm} × {size.heightMm} mm. Change every word, colour and position in the designer.
              </figcaption>
            </figure>
          )}
        </div>
      </section>

      <section id="configure" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-12 sm:px-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold">Configure your job</h2>
          <p className="mt-1 text-ink-muted">
            Prices include {TAX_CONFIG.rateBps / 100}% {TAX_CONFIG.label} and update as you choose. Volume discounts apply automatically.
          </p>
        </div>
        <ProductConfigurator product={product} />
      </section>

      <section className="border-y border-line bg-surface/60">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="mb-8 text-2xl font-bold">How ordering works</h2>
          <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <li key={step.title} className="flex flex-col gap-2 border-t-2 border-ink pt-4">
                <span className="font-display text-2xl font-semibold text-accent">{i + 1}</span>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm text-ink-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-2xl font-bold">Print specification</h2>
          <dl className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
            {specs.map((s) => (
              <div key={s.label} className="grid gap-1 p-4 sm:grid-cols-[10rem_1fr]">
                <dt className="text-sm text-ink-muted">{s.label}</dt>
                <dd className="font-medium">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h2 className="mb-4 text-2xl font-bold">Materials</h2>
          <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
            {product.materials.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-4 p-4">
                <span>
                  <span className="block font-medium">{m.name}</span>
                  <span className="text-sm text-ink-muted">{m.description}</span>
                </span>
                {m.isDefault && <span className="shrink-0 rounded-full bg-paper px-2.5 py-1 text-xs">Most popular</span>}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {work.length > 0 && (
        <section id="work" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 pb-16 sm:px-6">
          <h2 className="mb-6 text-2xl font-bold">Recent {product.divisionName.toLowerCase()} work</h2>
          <GalleryGrid items={work} families={[]} showFilter={false} />
        </section>
      )}
    </main>
  );
}
