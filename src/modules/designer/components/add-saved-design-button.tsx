"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";

/** Reuse a saved design: adds its latest version to the basket (the action redirects there). */
export function AddSavedDesignButton({ designId, version, action }: { designId: string; version: number; action: (input: unknown) => Promise<ActionResult> }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1">
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await action({ designId });
            if (!result.ok && result.error) setError(result.error);
          })
        }
      >
        {pending ? "Adding…" : `Order v${version}`}
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
