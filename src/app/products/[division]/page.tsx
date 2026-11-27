import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ROUTES } from "@/constants/routes";
import { formatMoney } from "@/lib/money";
import * as catalogueController from "@/modules/catalogue/catalogue.controller";
import { DivisionArt } from "@/modules/catalogue/components/division-art";
import { GalleryGrid } from "@/modules/catalogue/components/gallery-grid";

export const revalidate = 300;

export async function generateStaticParams() {
  return catalogueController.staticDivisionParams();
}

export async function generateMetadata({ params }: PageProps<"/products/[division]">): Promise<Metadata> {
  const { division } = await params;
  const result = await catalogueController.getDivision(division);
  return result ? { title: result.division.name, description: result.division.description } : {};
}

export default async function DivisionPage({ params }: PageProps<"/products/[division]">) {
  const { division: slug } = await params;
  const [result, gallery] = await Promise.all([catalogueController.getDivision(slug), catalogueController.getGallery()]);
  if (!result) notFound();
  const { division, products } = result;
  const work = gallery.filter((g) => g.divisionSlug === slug);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <Breadcrumbs items={[{ href: ROUTES.products, label: "Products" }, { label: division.name }]} />
      <div className="flex items-start gap-5">
        <DivisionArt slug={division.slug} className="hidden size-16 shrink-0 sm:block" />
        <div>
          <h1 className="text-4xl font-bold sm:text-5xl">{division.name}</h1>
          <p className="mt-3 max-w-2xl text-lg text-ink-muted">{division.description}</p>
        </div>
      </div>

      <ul className="mt-10 grid gap-4 md:grid-cols-2">
        {products.map((p) => (
          <li key={p.id}>
            <Link
              href={ROUTES.product(division.slug, p.slug)}
              className="group flex h-full flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-surface p-6 hover:border-ink"
            >
              <h2 className="text-2xl font-semibold group-hover:text-accent">{p.name}</h2>
              <p className="text-ink-muted">{p.summary}</p>
              <p className="mt-auto pt-3 text-sm">
                From <span className="font-semibold">{formatMoney(catalogueController.fromUnitPrice(p))}</span> each, in{" "}
                {p.materials.length} materials
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {work.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-bold">Recent {division.name.toLowerCase()} work</h2>
          <GalleryGrid items={work} families={[]} showFilter={false} />
        </section>
      )}
    </main>
  );
}
