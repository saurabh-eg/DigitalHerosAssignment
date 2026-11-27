import Papa from "papaparse";
import { CSV_LIMITS } from "@/constants/limits";

export type ParsedCsv = { columns: string[]; rows: Array<Record<string, string>>; errors: string[] };

/** Parses a CSV with a header row and enforces the variable-data limits (D-010). */
export function parseCsv(text: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
    transform: (v) => v.trim(),
  });

  const columns = (result.meta.fields ?? []).filter(Boolean);
  const rows = result.data;
  const errors: string[] = [];

  if (columns.length === 0) errors.push("The first row must contain column names, e.g. number,name.");
  if (new Set(columns.map((c) => c.toLowerCase())).size !== columns.length) errors.push("Column names must be unique.");
  if (columns.length > CSV_LIMITS.maxColumns) errors.push(`Use at most ${CSV_LIMITS.maxColumns} columns.`);
  if (rows.length === 0) errors.push("The file has no data rows.");
  if (rows.length > CSV_LIMITS.maxRows) errors.push(`Use at most ${CSV_LIMITS.maxRows.toLocaleString("en-GB")} rows per order.`);

  const longCell = rows.findIndex((row) => Object.values(row).some((v) => (v ?? "").length > CSV_LIMITS.maxCellLength));
  if (longCell >= 0) errors.push(`Row ${longCell + 2} has a value longer than ${CSV_LIMITS.maxCellLength} characters.`);

  for (const e of result.errors.slice(0, 3)) {
    errors.push(`Row ${(e.row ?? 0) + 2}: ${e.message}`);
  }

  return { columns, rows, errors };
}

/** Guesses placeholder → column links by matching names, e.g. placeholder "number" ↔ column "Number". */
export function guessMapping(placeholders: string[], columns: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const placeholder of placeholders) {
    const match = columns.find((c) => c.toLowerCase().replace(/[^a-z0-9]/g, "") === placeholder.toLowerCase());
    if (match) mapping[placeholder] = match;
  }
  return mapping;
}
