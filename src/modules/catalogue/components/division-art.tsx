import type { ReactNode } from "react";

// Line drawings per division; unknown (newly added) divisions fall back to a generic sheet,
// so a new division needs no code change (PRD §14).
const ART: Record<string, ReactNode> = {
  "labels-stickers": (
    <>
      <rect x="10" y="14" width="34" height="24" rx="4" />
      <circle cx="44" cy="44" r="12" className="fill-accent stroke-accent" />
      <path d="M16 22h16M16 28h22M16 34h10" />
    </>
  ),
  "race-event-numbers": (
    <>
      <rect x="8" y="14" width="48" height="36" rx="2" />
      <circle cx="13" cy="19" r="1.5" />
      <circle cx="51" cy="19" r="1.5" />
      <circle cx="13" cy="45" r="1.5" />
      <circle cx="51" cy="45" r="1.5" />
      <path d="M24 28l4-3v15M36 26h8l-6 14" className="stroke-accent" strokeWidth="3" />
    </>
  ),
  "mtb-boards": (
    <>
      <path d="M16 10h32l-4 36H20z" />
      <path d="M24 46l-2 10M40 46l2 10" />
      <path d="M26 22h12M32 22v14" className="stroke-accent" strokeWidth="3" />
    </>
  ),
  stamps: (
    <>
      <path d="M24 8h16v14H24z" />
      <path d="M18 22h28v10H18z" />
      <path d="M14 32h36v6H14z" />
      <path d="M12 50h40" className="stroke-accent" strokeWidth="3" />
    </>
  ),
  trophies: (
    <>
      <path d="M20 8h24v14a12 12 0 0 1-24 0z" />
      <path d="M20 12h-6a6 6 0 0 0 6 10M44 12h6a6 6 0 0 1-6 10M32 34v8M24 42h16v6H24z" />
      <path d="M18 52h28" className="stroke-accent" strokeWidth="3" />
    </>
  ),
  "laser-cut": (
    <>
      <path d="M10 46c8-20 16-26 22-26s14 6 22 26z" />
      <path d="M32 8v8" className="stroke-accent" strokeWidth="3" />
      <path d="M28 20l4-4 4 4" className="stroke-accent" />
      <path d="M10 52h44" strokeDasharray="2 3" />
    </>
  ),
};

const FALLBACK = (
  <>
    <rect x="12" y="10" width="40" height="44" rx="2" />
    <path d="M20 22h24M20 30h24M20 38h14" />
  </>
);

export function DivisionArt({ slug, className }: { slug: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {ART[slug] ?? FALLBACK}
    </svg>
  );
}
