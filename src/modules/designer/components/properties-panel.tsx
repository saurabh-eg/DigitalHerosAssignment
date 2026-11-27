"use client";

import { useId, type ReactNode } from "react";
import { DESIGN_LIMITS } from "@/constants/limits";
import { FIT_MODE } from "@/constants/print";
import { cn } from "@/lib/cn";
import type { SceneElement, TextElement } from "../designer.validator";
import { FONT_FAMILIES, FONT_FAMILY_IDS, type FontFamilyId } from "../render/fonts";
import { effectiveDpi } from "../render/geometry";
import type { SceneIssue } from "../render/validate";
import type { SceneHistory } from "./use-scene-history";

const inputClass =
  "h-10 w-full rounded-md border border-line bg-surface px-2.5 text-sm focus:border-ink focus:outline-none disabled:opacity-50";

function Row({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-ink-muted">
        {label}
      </label>
      {children(id)}
    </div>
  );
}

function NumberField({ label, value, onChange, min, max, step = 1 }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number }) {
  return (
    <Row label={label}>
      {(id) => (
        <input
          id={id}
          type="number"
          value={Math.round(value * 100) / 100}
          min={min}
          max={max}
          step={step}
          onChange={(e) => Number.isFinite(e.target.valueAsNumber) && onChange(Math.min(max, Math.max(min, e.target.valueAsNumber)))}
          className={inputClass}
        />
      )}
    </Row>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Row label={label}>
      {(id) => (
        <span className="flex items-center gap-2">
          <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 cursor-pointer rounded-md border border-line bg-surface p-1" />
          <span className="text-sm text-ink-muted uppercase">{value}</span>
        </span>
      )}
    </Row>
  );
}

function TextProperties({ el, history, placeholders }: { el: TextElement; history: SceneHistory; placeholders: boolean }) {
  const set = (patch: Partial<TextElement>) => history.updateElement(el.id, patch);
  const singleWeight = el.fontFamily === "archivo-black";

  return (
    <>
      <Row label="Text">
        {(id) => (
          <textarea
            id={id}
            value={el.text}
            maxLength={DESIGN_LIMITS.maxTextLength}
            rows={3}
            onChange={(e) => set({ text: e.target.value })}
            className="w-full rounded-md border border-line bg-surface px-2.5 py-2 text-sm focus:border-ink focus:outline-none"
            data-autofocus-text
          />
        )}
      </Row>
      <div className="grid grid-cols-2 gap-3">
        <Row label="Font">
          {(id) => (
            <select id={id} value={el.fontFamily} onChange={(e) => set({ fontFamily: e.target.value as FontFamilyId })} className={inputClass}>
              {FONT_FAMILY_IDS.map((f) => (
                <option key={f} value={f}>
                  {FONT_FAMILIES[f].label}
                </option>
              ))}
            </select>
          )}
        </Row>
        <Row label="Weight">
          {(id) => (
            <select id={id} value={el.fontWeight} disabled={singleWeight} onChange={(e) => set({ fontWeight: Number(e.target.value) as 400 | 700 })} className={inputClass}>
              <option value={400}>Regular</option>
              <option value={700}>Bold</option>
            </select>
          )}
        </Row>
        <NumberField
          label="Size (pt)"
          value={el.fontSizePt}
          min={el.fit.minPt}
          max={DESIGN_LIMITS.maxFontSizePt}
          step={0.5}
          onChange={(v) => set({ fontSizePt: v, fit: { ...el.fit, maxPt: Math.max(v, el.fit.minPt) } })}
        />
        <NumberField label="Letter spacing (em)" value={el.trackingEm} min={-0.2} max={1} step={0.01} onChange={(v) => set({ trackingEm: v })} />
      </div>
      <ColorField label="Colour" value={el.color} onChange={(color) => set({ color })} />
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-ink-muted">Alignment</span>
        <div role="radiogroup" aria-label="Alignment" className="flex gap-1">
          {(["left", "center", "right"] as const).map((a) => (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={el.align === a}
              onClick={() => set({ align: a })}
              className={cn("flex-1 rounded-md border px-2 py-2 text-sm capitalize", el.align === a ? "border-ink bg-ink text-surface" : "border-line bg-surface hover:border-ink")}
            >
              {a === "center" ? "Centre" : a}
            </button>
          ))}
        </div>
      </div>
      <details className="rounded-md border border-line bg-paper/60 p-3 text-sm">
        <summary className="cursor-pointer font-medium">Fitting rules</summary>
        <div className="mt-3 flex flex-col gap-3">
          <Row label="When text is too long">
            {(id) => (
              <select id={id} value={el.fit.mode} onChange={(e) => set({ fit: { ...el.fit, mode: e.target.value as TextElement["fit"]["mode"] } })} className={inputClass}>
                <option value={FIT_MODE.TRACK_THEN_SHRINK}>Tighten spacing, then shrink</option>
                <option value={FIT_MODE.SHRINK}>Shrink to fit</option>
                <option value={FIT_MODE.NONE}>Don&apos;t adjust</option>
              </select>
            )}
          </Row>
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Smallest size (pt)"
              value={el.fit.minPt}
              min={DESIGN_LIMITS.minFontSizePt}
              max={el.fit.maxPt}
              step={0.5}
              onChange={(v) => set({ fit: { ...el.fit, minPt: v } })}
            />
            <NumberField
              label="Tightest spacing (em)"
              value={el.fit.minTrackingEm}
              min={-0.2}
              max={0}
              step={0.01}
              onChange={(v) => set({ fit: { ...el.fit, minTrackingEm: v } })}
            />
          </div>
          {placeholders && (
            <Row label="Spreadsheet field (optional)">
              {(id) => (
                <input
                  id={id}
                  value={el.placeholder ?? ""}
                  maxLength={40}
                  placeholder="e.g. name"
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase();
                    set({ placeholder: value || undefined });
                  }}
                  className={inputClass}
                />
              )}
            </Row>
          )}
        </div>
      </details>
    </>
  );
}

