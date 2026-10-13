import { defineConfig, devices } from "@playwright/test";

const port = 3100;
/** The loopback KitaMo Auth + Core stub (tests/e2e/stub); never a hosted call. */
export const STUB_PORT = 3199;
const stubUrl = `http://127.0.0.1:${STUB_PORT}`;
const captcha = "stub-captcha";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // The memory guard sets E2E_WORKERS=1 on the shared 8 GB laptop.
  ...(process.env.E2E_WORKERS
    ? { workers: Number(process.env.E2E_WORKERS) }
    : {}),
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /responsive\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      // The KitaMo sign-in flow runs once, on desktop; its pages are in the
      // responsive and accessibility runs through the mock adapter.
      testIgnore: [/responsive\.spec\.ts/, /kitamo\.spec\.ts/],
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "responsive-chromium",
      testMatch: /responsive\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: `KITAMO_STUB_PORT=${STUB_PORT} KITAMO_AUTH_TEST_CAPTCHA_TOKEN=${captcha} node --import ./tests/e2e/stub/register.mjs tests/e2e/stub/kitamo-stub.ts`,
      url: `${stubUrl}/__stub/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      // KitaMo's Auth and Core point at the loopback stub; the development
      // role cookie (mock adapter) keeps working for the mock beta's specs.
      command: `KITAMO_SUPABASE_URL=${stubUrl} KITAMO_SUPABASE_ANON_KEY=stub-anon KITAMO_AUTH_TEST_CAPTCHA_TOKEN=${captcha} MOCK_ADMIN_SCENARIO=normal MOCK_ADMIN_LATENCY_MS=0 npm run dev -- --hostname 127.0.0.1 --port ${port}`,
      url: `http://127.0.0.1:${port}/sign-in`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
