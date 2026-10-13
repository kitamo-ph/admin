import { expect, test } from "@playwright/test";

import { authenticateAs } from "./helpers/auth";

const MAIN_ADMIN_ROUTES = [
  "/overview",
  "/users",
  "/businesses",
  "/devices",
  "/synchronization",
  "/problem-reports",
  "/app-versions",
  "/audit-log",
  "/settings",
  "/health",
  "/flags",
  "/associations",
] as const;

test.beforeEach(async ({ baseURL, context }) => {
  await authenticateAs(context, baseURL, "super_admin");
});

test("a super admin can open every main administration route", async ({
  page,
}) => {
  for (const path of MAIN_ADMIN_ROUTES) {
    await test.step(path, async () => {
      const response = await page.goto(path);

      expect(response?.ok(), `${path} should return a successful page`).toBe(
        true,
      );
      await expect(page).toHaveURL(new RegExp(`${path.replace("/", "\\/")}$`));
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  }
});

test("stable detail routes resolve through the service boundary", async ({
  page,
}) => {
  for (const path of [
    "/users/user-001",
    // A fictional R16 business id (lib/admin/mock-r16.ts).
    "/businesses/00000011-0000-4000-8000-000000a7d8e2",
    "/problem-reports/report-001",
  ]) {
    await test.step(path, async () => {
      const response = await page.goto(path);

      expect(response?.ok(), `${path} should return a successful page`).toBe(
        true,
      );
      await expect(page).toHaveURL(
        new RegExp(`${path.replaceAll("/", "\\/")}$`),
      );
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  }
});
