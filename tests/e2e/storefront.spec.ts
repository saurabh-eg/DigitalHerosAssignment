import { expect, test } from "@playwright/test";

const SHOTS = process.env.E2E_SCREENSHOT_DIR;

test("home page shows the hub of six ranges and a live job ticket", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  for (const name of ["Labels & Stickers", "Race & Event Numbers", "MTB Boards", "Stamps", "Trophies", "Laser-cut Work"]) {
    await expect(page.getByRole("heading", { name, level: 3 })).toBeVisible();
  }
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/home-${info.project.name}.png`, fullPage: true });
});

test("configurator prices live and applies the volume discount from 100 units", async ({ page }, info) => {
  await page.goto("/products/labels-stickers/custom-labels");
  const copies = page.getByLabel("Copies");

  await copies.fill("99");
  await expect(page.getByText(/^Volume discount \(/)).toHaveCount(0);
  await expect(page.getByText("£43.61").first()).toBeVisible(); // 99 × 39p + £5 setup

  await copies.fill("100");
  await expect(page.getByText("Volume discount (10%)")).toBeVisible();
  await expect(page.getByText("£40.00").first()).toBeVisible(); // 100 × 35p + £5 setup
  await expect(page.getByText(/including £6\.67 VAT/)).toBeVisible();

  if (SHOTS) await page.screenshot({ path: `${SHOTS}/product-${info.project.name}.png`, fullPage: true });
});

test("configurator explains an invalid size instead of pricing it", async ({ page }) => {
  await page.goto("/products/labels-stickers/custom-labels");
  await page.getByRole("spinbutton", { name: /Width/ }).fill("900");
  await expect(page.getByText("No price yet")).toBeVisible();
  await expect(page.getByText(/Size must be between 20–300 mm/).first()).toBeVisible();
});

test("calculator switches between products", async ({ page }) => {
  await page.goto("/calculator");
  await page.getByLabel("Product").selectOption({ label: "Stamps: Custom Stamps" });
  await expect(page.getByRole("radio", { name: "38 × 14 mm" })).toBeVisible();
});

test("gallery filters by product family", async ({ page }, info) => {
  await page.goto("/gallery");
  await page.getByRole("radio", { name: "Race & Event Numbers" }).click();
  await expect(page.getByRole("heading", { name: "Riverside 10K race numbers" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Café wall sign" })).toHaveCount(0);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/gallery-${info.project.name}.png`, fullPage: true });
});
