import { describe, expect, it } from "vitest";

import { existsSync, readFileSync } from "node:fs";

import { READ_ONLY_LINE } from "@/components/layout/read-only-line";

/** The design pass (mkt-adm-01, a legal HIGH; the lead's decision on 84963c8). */
describe("the read-only line on every signed-in page and full-screen state", () => {
  it("keeps the words", () => {
    expect(READ_ONLY_LINE).toBe(
      "Read-only toward businesses · every view is logged",
    );
  });

  it("is in the shell at both widths: the laptop header and the phone line", () => {
    const shell = readFileSync("components/layout/admin-shell.tsx", "utf8");
    expect(shell.match(/<ReadOnlyLine \/>/g)).toHaveLength(2);
  });

  it("is on the root not-found and error pages and the plain states an admin reaches", () => {
    for (const file of ["app/not-found.tsx", "app/error.tsx"]) {
      expect(readFileSync(file, "utf8")).toContain("<ReadOnlyLine");
    }
    for (const file of [
      "app/unavailable/page.tsx",
      "app/maintenance/page.tsx",
      "app/access-denied/page.tsx",
    ]) {
      expect(readFileSync(file, "utf8")).toMatch(/^\s+readOnlyLine$/m);
    }
  });

  it("renders a missing admin view and a failed admin page inside the shell", () => {
    expect(existsSync("app/(admin)/not-found.tsx")).toBe(true);
    expect(existsSync("app/(admin)/error.tsx")).toBe(true);
  });
});
