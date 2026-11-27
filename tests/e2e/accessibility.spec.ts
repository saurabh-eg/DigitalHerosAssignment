import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// WCAG 2.1 A/AA checks with axe-core on every page type, including signed-in pages Lighthouse can't reach.
const CUSTOMER = { email: "demo.customer@example.com", password: process.env.SEED_CUSTOMER_PASSWORD ?? "DemoCustomer#2026" };
const ADMIN = { email: "demo.admin@example.com", password: process.env.SEED_ADMIN_PASSWORD ?? "DemoAdmin#2026" };

test.describe.configure({ timeout: 180_000 });

async function signIn(page: Page, user: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(admin|account)$/);
}

async function audit(page: Page, path: string, ready?: (page: Page) => Promise<void>) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  if (ready) await ready(page);
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const summary = violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length}× e.g. ${v.nodes[0]?.target.join(" ")}`);
  expect(summary, `${path} has accessibility violations`).toEqual([]);
}

test("public pages", async ({ page }) => {
  for (const path of ["/", "/products", "/products/race-event-numbers", "/products/labels-stickers/custom-labels", "/calculator", "/gallery", "/login", "/signup", "/reset-password", "/no-such-page"]) {
    await audit(page, path);
  }
});

test("customer pages, basket and designer", async ({ page }) => {
  await signIn(page, CUSTOMER);
  for (const path of ["/account", "/account/orders", "/account/designs", "/account/invoices", "/account/settings", "/cart"]) {
    await audit(page, path);
  }
  const order = page.locator("a[href^='/account/orders/']").first();
  await page.goto("/account/orders");
  if (await order.count()) await audit(page, (await order.getAttribute("href"))!);
  await page.goto("/account/designs");
  const edit = page.getByRole("link", { name: "Edit" }).first();
  if (await edit.count()) {
    await audit(page, (await edit.getAttribute("href"))!, async (p) => {
      await expect(p.getByText("Loading the designer…")).toHaveCount(0);
    });
  }
});

test("production console", async ({ page }) => {
  await signIn(page, ADMIN);
  for (const path of ["/admin", "/admin/pipeline", "/admin/jobs", "/admin/archive", "/admin/reports", "/admin/users", "/admin/catalogue", "/admin/gallery"]) {
    await audit(page, path);
  }
  await page.goto("/admin/jobs");
  const job = page.locator("table a[href^='/admin/jobs/']").first();
  if (await job.count()) await audit(page, (await job.getAttribute("href"))!);
  await page.goto("/admin/catalogue");
  await audit(page, (await page.locator("a[href^='/admin/catalogue/']").first().getAttribute("href"))!);
});
