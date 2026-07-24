import { describe, expect, it } from "vitest";

import {
  accountStatusSchema,
  administratorSchema,
  auditActionSchema,
  businessStatusSchema,
  businessTypeSchema,
  ianaTimezoneSchema,
  mockScenarioSchema,
  releaseChannelSchema,
  reportStatusSchema,
  serviceErrorSchema,
  serviceMetaSchema,
  serviceResultSchema,
  syncStateSchema,
  updateProblemReportInputSchema,
  utcDateTimeSchema,
} from "../../lib/admin";

describe("admin domain schemas", () => {
  it("keeps the approved stable enum contracts", () => {
    expect(accountStatusSchema.options).toEqual([
      "active",
      "invited",
      "suspended",
      "disabled",
    ]);
    expect(businessStatusSchema.options).toEqual([
      "active",
      "inactive",
      "suspended",
      "under_review",
    ]);
    expect(businessTypeSchema.options).toEqual([
      "sari_sari_store",
      "karinderia",
      "market_vendor",
      "kiosk",
      "food_seller",
      "other",
    ]);
    expect(syncStateSchema.options).toEqual([
      "healthy",
      "pending",
      "retrying",
      "failed",
      "stale",
      "conflict",
    ]);
    expect(reportStatusSchema.options).toEqual([
      "new",
      "triaged",
      "in_progress",
      "waiting_for_user",
      "resolved",
      "closed",
    ]);
    expect(releaseChannelSchema.options).toEqual([
      "internal",
      "closed",
      "open",
      "production",
    ]);
    expect(auditActionSchema.options).toContain("sync.inspected");
    expect(auditActionSchema.options).toContain("problem_report.resolved");
  });

  it("rejects unmasked administrator email addresses", () => {
    expect(
      administratorSchema.safeParse({
        id: "admin-test",
        displayName: "Fictional Administrator",
        emailMasked: "admin@example.test",
        role: "support_admin",
        status: "active",
      }).success,
    ).toBe(false);
  });

  it("accepts valid IANA timezones and rejects display labels", () => {
    expect(ianaTimezoneSchema.safeParse("Asia/Manila").success).toBe(true);
    expect(ianaTimezoneSchema.safeParse("Philippine time").success).toBe(false);
  });

  it("accepts normalized UTC timestamps and rejects non-UTC offsets", () => {
    expect(
      utcDateTimeSchema.safeParse("2026-07-24T17:30:00.000Z").success,
    ).toBe(true);
    expect(
      utcDateTimeSchema.safeParse("2026-07-25T01:30:00.000+08:00").success,
    ).toBe(false);
  });

  it("requires a meaningful, typed problem-report change", () => {
    const baseInput = {
      reportId: "report-001",
      reason: "Support review",
      actor: {
        id: "admin-session",
        displayName: "Mock Support",
        role: "support_admin" as const,
      },
    };

    expect(updateProblemReportInputSchema.safeParse(baseInput).success).toBe(
      false,
    );
    expect(
      updateProblemReportInputSchema.safeParse({
        ...baseInput,
        status: "triaged",
      }).success,
    ).toBe(true);
    expect(
      updateProblemReportInputSchema.safeParse({
        ...baseInput,
        status: "not-a-status",
      }).success,
    ).toBe(false);
  });

  it("requires mock provenance and correlation IDs on envelopes", () => {
    const meta = {
      requestId: "mock-normal-000001",
      source: "mock",
      generatedAt: "2026-07-25T00:00:01.000Z",
      scenario: "normal",
      stale: false,
      latencyMs: 0,
      warnings: [],
    };

    expect(serviceMetaSchema.safeParse(meta).success).toBe(true);
    expect(
      serviceMetaSchema.safeParse({ ...meta, source: "database" }).success,
    ).toBe(false);
    expect(
      serviceErrorSchema.safeParse({
        code: "NOT_FOUND",
        message: "Missing",
        retryable: false,
      }).success,
    ).toBe(false);
    expect(
      serviceResultSchema(mockScenarioSchema).safeParse({
        ok: false,
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Unavailable",
          retryable: true,
          correlationId: "mock-normal-000001",
        },
        meta,
      }).success,
    ).toBe(true);
  });
});
