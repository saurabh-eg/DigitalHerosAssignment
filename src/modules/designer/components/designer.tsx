"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DESIGN_LIMITS, UPLOAD_LIMITS } from "@/constants/limits";
import { BUCKET } from "@/constants/storage";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/cn";
import type { RegisteredAsset } from "../designer.controller";
import type { CsvData, DesignView, UploadedArtwork } from "../designer.types";
import type { Scene, SceneElement } from "../designer.validator";
import type { RenderContext } from "../render/scene-svg";
import { instantiateTemplate } from "../render/template";
import { validateRows, validateScene, valuesForRow } from "../render/validate";
import { DataPanel } from "./data-panel";
import { DesignCanvas } from "./design-canvas";
import { ProofPreview } from "./proof-preview";
import { PropertiesPanel } from "./properties-panel";
import { extensionOf, uploadToStorage } from "./upload-file";
import { UploadPanel } from "./upload-panel";
import { useFontSet } from "./use-font-set";
import { useSceneHistory } from "./use-scene-history";

export type DesignerActions = {
  saveDraft: (input: unknown) => Promise<ActionResult<{ savedAt: string }>>;
  registerAsset: (input: unknown) => Promise<ActionResult<RegisteredAsset>>;
  saveCsvMapping: (input: unknown) => Promise<ActionResult>;
  saveVersion: (input: unknown) => Promise<ActionResult<{ version: number }>>;
};

type Tab = "edit" | "data" | "artwork";
type SaveState = "saved" | "saving" | "unsaved" | "error";

const newId = () => `el${crypto.randomUUID().slice(0, 8)}`;

function textElement(scene: Scene): SceneElement {
  const a = scene.printAreas[0];
  const heightMm = Math.max(6, a.heightMm * 0.2);
  const sizePt = Math.min(DESIGN_LIMITS.maxFontSizePt, Math.max(8, Math.floor(heightMm * 0.8 * 2.835)));
  return {
    id: newId(),
    type: "text",
    xMm: a.xMm + a.widthMm * 0.15,
    yMm: a.yMm + (a.heightMm - heightMm) / 2,
    widthMm: a.widthMm * 0.7,
    heightMm,
    rotation: 0,
    printAreaId: a.id,
    locked: false,
    text: "Your text",
    fontFamily: "inter",
    fontWeight: 700,
    fontSizePt: sizePt,
    trackingEm: 0,
    color: "#1a2030",
    align: "center",
    fit: { mode: "track_then_shrink", minPt: Math.max(DESIGN_LIMITS.minFontSizePt, Math.floor(sizePt * 0.35)), maxPt: sizePt, minTrackingEm: -0.05 },
  };
}

function boxElement(scene: Scene): SceneElement {
  const a = scene.printAreas[0];
  return {
    id: newId(),
    type: "rect",
    xMm: a.xMm + a.widthMm * 0.3,
    yMm: a.yMm + a.heightMm * 0.3,
    widthMm: a.widthMm * 0.4,
    heightMm: a.heightMm * 0.4,
    rotation: 0,
    printAreaId: a.id,
    locked: false,
    fill: "#1a2030",
    cornerRadiusMm: 0,
  };
}

