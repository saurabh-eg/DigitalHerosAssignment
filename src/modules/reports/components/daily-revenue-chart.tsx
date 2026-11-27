import { formatMoney } from "@/lib/money";

type Day = { day: string; orders: number; revenue_minor: number };

const W = 720;
const H = 180;
const PAD = { top: 12, right: 8, bottom: 22, left: 8 };
const GAP = 2;
const RADIUS = 4;

/** One bar path: rounded top (data end), square base anchored to the baseline. */
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(RADIUS, w / 2, h);
  return `M${x} ${y + h}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h}Z`;
}

/** Daily revenue for the report range: single series, so no legend; each bar has a hover tooltip; table view below. */
export function DailyRevenueChart({ from, to, days }: { from: string; to: string; days: Day[] }) {
  // Fill empty days so the time axis is continuous.
  const byDay = new Map(days.map((d) => [d.day, d]));
  const series: Day[] = [];
  for (let t = Date.parse(from); t <= Date.parse(to); t += 86_400_000) {
    const day = new Date(t).toISOString().slice(0, 10);
    series.push(byDay.get(day) ?? { day, orders: 0, revenue_minor: 0 });
  }
  const max = Math.max(1, ...series.map((d) => d.revenue_minor));
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const slot = plotW / series.length;
  const barW = Math.max(1, slot - GAP);
  const label = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-sm text-ink-muted">Revenue per day, VAT included. Peak {formatMoney(max)}.</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Daily revenue bar chart">
        <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke="var(--color-line)" strokeWidth={1} />
        {series.map((d, i) => {
          const h = (d.revenue_minor / max) * plotH;
          const x = PAD.left + i * slot + GAP / 2;
          return (
            <g key={d.day} className="group">
              {/* Full-height hit target, wider than the mark, so small days are still hoverable. */}
              <rect x={PAD.left + i * slot} y={PAD.top} width={slot} height={plotH} fill="transparent">
                <title>{`${label(d.day)}: ${formatMoney(d.revenue_minor)} from ${d.orders} ${d.orders === 1 ? "order" : "orders"}`}</title>
              </rect>
              {h > 0 && <path d={barPath(x, H - PAD.bottom - h, barW, h)} className="pointer-events-none fill-ink/80 group-hover:fill-accent" />}
            </g>
          );
        })}
        <text x={PAD.left} y={H - 6} fontSize={11} fill="var(--color-ink-muted)">
          {label(from)}
        </text>
        <text x={W - PAD.right} y={H - 6} fontSize={11} fill="var(--color-ink-muted)" textAnchor="end">
          {label(to)}
        </text>
      </svg>
      <details className="text-sm">
        <summary className="cursor-pointer text-ink-muted">Show as a table</summary>
        <table className="mt-2 w-full max-w-md">
          <thead className="text-left text-ink-muted">
            <tr>
              <th className="font-medium">Day</th>
              <th className="text-right font-medium">Orders</th>
              <th className="text-right font-medium">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {series
              .filter((d) => d.orders > 0)
              .map((d) => (
                <tr key={d.day} className="border-t border-line">
                  <td className="py-1">{label(d.day)}</td>
                  <td className="py-1 text-right">{d.orders}</td>
                  <td className="py-1 text-right">{formatMoney(d.revenue_minor)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
