"use client";

import { useMemo, useState } from "react";
import type { UploadedArtwork } from "../designer.types";
import type { Scene } from "../designer.validator";
import { renderSceneSvg, type RenderContext } from "../render/scene-svg";
import { ArtworkPreview } from "./upload-panel";

/**
 * PRD §06 real-time proof preview, rendered by the same renderer as the print file: what is approved
 * is what is printed. Optionally shows the bleed that will be trimmed off.
 */
export function ProofPreview({ scene, ctx, artwork, rowLabel }: { scene: Scene; ctx: RenderContext; artwork: UploadedArtwork | null; rowLabel?: string }) {
  const [showBleed, setShowBleed] = useState(false);
  const svg = useMemo(() => (artwork ? "" : renderSceneSvg(scene, ctx, { includeBleed: showBleed })), [scene, ctx, showBleed, artwork]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid place-items-center rounded-[var(--radius-card)] bg-[#d9dde3] p-6 sm:p-10">
        {artwork ? (
          <ArtworkPreview artwork={artwork} className="max-h-[60vh] w-full bg-surface shadow-[0_10px_30px_rgba(26,32,48,0.25)]" />
        ) : (
          <div
            className="w-full max-w-2xl [&>svg]:h-auto [&>svg]:max-h-[60vh] [&>svg]:w-full [&>svg]:shadow-[0_10px_30px_rgba(26,32,48,0.25)]"
            role="img"
            aria-label="Proof preview"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-ink-muted">
          Proof at {scene.widthMm} × {scene.heightMm} mm{rowLabel ? `, ${rowLabel}` : ""}. Text is converted to outlines exactly as it will print.
        </p>
        {!artwork && scene.bleedMm > 0 && (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={showBleed} onChange={(e) => setShowBleed(e.target.checked)} className="accent-accent" />
            Show the {scene.bleedMm} mm bleed
          </label>
        )}
      </div>
    </div>
  );
}
