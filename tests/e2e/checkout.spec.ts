import { expect, test, type Frame, type Page } from "@playwright/test";

// Full purchase: basket → Stripe Checkout (test mode, Stripe's published test card) → proof v1 →
// change request → revised design v2 → proof v2 → approval → production.
const CUSTOMER = { email: "demo.customer@example.com", password: process.env.SEED_CUSTOMER_PASSWORD ?? "DemoCustomer#2026" };

test.describe.configure({ mode: "serial", timeout: 240_000 });
test.skip(({ browserName }) => browserName !== "chromium");

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(CUSTOMER.email);
  await page.getByLabel("Password").fill(CUSTOMER.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account$/);
}

/** Stripe renders the card form in the page or inside an iframe depending on the Checkout version. */
async function stripeCardForm(page: Page): Promise<Frame> {
  for (let attempt = 0; attempt < 60; attempt++) {
    for (const frame of page.frames()) {
      if ((await frame.getByRole("textbox", { name: "Card number" }).count().catch(() => 0)) > 0) return frame;
    }
    await page.waitForTimeout(500);
  }
  throw new Error("Stripe card form not found");
}

async function payWithTestCard(page: Page) {
  await expect(page).toHaveURL(/checkout\.stripe\.com/, { timeout: 30_000 });
  const form = await stripeCardForm(page);
  // Stripe's published test card for successful payments (test mode only).
  await form.getByRole("textbox", { name: "Card number" }).fill("4242 4242 4242 4242");
  await form.getByRole("textbox", { name: /Expiration/ }).fill("12 / 34");
  await form.getByRole("textbox", { name: /Security code|CVC/ }).fill("123");
  await form.getByRole("textbox", { name: /Name on card|Cardholder/ }).fill("Demo Customer");
  const postcode = form.getByRole("textbox", { name: /Postal code|Postcode|ZIP/ });
  if (await postcode.isVisible().catch(() => false)) await postcode.fill("BN7 2AA");
  await form.getByRole("button", { name: /^Pay$/ }).click();
}

test("buy a label, request changes, approve the revised proof and reach production", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Runs once, on desktop");
  await signIn(page);

  // Design and save v1, then add it to the basket.
  await page.goto("/products/labels-stickers/custom-labels");
  await page.getByRole("link", { name: "Design it online" }).click();
  await page.getByRole("button", { name: "Start designing" }).click();
  await expect(page.getByText("Loading the designer…")).toHaveCount(0);
  await page.getByRole("button", { name: "Save design" }).click();
  await expect(page.getByText(/Saved as version 1/)).toBeVisible();
  const designUrl = page.url();
  await page.getByRole("button", { name: "Add v1 to basket" }).click();
  await expect(page).toHaveURL(/\/cart$/);

  // Collection, then pay.
  await page.getByText("Collect from the workshop").click();
  await page.getByRole("button", { name: "Choose collection" }).click();
  await expect(page.getByText("Free collection selected.")).toBeVisible();
  await page.getByRole("button", { name: "Pay securely with Stripe" }).click();
  await payWithTestCard(page);

  // Back on the order page with proof v1 waiting.
  await expect(page).toHaveURL(/\/account\/orders\/[0-9a-f-]{36}\?placed=1/, { timeout: 90_000 });
  const orderUrl = page.url().split("?")[0];
  await expect(page.getByText("Payment received, thank you.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Proof v1" })).toBeVisible();

  // Ask for a change: the order goes back to the artwork stage.
  await page.getByRole("button", { name: "Request changes" }).click();
  await page.getByLabel("What should change?").fill("Please change the weight to 500 g.");
  await page.getByRole("button", { name: "Send change request" }).click();
  await expect(page.getByText(/Change request sent/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Save a new design version first" })).toBeDisabled();

  // Revise the design and save v2.
  await page.goto(designUrl);
  await expect(page.getByText("Loading the designer…")).toHaveCount(0);
  await page.getByRole("button", { name: "Add text" }).click();
  await page.getByLabel("Text", { exact: true }).fill("500 g");
  await expect(page.getByText("All changes saved")).toBeVisible();
  await page.getByRole("button", { name: "Save design" }).click();
  await expect(page.getByText(/Saved as version 2/)).toBeVisible();

  // Submit it, get proof v2, approve it.
  await page.goto(orderUrl);
  await page.getByRole("button", { name: "Submit design v2" }).click();
  await expect(page.getByRole("heading", { name: "Proof v2" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Approve proof v2" }).click();
  await expect(page.getByText("Approved. Your job is now in production.")).toBeVisible({ timeout: 60_000 });

  // The approval log records both versions.
  await page.getByText("Version history and approval log").click();
  await expect(page.getByText(/Changes requested by Demo Customer/)).toBeVisible();
  await expect(page.getByText(/Approved by Demo Customer/)).toBeVisible();
});
