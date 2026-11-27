/** Loading placeholder shaped like a page heading plus content blocks; announced to screen readers. */
export function PageSkeleton({ blocks = 3 }: { blocks?: number }) {
  return (
    <div className="flex animate-pulse flex-col gap-6" role="status" aria-label="Loading">
      <div className="flex flex-col gap-2">
        <div className="h-8 w-64 rounded bg-line/70" />
        <div className="h-4 w-96 max-w-full rounded bg-line/50" />
      </div>
      {Array.from({ length: blocks }, (_, i) => (
        <div key={i} className="h-28 rounded-[var(--radius-card)] bg-line/40" />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
