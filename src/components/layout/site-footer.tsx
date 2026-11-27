import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { DELIVERY_CONFIG, SITE_CONFIG, TAX_CONFIG } from "@/constants/site-config";
import { formatMoney } from "@/lib/money";

type Family = { slug: string; name: string };

function Column({ title, links }: { title: string; links: Array<{ href: string; label: string }> }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-display text-sm font-semibold text-paper">{title}</h2>
      <ul className="flex flex-col gap-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm text-paper/70 transition-colors hover:text-paper">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Site footer: product families come from the catalogue, so a new division appears here automatically. */
export function SiteFooter({ families }: { families: Family[] }) {
  return (
    <footer className="mt-auto bg-ink text-paper">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <Link href={ROUTES.home} className="flex items-center gap-2 font-display text-xl font-bold">
            <span className="grid size-8 place-items-center rounded-md bg-paper" aria-hidden>
              <span className="size-3 rounded-full bg-accent" />
            </span>
            {SITE_CONFIG.name}
          </Link>
          <p className="max-w-xs text-sm text-paper/70">
            Labels, race numbers, MTB boards, stamps, trophies and laser-cut work. Priced as you choose, proofed before we print.
          </p>
          <p className="text-sm text-paper/70">
            Questions about a job?{" "}
            <a href={`mailto:${SITE_CONFIG.supportEmail}`} className="text-paper underline underline-offset-4">
              {SITE_CONFIG.supportEmail}
            </a>
          </p>
        </div>
        <Column title="Products" links={families.map((f) => ({ href: ROUTES.division(f.slug), label: f.name }))} />
        <Column
          title="Order"
          links={[
            { href: ROUTES.products, label: "All products" },
            { href: ROUTES.calculator, label: "Price calculator" },
            { href: ROUTES.gallery, label: "Gallery of work" },
            { href: ROUTES.cart, label: "Basket" },
          ]}
        />
        <Column
          title="Your account"
          links={[
            { href: ROUTES.account.root, label: "My account" },
            { href: ROUTES.account.orders, label: "Track an order" },
            { href: ROUTES.account.designs, label: "Saved designs" },
            { href: ROUTES.account.invoices, label: "Invoices" },
          ]}
        />
      </div>
      <div className="border-t border-paper/15">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-paper/60 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {SITE_CONFIG.name} by {SITE_CONFIG.company}
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            <li>Prices include {TAX_CONFIG.rateBps / 100}% {TAX_CONFIG.label}</li>
            <li>Free UK delivery over {formatMoney(DELIVERY_CONFIG.freeThresholdMinor)}</li>
            <li>Secure card payments by Stripe</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
