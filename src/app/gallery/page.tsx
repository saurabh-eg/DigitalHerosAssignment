import type { Metadata } from "next";
import * as catalogueController from "@/modules/catalogue/catalogue.controller";
import { GalleryGrid } from "@/modules/catalogue/components/gallery-grid";

export const revalidate = 300;
export const metadata: Metadata = { title: "Gallery", description: "Recent print work across all six ranges." };

export default async function GalleryPage() {
  const [items, hub] = await Promise.all([catalogueController.getGallery(), catalogueController.getHub()]);
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-bold sm:text-5xl">Gallery</h1>
      <p className="mt-3 mb-10 max-w-2xl text-lg text-ink-muted">Recent jobs from each range.</p>
      <GalleryGrid items={items} families={hub} />
    </main>
  );
}
