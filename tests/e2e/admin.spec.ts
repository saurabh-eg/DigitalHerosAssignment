import { expect, test, type Page } from "@playwright/test";

const ADMIN = { email: "demo.admin@example.com", password: process.env.SEED_ADMIN_PASSWORD ?? "DemoAdmin#2026" };
const CUSTOMER = { email: "demo.customer@example.com", password: process.env.SEED_CUSTOMER_PASSWORD ?? "DemoCustomer#2026" };

const SHOTS = process.env.E2E_SCREENSHOT_DIR;

test.describe.configure({ mode: "serial", timeout: 120_000 });

async function signIn(page: Page, user: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(admin|account)$/);
}

test("customers can't reach the console or its downloads", async ({ page }) => {
  await signIn(page, CUSTOMER);
  expect((await page.goto("/admin/jobs"))?.status()).toBe(404);
  expect((await page.request.get("/admin/reports/xero")).status()).toBe(403);
});

test("overview, pipeline and job database", async ({ page }, info) => {
  await signIn(page, ADMIN);
  await expect(page.getByRole("heading", { name: "Print queue" })).toBeVisible();

  await page.getByRole("link", { name: "Pipeline", exact: true }).first().click();
  for (const stage of ["Order", "Artwork", "Proof", "Production", "Completed"]) {
    await expect(page.getByRole("heading", { name: new RegExp(`^${stage}`) })).toBeVisible();
  }
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/admin-pipeline-${info.project.name}.png`, fullPage: true });

  await page.goto("/admin/jobs?status=production");
  await expect(page.getByRole("heading", { name: "Job database" })).toBeVisible();
  if (info.project.name === "desktop") await expect(page.getByRole("columnheader", { name: "Production files" })).toBeVisible();

  // Search by customer email finds their jobs; a nonsense term finds none.
  await page.getByLabel("Order number, customer or company").fill("demo.customer");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByText(/\d+ jobs?, page 1/)).toBeVisible();
  await page.goto("/admin/jobs?q=zzzz-no-such-job");
  await expect(page.getByText("No jobs match these filters.")).toBeVisible();
});

test("download production files, complete and archive a job", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Changes data; runs once");
  await signIn(page, ADMIN);
  await page.goto("/admin/jobs?status=production");
  const jobLink = page.locator("table a[href^='/admin/jobs/']").first();
  await expect(jobLink).toBeVisible();
  await jobLink.click();
  await expect(page.getByRole("heading", { name: "Production files" })).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/admin-job-${info.project.name}.png`, fullPage: true });

  // One file, then the whole order as a ZIP.
  const fileHref = await page.getByRole("link", { name: "Download", exact: true }).first().getAttribute("href");
  const file = await page.request.get(fileHref!);
  expect(file.status()).toBe(200);
  expect(["%PDF-", "\x89PNG\r"]).toContain((await file.body()).subarray(0, 5).toString("latin1"));
  const zipHref = await page.getByRole("link", { name: /Download all/ }).getAttribute("href");
  const zip = await page.request.get(zipHref!);
  expect(zip.headers()["content-type"]).toBe("application/zip");
  expect((await zip.body()).subarray(0, 2).toString()).toBe("PK");

  // Advance the pipeline, then file it in the archive.
  await page.getByRole("button", { name: "Mark complete" }).click();
  // The button belongs to the production stage, so success shows as the new status (and the archive action).
  await expect(page.locator("header").getByText("Completed", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Archive" })).toBeVisible();
  await page.getByRole("button", { name: "Archive" }).click();
  await expect(page.getByText(/Archived\. It stays searchable/)).toBeVisible();
  const orderNumber = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();
  await page.goto(`/admin/archive?q=${orderNumber}`);
  await expect(page.getByRole("link", { name: orderNumber })).toBeVisible();
});

test("reports and the Xero CSV export", async ({ page }, info) => {
  await signIn(page, ADMIN);
  await page.goto("/admin/reports");
  await expect(page.getByText("Revenue (incl. VAT)")).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/admin-reports-${info.project.name}.png`, fullPage: true });
  await expect(page.getByRole("heading", { name: "Throughput by product family" })).toBeVisible();
  const href = await page.getByRole("link", { name: "Download Xero CSV" }).getAttribute("href");
  const csv = await page.request.get(href!);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect((await csv.text()).split("\r\n")[0]).toContain("*InvoiceNumber");
});

test("users list and catalogue management", async ({ page }, info) => {
  await signIn(page, ADMIN);
  await page.goto("/admin/users");
  await expect(page.getByRole("cell", { name: /demo\.customer@example\.com/ })).toBeVisible();
  await expect(page.getByText("Admin (you)")).toBeVisible();

  await page.goto("/admin/catalogue");
  await expect(page.getByRole("heading", { name: "Labels & Stickers" })).toBeVisible();
  await page.getByRole("link", { name: "Custom Labels & Stickers" }).click();
  await expect(page.getByRole("heading", { name: "Templates" })).toBeVisible();

  // Invalid parameters JSON is rejected with a clear message and nothing changes.
  const params = page.getByLabel("Size, orientation and quantity rules (JSON)");
  const original = await params.inputValue();
  await params.fill("{ not json");
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByText(/Parameters isn't valid JSON/)).toBeVisible();
  await params.fill(original);

  if (info.project.name === "desktop") {
    // PRD §14: a new division is created from the console with no code change.
    const slug = `e2e-${Date.now()}`;
    await page.goto("/admin/catalogue");
    await page.getByPlaceholder("Name, e.g. Signage").fill("E2E Division");
    await page.getByPlaceholder("slug, e.g. signage").fill(slug);
    await page.getByRole("button", { name: "Create division" }).click();
    await expect(page.getByText(/Division "E2E Division" created/)).toBeVisible();
    await page.reload();
    const card = page.locator("article", { hasText: `/${slug}` });
    await card.getByRole("button", { name: "Hide division" }).click();
    await expect(card.getByText("Division hidden from the storefront.")).toBeVisible();
  }
});
