// Checks a scene is printable: every element inside its print area, text fits, images sharp enough.
// Run in the editor for live warnings and on the server before a design version is saved.
import { DESIGN_LIMITS } from "@/constants/limits";
import type { Scene } from "../designer.validator";
import type { FontSet } from "./fonts";
import { effectiveDpi, isWithinArea } from "./geometry";
import { layoutText } from "./scene-svg";

export type SceneIssue = {
  elementId: string | null;
  severity: "error" | "warning";
  message: string;
  /** Set for variable-data rows (1-based, as the customer sees it in a spreadsheet). */
  row?: number;
};

export function validateScene(scene: Scene, fonts: FontSet | null, values?: Record<string, string>): SceneIssue[] {
  const issues: SceneIssue[] = [];
  const areas = new Map(scene.printAreas.map((a) => [a.id, a]));

  for (const el of scene.elements) {
    const area = areas.get(el.printAreaId);
    if (!area) {
      issues.push({ elementId: el.id, severity: "error", message: "This element isn't attached to a print area." });
      continue;
    }
    if (!isWithinArea(el, area)) {
      issues.push({ elementId: el.id, severity: "error", message: "Part of this element is outside the printable area." });
    }
    if (el.type === "text" && fonts) {
      const layout = layoutText(el, { fonts, values });
      if (!layout.fits) {
        issues.push({
          elementId: el.id,
          severity: "error",
          message: `"${layout.text.slice(0, 30)}" doesn't fit, even at ${el.fit.minPt} pt. Shorten it or enlarge the box.`,
        });
      }
    }
    if (el.type === "image" && el.mimeType !== "image/svg+xml") {
      const dpi = effectiveDpi(el.pixelWidth, el.pixelHeight, el.widthMm, el.heightMm);
      if (dpi < DESIGN_LIMITS.minImageDpi) {
        issues.push({ elementId: el.id, severity: "error", message: `This image is only ${Math.round(dpi)} dpi at this size and will print blurry. Make it smaller or use a larger file.` });
      } else if (dpi < DESIGN_LIMITS.warnImageDpi) {
        issues.push({ elementId: el.id, severity: "warning", message: `This image is ${Math.round(dpi)} dpi at this size; 300 dpi prints sharpest.` });
      }
    }
  }
  return issues;
}

/** Validates every CSV row against the template's fitting rules (PRD §07). Returns only failing rows. */
export function validateRows(
  scene: Scene,
  fonts: FontSet,
  rows: Array<Record<string, string>>,
  mapping: Record<string, string>,
): SceneIssue[] {
  const issues: SceneIssue[] = [];
  rows.forEach((row, index) => {
    const values = valuesForRow(row, mapping);
    for (const issue of validateScene(scene, fonts, values)) {
      if (issue.severity === "error" && issue.elementId) {
        const el = scene.elements.find((e) => e.id === issue.elementId);
        if (el?.type === "text" && el.placeholder) issues.push({ ...issue, row: index + 1 });
      }
    }
  });
  return issues;
}

/** Maps a CSV row to placeholder values using placeholder → column mapping. */
export function valuesForRow(row: Record<string, string>, mapping: Record<string, string>): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [placeholder, column] of Object.entries(mapping)) values[placeholder] = (row[column] ?? "").trim();
  return values;
}
