import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";

import { PRIVACY_URL, TERMS_URL } from "@/components/layout/legal-links";

describe("KitaMo's Privacy Policy and Terms on every page (R21)", () => {
  it("links to KitaMo's own pages", () => {
    expect(PRIVACY_URL).toBe("https://app.kitamo.online/privacy");
    expect(TERMS_URL).toBe("https://app.kitamo.online/terms");
  });

  it("puts the links in both shells and on the not-found and error pages", () => {
    for (const file of [
      "components/layout/admin-shell.tsx",
      "components/layout/public-shell.tsx",
      "app/not-found.tsx",
      "app/error.tsx",
    ]) {
      expect(readFileSync(file, "utf8")).toContain("<LegalLinks");
    }
  });

  it("shows the sign-in and authenticator pages in the public shell", () => {
    for (const page of [
      "app/sign-in/page.tsx",
      "app/mfa/page.tsx",
      "app/mfa/enroll/page.tsx",
    ]) {
      expect(readFileSync(page, "utf8")).toContain("<PublicShell");
    }
  });
});
