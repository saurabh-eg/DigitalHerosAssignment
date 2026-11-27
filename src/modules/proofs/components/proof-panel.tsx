"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ActionMessage } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { ROUTES } from "@/constants/routes";
import { idle, type ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/cn";
import type { OrderItem, Proof } from "@/modules/orders/orders.types";

type FormAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

const STATUS_STYLE: Record<Proof["status"], string> = {
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  changes_requested: "bg-danger/10 text-danger",
  superseded: "bg-paper text-ink-muted",
};
const STATUS_LABEL: Record<Proof["status"], string> = {
  pending: "Waiting for your approval",
  approved: "Approved",
  changes_requested: "Changes requested",
  superseded: "Replaced by a newer version",
};
const EVENT_LABEL = { issued: "Proof issued", approved: "Approved", changes_requested: "Changes requested", reorder_reused: "Reused for reorder" };

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

/** PRD §08: versioned proofs, approval log, change requests and the approval gate, per order line. */
export function ProofPanel({
  orderId,
  orderStatus,
  item,
  proofs,
  latestDesignVersion,
  artworkUrl,
  actions,
}: {
  orderId: string;
  orderStatus: string;
  item: OrderItem;
  proofs: Proof[];
  latestDesignVersion: number | null;
  artworkUrl: string | null;
  actions: { approve: FormAction; requestChanges: FormAction; resubmit: FormAction };
}) {
  const [approveState, approveAction] = useActionState(actions.approve, idle as ActionResult);
  const [changesState, changesAction] = useActionState(actions.requestChanges, idle as ActionResult);
  const [resubmitState, resubmitAction] = useActionState(actions.resubmit, idle as ActionResult);
  const [askingForChanges, setAskingForChanges] = useState(false);

  const sorted = [...proofs].sort((a, b) => b.version - a.version);
  const latest = sorted[0];
  if (!latest) return <p className="text-sm text-ink-muted">The proof for this item is being prepared.</p>;

  const canAnswer = orderStatus === "proof" && latest.status === "pending";
  const waitingForRevision = orderStatus === "artwork" && latest.status === "changes_requested";
  const hasNewVersion = latestDesignVersion !== null && item.designVersion !== null && latestDesignVersion > item.designVersion;
  const preview = latest.previewUrl ?? artworkUrl;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-display text-lg font-semibold">Proof v{latest.version}</h3>
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", STATUS_STYLE[latest.status])}>{STATUS_LABEL[latest.status]}</span>
        <span className="text-xs text-ink-muted">from design v{latest.designVersion}</span>
      </div>

      {preview ? (
        <a href={preview} target="_blank" rel="noreferrer" className="block rounded-md bg-[#d9dde3] p-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed proof URL */}
          <img src={preview} alt={`Proof version ${latest.version} of ${item.productName}`} className="mx-auto max-h-[420px] bg-surface shadow-[0_8px_24px_rgba(26,32,48,0.2)]" />
        </a>
      ) : (
        <p className="rounded-md bg-paper p-4 text-sm text-ink-muted">Your uploaded file is the proof for this item.</p>
      )}
      {item.csvDatasetId && <p className="text-sm text-ink-muted">Shown with spreadsheet row 1. Every row uses this approved layout.</p>}

      {/* Outside the action blocks: after a successful action the block itself disappears with the new status. */}
      <ActionMessage state={approveState} />
      <ActionMessage state={changesState} />
      <ActionMessage state={resubmitState} />

      {canAnswer && (
        <div className="flex flex-col gap-3 rounded-md border border-line p-4">
          <p className="text-sm">What you approve is exactly what we print. Check spelling, colours and layout.</p>
          {!askingForChanges ? (
            <div className="flex flex-wrap gap-2">
              <form action={approveAction}>
                <input type="hidden" name="proofId" value={latest.id} />
                <input type="hidden" name="orderId" value={orderId} />
                <SubmitButton pendingLabel="Approving…">Approve proof v{latest.version}</SubmitButton>
              </form>
              <Button variant="secondary" onClick={() => setAskingForChanges(true)}>
                Request changes
              </Button>
            </div>
          ) : (
            <form action={changesAction} className="flex flex-col gap-2">
              <input type="hidden" name="proofId" value={latest.id} />
              <input type="hidden" name="orderId" value={orderId} />
              <label htmlFor={`changes-${latest.id}`} className="text-sm font-medium">
                What should change?
              </label>
              <textarea
                id={`changes-${latest.id}`}
                name="comment"
                rows={3}
                required
                minLength={5}
                maxLength={1000}
                className="rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-ink focus:outline-none"
              />
              <div className="flex gap-2">
                <SubmitButton pendingLabel="Sending…">Send change request</SubmitButton>
                <Button variant="ghost" onClick={() => setAskingForChanges(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {waitingForRevision && item.designId && (
        <div className="flex flex-col gap-3 rounded-md border border-line p-4 text-sm">
          <p>
            1. <Link href={ROUTES.designer(item.designId)} className="font-medium text-accent underline">Edit your design</Link> and press Save design.
            <br />
            2. Submit the new version here to get proof v{latest.version + 1}.
          </p>
          <form action={resubmitAction}>
            <input type="hidden" name="orderId" value={orderId} />
            <input type="hidden" name="itemId" value={item.id} />
            <SubmitButton disabled={!hasNewVersion} pendingLabel="Issuing revised proof…">
              {hasNewVersion ? `Submit design v${latestDesignVersion}` : "Save a new design version first"}
            </SubmitButton>
          </form>
        </div>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer font-medium">Version history and approval log</summary>
        <ol className="mt-3 flex flex-col gap-3 border-l border-line pl-4">
          {sorted.map((p) => (
            <li key={p.id}>
              <p className="font-medium">
                v{p.version} <span className="font-normal text-ink-muted">({STATUS_LABEL[p.status].toLowerCase()})</span>
              </p>
              <ul className="text-ink-muted">
                {p.events.map((e, i) => (
                  <li key={i}>
                    {EVENT_LABEL[e.event]}
                    {e.actorName ? ` by ${e.actorName}` : ""}, {when(e.createdAt)}
                    {e.comment && <span className="block text-ink">“{e.comment}”</span>}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
