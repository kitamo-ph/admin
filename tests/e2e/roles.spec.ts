import { expect, test } from "@playwright/test";

import { authenticateAs, type MockAdminRole } from "./helpers/auth";

test("an operations viewer can directly read users", async ({
  baseURL,
  context,
  page,
}) => {
  await authenticateAs(context, baseURL, "operations_viewer");

  const response = await page.goto("/users");

  expect(response?.ok()).toBe(true);
  await expect(page).toHaveURL(/\/users$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("an operations viewer can read a report but has no mutation control", async ({
  baseURL,
  context,
  page,
}) => {
  await authenticateAs(context, baseURL, "operations_viewer");

  const response = await page.goto("/problem-reports/report-001");

  expect(response?.ok()).toBe(true);
  await expect(page).toHaveURL(/\/problem-reports\/report-001$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /update report|save changes/i }),
  ).toHaveCount(0);
});

for (const role of [
  "support_admin",
  "operations_viewer",
] as const satisfies readonly MockAdminRole[]) {
  test(`${role} is denied direct settings access`, async ({
    baseURL,
    context,
    page,
  }) => {
    await authenticateAs(context, baseURL, role);

    await page.goto("/settings");

    await expect(page).toHaveURL(/\/access-denied$/);
    await expect(
      page.getByRole("heading", {
        name: "This area is outside your assigned access",
      }),
    ).toBeVisible();
  });
}

test("a support admin can submit a safe problem-report workflow update", async ({
  baseURL,
  context,
  page,
}) => {
  await authenticateAs(context, baseURL, "support_admin");
  await page.goto("/problem-reports/report-001");

  const status = page.getByRole("combobox", {
    name: "Status",
    exact: true,
  });
  const internalNote = page.getByRole("textbox", {
    name: "Internal note",
    exact: true,
  });
  const reason = page.getByRole("textbox", {
    name: "Reason",
    exact: true,
  });
  const submit = page.getByRole("button", {
    name: /update report|save changes/i,
  });

  await expect(status).toBeVisible({ timeout: 15_000 });
  await expect(internalNote).toBeVisible();
  await expect(reason).toBeVisible();
  await status.selectOption("triaged");
  await internalNote.fill("Automated support workflow verification note");
  await reason.fill("Playwright support workflow verification");
  await submit.click();

  await expect(
    page.getByText(/report updated|update recorded|changes saved/i),
  ).toBeVisible();
});
