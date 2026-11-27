"use client";

import { useId, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { CSV_LIMITS, UPLOAD_LIMITS } from "@/constants/limits";
import { BUCKET } from "@/constants/storage";
import type { ActionResult } from "@/lib/action-result";
import type { RegisteredAsset } from "../designer.controller";
import type { CsvData } from "../designer.types";
import type { Scene } from "../designer.validator";
import { parseCsv } from "../csv";
import type { SceneIssue } from "../render/validate";
import { uploadToStorage } from "./upload-file";

type Props = {
  designId: string;
  organizationId: string;
  scene: Scene;
  csv: CsvData | null;
  onCsv: (csv: CsvData) => void;
  rowIndex: number;
  onRowIndex: (index: number) => void;
  rowIssues: SceneIssue[] | null;
  registerAsset: (input: unknown) => Promise<ActionResult<RegisteredAsset>>;
  saveMapping: (input: unknown) => Promise<ActionResult>;
};

function sampleCsv(scene: Scene, placeholders: string[]): string {
  const sample = (p: string) => {
    const el = scene.elements.find((e) => e.type === "text" && e.placeholder === p);
    return el?.type === "text" ? el.text.replace(/"/g, '""') : "";
  };
  return [placeholders.join(","), placeholders.map((p) => `"${sample(p)}"`).join(",")].join("\n");
}

/** PRD §07 variable data: one finished piece per spreadsheet row, merged on the server. */
export function DataPanel({ designId, organizationId, scene, csv, onCsv, rowIndex, onRowIndex, rowIssues, registerAsset, saveMapping }: Props) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const placeholders = [...new Set(scene.elements.flatMap((el) => (el.type === "text" && el.placeholder ? [el.placeholder] : [])))];

  async function onFile(file: File) {
    setError(null);
    if (file.size > UPLOAD_LIMITS.csvMaxBytes) return setError("Spreadsheets must be under 2 MB.");
    const preview = parseCsv(await file.text());
    if (preview.errors.length > 0) return setError(preview.errors[0]);
    setBusy(true);
    try {
      const path = await uploadToStorage(BUCKET.CSV, organizationId, designId, file);
      const result = await registerAsset({ designId, kind: "csv", path, originalName: file.name });
      if (!result.ok) setError(result.error);
      else if (result.data.kind === "csv") {
        onCsv(result.data.csv);
        onRowIndex(0);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "The upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function setColumn(placeholder: string, column: string) {
    if (!csv) return;
    const mapping = { ...csv.mapping };
    if (column) mapping[placeholder] = column;
    else delete mapping[placeholder];
    onCsv({ ...csv, mapping });
    const result = await saveMapping({ designId, mapping });
    if (!result.ok) setError(result.error);
  }

  if (placeholders.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        No text is linked to a spreadsheet field yet. Select a text box and set its spreadsheet field under Fitting rules, for example
        &ldquo;name&rdquo;.
      </p>
    );
  }

  const failingRows = rowIssues ? [...new Set(rowIssues.map((i) => i.row!))] : [];

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-ink-muted">
        Upload a CSV with one row per finished piece. Columns fill these fields: {placeholders.map((p) => `“${p}”`).join(", ")}. Up to{" "}
        {CSV_LIMITS.maxRows.toLocaleString("en-GB")} rows.
      </p>
      <a
        href={`data:text/csv;charset=utf-8,${encodeURIComponent(sampleCsv(scene, placeholders))}`}
        download="sample.csv"
        className="text-sm font-medium text-accent underline-offset-4 hover:underline"
      >
        Download a sample spreadsheet
      </a>

      <div>
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium">
          {csv ? "Replace spreadsheet" : "Upload spreadsheet (.csv)"}
        </label>
        <input
          id={inputId}
          type="file"
          accept=".csv,text/csv"
          disabled={busy}
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:text-surface"
        />
        {busy && <p className="mt-2 text-sm text-ink-muted">Checking your spreadsheet…</p>}
      </div>
      {error && <Alert tone="error">{error}</Alert>}

      {csv && (
        <>
          <div className="flex flex-col gap-3">
            <h3 className="font-display font-semibold">Match fields to columns</h3>
            {placeholders.map((p) => (
              <label key={p} className="grid grid-cols-[6rem_1fr] items-center gap-2 text-sm">
                <span className="truncate font-medium">{p}</span>
                <select
                  value={csv.mapping[p] ?? ""}
                  onChange={(e) => setColumn(p, e.target.value)}
                  className="h-10 rounded-md border border-line bg-surface px-2 focus:border-ink focus:outline-none"
                >
                  <option value="">Choose a column</option>
                  {csv.columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 rounded-md border border-line bg-surface p-2 text-sm">
            <button type="button" onClick={() => onRowIndex(Math.max(0, rowIndex - 1))} disabled={rowIndex === 0} className="rounded px-3 py-1.5 hover:bg-paper disabled:opacity-40">
              Previous
            </button>
            <span>
              Previewing row {rowIndex + 1} of {csv.rowCount.toLocaleString("en-GB")}
            </span>
            <button
              type="button"
              onClick={() => onRowIndex(Math.min(csv.rows.length - 1, rowIndex + 1))}
              disabled={rowIndex >= csv.rows.length - 1}
              className="rounded px-3 py-1.5 hover:bg-paper disabled:opacity-40"
            >
              Next
            </button>
          </div>

          {rowIssues === null ? (
            <p className="text-sm text-ink-muted">Checking every row…</p>
          ) : failingRows.length === 0 ? (
            <Alert tone="success">All {csv.rowCount.toLocaleString("en-GB")} rows fit the layout. Quantity is set to {csv.rowCount.toLocaleString("en-GB")}.</Alert>
          ) : (
            <Alert tone="error">
              {failingRows.length} {failingRows.length === 1 ? "row doesn't" : "rows don't"} fit, even at the smallest allowed size:{" "}
              {failingRows.slice(0, 10).map((row, i) => (
                <span key={row}>
                  {i > 0 && ", "}
                  <button type="button" className="underline" onClick={() => onRowIndex(row - 1)}>
                    row {row}
                  </button>
                </span>
              ))}
              {failingRows.length > 10 && " and more"}. Shorten those values or make the text boxes larger.
            </Alert>
          )}
        </>
      )}
    </div>
  );
}
