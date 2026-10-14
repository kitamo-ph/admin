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

// Multi-page flows against a dev server that compiles routes on first use.
test.describe.configure({ timeout: 120_000 });

const READERS = [
  "km_admin_session",
  "km_admin_directory",
  "km_admin_business_summary",
  "km_admin_business_records",
  "km_admin_flags",
  "km_admin_access_log",
  "km_admin_associations",
  "km_admin_association",
];
const WRITERS = [
  "open_admin_access",
  "close_admin_access",
  "raise_admin_flag",
  "review_admin_flag",
  "admin_create_association",
  "admin_add_association_officer",
  "admin_end_association_officer",
  "admin_rotate_association_code",
  "admin_close_association",
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
    .getByRole("combobox", { name: "Reason", exact: true })
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
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "didn't match",
    );
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
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
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
      .getByRole("combobox", { name: "Reason", exact: true })
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
      .getByRole("combobox", { name: "Reason", exact: true })
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
      .getByRole("combobox", { name: "Kind", exact: true })
      .selectOption("health_mismatch");
    await page
      .getByRole("combobox", { name: "Source", exact: true })
      .selectOption("health");
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
    await page
      .getByRole("combobox", { name: "Change to" })
      .first()
      .selectOption("dismissed");
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

  test("the access log lists the access and its reads", async ({ page }) => {
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
  });

  test("Associations (0086): one of each kind, the kind listed, officers added and ended, the code rotated, closed", async ({
    page,
    request,
  }) => {
    const email = account("enrolled");
    await signIn(page, email, "/associations");
    const list = page.getByRole("table", { name: "Associations" });
    await expect(
      list.getByRole("row", { name: /Villa Rosa Homeowners/ }),
    ).toContainText("HOA");
    await expect(
      list.getByRole("row", { name: /Malanday Market Vendors/ }),
    ).toContainText("Barangay");

    for (const [kind, name] of [
      ["Barangay", "Brgy. Dalig Vendors"],
      ["HOA", "Sampaguita Homes HOA"],
    ] as const) {
      await page.goto("/associations");
      const create = page.getByRole("form", { name: "Create an association" });
      await create.getByLabel("Name", { exact: true }).fill(name);
      await create.getByRole("radio", { name: kind, exact: true }).check();
      await create.getByLabel("Letter reference").fill("LTR-2026-0001");
      await create
        .getByRole("button", { name: "Create the association" })
        .click();
      await expect(page.getByText("Association created")).toBeVisible();
      await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
      await expect(page.getByTestId("join-code")).toHaveText(
        /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/,
      );
      await page.goto("/associations");
      await expect(
        page
          .getByRole("table", { name: "Associations" })
          .getByRole("row", { name: new RegExp(name) }),
      ).toContainText(kind);
    }

    // The HOA just made: its detail, officers, the code, then closing it.
    await page
      .getByRole("table", { name: "Associations" })
      .getByRole("link", { name: "Sampaguita Homes HOA" })
      .click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Sampaguita Homes HOA" }),
    ).toBeVisible();
    const add = page.getByRole("form", { name: "Add an officer" });
    await add.getByLabel("Officer's KitaMo email").fill("juan@example.test");
    await add
      .getByLabel("Name and role members see")
      .fill("Juan D., President");
    await add.getByRole("button", { name: "Add the officer" }).click();
    await expect(page.getByText("Officer added")).toBeVisible();
    const officers = page.getByRole("table", { name: "Officers" });
    await expect(
      officers.getByRole("row", { name: /Juan D., President/ }),
    ).toContainText("Not yet");
    // Never the officer's email on the page.
    expect(await page.content()).not.toContain("juan@example.test");

    const again = page.getByRole("form", { name: "Add an officer" });
    await again
      .getByLabel("Officer's KitaMo email")
      .fill("unknown@example.test");
    await again
      .getByLabel("Name and role members see")
      .fill("Maria S., Secretary");
    await again.getByRole("button", { name: "Add the officer" }).click();
    await expect(again.getByRole("alert")).toContainText(
      "cannot be an officer here",
    );

    await page
      .getByRole("form", { name: "End Juan D., President's role" })
      .getByRole("button", { name: "End this officer's role" })
      .click();
    await expect(page.getByText("Officer's role ended")).toBeVisible();
    await expect(
      page
        .getByRole("table", { name: "Officers" })
        .getByRole("row", { name: /Juan D., President/ }),
    ).not.toContainText("—");

    const before = await page.getByTestId("join-code").innerText();
    await page.getByRole("button", { name: "Rotate the join code" }).click();
    await expect(page.getByText("Join code changed")).toBeVisible();
    await expect(page.getByTestId("join-code")).not.toHaveText(before);

    const close = page.getByRole("form", { name: "Close the association" });
    await close.getByRole("button", { name: "Close the association" }).click();
    await expect(close.getByText(/Tick the box to confirm/)).toBeVisible();
    await close.getByRole("checkbox").check();
    await close.getByRole("button", { name: "Close the association" }).click();
    await expect(page.getByText("Association closed")).toBeVisible();
    await expect(page.getByText("Closed", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("form", { name: "Add an officer" }),
    ).toHaveCount(0);

    const calls = await stubCalls(request, email);
    for (const fn of calls.rpc) {
      expect([...READERS, ...WRITERS], fn).toContain(fn);
    }
    expect(new Set(calls.rpc.filter((fn) => WRITERS.includes(fn)))).toEqual(
      new Set([
        "admin_create_association",
        "admin_add_association_officer",
        "admin_end_association_officer",
        "admin_rotate_association_code",
        "admin_close_association",
      ]),
    );
  });
});

test("the stub is local", async ({ request }) => {
  expect(new URL(STUB).hostname).toBe("127.0.0.1");
  expect((await request.get(`${STUB}/__stub/health`)).ok()).toBe(true);
});
