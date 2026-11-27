"use client";

import { useState } from "react";
import { ActionForm } from "@/components/admin/action-form";
import type { ActionResult } from "@/lib/action-result";

type FormAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
type Tier = { min_quantity: number; discount_bps: number };

/** Editable list of volume-discount breaks (quantity floor → % off). */
export function TiersEditor({ productId, tiers, action }: { productId: string | null; tiers: Tier[]; action: FormAction }) {
  const [rows, setRows] = useState(() => tiers.map((t) => ({ key: crypto.randomUUID(), qty: String(t.min_quantity), pct: String(t.discount_bps / 100) })));
  const input = "h-9 w-28 rounded-md border border-line bg-surface px-2.5 text-sm";
  return (
    <ActionForm action={action} hidden={productId ? { productId } : {}} label="Save discounts" variant="primary">
      <div className="flex flex-col gap-2">
        {rows.length === 0 && <p className="text-sm text-ink-muted">No volume discounts.</p>}
        {rows.map((r, i) => (
          <div key={r.key} className="flex items-center gap-2 text-sm">
            <span className="text-ink-muted">From</span>
            <input name="minQuantity" type="number" min={2} defaultValue={r.qty} aria-label={`Tier ${i + 1} quantity`} className={input} />
            <span className="text-ink-muted">units,</span>
            <input name="discountPct" type="number" min={0.01} max={90} step={0.01} defaultValue={r.pct} aria-label={`Tier ${i + 1} discount percent`} className={input} />
            <span className="text-ink-muted">% off</span>
            <button type="button" onClick={() => setRows(rows.filter((x) => x.key !== r.key))} className="text-danger hover:underline">
              Remove
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setRows([...rows, { key: crypto.randomUUID(), qty: "", pct: "" }])} className="self-start text-sm text-accent hover:underline">
          Add a break
        </button>
      </div>
    </ActionForm>
  );
}
