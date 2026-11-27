"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

/** Route-level error boundary: says what happened and offers a way forward, without exposing internals. */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-4 py-20 sm:px-6">
      <h1 className="text-3xl font-bold">Something went wrong loading this page</h1>
      <p className="text-ink-muted">
        Nothing you saved has been lost. Try again; if it keeps happening, quote the reference below when you contact us.
      </p>
      {error.digest && <p className="font-mono text-sm text-ink-muted">Reference: {error.digest}</p>}
      <div className="flex flex-wrap gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href={ROUTES.home} variant="secondary">
          Back to the homepage
        </ButtonLink>
      </div>
    </main>
  );
}
