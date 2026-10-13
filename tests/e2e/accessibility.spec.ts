import { expect, test } from "@playwright/test";

import { authenticateAs } from "./helpers/auth";

const ACCESSIBILITY_ROUTES = [
  "/overview",
  "/users",
  "/problem-reports/report-001",
  // R16 (ADM-048), through the mock adapter: the reason sheet and Flags.
  "/businesses",
  "/businesses/00000011-0000-4000-8000-000000a7d8e2",
  "/flags",
  "/audit-log",
] as const;

test.beforeEach(async ({ baseURL, context }) => {
  await authenticateAs(context, baseURL, "super_admin");
});

test("representative admin routes expose usable keyboard and semantic foundations", async ({
  page,
}) => {
  await page.goto("/overview");
  // The layout awaits the session (Core's km_admin_session in production), so
  // the root loading state can stream first; React reveals the page shortly
  // after the load event. Press Tab on the revealed page, not the skeleton.
  await expect(page.locator("main#main-content")).toBeVisible();

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toBeFocused();
  const focusStyle = await skipLink.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
    };
  });
  expect(focusStyle.outlineStyle).not.toBe("none");
  expect(Number.parseFloat(focusStyle.outlineWidth)).toBeGreaterThan(0);

  await page.keyboard.press("Enter");
  await expect(page.locator("main#main-content")).toBeFocused();

  for (const path of ACCESSIBILITY_ROUTES) {
    await test.step(path, async () => {
      const response = await page.goto(path);
      expect(response?.ok()).toBe(true);

      await expect(page.locator("main#main-content")).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      const issues = await page.evaluate(() => {
        const visible = (element: Element) =>
          element instanceof HTMLElement && element.checkVisibility();
        const accessibleName = (element: Element) =>
          element.getAttribute("aria-label")?.trim() ||
          element.getAttribute("title")?.trim() ||
          element.textContent?.trim();

        const unnamedInteractive = [
          ...document.querySelectorAll("button, a[href], summary"),
        ]
          .filter(visible)
          .filter((element) => !accessibleName(element))
          .map((element) => element.outerHTML.slice(0, 120));

        const unlabeledControls = [
          ...document.querySelectorAll("input, select, textarea"),
        ]
          .filter(visible)
          .filter((element) => {
            if (!(
              element instanceof HTMLInputElement ||
              element instanceof HTMLSelectElement ||
              element instanceof HTMLTextAreaElement
            )) {
              return false;
            }
            return (
              element.labels?.length === 0 &&
              !element.getAttribute("aria-label") &&
              !element.getAttribute("aria-labelledby")
            );
          })
          .map((element) => element.outerHTML.slice(0, 120));

        const headingLevels = [
          ...document.querySelectorAll("h1,h2,h3,h4,h5,h6"),
        ]
          .filter(visible)
          .map((heading) => Number(heading.tagName.slice(1)));
        const skippedHeadingLevel = headingLevels.some(
          (level, index) => index > 0 && level > headingLevels[index - 1] + 1,
        );

        return { unnamedInteractive, unlabeledControls, skippedHeadingLevel };
      });

      expect(issues).toEqual({
        unnamedInteractive: [],
        unlabeledControls: [],
        skippedHeadingLevel: false,
      });
    });
  }
});
