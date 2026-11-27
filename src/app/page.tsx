import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import * as catalogueController from "@/modules/catalogue/catalogue.controller";
import { DivisionHub } from "@/modules/catalogue/components/division-hub";
import { GalleryGrid } from "@/modules/catalogue/components/gallery-grid";
import { JobTicket } from "@/modules/catalogue/components/job-ticket";

export const revalidate = 300;

const STEPS = [
  { title: "Configure", body: "Pick the size, material and quantity. The price updates as you go, volume discounts included." },
  { title: "Design or upload", body: "Edit a template inside the printable area, or upload a finished PDF, SVG, AI or PNG." },
  { title: "Approve the proof", body: "Check exactly what will be printed. Ask for changes until it's right, then approve." },
  { title: "We print it", body: "Track the job from your account, and reorder the same artwork in one click next time." },
];

export default async function HomePage() {
  const [hub, products, gallery] = await Promise.all([
    catalogueController.getHub(),
    catalogueController.listSellableProducts(),
    catalogueController.getGallery(),
  ]);

  return (
    <main className="flex flex-col">
      <section className="mx-auto grid w-full max-w-6xl gap-12 px-4 pt-12 pb-16 sm:px-6 lg:grid-cols-[1fr_26rem] lg:items-center lg:pt-20 lg:pb-24">
        <div className="flex flex-col gap-6">
          <h1 className="text-5xl font-bold sm:text-6xl">Custom print, priced as you choose it.</h1>
          <p className="max-w-xl text-lg text-ink-muted">
            Labels, race numbers, MTB boards, stamps, trophies and laser-cut work. Configure the job, see the price
            straight away, design or upload your artwork, and approve a proof before anything is printed.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={ROUTES.products} size="lg">
              Browse products
            </ButtonLink>
            <ButtonLink href={ROUTES.calculator} size="lg" variant="secondary">
              Open the price calculator
            </ButtonLink>
          </div>
        </div>
        <JobTicket products={products} />
      </section>

      <section className="border-y border-line bg-surface/60">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="mb-2 text-3xl font-bold">Six ranges, one workshop</h2>
          <p className="mb-8 max-w-2xl text-ink-muted">
            Every product is made to your size, not picked from a list of fixed SKUs.
          </p>
          <DivisionHub divisions={hub} />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="mb-8 text-3xl font-bold">How an order runs</h2>
        <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-2 border-t-2 border-ink pt-4">
              <span className="font-display text-3xl font-semibold text-accent">{i + 1}</span>
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="text-sm text-ink-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-3xl font-bold">Recent work</h2>
          <Link href={ROUTES.gallery} className="font-medium text-accent underline-offset-4 hover:underline">
            See the full gallery
          </Link>
        </div>
        <GalleryGrid items={gallery.slice(0, 3)} families={hub} showFilter={false} />
      </section>
    </main>
  );
}
