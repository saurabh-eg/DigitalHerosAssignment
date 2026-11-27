import { describe, expect, it } from "vitest";
import { engravedCharacters, type SavedVersion } from "@/modules/designer/designer.orders";
import { instantiateTemplate } from "@/modules/designer/render/template";
import { templateSceneSchema } from "@/modules/designer/designer.validator";
import { renderEmail } from "@/modules/notifications/notifications.templates";

const plate = instantiateTemplate(
  templateSceneSchema.parse({
    background: "#c9a94b",
    elements: [
      { id: "title", type: "text", x: 0, y: 0, width: 1, height: 0.5, text: "Player of the Season", fontFamily: "playfair-display", fontWeight: 700, color: "#2b2b2b", align: "center" },
      { id: "name", type: "text", x: 0, y: 0.5, width: 1, height: 0.5, text: "Ellie Marsh", fontFamily: "playfair-display", fontWeight: 400, color: "#2b2b2b", align: "center", placeholder: "name" },
    ],
  }),
  { widthMm: 90, heightMm: 30, bleedMm: 0, safeMarginMm: 2 },
);

const saved = (overrides: Partial<SavedVersion> = {}): SavedVersion => ({
  designId: "d",
  version: 1,
  productId: "p",
  organizationId: "o",
  configuration: { widthMm: 90, heightMm: 30, orientation: "landscape", materialId: "m", quantity: 3, characterCount: 0 },
  scene: plate,
  uploadId: null,
  csvDatasetId: null,
  csvRows: null,
  csvMapping: {},
  ...overrides,
});

describe("engravedCharacters (D-055)", () => {
  it("counts non-space characters across every text element", () => {
    expect(engravedCharacters(saved())).toBe("PlayeroftheSeason".length + "EllieMarsh".length);
  });

  it("uses the longest row for spreadsheet merges", () => {
    const count = engravedCharacters(saved({ csvRows: [{ who: "Al" }, { who: "Bartholomew Ng" }], csvMapping: { name: "who" } }));
    expect(count).toBe("PlayeroftheSeason".length + "BartholomewNg".length);
  });

  it("is zero for uploaded artwork", () => {
    expect(engravedCharacters(saved({ scene: null }))).toBe(0);
  });
});

describe("email templates", () => {
  it("escapes customer-supplied text", () => {
    const { html, subject } = renderEmail("proof_changes_requested", {
      orderNumber: "MR-001001",
      customerName: "<b>Eve</b>",
      orderUrl: "https://example.test/o",
      comment: '<script>alert("x")</script>',
    });
    expect(subject).toBe("Changes requested on order MR-001001");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<b>Eve</b>");
  });
});
