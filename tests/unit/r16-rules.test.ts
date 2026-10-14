import { describe, expect, it } from "vitest";

import {
  ASSOCIATION_KIND_LABELS,
  FLAG_TRANSITIONS,
  checkAddOfficer,
  checkCreateAssociation,
  checkFlagReview,
  checkRaiseFlag,
  checkReasonSheet,
  formatJoinCode,
  minutesLeft,
  type ReasonSheetDraft,
} from "@/lib/admin/r16-rules";

const FLAG = "0f000000-0000-4000-8000-000000000001";
const draft = (over: Partial<ReasonSheetDraft> = {}): ReasonSheetDraft => ({
  level: "summary",
  reasonCode: "support_request",
  reasonText: "The owner asked why yesterday's tally is off.",
  flagId: "",
  reference: "",
  withholdCode: "",
  withholdDays: "",
  ...over,
});

describe("the reason sheet", () => {
  it("opens a summary with a reason code and 20+ characters", () => {
    const result = checkReasonSheet(draft());
    expect(result).toEqual({
      ok: true,
      value: {
        level: "summary",
        reasonCode: "support_request",
        reasonText: "The owner asked why yesterday's tally is off.",
        flagId: null,
        reference: null,
        withholdCode: null,
        withholdDays: null,
      },
    });
  });

  it("blocks a missing reason, a short reason, or a reason that is only spaces", () => {
    for (const reasonText of [
      "",
      "Too short to count",
      "                         ",
    ]) {
      const result = checkReasonSheet(draft({ reasonText }));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.reasonText).toMatch(/at least 20/);
    }
    const nineteen = checkReasonSheet(draft({ reasonText: "x".repeat(19) }));
    const twenty = checkReasonSheet(
      draft({ reasonText: ` ${"x".repeat(20)} ` }),
    );
    expect(nineteen.ok).toBe(false);
    expect(twenty.ok).toBe(true);
    expect(checkReasonSheet(draft({ reasonText: "x".repeat(501) })).ok).toBe(
      false,
    );
  });

  it("blocks an unknown level or reason code", () => {
    const result = checkReasonSheet(
      draft({ level: "everything", reasonCode: "curious" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.level).toBeDefined();
      expect(result.errors.reasonCode).toBeDefined();
    }
  });

  it("blocks Records without a flag or a reference (break-glass)", () => {
    const result = checkReasonSheet(draft({ level: "records" }));
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors.evidence).toMatch(
        /flag .* or a support or legal reference/,
      );
    expect(checkReasonSheet(draft({ level: "records", flagId: FLAG })).ok).toBe(
      true,
    );
    expect(
      checkReasonSheet(draft({ level: "records", reference: "SUP-2026-0142" }))
        .ok,
    ).toBe(true);
  });

  it("checks a reference's shape", () => {
    for (const reference of [
      "abc",
      "has spaces here",
      "x".repeat(61),
      "<script>",
    ]) {
      const result = checkReasonSheet(draft({ level: "records", reference }));
      expect(result.ok, reference).toBe(false);
      if (!result.ok) expect(result.errors.reference).toBeDefined();
    }
  });

  it("needs the flag for a flag review, at any level", () => {
    const result = checkReasonSheet(draft({ reasonCode: "flag_review" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.evidence).toMatch(/needs the flag/);
    expect(
      checkReasonSheet(draft({ reasonCode: "flag_review", flagId: FLAG })).ok,
    ).toBe(true);
  });

  it("holds disclosure only for a legal request or a flag review, 1 to 90 days", () => {
    const legal = {
      reasonCode: "legal_request",
      withholdCode: "legal_request",
    };
    expect(checkReasonSheet(draft({ ...legal, withholdDays: "90" })).ok).toBe(
      true,
    );
    for (const withholdDays of ["91", "0", "", "ten"]) {
      expect(
        checkReasonSheet(draft({ ...legal, withholdDays })).ok,
        withholdDays,
      ).toBe(false);
    }
    const support = checkReasonSheet(
      draft({ withholdCode: "fraud_review", withholdDays: "30" }),
    );
    expect(support.ok).toBe(false);
    if (!support.ok)
      expect(support.errors.withhold).toMatch(/legal request or a flag review/);
  });
});

describe("the 30-minute banner", () => {
  const opened = Date.UTC(2026, 9, 14, 6, 0, 0);
  const expires = new Date(opened + 30 * 60_000).toISOString();

  it("counts down in whole minutes, rounded up", () => {
    expect(minutesLeft(expires, opened)).toBe(30);
    expect(minutesLeft(expires, opened + 6 * 60_000 + 1)).toBe(24);
    expect(minutesLeft(expires, opened + 29 * 60_000 + 59_000)).toBe(1);
  });

  it("reads 0, ended, at 30 minutes and after", () => {
    expect(minutesLeft(expires, opened + 30 * 60_000)).toBe(0);
    expect(minutesLeft(expires, opened + 45 * 60_000)).toBe(0);
    expect(minutesLeft("not a time", opened)).toBe(0);
  });
});

describe("flag reviews", () => {
  it("allows only the spec's transitions", () => {
    expect(FLAG_TRANSITIONS).toEqual({
      open: ["reviewing", "dismissed", "confirmed"],
      reviewing: ["dismissed", "confirmed"],
      dismissed: ["open"],
      confirmed: ["open"],
    });
    expect(
      checkFlagReview("reviewing", "open", "Looked again carefully.").ok,
    ).toBe(false);
    expect(
      checkFlagReview("dismissed", "confirmed", "Looked again carefully.").ok,
    ).toBe(false);
  });

  it("needs a 10-500 character note except when moving to reviewing", () => {
    expect(checkFlagReview("open", "reviewing", "")).toEqual({
      ok: true,
      value: { status: "reviewing", note: null },
    });
    const short = checkFlagReview("open", "dismissed", "ok");
    expect(short.ok).toBe(false);
    if (!short.ok) expect(short.errors.note).toBeDefined();
    expect(
      checkFlagReview("open", "dismissed", "Counts matched after the restock.")
        .ok,
    ).toBe(true);
  });
});

describe("raising a flag", () => {
  it("takes counts and a check name only, never money or text", () => {
    const result = checkRaiseFlag({
      kind: "health_mismatch",
      source: "health",
      check: "stock_use",
      counts: { stock_use_issues_7d: 4 },
    });
    expect(result).toEqual({
      ok: true,
      value: {
        kind: "health_mismatch",
        source: "health",
        evidence: { counts: { stock_use_issues_7d: 4 }, check: "stock_use" },
      },
    });
    for (const counts of [
      { total_cents: 5 },
      { balance: 1 },
      { stock: -1 },
      { stock: 1.5 },
      Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`k${i}`, 1])),
    ]) {
      expect(
        checkRaiseFlag({ kind: "other", source: "admin", check: "", counts })
          .ok,
      ).toBe(false);
    }
  });

  it("refuses the report source (R23) and a free-text check", () => {
    expect(
      checkRaiseFlag({
        kind: "other",
        source: "report",
        check: "",
        counts: null,
      }).ok,
    ).toBe(false);
    expect(
      checkRaiseFlag({
        kind: "other",
        source: "admin",
        check: "He seemed off",
        counts: null,
      }).ok,
    ).toBe(false);
  });
});

