import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { SITE_CONFIG } from "@/constants/site-config";
import { UserMenu } from "./user-menu";

const NAV = [
  { href: ROUTES.products, label: "Products" },
  { href: ROUTES.calculator, label: "Price calculator" },
  { href: ROUTES.gallery, label: "Gallery" },
];

export function SiteHeader({ signOutAction }: { signOutAction: () => Promise<void> }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href={ROUTES.home} className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <span className="grid size-7 place-items-center rounded-md bg-ink" aria-hidden>
            <span className="size-2.5 rounded-full bg-accent" />
          </span>
          {SITE_CONFIG.name}
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-2 text-sm text-ink-muted transition-colors hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <UserMenu signOutAction={signOutAction} />
      </div>
    </header>
  );
}
