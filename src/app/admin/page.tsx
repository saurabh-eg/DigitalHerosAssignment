import type { Metadata } from "next";
import { ORDER_STATUS_LABEL, PIPELINE_STAGES } from "@/constants/pipeline";

export const metadata: Metadata = { title: "Production console" };

// Overview shell; the pipeline board, job search, downloads and reports arrive in P9.
export default function AdminOverviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold">Production console</h1>
        <p className="mt-1 text-ink-muted">Every job, quote to completed, in one place.</p>
      </header>
      <ol className="flex flex-wrap gap-2" aria-label="Pipeline stages">
        {PIPELINE_STAGES.map((stage, index) => (
          <li
            key={stage}
            className="rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-xs uppercase tracking-wider"
          >
            {String(index + 1).padStart(2, "0")} · {ORDER_STATUS_LABEL[stage]}
          </li>
        ))}
      </ol>
    </div>
  );
}
