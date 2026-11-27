import type { Metadata } from "next";
import Link from "next/link";
import { LinePreview } from "@/components/orders/line-preview";
import { ButtonLink } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import * as designerController from "@/modules/designer/designer.controller";
import { AddSavedDesignButton } from "@/modules/designer/components/add-saved-design-button";
import { addToCartAction } from "../../cart/actions";

export const metadata: Metadata = { title: "Saved designs" };

export default async function SavedDesignsPage() {
  const designs = await designerController.listMyDesignsWithPreviews();
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold">Saved designs</h1>
        <p className="mt-1 text-ink-muted">Every design you&apos;ve saved, ready to edit or order again.</p>
      </header>
      {designs.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-[var(--radius-card)] border border-dashed border-line p-6">
          <p>No saved designs yet. Start a job and press Save design in the designer.</p>
          <ButtonLink href={ROUTES.products}>Browse products</ButtonLink>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {designs.map((d) => (
            <li key={d.id} className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4">
              <LinePreview preview={d.preview} />
              <div className="text-sm">
                <h2 className="font-display text-base font-semibold">{d.name}</h2>
                <p className="text-ink-muted">
                  {d.productName}, {d.configuration.widthMm} × {d.configuration.heightMm} mm, {d.configuration.quantity.toLocaleString("en-GB")} copies
                </p>
                <p className="text-ink-muted">
                  Version {d.currentVersion}, {d.source === "upload" ? "uploaded artwork" : "designed online"}. Updated{" "}
                  {new Date(d.updatedAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}
                </p>
              </div>
              <div className="mt-auto flex flex-wrap gap-2">
                <AddSavedDesignButton designId={d.id} version={d.currentVersion} action={addToCartAction} />
                <Link href={ROUTES.designer(d.id)} className="inline-flex h-9 items-center rounded-full border border-line px-4 text-sm font-medium hover:border-ink">
                  Edit
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
