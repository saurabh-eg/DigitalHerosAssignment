"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { GalleryItem } from "../catalogue.types";

type Family = { slug: string; name: string };

/** PRD §12: a gallery of real work organised by product family. */
export function GalleryGrid({
  items,
  families,
  initialFamily = "all",
  showFilter = true,
}: {
  items: GalleryItem[];
  families: Family[];
  initialFamily?: string;
  showFilter?: boolean;
}) {
  const [family, setFamily] = useState(initialFamily);
  const visible = family === "all" ? items : items.filter((i) => i.divisionSlug === family);
  const withWork = families.filter((f) => items.some((i) => i.divisionSlug === f.slug));

  return (
    <div className="flex flex-col gap-6">
      {showFilter && (
        <div role="radiogroup" aria-label="Product family" className="flex flex-wrap gap-2">
          {[{ slug: "all", name: "All work" }, ...withWork].map((f) => (
            <button
              key={f.slug}
              type="button"
              role="radio"
              aria-checked={family === f.slug}
              onClick={() => setFamily(f.slug)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm transition-colors",
                family === f.slug ? "border-ink bg-ink text-surface" : "border-line bg-surface hover:border-ink",
              )}
            >
              {f.name}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="text-ink-muted">No work to show for this range yet.</p>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <li key={item.id} className="flex flex-col gap-3">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                  unoptimized={item.imageUrl.endsWith(".svg")}
                />
              </div>
              <div>
                <p className="text-sm text-ink-muted">{item.divisionName}</p>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-ink-muted">{item.description}</p>
                {item.imageUrl.endsWith(".svg") && <p className="mt-1 text-xs text-ink-muted">Illustrated sample</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
