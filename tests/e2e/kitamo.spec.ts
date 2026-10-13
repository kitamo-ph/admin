import { expect, test, type Page } from "@playwright/test";

import {
  account,
  advanceCore,
  PASSWORD,
  signIn,
  stubCalls,
  STUB,
} from "./helpers/kitamo";

/**
 * R16's real path (ADM-048): KitaMo's Auth at aal2, then the Core adapter,
 * against the loopback stub (GoTrue REST + PostgREST); no hosted call.
 */

const READERS = [
  "km_admin_session",
  "km_admin_directory",
  "km_admin_business_summary",
  "km_admin_business_records",
  "km_admin_flags",
  "km_admin_access_log",
  "km_admin_associations",
];
const WRITERS = [
  "open_admin_access",
  "close_admin_access",
  "raise_admin_flag",
  "review_admin_flag",
];
const REASON = "The owner asked why yesterday's tally is off.";

/** Every request the browser makes stays on the admin site itself. */
function watchBrowserRequests(page: Page): string[] {
  const elsewhere: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.origin !== "http://127.0.0.1:3100" &&
      !url.protocol.startsWith("data")
    ) {
      elsewhere.push(request.url());
    }
  });
  return elsewhere;
}

async function openFirstBusiness(page: Page) {
  await page.goto("/businesses");
  await page
    .getByRole("table", { name: "Business directory" })
    .getByRole("link")
    .first()
    .click();
  await expect(page.getByRole("form", { name: /Reason sheet/ })).toBeVisible();
}

async function openSummary(page: Page) {
  await openFirstBusiness(page);
  await page
    .getByLabel("Reason", { exact: true })
    .selectOption("support_request");
  await page.getByLabel(/Why you need to look/).fill(REASON);
  await page
    .getByRole("button", { name: "Open the summary for 30 minutes" })
    .click();
  await expect(
    page.getByRole("heading", { name: "The last 14 days" }),
  ).toBeVisible();
}

