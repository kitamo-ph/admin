import { describe, expect, it } from "vitest";

import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  shortenId,
  titleCase,
} from "@/lib/format";

describe("formatDateTime", () => {
  it("formats timestamps in Philippine time", () => {
    expect(formatDateTime("2025-02-03T15:30:00.000Z")).toBe(
      "Feb 3, 2025, 11:30 PM",
    );
  });

  it("handles a Philippine calendar-day rollover", () => {
    expect(formatDateTime("2025-12-31T17:30:00.000Z")).toBe(
      "Jan 1, 2026, 1:30 AM",
    );
  });

  it("uses an explicitly supplied business timezone", () => {
    expect(formatDateTime("2025-12-31T17:30:00.000Z", "UTC")).toBe(
      "Dec 31, 2025, 5:30 PM",
    );
  });

  it.each([null, undefined, ""] as const)(
    "uses a safe fallback for %s",
    (value) => {
      expect(formatDateTime(value)).toBe("Not recorded");
    },
  );
});

describe("formatDate", () => {
  it("formats dates in the Philippine time zone", () => {
    expect(formatDate("2025-12-31T17:30:00.000Z")).toBe("Jan 1, 2026");
  });

  it.each([null, undefined, ""] as const)(
    "uses a safe fallback for %s",
    (value) => {
      expect(formatDate(value)).toBe("Not recorded");
    },
  );
});

describe("number formatting", () => {
  it("formats numbers using the Philippine locale", () => {
    expect(formatNumber(1_234_567)).toBe("1,234,567");
  });

  it("formats percentages with one decimal place by default", () => {
    expect(formatPercent(98.75)).toBe("98.8%");
  });

  it("supports an explicit percentage precision", () => {
    expect(formatPercent(98.756, 2)).toBe("98.76%");
  });
});

describe("text and identifier formatting", () => {
  it("turns underscore-separated values into title case", () => {
    expect(titleCase("waiting_for_user")).toBe("Waiting For User");
  });

  it("leaves an empty value empty", () => {
    expect(titleCase("")).toBe("");
  });

  it("does not shorten identifiers at the boundary", () => {
    expect(shortenId("1234567890abcdef")).toBe("1234567890abcdef");
  });

  it("shortens long identifiers while retaining both ends", () => {
    expect(shortenId("sync-event-0123456789abcdef")).toBe("sync-eve…abcdef");
  });
});
