import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createMockAdminService,
  getAdminService,
  type ServiceResult,
} from "../../lib/admin";

function expectSuccess<T>(
  result: ServiceResult<T>,
): asserts result is Extract<ServiceResult<T>, { ok: true }> {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`${result.error.code}: ${result.error.message}`);
  }
}

function expectFailure<T>(
  result: ServiceResult<T>,
): asserts result is Extract<ServiceResult<T>, { ok: false }> {
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error("Expected the mock service call to fail");
  }
}

describe("mock admin service contracts", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("serves the deterministic minimum dataset sizes through the service only", async () => {
    const service = createMockAdminService();
    const users = await service.listUsers({ limit: 1_000 });
    const businesses = await service.listBusinesses({ limit: 1_000 });
    const stalls = await service.listStalls({ limit: 1_000 });
    const devices = await service.listDevices({ limit: 1_000 });
    const syncEvents = await service.listSyncEvents({ limit: 1_000 });
    const reports = await service.listProblemReports({ limit: 1_000 });
    const versions = await service.listAppVersions({ limit: 1_000 });
    const audits = await service.listAuditEvents({ limit: 1_000 });
    const administrators = await service.listAdministrators({ limit: 1_000 });

    expectSuccess(users);
    expectSuccess(businesses);
    expectSuccess(stalls);
    expectSuccess(devices);
    expectSuccess(syncEvents);
    expectSuccess(reports);
    expectSuccess(versions);
    expectSuccess(audits);
    expectSuccess(administrators);

    expect(users.data.total).toBe(120);
    expect(businesses.data.total).toBe(35);
    expect(stalls.data.total).toBe(60);
    expect(devices.data.total).toBe(90);
    expect(syncEvents.data.total).toBe(400);
    expect(reports.data.total).toBe(45);
    expect(versions.data.total).toBe(8);
    expect(audits.data.total).toBe(150);
    expect(administrators.data.total).toBe(8);
    expect(users.meta.source).toBe("mock");
    expect(syncEvents.data.items[0]).toMatchObject({
      platform: "android",
      source: "android_client",
    });
  });

  it("generates the same fictional records for fresh service instances", async () => {
    const first = await createMockAdminService().listUsers({ limit: 5 });
    const second = await createMockAdminService().listUsers({ limit: 5 });

    expectSuccess(first);
    expectSuccess(second);
    expect(first.data).toEqual(second.data);
    expect(first.meta).toEqual(second.meta);
  });

  it("supports search and typed filtering across cross-linked records", async () => {
    const service = createMockAdminService();
    const businessMatches = await service.listUsers({
      search: "Tala Sari-Sari",
      role: "owner",
      accountStatus: "suspended",
      limit: 1_000,
    });
    const lowEndDevices = await service.listDevices({
      performanceTier: "low_end",
      status: "active",
      limit: 1_000,
    });
    const failedSyncs = await service.listSyncEvents({
      status: "failed",
      limit: 1_000,
    });
    const unresolvedReports = await service.listProblemReports({
      status: "new",
      limit: 1_000,
    });

    expectSuccess(businessMatches);
    expectSuccess(lowEndDevices);
    expectSuccess(failedSyncs);
    expectSuccess(unresolvedReports);
    expect(businessMatches.data.items).toHaveLength(1);
    expect(businessMatches.data.items[0].businessNames).toContain(
      "Tala Sari-Sari",
    );
    expect(
      lowEndDevices.data.items.every(
        (device) =>
          device.performanceTier === "low_end" && device.status === "active",
      ),
    ).toBe(true);
    expect(
      failedSyncs.data.items.every((event) => event.status === "failed"),
    ).toBe(true);
    expect(
      unresolvedReports.data.items.every((report) => report.status === "new"),
    ).toBe(true);
  });

  it("returns structured validation and not-found errors instead of throwing", async () => {
    const service = createMockAdminService();
    const invalid = await service.listUsers({ limit: 0 } as never);
    const missing = await service.getBusiness("business-does-not-exist");

    expectFailure(invalid);
    expectFailure(missing);
    expect(invalid.error.code).toBe("VALIDATION_ERROR");
    expect(invalid.error.correlationId).toBe(invalid.meta.requestId);
    expect(missing.error.code).toBe("NOT_FOUND");
    expect(missing.error.details).toEqual({
      id: "business-does-not-exist",
    });
  });

  it("filters audit events by an inclusive Manila calendar date", async () => {
    const service = createMockAdminService();
    const oneDay = await service.listAuditEvents({
      from: "2026-07-24",
      to: "2026-07-24",
      limit: 1_000,
    });
    const inverted = await service.listAuditEvents({
      from: "2026-07-25",
      to: "2026-07-24",
    });

    expectSuccess(oneDay);
    expectFailure(inverted);
    expect(oneDay.data.total).toBeGreaterThan(0);
    expect(
      oneDay.data.items.every(
        (event) =>
          Date.parse(event.occurredAt) >=
            Date.parse("2026-07-23T16:00:00.000Z") &&
          Date.parse(event.occurredAt) <=
            Date.parse("2026-07-24T15:59:59.999Z"),
      ),
    ).toBe(true);
    expect(
      oneDay.data.items.some((event) =>
        event.occurredAt.startsWith("2026-07-23"),
      ),
    ).toBe(true);
    expect(inverted.error.code).toBe("VALIDATION_ERROR");
  });

  it("updates a report in memory and appends a complete audit event", async () => {
    const service = createMockAdminService();
    const update = await service.updateProblemReportMock({
      reportId: "report-001",
      status: "triaged",
      severity: "high",
      assignedAdminId: "admin-003",
      internalNote:
        "Validated the masked context and queued a support follow-up.",
      reason: "Initial support triage",
      actor: {
        id: "admin-session-support",
        displayName: "Development Support Admin",
        role: "support_admin",
      },
    });

    expectSuccess(update);
    expect(update.data.report.status).toBe("triaged");
    expect(update.data.report.severity).toBe("high");
    expect(update.data.report.assignedAdminName).toBe("Cielo Manalo");
    expect(update.data.report.internalNotes.at(-1)?.body).toContain(
      "masked context",
    );
    expect(update.data.auditEvent).toMatchObject({
      action: "problem_report.updated",
      targetId: "report-001",
      businessId: "business-001",
      reasonCode: "support_case_update",
      reasonNote: "Initial support triage",
      outcome: "succeeded",
    });
    expect(update.data.auditEvent.beforeState).toMatchObject({
      status: "new",
      internalNoteCount: 0,
    });
    expect(update.data.auditEvent.afterState).toMatchObject({
      status: "triaged",
      internalNoteCount: 1,
    });
    expect(JSON.stringify(update.data.auditEvent)).not.toContain(
      "Validated the masked context",
    );

    const auditEvents = await service.listAuditEvents({
      action: "problem_report.updated",
      limit: 1_000,
    });
    const freshDetail = await service.getProblemReport("report-001");
    expectSuccess(auditEvents);
    expectSuccess(freshDetail);
    expect(auditEvents.data.total).toBe(1);
    expect(freshDetail.data.report.status).toBe("triaged");

    const independentDetail =
      await createMockAdminService().getProblemReport("report-001");
    expectSuccess(independentDetail);
    expect(independentDetail.data.report.status).toBe("new");
  });

  it("denies report mutations for operations viewers at the service boundary", async () => {
    const service = createMockAdminService();
    const denied = await service.updateProblemReportMock({
      reportId: "report-001",
      status: "triaged",
      reason: "Attempted viewer update",
      actor: {
        id: "admin-session-viewer",
        displayName: "Development Operations Viewer",
        role: "operations_viewer",
      },
    });

    expectFailure(denied);
    expect(denied.error.code).toBe("FORBIDDEN");
  });

  it("provides healthy normal state and controlled degraded/error scenarios", async () => {
    const normalService = createMockAdminService();
    const normalHealth = await normalService.getSystemHealth();
    const partialService = createMockAdminService({
      scenario: "partial_failure",
    });
    const partialHealth = await partialService.getSystemHealth();
    const partialSync = await partialService.listSyncEvents();
    const partialUsers = await partialService.listUsers();
    const unavailable = await createMockAdminService({
      scenario: "backend_unavailable",
    }).getDashboardSummary();
    const maintenanceService = createMockAdminService({
      scenario: "maintenance",
    });
    const maintenanceHealth = await maintenanceService.getSystemHealth();
    const maintenanceDashboard = await maintenanceService.getDashboardSummary();

    expectSuccess(normalHealth);
    expectSuccess(partialHealth);
    expectFailure(partialSync);
    expectSuccess(partialUsers);
    expectFailure(unavailable);
    expectSuccess(maintenanceHealth);
    expectFailure(maintenanceDashboard);
    expect(normalHealth.data.overallStatus).toBe("healthy");
    expect(partialHealth.data.overallStatus).toBe("degraded");
    expect(partialSync.error.code).toBe("SERVICE_UNAVAILABLE");
    expect(unavailable.error.code).toBe("SERVICE_UNAVAILABLE");
    expect(maintenanceHealth.data.overallStatus).toBe("maintenance");
    expect(maintenanceDashboard.error.code).toBe("MAINTENANCE");
  });

  it("supports empty, stale, high-failure, and outdated-version scenarios", async () => {
    const emptyUsers = await createMockAdminService({
      scenario: "empty",
    }).listUsers();
    const stale = await createMockAdminService({
      scenario: "stale_data",
    }).getDashboardSummary();
    const normalSyncs = await createMockAdminService().listSyncEvents({
      status: "failed",
      limit: 1_000,
    });
    const failedSyncs = await createMockAdminService({
      scenario: "high_sync_failure",
    }).listSyncEvents({ status: "failed", limit: 1_000 });
    const normalOutdated = await createMockAdminService().listDevices({
      limit: 1_000,
    });
    const spikedOutdated = await createMockAdminService({
      scenario: "outdated_version_spike",
    }).listDevices({ limit: 1_000 });

    expectSuccess(emptyUsers);
    expectSuccess(stale);
    expectSuccess(normalSyncs);
    expectSuccess(failedSyncs);
    expectSuccess(normalOutdated);
    expectSuccess(spikedOutdated);
    expect(emptyUsers.data.total).toBe(0);
    expect(stale.meta.stale).toBe(true);
    expect(stale.meta.warnings).not.toHaveLength(0);
    expect(failedSyncs.data.total).toBeGreaterThan(normalSyncs.data.total);

    const oldVersionIds = new Set([
      "version-001",
      "version-002",
      "version-003",
      "version-004",
    ]);
    const normalOldDevices = normalOutdated.data.items.filter((device) =>
      oldVersionIds.has(device.appVersionId),
    ).length;
    const spikedOldDevices = spikedOutdated.data.items.filter((device) =>
      oldVersionIds.has(device.appVersionId),
    ).length;
    expect(spikedOldDevices).toBeGreaterThan(normalOldDevices);
  });

  it("applies deterministic latency and method-level controlled failures", async () => {
    vi.useFakeTimers();
    const service = createMockAdminService({
      latencyMs: 25,
      failure: {
        methods: ["listAuditEvents"],
        code: "TIMEOUT",
        message: "Deterministic timeout",
      },
    });

    const pendingResult = service.listAuditEvents();
    await vi.advanceTimersByTimeAsync(25);
    const result = await pendingResult;

    expectFailure(result);
    expect(result.error.code).toBe("TIMEOUT");
    expect(result.error.message).toBe("Deterministic timeout");
    expect(result.meta.latencyMs).toBe(25);
  });

  it("selects and validates scenarios from trusted server env names", async () => {
    vi.stubEnv("MOCK_ADMIN_SCENARIO", "empty");
    vi.stubEnv("MOCK_ADMIN_LATENCY_MS", "0");
    const emptyUsers = await getAdminService().listUsers();

    expectSuccess(emptyUsers);
    expect(emptyUsers.data.total).toBe(0);
    expect(emptyUsers.meta.scenario).toBe("empty");

    vi.stubEnv("MOCK_ADMIN_SCENARIO", "not-a-scenario");
    expect(() => getAdminService()).toThrow("Invalid MOCK_ADMIN_SCENARIO");
  });
});