export function PropertiesPanel({
  element,
  history,
  issues,
  placeholders,
  background,
  onBackground,
}: {
  element: SceneElement | null;
  history: SceneHistory;
  issues: SceneIssue[];
  placeholders: boolean;
  background: string;
  onBackground: (color: string) => void;
}) {
  if (!element) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-muted">Select something on the canvas to edit it, or add text, a logo or a box.</p>
        <ColorField label="Background colour" value={background} onChange={onBackground} />
      </div>
    );
  }

  const own = issues.filter((i) => i.elementId === element.id);
  const label = element.type === "text" ? "Text" : element.type === "image" ? "Logo" : "Box";

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-lg font-semibold">{label}</h2>
      {own.map((issue) => (
        <p key={issue.message} className={cn("rounded-md px-3 py-2 text-sm", issue.severity === "error" ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning")}>
          {issue.message}
        </p>
      ))}

      {element.type === "text" && <TextProperties el={element} history={history} placeholders={placeholders} />}
      {element.type === "rect" && (
        <>
          <ColorField label="Fill" value={element.fill} onChange={(fill) => history.updateElement(element.id, { fill })} />
          <NumberField label="Corner radius (mm)" value={element.cornerRadiusMm} min={0} max={100} onChange={(v) => history.updateElement(element.id, { cornerRadiusMm: v })} />
        </>
      )}
      {element.type === "image" && element.mimeType !== "image/svg+xml" && (
        <p className="text-sm text-ink-muted">
          {element.pixelWidth} × {element.pixelHeight} px, about{" "}
          {Math.round(effectiveDpi(element.pixelWidth, element.pixelHeight, element.widthMm, element.heightMm))} dpi at this size.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 border-t border-line pt-4">
        <NumberField label="Width (mm)" value={element.widthMm} min={1} max={1000} onChange={(v) => history.updateElement(element.id, { widthMm: v })} />
        <NumberField label="Height (mm)" value={element.heightMm} min={1} max={1000} onChange={(v) => history.updateElement(element.id, { heightMm: v })} />
        <NumberField label="Rotation (°)" value={element.rotation} min={-180} max={180} onChange={(v) => history.updateElement(element.id, { rotation: v })} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => history.moveLayer(element.id, 1)} className="rounded-md border border-line bg-surface px-3 py-2 text-sm hover:border-ink">
          Bring forward
        </button>
        <button type="button" onClick={() => history.moveLayer(element.id, -1)} className="rounded-md border border-line bg-surface px-3 py-2 text-sm hover:border-ink">
          Send back
        </button>
        <button type="button" onClick={() => history.removeElement(element.id)} className="rounded-md border border-danger/40 bg-surface px-3 py-2 text-sm text-danger hover:border-danger">
          Delete
        </button>
      </div>
    </div>
  );
}
