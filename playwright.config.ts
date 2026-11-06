import { defineConfig, devices } from "@playwright/test";

/**
 * Two Playwright suites (see "Testing" in README.MD):
 *
 *   e2e   End-to-end: the real backend and database behind the app (e2e/). `setup` logs in once per role
 *         through the API first. Needs a running backend and the E2E_* accounts; `bun run e2e`.
 *   ui    Browser UI tests with every /api call mocked (test/ui/): error states, edge cases and per-role
 *         UI that a real backend can't produce on demand. No backend; `bun run test:ui`.
 */
const PORT = Number(process.env.E2E_PORT ?? 5173);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
const CI = !!process.env.CI;

export default defineConfig({
  outputDir: "./.playwright/results",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 4 : undefined,
  reporter: CI
    ? [["github"], ["html", { open: "never", outputFolder: ".playwright/report" }], ["junit", { outputFile: ".playwright/results/junit.xml" }]]
    : [["list"], ["html", { open: "never", outputFolder: ".playwright/report" }]],
  use: {
    baseURL: BASE_URL,
    locale: "en-US",
    trace: CI ? "on-first-retry" : "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "setup",
      testDir: "./e2e/setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "e2e",
      testDir: "./e2e",
      testIgnore: "setup/**",
      dependencies: ["setup"],
      // Specs run as the company admin unless they say otherwise (test.use({ storageState })).
      use: { ...devices["Desktop Chrome"], storageState: ".playwright/auth/company-admin.json" },
    },
    {
      name: "ui",
      testDir: "./test/ui",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // E2E_BASE_URL points at an already running app (e.g. staging): don't start one.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // CI serves the production build; locally the dev server (proxying /api to API_PROXY_TARGET).
        command: CI ? `bunx vite preview --port ${PORT} --strictPort` : `bunx vite --port ${PORT} --strictPort`,
        url: BASE_URL,
        reuseExistingServer: !CI,
        timeout: 120_000,
      },
});