/** `initialTab="data"` opens the spreadsheet panel straight away for jobs started as a CSV merge. */
export function Designer({ view, actions, initialTab }: { view: DesignView; actions: DesignerActions; initialTab?: string }) {
  const { fonts, error: fontError } = useFontSet();
  const history = useSceneHistory(view.scene);
  const { scene } = history;
  const isUpload = view.source === "upload";
  const variable = view.product.supportsVariableData && !isUpload;

  const [name, setName] = useState(view.name);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [assetUrls, setAssetUrls] = useState(view.assetUrls);
  const [artwork, setArtwork] = useState<UploadedArtwork | null>(view.upload);
  const [csv, setCsv] = useState<CsvData | null>(view.csv);
  const [rowIndex, setRowIndex] = useState(0);
  const [tab, setTab] = useState<Tab>(isUpload ? "artwork" : initialTab === "data" && variable ? "data" : "edit");
  const [showProof, setShowProof] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [version, setVersion] = useState(view.currentVersion);
  const [templateToApply, setTemplateToApply] = useState<string | null>(null);
  const [savingVersion, setSavingVersion] = useState(false);

  const values = useMemo(
    () => (csv && csv.rows[rowIndex] ? valuesForRow(csv.rows[rowIndex], csv.mapping) : undefined),
    [csv, rowIndex],
  );
  const ctx: RenderContext | null = useMemo(
    () => (fonts ? { fonts, values, imageHref: (el) => assetUrls[el.assetPath] ?? null } : null),
    [fonts, values, assetUrls],
  );
  const issues = useMemo(() => (fonts ? validateScene(scene, fonts, values) : []), [scene, fonts, values]);

  // Checking every CSV row can take a moment on large files, so it runs on a deferred copy.
  const deferredScene = useDeferredValue(scene);
  const rowIssues = useMemo(() => {
    if (!fonts || !csv) return null;
    return validateRows(deferredScene, fonts, csv.rows, csv.mapping);
  }, [deferredScene, fonts, csv]);

  // ─── Autosave ─────────────────────────────────────────────────────────────
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSaveState("unsaved");
    const timer = setTimeout(async () => {
      setSaveState("saving");
      const result = await actions.saveDraft({ designId: view.id, name: name.trim() || view.name, scene });
      setSaveState(result.ok ? "saved" : "error");
      if (!result.ok) setMessage({ tone: "error", text: result.error });
    }, DESIGN_LIMITS.autosaveDebounceMs);
    return () => clearTimeout(timer);
  }, [scene, name, actions, view.id, view.name]);

  // ─── Keyboard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        history.redo();
      } else if (selectedId && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault();
        history.removeElement(selectedId);
        setSelectedId(null);
      } else if (selectedId && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const el = scene.elements.find((x) => x.id === selectedId);
        if (!el) return;
        const step = e.shiftKey ? 5 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        history.updateElement(selectedId, { xMm: el.xMm + dx, yMm: el.yMm + dy });
      } else if (e.key === "Escape") {
        setSelectedId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [history, selectedId, scene.elements]);

  // ─── Toolbar actions ──────────────────────────────────────────────────────
  function add(el: SceneElement) {
    history.addElement(el);
    setSelectedId(el.id);
    setTab("edit");
  }

  async function addLogo(file: File) {
    setMessage(null);
    if (!["png", "jpg", "jpeg", "svg"].includes(extensionOf(file.name))) return setMessage({ tone: "error", text: "Logos must be PNG, JPG or SVG files." });
    if (file.size > UPLOAD_LIMITS.logoMaxBytes) return setMessage({ tone: "error", text: "Logos must be under 5 MB." });
    try {
      const path = await uploadToStorage(BUCKET.DESIGN_ASSETS, view.organizationId, view.id, file);
      const result = await actions.registerAsset({ designId: view.id, kind: "logo", path, originalName: file.name });
      if (!result.ok) return setMessage({ tone: "error", text: result.error });
      if (result.data.kind !== "logo") return;
      const logo = result.data.logo;
      setAssetUrls((urls) => ({ ...urls, [logo.assetPath]: logo.url }));
      const a = scene.printAreas[0];
      const scale = Math.min((a.widthMm * 0.4) / logo.pixelWidth, (a.heightMm * 0.4) / logo.pixelHeight);
      const widthMm = logo.pixelWidth * scale;
      const heightMm = logo.pixelHeight * scale;
      add({
        id: newId(),
        type: "image",
        xMm: a.xMm + (a.widthMm - widthMm) / 2,
        yMm: a.yMm + (a.heightMm - heightMm) / 2,
        widthMm,
        heightMm,
        rotation: 0,
        printAreaId: a.id,
        locked: false,
        assetPath: logo.assetPath,
        mimeType: logo.mimeType,
        pixelWidth: logo.pixelWidth,
        pixelHeight: logo.pixelHeight,
      });
    } catch (e) {
      setMessage({ tone: "error", text: e instanceof Error ? e.message : "The upload failed." });
    }
  }

  function applyTemplate(templateId: string) {
    const template = view.templates.find((t) => t.id === templateId);
    if (!template) return;
    history.replace(instantiateTemplate(template.scene, scene));
    setSelectedId(null);
    setTemplateToApply(null);
  }

  async function saveVersion() {
    setMessage(null);
    setSavingVersion(true);
    // Make sure the latest edits are stored before validating on the server.
    const draft = await actions.saveDraft({ designId: view.id, name: name.trim() || view.name, scene });
    if (!draft.ok) {
      setSavingVersion(false);
      return setMessage({ tone: "error", text: draft.error });
    }
    const result = await actions.saveVersion({ designId: view.id });
    setSavingVersion(false);
    if (!result.ok) return setMessage({ tone: "error", text: result.error });
    setVersion(result.data.version);
    setSaveState("saved");
    setMessage({ tone: "success", text: result.message ?? "Design saved." });
  }

  if (fontError) return <Alert tone="error">The designer fonts didn&apos;t load. Check your connection and reload the page.</Alert>;
  if (!fonts || !ctx) {
    return <p className="py-20 text-center text-ink-muted">Loading the designer…</p>;
  }

  const selected = scene.elements.find((el) => el.id === selectedId) ?? null;
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const tabs: Array<{ id: Tab; label: string }> = isUpload
    ? [{ id: "artwork", label: "Artwork" }]
    : [{ id: "edit", label: "Edit" }, ...(variable ? [{ id: "data" as Tab, label: "Spreadsheet" }] : [])];
  const saveLabel: Record<SaveState, string> = { saved: "All changes saved", saving: "Saving…", unsaved: "Unsaved changes", error: "Couldn't save" };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 border-b border-line pb-4">
        <label className="sr-only" htmlFor="design-name">
          Design name
        </label>
        <input
          id="design-name"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          className="h-10 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 font-display text-xl font-semibold hover:border-line focus:border-ink focus:bg-surface focus:outline-none sm:max-w-md"
        />
        <span className={cn("text-sm", saveState === "error" ? "text-danger" : "text-ink-muted")} aria-live="polite">
          {saveLabel[saveState]}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {!isUpload && (
            <>
              <Button variant="ghost" size="sm" onClick={history.undo} disabled={!history.canUndo} title="Undo (Ctrl+Z)">
                Undo
              </Button>
              <Button variant="ghost" size="sm" onClick={history.redo} disabled={!history.canRedo} title="Redo (Ctrl+Shift+Z)">
                Redo
              </Button>
            </>
          )}
          <Button variant="secondary" size="sm" onClick={() => setShowProof((v) => !v)} aria-pressed={showProof}>
            {showProof ? "Back to editing" : "Preview proof"}
          </Button>
          <Button size="sm" onClick={saveVersion} disabled={savingVersion || (isUpload && !artwork)}>
            {savingVersion ? "Checking…" : "Save design"}
          </Button>
        </div>
      </div>

      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="flex min-w-0 flex-col gap-3">
          {!isUpload && !showProof && (
            <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Add to design">
              <Button variant="secondary" size="sm" onClick={() => add(textElement(scene))}>
                Add text
              </Button>
              <label className="inline-flex h-9 cursor-pointer items-center rounded-full border border-line bg-surface px-4 text-sm font-medium hover:border-ink">
                Add logo
                <input type="file" accept=".png,.jpg,.jpeg,.svg" className="sr-only" onChange={(e) => e.target.files?.[0] && addLogo(e.target.files[0])} />
              </label>
              <Button variant="secondary" size="sm" onClick={() => add(boxElement(scene))}>
                Add box
              </Button>
              {view.templates.length > 1 && (
                <select
                  value=""
                  onChange={(e) => setTemplateToApply(e.target.value || null)}
                  className="h-9 rounded-full border border-line bg-surface px-3 text-sm"
                  aria-label="Switch template"
                >
                  <option value="">Switch template…</option>
                  {view.templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
          {templateToApply && (
            <div className="flex flex-wrap items-center gap-3 rounded-md bg-warning/10 px-3 py-2 text-sm">
              Replace your current design with this template? You can undo afterwards.
              <Button size="sm" onClick={() => applyTemplate(templateToApply)}>
                Replace design
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setTemplateToApply(null)}>
                Keep current design
              </Button>
            </div>
          )}

          <div className="rounded-[var(--radius-card)] border border-line bg-[#e2e5ea] p-3 sm:p-5">
            {showProof || isUpload ? (
              <ProofPreview
                scene={scene}
                ctx={ctx}
                artwork={isUpload ? artwork : null}
                rowLabel={csv ? `row ${rowIndex + 1} of ${csv.rowCount}` : undefined}
              />
            ) : (
              <DesignCanvas
                scene={scene}
                fonts={fonts}
                assetUrls={assetUrls}
                values={values}
                selectedId={selectedId}
                onSelect={setSelectedId}
                history={history}
                issues={issues}
              />
            )}
          </div>

          {!isUpload && !showProof && (
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-muted" aria-label="Canvas guides">
              <li className="flex items-center gap-1.5">
                <span className="inline-block h-0 w-5 border-t-2 border-dashed border-accent" /> Print area: everything must stay inside
              </li>
              <li className="flex items-center gap-1.5">
                <span className="inline-block h-0 w-5 border-t-2 border-ink" /> Trim line
              </li>
              {scene.bleedMm > 0 && (
                <li className="flex items-center gap-1.5">
                  <span className="inline-block size-3 bg-danger/20" /> Bleed, trimmed off after printing
                </li>
              )}
            </ul>
          )}
        </section>

        <aside className="flex flex-col gap-4">
          {tabs.length > 1 && (
            <div role="tablist" className="flex gap-1 rounded-full bg-surface p-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  type="button"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={cn("flex-1 rounded-full px-3 py-1.5 text-sm", tab === t.id ? "bg-ink text-surface" : "hover:bg-paper")}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
            {tab === "edit" && (
              <PropertiesPanel
                element={selected}
                history={history}
                issues={issues}
                placeholders={variable}
                background={scene.background}
                onBackground={(background) => history.apply((s) => ({ ...s, background }))}
              />
            )}
            {tab === "data" && (
              <DataPanel
                designId={view.id}
                organizationId={view.organizationId}
                scene={scene}
                csv={csv}
                onCsv={setCsv}
                rowIndex={rowIndex}
                onRowIndex={setRowIndex}
                rowIssues={rowIssues}
                registerAsset={actions.registerAsset}
                saveMapping={actions.saveCsvMapping}
              />
            )}
            {tab === "artwork" && (
              <UploadPanel
                designId={view.id}
                organizationId={view.organizationId}
                scene={scene}
                artwork={artwork}
                onArtwork={setArtwork}
                registerAsset={actions.registerAsset}
              />
            )}
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-[var(--radius-card)] border border-line bg-surface p-4 text-sm">
            <dt className="text-ink-muted">Product</dt>
            <dd>{view.product.name}</dd>
            <dt className="text-ink-muted">Size</dt>
            <dd>
              {scene.widthMm} × {scene.heightMm} mm
            </dd>
            <dt className="text-ink-muted">Material</dt>
            <dd>{view.product.materials.find((m) => m.id === view.configuration.materialId)?.name}</dd>
            <dt className="text-ink-muted">Quantity</dt>
            <dd>{(csv?.rowCount ?? view.configuration.quantity).toLocaleString("en-GB")}</dd>
            <dt className="text-ink-muted">Saved version</dt>
            <dd>{version > 0 ? `v${version}` : "Not saved yet"}</dd>
            {!isUpload && (
              <>
                <dt className="text-ink-muted">Checks</dt>
                <dd className={errorCount ? "text-danger" : "text-success"}>
                  {errorCount ? `${errorCount} ${errorCount === 1 ? "problem" : "problems"} to fix` : "Ready to print"}
                </dd>
              </>
            )}
          </dl>
        </aside>
      </div>
    </div>
  );
}
