import { expect, test } from "@playwright/test";

import { authenticateAs } from "./helpers/auth";

const RESPONSIVE_ROUTES = [
  "/overview",
  "/users",
  "/businesses",
  "/businesses/business-001",
  "/devices",
  "/synchronization",
  "/problem-reports",
  "/problem-reports/report-001",
  "/app-versions",
  "/audit-log",
  "/settings",
  "/health",
] as const;

const VIEWPORTS = [
  { name: "narrow-phone", width: 320, height: 800 },
  { name: "pixel-class-mobile", width: 412, height: 915 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "standard-desktop", width: 1440, height: 900 },
  { name: "wide-desktop", width: 1920, height: 1080 },
] as const;

test.beforeEach(async ({ baseURL, context }) => {
  await authenticateAs(context, baseURL, "super_admin");
});

for (const viewport of VIEWPORTS) {
  test(`${viewport.name} keeps every required admin route usable`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(viewport);

    for (const path of RESPONSIVE_ROUTES) {
      await test.step(path, async () => {
        const response = await page.goto(path);
        expect(response?.ok(), `${path} should render`).toBe(true);
        await expect(page.locator("main#main-content")).toBeVisible();
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

        const overflow = await page.evaluate(() => ({
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
        }));
        expect(
          overflow.documentWidth,
          `${path} should not create page-level horizontal overflow`,
        ).toBeLessThanOrEqual(overflow.viewportWidth + 1);

        for (const table of await page.locator("table").all()) {
          const container = table.locator("xpath=..");
          await expect(container).toHaveCSS("overflow-x", "auto");
        }

        if (viewport.width < 1024) {
          await expect(
            page.getByText("Open navigation", { exact: true }),
          ).toBeAttached();
        } else {
          await expect(
            page.getByRole("navigation", { name: "Admin navigation" }),
          ).toBeVisible();
        }
      });
    }
  });
}
