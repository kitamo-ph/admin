import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";

import {
  ASSOCIATION_REASONS,
  CALENDAR_DAYS,
  UNCONFIRMED,
  refusalMessage,
} from "@/lib/admin/r16-messages";
import type { ServiceError } from "@/lib/admin/schemas";

const error = (
  code: ServiceError["code"],
  details?: Record<string, unknown>,
): ServiceError => ({
  code,
  message: "x",
  retryable: true,
  correlationId: "core-1",
  ...(details === undefined ? {} : { details }),
});

describe("what a refused or unanswered write says (the lead's review, LOW 7)", () => {
  it("never says nothing was changed when the result is unknown", () => {
    expect(refusalMessage(error("TIMEOUT"))).toBe(UNCONFIRMED);
    expect(
      refusalMessage(error("SERVICE_UNAVAILABLE", { stage: "transport" })),
    ).toBe(UNCONFIRMED);
    expect(
      refusalMessage(
        error("SERVICE_UNAVAILABLE", { contract: "admin_close_association" }),
      ),
    ).toBe(UNCONFIRMED);
    expect(UNCONFIRMED).toBe(
      "We couldn't confirm this. Check the list before trying again.",
    );
    expect(UNCONFIRMED).not.toMatch(/nothing/i);
  });

  it("says nothing was changed when Core answered with an error", () => {
    expect(refusalMessage(error("SERVICE_UNAVAILABLE"))).toMatch(
      /Nothing was opened or changed/,
    );
  });

  it("states 0086's letter-reference rule", () => {
    expect(
      refusalMessage(
        error("VALIDATION_ERROR", { reason: "letter_reference" }),
        ASSOCIATION_REASONS,
      ),
    ).toContain("4 to 60 letters");
  });
});

describe("the days Core groups by (R20, ADMIN-MARKETING-GOLIVE §4)", () => {
  it("are called calendar days, never business days", () => {
    expect(CALENDAR_DAYS).toBe(
      "Calendar days, midnight to midnight, in the business's timezone (not KitaMo's business day).",
    );
    expect(CALENDAR_DAYS).not.toMatch(/^business days/i);
  });

  it("the Summary's 14 days and the Records window both say so", () => {
    for (const page of [
      "app/(admin)/businesses/[businessId]/page.tsx",
      "app/(admin)/businesses/[businessId]/records/page.tsx",
    ]) {
      const text = readFileSync(page, "utf8");
      expect(text).toContain("{CALENDAR_DAYS}");
      expect(text).not.toMatch(/Business days in/);
    }
  });
});

describe("the Node version Vercel builds with (R20)", () => {
  it("is pinned to 22.x in package.json and its lock", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      engines: { node: string };
    };
    const lock = JSON.parse(readFileSync("package-lock.json", "utf8")) as {
      packages: Record<string, { engines?: { node: string } }>;
    };
    expect(pkg.engines.node).toBe("22.x");
    expect(lock.packages[""]?.engines?.node).toBe("22.x");
  });
});