test.describe("KitaMo sign-in", () => {
  test("password, then authenticator setup, reaches the Overview at aal2", async ({
    context,
    page,
  }) => {
    const elsewhere = watchBrowserRequests(page);
    const email = account("admin");
    await page.goto("/overview");
    await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Foverview$/);
    await signIn(page, email);
    await expect(page).toHaveURL(/\/overview$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Overview" }),
    ).toBeVisible();
    await expect(page.getByText("KitaMo admin").first()).toBeAttached();

    const cookies = await context.cookies();
    for (const name of ["adm_at", "adm_rt", "adm_seen"]) {
      const cookie = cookies.find((entry) => entry.name === name);
      expect(cookie, name).toMatchObject({ httpOnly: true, sameSite: "Lax" });
      expect(cookie?.domain).toBe("127.0.0.1");
    }
    // Auth and Core are called by the server only; the browser never sees them.
    expect(elsewhere).toEqual([]);
    // The parked mock-first sections are not part of a KitaMo session.
    await expect(
      page
        .getByRole("navigation", { name: "Admin navigation" })
        .getByRole("link", { name: "Users" }),
    ).toHaveCount(0);
    await page.goto("/users");
    await expect(
      page.getByRole("heading", { level: 1, name: "Users" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "That admin view does not exist" }),
    ).toBeVisible();
  });

  test("an enrolled admin goes straight to the code, and a wrong code is refused", async ({
    page,
  }) => {
    const email = account("enrolled");
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in with KitaMo" }).click();
    await expect(page).toHaveURL(/\/mfa\?/);
    await expect(
      page.getByRole("heading", { name: "Enter your authenticator code" }),
    ).toBeVisible();
    await page.getByLabel("6-digit code").fill("000000");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("alert")).toContainText("didn't match");
    // aal1 is not enough for the admin site.
    await page.goto("/overview");
    await expect(page).toHaveURL(/\/mfa\?returnTo=%2Foverview/);
    await page.getByLabel("6-digit code").fill("123456");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/overview$/);
  });

  test("a wrong password is refused without a session", async ({
    context,
    page,
  }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(account("admin"));
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in with KitaMo" }).click();
    await expect(page.getByRole("alert")).toContainText(
      "don't match a KitaMo account",
    );
    expect(
      (await context.cookies()).some((cookie) => cookie.name === "adm_at"),
    ).toBe(false);
  });

  test("a business owner's account is not permitted (Core's KM005)", async ({
    page,
  }) => {
    await signIn(page, account("owner"));
    await expect(page).toHaveURL(/\/access-denied\?why=not_permitted$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Not permitted" }),
    ).toBeVisible();
  });

  test("sign out ends the session; 30 minutes idle does too", async ({
    baseURL,
    context,
    page,
  }) => {
    await signIn(page, account("enrolled"));
    await expect(page).toHaveURL(/\/overview$/);
    await page.getByRole("button", { name: "Sign out" }).first().click();
    await expect(page).toHaveURL(/\/sign-in\?why=signed_out$/);
    await page.goto("/overview");
    await expect(page).toHaveURL(/\/sign-in\?returnTo=/);

    await signIn(page, account("enrolled"));
    await expect(page).toHaveURL(/\/overview$/);
    await context.addCookies([
      {
        name: "adm_seen",
        value: String(Date.now() - 31 * 60_000),
        url: baseURL ?? "http://127.0.0.1:3100",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    await page.goto("/businesses");
    await expect(page).toHaveURL(/\/sign-in\?why=idle$/);
    await expect(page.getByRole("status").first()).toContainText("30 minutes");
  });
});

test.describe("R16 pages through the Core adapter", () => {
  test("the reason sheet blocks a look without a reason, and Records without evidence", async ({
    page,
    request,
  }) => {
    const email = account("enrolled");
    await signIn(page, email, "/businesses");
    await openFirstBusiness(page);
    const open = page.getByRole("button", {
      name: /^Open the summary|^Open records/,
    });

    // No reason at all.
    await open.click();
    await expect(
      page.getByText(/Write the reason in at least 20 characters/),
    ).toBeVisible();
    await expect(
      page.getByText("Nothing was opened. Fix the marked fields first."),
    ).toBeVisible();

    // Records with a reason but neither a flag nor a reference.
    await page.getByLabel(/Records \(break-glass\)/).check();
    await page
      .getByLabel("Reason", { exact: true })
      .selectOption("health_check");
    await page.getByLabel(/Why you need to look/).fill(REASON);
    await page
      .getByRole("button", { name: "Open records for 30 minutes" })
      .click();
    await expect(
      page.getByText(
        /Records need an open flag of this business or a support or legal reference/,
      ),
    ).toBeVisible();

    // A reason under 20 characters.
    await page.getByLabel(/Summary \(counts/).check();
    await page.getByLabel(/Why you need to look/).fill("Just curious");
    await page
      .getByRole("button", { name: "Open the summary for 30 minutes" })
      .click();
    await expect(
      page.getByText(/at least 20 characters \(12 so far\)/),
    ).toBeVisible();

    // Nothing reached Core's writers.
    expect((await stubCalls(request, email)).rpc).not.toContain(
      "open_admin_access",
    );

    // With a reason: the Summary, the banner, then Records as a new access.
    await page.getByLabel(/Why you need to look/).fill(REASON);
    await page
      .getByRole("button", { name: "Open the summary for 30 minutes" })
      .click();
    await expect(
      page.getByRole("heading", { name: "The last 14 days" }),
    ).toBeVisible();
    const banner = page.getByTestId("access-banner");
    // The reason picked above (health check) is the one on the banner.
    await expect(banner).toContainText(
      "Summary · reason: health check · 30 min left",
    );

    // Records are refused with only a summary access: the page asks for a new one.
    await page.goto(`${page.url()}/records`);
    await expect(
      page.getByRole("form", { name: /Reason sheet/ }),
    ).toBeVisible();
    expect((await stubCalls(request, email)).rpc).not.toContain(
      "km_admin_business_records",
    );

    await page
      .getByLabel("Reason", { exact: true })
      .selectOption("support_request");
    await page.getByLabel(/Why you need to look/).fill(REASON);
    await page.getByLabel(/support or legal reference/).fill("SUP-2026-0142");
    await page
      .getByRole("button", { name: "Open records for 30 minutes" })
      .click();
    await expect(page).toHaveURL(/\/records$/);
    await expect(
      page.getByRole("navigation", { name: "Record kinds" }),
    ).toBeVisible();
    await expect(page.getByTestId("access-banner")).toHaveCount(2);
    await page.getByRole("link", { name: "Credit" }).click();
    await expect(page.getByRole("table", { name: "Credit" })).toBeVisible();
  });

  test("the 30-minute banner counts down on a local clock and ends the access", async ({
    page,
    request,
  }) => {
    await page.clock.install();
    const email = account("enrolled");
    await signIn(page, email, "/businesses");
    await openSummary(page);
    const banner = page.getByTestId("access-banner");
    await expect(banner).toContainText("30 min left");

    const before = (await stubCalls(request, email)).rpc.length;
    await page.clock.fastForward("06:00");
    await expect(banner).toContainText("24 min left");
    // Activity keeps the idle lock away; the banner's clock still runs.
    await page.keyboard.press("Shift");
    await page.clock.fastForward("18:00");
    await page.keyboard.press("Shift");
    await page.clock.fastForward("06:30");
    await expect(banner).toContainText(
      "This access ended. Open a new one with a reason.",
    );
    await expect(banner.getByRole("button", { name: /Close/ })).toHaveCount(0);
    // The countdown made no request: no polling.
    expect((await stubCalls(request, email)).rpc.length).toBe(before);

    // Core's own clock past 30 minutes: the summary is gone; a new reason is needed.
    await advanceCore(request, email, 31);
    await page.reload();
    await expect(
      page.getByRole("form", { name: /Reason sheet/ }),
    ).toBeVisible();
    await expect(page.getByTestId("access-banner")).toHaveCount(0);
  });

  test("Close ends the access at once", async ({ page }) => {
    await signIn(page, account("enrolled"), "/businesses");
    await openSummary(page);
    await page
      .getByTestId("access-banner")
      .getByRole("button", { name: /Close/ })
      .click();
    await expect(page.getByText("Access closed")).toBeVisible();
    await expect(
      page.getByRole("form", { name: /Reason sheet/ }),
    ).toBeVisible();
  });

  test("read-only: no write controls, and every write is one of the four admin-log RPCs", async ({
    page,
    request,
  }) => {
    const email = account("enrolled");
    await signIn(page, email, "/businesses");
    await openSummary(page);
    const business = page.url();
    await page
      .getByLabel("Kind", { exact: true })
      .selectOption("health_mismatch");
    await page.getByLabel("Source", { exact: true }).selectOption("health");
    await page.getByLabel(/Attach the health counts/).check();
    await page.getByRole("button", { name: "Raise the flag" }).click();
    await expect(page.getByText("Flag raised")).toBeVisible();

    const forbidden =
      /delete|remove|edit|suspend|restore|void|refund|disable|impersonate|reset|update|export/i;
    for (const path of [
      "/overview",
      "/businesses",
      new URL(business).pathname,
      "/flags",
      "/audit-log",
      "/associations",
    ]) {
      await page.goto(path);
      const labels = await page.getByRole("button").allInnerTexts();
      for (const label of labels) {
        expect(label, `${path}: ${label}`).not.toMatch(forbidden);
      }
    }

    await page.goto("/flags");
    await page.getByLabel("Change to").first().selectOption("dismissed");
    await page
      .getByLabel(/Note/)
      .first()
      .fill("Counts matched after the restock.");
    await page.getByRole("button", { name: "Save the review" }).first().click();
    await expect(page.getByText("Review saved")).toBeVisible();

    const calls = await stubCalls(request, email);
    for (const fn of calls.rpc) {
      expect([...READERS, ...WRITERS], fn).toContain(fn);
    }
    for (const call of calls.rest) {
      expect(call.method, call.path).toBe("POST");
      expect(call.path, call.path).toMatch(/^\/rest\/v1\/rpc\/[a-z_]+$/);
    }
    const writes = calls.rpc.filter((fn) => WRITERS.includes(fn));
    expect(new Set(writes)).toEqual(
      new Set(["open_admin_access", "raise_admin_flag", "review_admin_flag"]),
    );
  });

  test("the access log lists the access; Associations is the HOA stub", async ({
    page,
  }) => {
    await signIn(page, account("enrolled"), "/businesses");
    await openSummary(page);
    await page.goto("/audit-log");
    await expect(
      page.getByText("Access entries cannot be edited, hidden, or deleted."),
    ).toBeVisible();
    const accesses = page.getByRole("table", { name: "Accesses" });
    await expect(accesses).toContainText(REASON);
    await expect(accesses).toContainText("support request");
    await expect(page.getByRole("table", { name: "Reads" })).toContainText(
      "km_admin_business_summary",
    );
    await page.goto("/associations");
    await expect(
      page.getByRole("heading", {
        name: "Associations arrive with the HOA level.",
      }),
    ).toBeVisible();
  });
});

test("the stub is local", async ({ request }) => {
  expect(new URL(STUB).hostname).toBe("127.0.0.1");
  expect((await request.get(`${STUB}/__stub/health`)).ok()).toBe(true);
});
