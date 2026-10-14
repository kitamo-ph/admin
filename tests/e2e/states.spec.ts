import { expect, test } from "@playwright/test";

import { authenticateAs } from "./helpers/auth";

test.beforeEach(async ({ baseURL, context }) => {
  await authenticateAs(context, baseURL, "super_admin");
});

test("a filtered user result can render a useful empty state", async ({
  page,
}) => {
  const response = await page.goto(
    "/users?q=no-record-can-match-this-value-7f0d2d",
  );

  expect(response?.ok()).toBe(true);
  await expect(
    page.getByText(/no users|no matching users|no results/i).first(),
  ).toBeVisible();
});

test("the controlled maintenance state is safe and actionable", async ({
  page,
}) => {
  const response = await page.goto("/maintenance");

  expect(response?.ok()).toBe(true);
  await expect(
    page.getByRole("heading", {
      name: "Administrative tools are temporarily paused",
    }),
  ).toBeVisible();
  // /health is parked for a KitaMo session: the next step is the overview.
  await expect(page.getByRole("link", { name: "Try again" })).toHaveAttribute(
    "href",
    "/overview",
  );
});

test("the controlled unavailable state does not claim a mutation occurred", async ({
  page,
}) => {
  const response = await page.goto("/unavailable");

  expect(response?.ok()).toBe(true);
  await expect(
    page.getByRole("heading", {
      name: "Operational data cannot be reached right now",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("No merchant records or support reports were changed", {
      exact: false,
    }),
  ).toBeVisible();
});
