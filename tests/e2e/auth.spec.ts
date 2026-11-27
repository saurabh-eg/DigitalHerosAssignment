import { expect, test } from "@playwright/test";

const CUSTOMER = { email: "demo.customer@example.com", password: process.env.SEED_CUSTOMER_PASSWORD ?? "DemoCustomer#2026" };
const ADMIN = { email: "demo.admin@example.com", password: process.env.SEED_ADMIN_PASSWORD ?? "DemoAdmin#2026" };

async function signIn(page: import("@playwright/test").Page, user: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("signed-out visitors are sent to login and returned afterwards", async ({ page }) => {
  await page.goto("/account/settings");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount%2Fsettings/);
  await page.getByLabel("Email").fill(CUSTOMER.email);
  await page.getByLabel("Password").fill(CUSTOMER.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account\/settings$/);
  await expect(page.getByRole("heading", { name: "Profile & settings" })).toBeVisible();
});

test("wrong password shows an error and stays on login", async ({ page }) => {
  await signIn(page, { email: CUSTOMER.email, password: "not-the-password" });
  await expect(page.getByText("Email or password is incorrect.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("customer signs in, sees the account, cannot open the admin console, and signs out", async ({ page }) => {
  await signIn(page, CUSTOMER);
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Hello");

  const admin = await page.goto("/admin");
  expect(admin?.status()).toBe(404);

  await page.goto("/");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login/);
});

test("admin signs in and lands in the production console", async ({ page }) => {
  await signIn(page, ADMIN);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Production console", level: 1 })).toBeVisible();
});
