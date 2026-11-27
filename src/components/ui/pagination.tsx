import Link from "next/link";

/**
 * Server-rendered pager: page state lives in the URL (?page=), so lists can be bookmarked and shared.
 * `params` are the other query values to keep (e.g. a search term).
 */
export function Pagination({
  basePath,
  page,
  pageSize,
  total,
  params = {},
  noun = ["item", "items"],
}: {
  basePath: string;
  page: number;
  pageSize: number;
  total: number;
  params?: Record<string, string | undefined>;
  noun?: [string, string];
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const query = new URLSearchParams(Object.entries({ ...params, page: p > 1 ? String(p) : undefined }).filter((e): e is [string, string] => Boolean(e[1])));
    const qs = query.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const link = "rounded-full border border-line bg-surface px-3 py-1.5 hover:border-ink";

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-muted">
      <span>
        {total.toLocaleString("en-GB")} {total === 1 ? noun[0] : noun[1]}
        {pages > 1 && `, page ${page} of ${pages}`}
      </span>
      {pages > 1 && (
        <span className="flex gap-2">
          {page > 1 && (
            <Link href={href(page - 1)} className={link} rel="prev">
              Previous
            </Link>
          )}
          {page < pages && (
            <Link href={href(page + 1)} className={link} rel="next">
              Next
            </Link>
          )}
        </span>
      )}
    </nav>
  );
}
