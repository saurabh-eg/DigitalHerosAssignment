import type { Metadata } from "next";
import Image from "next/image";
import { ActionForm } from "@/components/admin/action-form";
import * as catalogueAdmin from "@/modules/catalogue/catalogue.admin.controller";
import { addGalleryItemAction, updateGalleryItemAction } from "../actions";

export const metadata: Metadata = { title: "Gallery" };

const field = "h-9 rounded-md border border-line bg-surface px-2.5 text-sm";

/** PRD §12: a gallery of real work, organised by product family. */
export default async function GalleryAdminPage() {
  const { items, divisions } = await catalogueAdmin.listGallery();
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold">Gallery</h1>
        <p className="mt-1 text-ink-muted">Photos of finished jobs, shown on the storefront by product family. Replace the illustrated samples with real work.</p>
      </header>

      <section className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
        <h2 className="mb-3 font-semibold">Add a photo</h2>
        <ActionForm action={addGalleryItemAction} label="Upload to gallery" variant="primary" pendingLabel="Uploading…">
          <div className="grid gap-2 md:grid-cols-2">
            <select name="divisionId" required className={field} aria-label="Product family">
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <input name="title" required placeholder="Title, e.g. Riverside 10K bibs" className={field} />
            <input name="description" placeholder="Short spec, e.g. A5 Tyvek, 1,200 bibs" className={`${field} md:col-span-2`} />
            <input name="photo" type="file" accept="image/jpeg,image/png" required className="text-sm md:col-span-2" aria-label="Photo (JPG or PNG, up to 4 MB)" />
          </div>
        </ActionForm>
      </section>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((g) => (
          <li key={g.id} className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-surface p-3">
            <div className="relative aspect-[4/3] overflow-hidden rounded bg-paper">
              <Image src={g.imageUrl} alt={g.title} fill sizes="33vw" className="object-cover" unoptimized={g.imageUrl.endsWith(".svg")} />
            </div>
            <p className="text-sm">
              <span className="font-medium">{g.title}</span>
              <span className="block text-ink-muted">
                {g.divisions?.name}
                {!g.is_published && <span className="text-warning">, hidden</span>}
              </span>
            </p>
            <div className="flex gap-3">
              <ActionForm action={updateGalleryItemAction} hidden={{ itemId: g.id, action: g.is_published ? "unpublish" : "publish" }} label={g.is_published ? "Hide" : "Publish"} variant="ghost" />
              <ActionForm action={updateGalleryItemAction} hidden={{ itemId: g.id, action: "delete" }} label="Delete" variant="ghost" confirm="Delete permanently" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
