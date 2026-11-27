import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { SITE_CONFIG, TAX_CONFIG } from "@/constants/site-config";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          {SITE_CONFIG.name} by {SITE_CONFIG.company}. Prices include {TAX_CONFIG.rateBps / 100}% {TAX_CONFIG.label}.
        </p>
        <nav aria-label="Footer" className="flex gap-5">
          <Link href={ROUTES.products} className="hover:text-ink">Products</Link>
          <Link href={ROUTES.calculator} className="hover:text-ink">Price calculator</Link>
          <Link href={ROUTES.gallery} className="hover:text-ink">Gallery</Link>
        </nav>
      </div>
    </footer>
  );
}
