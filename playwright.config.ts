import { defineConfig, devices } from "@playwright/test";

// Runs against an already-running app (`npm run build && npm start`) or E2E_BASE_URL (e.g. the Vercel URL).
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  // Sign-in round-trips to Supabase; allow for network latency rather than failing on a slow response.
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