describe("association rules (0086, D18)", () => {
  it("creates with a name, a kind of HOA or barangay, an optional place and the letter's reference", () => {
    expect(
      checkCreateAssociation({
        name: "  Villa Rosa Homeowners ",
        kind: "barangay",
        area: "  ",
        letterReference: " VR-HOA-2026-014 ",
      }),
    ).toEqual({
      ok: true,
      value: {
        name: "Villa Rosa Homeowners",
        kind: "barangay",
        area: null,
        letterReference: "VR-HOA-2026-014",
      },
    });
    const refused = checkCreateAssociation({
      name: "",
      kind: "village",
      area: "x".repeat(121),
      letterReference: "",
    });
    expect(refused.ok).toBe(false);
    if (!refused.ok) {
      expect(Object.keys(refused.errors).sort()).toEqual([
        "area",
        "kind",
        "letterReference",
        "name",
      ]);
    }
    expect(ASSOCIATION_KIND_LABELS).toEqual({
      hoa: "HOA",
      barangay: "Barangay",
    });
  });

  it("takes 0086's letter reference only: 4 to 60 of letters, digits, spaces or # : / . _ -", () => {
    const create = (letterReference: string) =>
      checkCreateAssociation({
        name: "Villa Rosa Homeowners",
        kind: "hoa",
        area: "",
        letterReference,
      });
    expect(create("Brgy. Resolution No. 14 s. 2026").ok).toBe(true);
    expect(create("VR-HOA 2026/014#2:a_b").ok).toBe(true);
    for (const bad of [
      "Brgy. Resolution No. 14, s. 2026",
      "L-1",
      "x".repeat(61),
      "Ref (2026)",
    ]) {
      const result = create(bad);
      expect(result.ok, bad).toBe(false);
      if (!result.ok) {
        expect(result.errors.letterReference).toContain("4 to 60 letters");
      }
    }
  });

  it("adds an officer by email with the name and role members see", () => {
    expect(
      checkAddOfficer({
        email: " Juan@Example.TEST ",
        label: " Juan D., President ",
      }),
    ).toEqual({
      ok: true,
      value: { email: "juan@example.test", label: "Juan D., President" },
    });
    const refused = checkAddOfficer({ email: "juan", label: "x".repeat(61) });
    expect(refused.ok).toBe(false);
    if (!refused.ok) {
      expect(Object.keys(refused.errors).sort()).toEqual(["email", "label"]);
    }
  });

  it("writes a join code as officers read it out", () => {
    expect(formatJoinCode("K7Q4X9RM")).toBe("K7Q4-X9RM");
  });
});
