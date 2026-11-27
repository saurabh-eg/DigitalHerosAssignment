import { expect, test, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

const CUSTOMER = { email: "demo.customer@example.com", password: process.env.SEED_CUSTOMER_PASSWORD ?? "DemoCustomer#2026" };
const MM = 72 / 25.4;
const SHOTS = process.env.E2E_SCREENSHOT_DIR;

test.describe.configure({ mode: "serial", timeout: 120_000 });

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(CUSTOMER.email);
  await page.getByLabel("Password").fill(CUSTOMER.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account$/);
}

async function startFromProduct(page: Page, productPath: string, link: string) {
  await page.goto(productPath);
  await page.getByRole("link", { name: link }).click();
  await expect(page).toHaveURL(/\/design\/new\?/);
  await page.getByRole("button", { name: /Start designing|Continue to/ }).click();
  await expect(page).toHaveURL(/\/design\/[0-9a-f-]{36}/);
  await expect(page.getByText("Loading the designer…")).toHaveCount(0);
}

test("design online: edit text, stay inside the print area, preview the proof and save a version", async ({ page }) => {
  await signIn(page);
  await startFromProduct(page, "/products/labels-stickers/custom-labels", "Design it online");

  await page.getByRole("button", { name: "Add text" }).click();
  const text = page.getByLabel("Text", { exact: true });
  await expect(text).toHaveValue("Your text");
  await text.fill("Hello Makeready");

  // Print-area lock: an oversized width is clamped to the 71 mm print area (75 mm label, 2 mm safe margin).
  const width = page.getByLabel("Width (mm)");
  await width.fill("500");
  await expect.poll(async () => Number(await width.inputValue())).toBeLessThanOrEqual(71);
  await expect(page.getByText("Ready to print")).toBeVisible();

  await expect(page.getByText("All changes saved")).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/designer-edit-${test.info().project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "Preview proof" }).click();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/designer-proof-${test.info().project.name}.png`, fullPage: true });
  await expect(page.getByText(/Proof at 75 × 50 mm/)).toBeVisible();
  await page.getByRole("button", { name: "Save design" }).click();
  await expect(page.getByText(/Saved as version 1/)).toBeVisible();
});

test("variable data: CSV rows merge into placeholders and overlong rows are flagged", async ({ page }) => {
  await signIn(page);
  await startFromProduct(page, "/products/race-event-numbers/race-bibs", "Merge names and numbers from a spreadsheet");
  await expect(page.getByRole("tab", { name: "Spreadsheet" })).toHaveAttribute("aria-selected", "true");

  const rows = Array.from({ length: 11 }, (_, i) => `${1001 + i},Runner ${i + 1}`);
  rows.push(`1012,${"Bartholomew-Featherstonehaugh ".repeat(3).trim()}`);
  const csv = ["number,name", ...rows].join("\n");
  await page.getByLabel(/Upload spreadsheet/).setInputFiles({ name: "entrants.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });

  await expect(page.getByText("Previewing row 1 of 12")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("combobox").filter({ hasText: "number" }).first()).toBeVisible();
  await expect(page.getByText(/1 row doesn't fit/)).toBeVisible();
  await expect(page.getByRole("button", { name: "row 12" })).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/designer-csv-${test.info().project.name}.png`, fullPage: true });

  // Saving is blocked until every row fits.
  await page.getByRole("button", { name: "Save design" }).click();
  await expect(page.getByText(/Some rows don't fit the layout \(rows 12\)/)).toBeVisible();
});

test("upload path: a print-ready PDF with bleed is accepted and saved", async ({ page }) => {
  await signIn(page);
  await startFromProduct(page, "/products/labels-stickers/custom-labels", "Upload finished artwork");

  const pdf = await PDFDocument.create();
  pdf.addPage([79 * MM, 54 * MM]); // 75 × 50 mm + 2 mm bleed each side
  const bytes = await pdf.save();
  await page.getByLabel(/Choose your artwork/).setInputFiles({ name: "label.pdf", mimeType: "application/pdf", buffer: Buffer.from(bytes) });

  await expect(page.getByText("Page size matches the print size including bleed.")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Save design" }).click();
  await expect(page.getByText(/Saved as version 1/)).toBeVisible();
});

test("upload path: a file pretending to be a PDF is rejected", async ({ page }) => {
  await signIn(page);
  await startFromProduct(page, "/products/labels-stickers/custom-labels", "Upload finished artwork");
  await page.getByLabel(/Choose your artwork/).setInputFiles({ name: "fake.pdf", mimeType: "application/pdf", buffer: Buffer.from("not really a pdf") });
  await expect(page.getByText("Artwork must be a PDF, SVG, AI or PNG file.")).toBeVisible({ timeout: 30_000 });
});
