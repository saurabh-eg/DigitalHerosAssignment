"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type NavIcon =
  | "overview"
  | "orders"
  | "designs"
  | "invoices"
  | "settings"
  | "pipeline"
  | "jobs"
  | "archive"
  | "reports"
  | "users"
  | "catalogue"
  | "gallery";

export type NavItem = { href: string; label: string; exact?: boolean; icon?: NavIcon };
export type NavGroup = { label?: string; items: NavItem[] };

const PATHS: Record<NavIcon, ReactNode> = {
  overview: <path d="M3 3h6v6H3zM11 3h6v4h-6zM11 9h6v8h-6zM3 11h6v6H3z" />,
  orders: <path d="M4 3h12v14H4zM7 7h6M7 10h6M7 13h4" />,
  designs: <path d="M4 16l2-6 7-7 3 3-7 7zM12 4l3 3" />,
  invoices: <path d="M5 2h8l3 3v13H5zM13 2v3h3M8 9h5M8 12h5M8 15h3" />,
  settings: <path d="M10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4" />,
  pipeline: <path d="M2 5h4v10H2zM8 5h4v7H8zM14 5h4v4h-4z" />,
  jobs: <path d="M3 4h14M3 8h14M3 12h14M3 16h9" />,
  archive: <path d="M2 4h16v4H2zM4 8v9h12V8M8 11h4" />,
  reports: <path d="M3 17V9M8 17V4M13 17v-6M18 17H2" />,
  users: <path d="M7 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 17c0-3 2.5-5 5-5s5 2 5 5M14 4a3 3 0 0 1 0 5M15 12c2 .5 3 2.5 3 5" />,
  catalogue: <path d="M3 3h6v6H3zM11 3h6v6h-6zM3 11h6v6H3zM11 11h6v6h-6z" />,
  gallery: <path d="M2 4h16v12H2zM2 13l5-4 4 3 3-2 4 3" />,
};

function Icon({ name }: { name: NavIcon }) {
  return (
    <svg viewBox="0 0 20 20" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {PATHS[name]}
    </svg>
  );
}

/** Dashboard navigation: grouped and vertical with an active bar on desktop, wrapping pills on phones. */
export function SideNav({ groups, label }: { groups: NavGroup[]; label: string }) {
  const pathname = usePathname();
  const isActive = (item: NavItem) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <nav aria-label={label} className="flex flex-wrap gap-1.5 md:flex-col md:flex-nowrap md:gap-5">
      {groups.map((group, gi) => (
        <div key={gi} className="contents md:flex md:flex-col md:gap-1">
          {group.label && <p className="hidden px-3 pb-1 text-xs font-medium text-ink-muted md:block">{group.label}</p>}
          {group.items.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-2.5 rounded-lg border border-line px-3 py-2 text-sm transition-colors md:border-transparent",
                  active ? "bg-surface font-medium text-ink shadow-[0_1px_2px_rgba(26,32,48,0.08)]" : "text-ink-muted hover:bg-surface/70 hover:text-ink",
                )}
              >
                {active && <span className="absolute inset-y-2 left-0 hidden w-0.5 rounded-full bg-accent md:block" aria-hidden />}
                {item.icon && <Icon name={item.icon} />}
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
