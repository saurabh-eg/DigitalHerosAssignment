import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SideNav, type NavGroup } from "./side-nav";

function initials(name: string): string {
  const parts = name.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/** Shared app shell for the customer account and the production console. */
export function DashboardShell({
  name,
  caption,
  badge,
  groups,
  navLabel,
  wide = false,
  children,
}: {
  name: string;
  caption: string;
  badge?: string;
  groups: NavGroup[];
  navLabel: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("mx-auto grid w-full flex-1 gap-6 px-4 py-6 sm:px-6 grid-cols-[minmax(0,1fr)] md:grid-cols-[15rem_minmax(0,1fr)] md:gap-10 md:py-10", wide ? "max-w-7xl" : "max-w-6xl")}>
      <aside className="flex min-w-0 flex-col gap-5 md:sticky md:top-24 md:self-start">
        <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink font-display text-sm font-semibold text-paper" aria-hidden>
            {initials(name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{name}</p>
            <p className="truncate text-xs text-ink-muted">
              {caption}
              {badge && <span className="ml-1.5 rounded-full bg-accent-soft px-1.5 py-0.5 text-[0.7rem] font-medium text-accent">{badge}</span>}
            </p>
          </div>
        </div>
        <SideNav groups={groups} label={navLabel} />
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}
