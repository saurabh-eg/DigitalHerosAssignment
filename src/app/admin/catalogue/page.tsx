import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/admin/action-form";
import { ROUTES } from "@/constants/routes";
import * as catalogueAdmin from "@/modules/catalogue/catalogue.admin.controller";
import { TiersEditor } from "@/modules/catalogue/components/tiers-editor";
import { createDivisionAction, createProductAction, setDivisionActiveAction, updateTiersAction } from "../actions";

export const metadata: Metadata = { title: "Products & templates" };

const field = "h-9 rounded-md border border-line bg-surface px-2.5 text-sm focus:border-ink focus:outline-none";

/** PRD §03 manage products & templates; PRD §14 add divisions without code changes. */
export default async function CataloguePage() {
  const { divisions, defaultTiers } = await catalogueAdmin.overview();
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold">Products & templates</h1>
        <p className="mt-1 text-ink-muted">
          One parameter-driven product per job type: sizes, materials and quantities are settings, not separate SKUs. Changes go live on the
          storefront immediately.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        {divisions.map((d) => (
          <article key={d.id} className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">
                  {d.name} {!d.is_active && <span className="text-sm font-normal text-warning">hidden</span>}
                </h2>
                <p className="text-sm text-ink-muted">/{d.slug}</p>
              </div>
              <ActionForm action={setDivisionActiveAction} hidden={{ divisionId: d.id, isActive: String(!d.is_active) }} label={d.is_active ? "Hide division" : "Show division"} variant="ghost" />
            </div>
            <ul className="mt-3 flex flex-col divide-y divide-line text-sm">
              {d.products
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                    <Link href={ROUTES.admin.catalogueProduct(p.id)} className="font-medium hover:text-accent">
                      {p.name}
                    </Link>
                    <span className="text-ink-muted">
                      {p.product_type} {p.is_active ? "" : <span className="text-warning">(inactive)</span>}
                    </span>
                  </li>
                ))}
            </ul>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-accent">Add a product to {d.name}</summary>
              <ActionForm action={createProductAction} hidden={{ divisionId: d.id }} label="Create product" className="mt-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  <input name="name" required placeholder="Name, e.g. Kraft swing tags" className={field} />
                  <input name="slug" required placeholder="slug, e.g. swing-tags" className={field} />
                  <input name="productType" required placeholder="File code, e.g. SwingTags" className={field} />
                </div>
              </ActionForm>
            </details>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
          <h2 className="font-semibold">New division</h2>
          <p className="mb-3 text-sm text-ink-muted">Appears on the product hub once it has an active product.</p>
          <ActionForm action={createDivisionAction} label="Create division" variant="primary">
            <div className="grid gap-2 sm:grid-cols-2">
              <input name="name" required placeholder="Name, e.g. Signage" className={field} />
              <input name="slug" required placeholder="slug, e.g. signage" className={field} />
              <input name="tagline" placeholder="Tagline" className={field} />
              <input name="sortOrder" type="number" placeholder="Order on hub (e.g. 7)" className={field} />
              <textarea name="description" rows={2} placeholder="One-line description for the hub tile" className="rounded-md border border-line px-2.5 py-2 text-sm sm:col-span-2" />
            </div>
          </ActionForm>
        </div>
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
          <h2 className="font-semibold">Default volume discounts</h2>
          <p className="mb-3 text-sm text-ink-muted">Used by every product without its own tiers.</p>
          <TiersEditor productId={null} tiers={defaultTiers} action={updateTiersAction} />
        </div>
      </section>
    </div>
  );
}
