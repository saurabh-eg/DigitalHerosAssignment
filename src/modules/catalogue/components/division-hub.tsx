import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { formatMoney } from "@/lib/money";
import type { DivisionWithProducts } from "../catalogue.types";
import { DivisionArt } from "./division-art";

/** PRD §12: a product hub of equal-weight tiles used as navigation. */
export function DivisionHub({ divisions }: { divisions: DivisionWithProducts[] }) {
  return (
    <ul className="grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
      {divisions.map((d) => (
        <li key={d.id} className="bg-surface">
          <Link
            href={ROUTES.division(d.slug)}
            className="group flex h-full flex-col gap-4 p-6 transition-colors hover:bg-paper focus-visible:bg-paper"
          >
            {d.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded art from storage, unknown dimensions
              <img src={d.imageUrl} alt="" className="size-14 object-contain" />
            ) : (
              <DivisionArt slug={d.slug} className="size-14 text-ink" />
            )}
            <div className="flex flex-1 flex-col gap-1">
              <h3 className="text-xl font-semibold group-hover:text-accent">{d.name}</h3>
              <p className="text-sm text-ink-muted">{d.description}</p>
            </div>
            {d.fromUnitMinor !== null && (
              <p className="text-sm">
                From <span className="font-semibold">{formatMoney(d.fromUnitMinor)}</span> each
              </p>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
