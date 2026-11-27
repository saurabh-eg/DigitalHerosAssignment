"use client";

import { useId, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { UPLOAD_LIMITS } from "@/constants/limits";
import { BUCKET } from "@/constants/storage";
import type { ActionResult } from "@/lib/action-result";
import type { RegisteredAsset } from "../designer.controller";
import type { UploadedArtwork } from "../designer.types";
import type { Scene } from "../designer.validator";
import { extensionOf, uploadToStorage } from "./upload-file";

const ACCEPTED = ["pdf", "svg", "ai", "png"];

export function ArtworkPreview({ artwork, className }: { artwork: UploadedArtwork; className?: string }) {
  if (artwork.mimeType === "image/png" || artwork.mimeType === "image/svg+xml") {
    // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage
    return <img src={artwork.url} alt={`Preview of ${artwork.originalName}`} className={className} />;
  }
  if (artwork.mimeType === "application/pdf") {
    return (
      <object data={artwork.url} type="application/pdf" className={className} aria-label={`Preview of ${artwork.originalName}`}>
        <a href={artwork.url} target="_blank" rel="noreferrer" className="text-accent underline">
          Open the PDF
        </a>
      </object>
    );
  }
  return <p className="text-sm text-ink-muted">No preview for this file type. We&apos;ll check it by hand.</p>;
}

/** PRD §06 upload path: finished artwork instead of designing online. */
export function UploadPanel({
  designId,
  organizationId,
  scene,
  artwork,
  onArtwork,
  registerAsset,
}: {
  designId: string;
  organizationId: string;
  scene: Scene;
  artwork: UploadedArtwork | null;
  onArtwork: (artwork: UploadedArtwork) => void;
  registerAsset: (input: unknown) => Promise<ActionResult<RegisteredAsset>>;
}) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const printW = scene.widthMm + 2 * scene.bleedMm;
  const printH = scene.heightMm + 2 * scene.bleedMm;

  async function onFile(file: File) {
    setError(null);
    if (!ACCEPTED.includes(extensionOf(file.name))) return setError("Upload a PDF, SVG, AI or PNG file.");
    if (file.size > UPLOAD_LIMITS.artworkMaxBytes) return setError("Files must be under 25 MB.");
    setBusy(true);
    try {
      const path = await uploadToStorage(BUCKET.UPLOADS, organizationId, designId, file);
      const result = await registerAsset({ designId, kind: "artwork", path, originalName: file.name });
      if (!result.ok) setError(result.error);
      else if (result.data.kind === "artwork") onArtwork(result.data.artwork);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md bg-paper p-3 text-sm">
        <p className="font-medium">Set up your file at {printW} × {printH} mm</p>
        <p className="text-ink-muted">
          That&apos;s {scene.widthMm} × {scene.heightMm} mm plus {scene.bleedMm} mm bleed on each edge. Keep text {scene.safeMarginMm} mm inside the trim.
          PNGs need 300 dpi ({Math.round((printW / 25.4) * 300)} × {Math.round((printH / 25.4) * 300)} px).
        </p>
      </div>
      <div>
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium">
          {artwork ? "Replace artwork" : "Choose your artwork (PDF, SVG, AI or PNG)"}
        </label>
        <input
          id={inputId}
          type="file"
          accept=".pdf,.svg,.ai,.png,application/pdf,image/svg+xml,image/png"
          disabled={busy}
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:text-surface"
        />
        {busy && <p className="mt-2 text-sm text-ink-muted">Uploading and checking your file…</p>}
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {artwork && (
        <div className="flex flex-col gap-2 text-sm">
          <p className="font-medium">
            {artwork.originalName} <span className="font-normal text-ink-muted">({Math.round(artwork.sizeBytes / 1024)} KB)</span>
          </p>
          <ul className="list-disc pl-5 text-ink-muted">
            {artwork.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
