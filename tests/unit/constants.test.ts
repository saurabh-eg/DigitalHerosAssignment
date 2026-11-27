import { describe, expect, it } from "vitest";
import { ALLOWED_TRANSITIONS, PIPELINE_STAGES } from "@/constants/pipeline";
import { can, PERMISSION } from "@/constants/roles";
import { productionFilePath } from "@/constants/storage";

describe("productionFilePath", () => {
  it("follows OrderID_ProductType_Date_Output inside an order folder", () => {
    const path = productionFilePath({
      orderNumber: "MR-000123",
      productType: "Race Numbers",
      date: new Date("2026-03-14T10:00:00Z"),
      output: "Row-0001",
      extension: "pdf",
    });
    expect(path).toBe("orders/MR-000123/MR-000123_Race-Numbers_20260314_Row-0001.pdf");
  });
});

describe("pipeline", () => {
  it("has the six PRD stages in order", () => {
    expect(PIPELINE_STAGES).toEqual(["quote", "order", "artwork", "proof", "production", "completed"]);
  });

  it("never lets an order skip proof on the way to production", () => {
    const reachProduction = Object.entries(ALLOWED_TRANSITIONS)
      .filter(([, next]) => next.includes("production"))
      .map(([from]) => from);
    expect(reachProduction).toEqual(["proof"]);
  });
});

describe("role permissions", () => {
  it("keeps production files admin-only", () => {
    expect(can("admin", PERMISSION.DOWNLOAD_PRODUCTION_FILES)).toBe(true);
    expect(can("customer", PERMISSION.DOWNLOAD_PRODUCTION_FILES)).toBe(false);
    expect(can("visitor", PERMISSION.DOWNLOAD_PRODUCTION_FILES)).toBe(false);
  });

  it("lets visitors use the calculator but not order", () => {
    expect(can("visitor", PERMISSION.USE_CALCULATOR)).toBe(true);
    expect(can("visitor", PERMISSION.PLACE_ORDER)).toBe(false);
  });
});
