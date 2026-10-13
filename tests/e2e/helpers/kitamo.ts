import { expect, type APIRequestContext, type Page } from "@playwright/test";

/** The loopback stub (tests/e2e/stub/kitamo-stub.ts); playwright.config.ts starts it. */
export const STUB = "http://127.0.0.1:3199";
export const PASSWORD = "correct-horse-battery";
export const TOTP = "123456";

/** A fresh account per test, so parallel tests never share Core state. */
export function account(kind: "admin" | "enrolled" | "owner"): string {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `${kind}-${id}@kitamo.test`;
}

/** Password (aal1), then the authenticator step (aal2), from /sign-in. */
export async function signIn(
  page: Page,
  email: string,
  returnTo = "/overview",
) {
  await page.goto(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in with KitaMo" }).click();
  if (!email.startsWith("enrolled")) {
    await expect(page).toHaveURL(/\/mfa\/enroll/);
    await page
      .getByRole("button", { name: "Set up the authenticator app" })
      .click();
    await expect(
      page.getByAltText("QR code for the authenticator app"),
    ).toBeVisible();
  } else {
    await expect(page).toHaveURL(/\/mfa\?/);
  }
  await page.getByLabel("6-digit code").fill(TOTP);
  await page.getByRole("button", { name: "Continue" }).click();
}

export type StubCalls = {
  rpc: string[];
  rest: { sub: string | null; method: string; path: string }[];
};

export async function stubCalls(
  request: APIRequestContext,
  email: string,
): Promise<StubCalls> {
  const response = await request.get(
    `${STUB}/__stub/calls?email=${encodeURIComponent(email)}`,
  );
  return (await response.json()) as StubCalls;
}

export async function advanceCore(
  request: APIRequestContext,
  email: string,
  minutes: number,
) {
  await request.post(`${STUB}/__stub/advance`, { data: { email, minutes } });
}
