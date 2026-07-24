import { z } from "zod";

import { createMockAdminData, MOCK_CLOCK_ISO } from "./mock-seed";
import {
  administratorListFiltersSchema,
  administratorSchema,
  appVersionListFiltersSchema,
  appVersionSchema,
  auditEventListFiltersSchema,
  auditEventSchema,
  businessDetailSchema,
  businessListFiltersSchema,
  businessSchema,
  dashboardSummarySchema,
  deviceListFiltersSchema,
  deviceSchema,
  listResultSchema,
  mockScenarioSchema,
  problemReportDetailSchema,
  problemReportListFiltersSchema,
  problemReportSchema,
  problemReportUpdateResultSchema,
  serviceResultSchema,
  stallListFiltersSchema,
  stallSchema,
  syncEventListFiltersSchema,
  syncEventSchema,
  systemHealthSchema,
  updateProblemReportInputSchema,
  userDetailSchema,
  userListFiltersSchema,
  userSchema,
  type Administrator,
  type AdministratorListFilters,
  type AppVersion,
  type AppVersionListFilters,
  type AuditEvent,
  type AuditEventListFilters,
  type Business,
  type BusinessDetail,
  type BusinessListFilters,
  type DashboardSummary,
  type Device,
  type DeviceListFilters,
  type ListResult,
  type MockScenario,
  type ProblemReport,
  type ProblemReportDetail,
  type ProblemReportListFilters,
  type ProblemReportUpdateResult,
  type ReportStatus,
  type ServiceErrorCode,
  type ServiceMeta,
  type ServiceResult,
  type Stall,
  type StallListFilters,
  type SyncEvent,
  type SyncEventListFilters,
  type SystemHealth,
  type UpdateProblemReportInput,
  type User,
  type UserDetail,
  type UserListFilters,
} from "./schemas";
import {
  type AdminService,
  type AdminServiceMethod,
  type MockAdminServiceOptions,
} from "./service";

const identifierSchema = z.string().trim().min(1).max(100);
const DEFAULT_LIST_LIMIT = 50;
const MAX_CONFIGURED_LATENCY_MS = 10_000;

const problemStatusTransitions: Record<ReportStatus, readonly ReportStatus[]> =
  {
    new: ["triaged", "in_progress"],
    triaged: ["new", "in_progress", "waiting_for_user", "resolved", "closed"],
    in_progress: ["triaged", "waiting_for_user", "resolved"],
    waiting_for_user: ["triaged", "in_progress", "resolved"],
    resolved: ["in_progress", "closed"],
    closed: ["triaged"],
  };

class MockServiceFault extends Error {
  constructor(
    readonly code: ServiceErrorCode,
    message: string,
    readonly retryable = false,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "MockServiceFault";
  }
}

const includesSearch = (
  search: string | undefined,
  values: readonly (string | null | undefined)[],
) => {
  if (!search) {
    return true;
  }

  const normalized = search.toLocaleLowerCase("en");
  return values.some((value) =>
    value?.toLocaleLowerCase("en").includes(normalized),
  );
};

const paginate = <T>(
  items: T[],
  query: { offset?: number; limit?: number },
): ListResult<T> => {
  const offset = query.offset ?? 0;
  const limit = query.limit ?? DEFAULT_LIST_LIMIT;
  const pageItems = items.slice(offset, offset + limit);

  return {
    items: pageItems,
    total: items.length,
    offset,
    limit,
    hasMore: offset + pageItems.length < items.length,
  };
};

const roundPercentage = (value: number) => Math.round(value * 10) / 10;
const isDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const auditRangeStart = (value: string | undefined) => {
  if (value === undefined) {
    return Number.NEGATIVE_INFINITY;
  }

  return Date.parse(isDateOnly(value) ? `${value}T00:00:00.000+08:00` : value);
};
const auditRangeEnd = (value: string | undefined) => {
  if (value === undefined) {
    return Number.POSITIVE_INFINITY;
  }

  return Date.parse(isDateOnly(value) ? `${value}T23:59:59.999+08:00` : value);
};

export class MockAdminService implements AdminService {
  private readonly scenario: MockScenario;
  private readonly latencyMs: number;
  private readonly data;
  private requestCounter = 0;
  private mutationCounter = 0;

  constructor(private readonly options: MockAdminServiceOptions = {}) {
    this.scenario = mockScenarioSchema.parse(options.scenario ?? "normal");

    const configuredLatency =
      options.latencyMs ?? (this.scenario === "slow" ? 250 : 0);
    if (
      !Number.isInteger(configuredLatency) ||
      configuredLatency < 0 ||
      configuredLatency > MAX_CONFIGURED_LATENCY_MS
    ) {
      throw new RangeError(
        `latencyMs must be an integer between 0 and ${MAX_CONFIGURED_LATENCY_MS}`,
      );
    }

    this.latencyMs = configuredLatency;
    this.data = createMockAdminData(this.scenario);
  }

  getDashboardSummary(): Promise<ServiceResult<DashboardSummary>> {
    return this.execute(
      "getDashboardSummary",
      z.undefined(),
      undefined,
      dashboardSummarySchema,
      () => {
        const users = this.emptyIfRequested(this.data.users);
        const businesses = this.emptyIfRequested(this.data.businesses);
        const stalls = this.emptyIfRequested(this.data.stalls);
        const devices = this.emptyIfRequested(this.data.devices);
        const syncEvents = this.emptyIfRequested(this.data.syncEvents);
        const reports = this.emptyIfRequested(this.data.problemReports);
        const versions = this.emptyIfRequested(this.data.appVersions);
        const auditEvents = this.emptyIfRequested(this.data.auditEvents);
        const completedSyncs = syncEvents.filter(
          (event) => event.status !== "pending",
        );
        const successfulSyncs = completedSyncs.filter(
          (event) => event.status === "success",
        );

        return {
          registeredUsers: users.length,
          activeBusinesses: businesses.filter(
            (business) => business.status === "active",
          ).length,
          activeStalls: stalls.filter((stall) => stall.status === "active")
            .length,
          connectedSellerDevices: devices.filter(
            (device) => device.status === "active",
          ).length,
          syncRecordsProcessed: successfulSyncs.reduce(
            (sum, event) => sum + event.recordsProcessed,
            0,
          ),
          syncSuccessRate:
            completedSyncs.length === 0
              ? 0
              : roundPercentage(
                  (successfulSyncs.length / completedSyncs.length) * 100,
                ),
          failedSyncAttempts: completedSyncs.filter(
            (event) => event.status === "failed",
          ).length,
          unresolvedProblemReports: reports.filter(
            (report) =>
              report.status !== "resolved" && report.status !== "closed",
          ).length,
          versionDistribution: versions.map((version) => {
            const deviceCount = devices.filter(
              (device) => device.appVersionId === version.id,
            ).length;

            return {
              appVersionId: version.id,
              versionName: version.versionName,
              deviceCount,
              percentage:
                devices.length === 0
                  ? 0
                  : roundPercentage((deviceCount / devices.length) * 100),
              outdated: !version.isSupported,
            };
          }),
          recentActivity: [...auditEvents]
            .sort((left, right) =>
              right.occurredAt.localeCompare(left.occurredAt),
            )
            .slice(0, 10),
          generatedAt:
            this.scenario === "stale_data"
              ? this.data.systemHealth.checkedAt
              : MOCK_CLOCK_ISO,
        };
      },
    );
  }

  listUsers(
    filters: UserListFilters = {},
  ): Promise<ServiceResult<ListResult<User>>> {
    return this.execute(
      "listUsers",
      userListFiltersSchema,
      filters,
      listResultSchema(userSchema),
      (query) => {
        const users = this.emptyIfRequested(this.data.users).filter((user) => {
          const inBusiness =
            query.businessId === undefined ||
            this.data.memberships.some(
              (membership) =>
                membership.userId === user.id &&
                membership.businessId === query.businessId,
            );

          return (
            includesSearch(query.search, [
              user.id,
              user.displayName,
              user.emailMasked,
              ...user.businessNames,
            ]) &&
            (query.role === undefined ||
              user.membershipRoles.includes(query.role)) &&
            (query.accountStatus === undefined ||
              user.accountStatus === query.accountStatus) &&
            inBusiness &&
            (query.appVersionId === undefined ||
              user.currentAppVersionId === query.appVersionId)
          );
        });

        return paginate(users, query);
      },
    );
  }

  getUser(userId: string): Promise<ServiceResult<UserDetail>> {
    return this.execute(
      "getUser",
      identifierSchema,
      userId,
      userDetailSchema,
      (id) => {
        const user =
          this.scenario === "empty"
            ? undefined
            : this.data.users.find((candidate) => candidate.id === id);
        if (!user) {
          throw this.notFound("User", id);
        }

        const memberships = this.data.memberships.filter(
          (membership) => membership.userId === id,
        );
        const businessIds = new Set(
          memberships.map((membership) => membership.businessId),
        );

        return {
          user,
          memberships,
          businesses: this.data.businesses.filter((business) =>
            businessIds.has(business.id),
          ),
          devices: this.data.devices.filter((device) => device.userId === id),
          recentSyncEvents: this.data.syncEvents
            .filter((event) => event.userId === id)
            .slice(0, 20),
          problemReports: this.data.problemReports.filter(
            (report) => report.userId === id,
          ),
        };
      },
    );
  }

  listBusinesses(
    filters: BusinessListFilters = {},
  ): Promise<ServiceResult<ListResult<Business>>> {
    return this.execute(
      "listBusinesses",
      businessListFiltersSchema,
      filters,
      listResultSchema(businessSchema),
      (query) =>
        paginate(
          this.emptyIfRequested(this.data.businesses).filter(
            (business) =>
              includesSearch(query.search, [
                business.id,
                business.name,
                business.ownerName,
                business.type,
              ]) &&
              (query.type === undefined || business.type === query.type) &&
              (query.status === undefined ||
                business.status === query.status) &&
              (query.syncHealth === undefined ||
                business.syncHealth === query.syncHealth),
          ),
          query,
        ),
    );
  }

  getBusiness(businessId: string): Promise<ServiceResult<BusinessDetail>> {
    return this.execute(
      "getBusiness",
      identifierSchema,
      businessId,
      businessDetailSchema,
      (id) => {
        const business =
          this.scenario === "empty"
            ? undefined
            : this.data.businesses.find((candidate) => candidate.id === id);
        if (!business) {
          throw this.notFound("Business", id);
        }

        const owner = this.data.users.find(
          (user) => user.id === business.ownerUserId,
        );
        if (!owner) {
          throw new MockServiceFault(
            "UNKNOWN",
            "The mock business owner relationship is invalid.",
          );
        }

        const devices = this.data.devices.filter(
          (device) => device.businessId === id,
        );
        const versionIds = new Set(
          devices.map((device) => device.appVersionId),
        );

        return {
          business,
          owner,
          memberships: this.data.memberships.filter(
            (membership) => membership.businessId === id,
          ),
          stalls: this.data.stalls.filter((stall) => stall.businessId === id),
          devices,
          appVersions: this.data.appVersions.filter((version) =>
            versionIds.has(version.id),
          ),
          recentSyncEvents: this.data.syncEvents
            .filter((event) => event.businessId === id)
            .slice(0, 30),
          problemReports: this.data.problemReports.filter(
            (report) => report.businessId === id,
          ),
          auditEvents: this.data.auditEvents.filter(
            (event) => event.businessId === id,
          ),
        };
      },
    );
  }

  listStalls(
    filters: StallListFilters = {},
  ): Promise<ServiceResult<ListResult<Stall>>> {
    return this.execute(
      "listStalls",
      stallListFiltersSchema,
      filters,
      listResultSchema(stallSchema),
      (query) =>
        paginate(
          this.emptyIfRequested(this.data.stalls).filter((stall) => {
            const business = this.data.businesses.find(
              (candidate) => candidate.id === stall.businessId,
            );
            return (
              includesSearch(query.search, [
                stall.id,
                stall.name,
                stall.locationLabel,
                business?.name,
              ]) &&
              (query.businessId === undefined ||
                stall.businessId === query.businessId) &&
              (query.status === undefined || stall.status === query.status)
            );
          }),
          query,
        ),
    );
  }

  listDevices(
    filters: DeviceListFilters = {},
  ): Promise<ServiceResult<ListResult<Device>>> {
    return this.execute(
      "listDevices",
      deviceListFiltersSchema,
      filters,
      listResultSchema(deviceSchema),
      (query) =>
        paginate(
          this.emptyIfRequested(this.data.devices).filter((device) => {
            const business = this.data.businesses.find(
              (candidate) => candidate.id === device.businessId,
            );
            const user = this.data.users.find(
              (candidate) => candidate.id === device.userId,
            );

            return (
              includesSearch(query.search, [
                device.id,
                device.deviceIdentifierMasked,
                device.manufacturer,
                device.model,
                device.appVersionName,
                business?.name,
                user?.displayName,
              ]) &&
              (query.status === undefined || device.status === query.status) &&
              (query.performanceTier === undefined ||
                device.performanceTier === query.performanceTier) &&
              (query.businessId === undefined ||
                device.businessId === query.businessId) &&
              (query.stallId === undefined ||
                device.stallId === query.stallId) &&
              (query.userId === undefined || device.userId === query.userId) &&
              (query.appVersionId === undefined ||
                device.appVersionId === query.appVersionId) &&
              (query.syncState === undefined ||
                device.syncState === query.syncState)
            );
          }),
          query,
        ),
    );
  }

  listSyncEvents(
    filters: SyncEventListFilters = {},
  ): Promise<ServiceResult<ListResult<SyncEvent>>> {
    return this.execute(
      "listSyncEvents",
      syncEventListFiltersSchema,
      filters,
      listResultSchema(syncEventSchema),
      (query) =>
        paginate(
          this.emptyIfRequested(this.data.syncEvents).filter(
            (event) =>
              includesSearch(query.search, [
                event.id,
                event.correlationId,
                event.deviceIdentifierMasked,
                event.businessName,
                event.stallName,
                event.appVersionName,
                event.errorType,
              ]) &&
              (query.state === undefined || event.state === query.state) &&
              (query.status === undefined || event.status === query.status) &&
              (query.retryState === undefined ||
                event.retryState === query.retryState) &&
              (query.businessId === undefined ||
                event.businessId === query.businessId) &&
              (query.stallId === undefined ||
                event.stallId === query.stallId) &&
              (query.deviceId === undefined ||
                event.deviceId === query.deviceId) &&
              (query.appVersionId === undefined ||
                event.appVersionId === query.appVersionId) &&
              (query.conflictStatus === undefined ||
                event.conflictStatus === query.conflictStatus) &&
              (query.errorType === undefined ||
                event.errorType === query.errorType),
          ),
          query,
        ),
    );
  }

  listProblemReports(
    filters: ProblemReportListFilters = {},
  ): Promise<ServiceResult<ListResult<ProblemReport>>> {
    return this.execute(
      "listProblemReports",
      problemReportListFiltersSchema,
      filters,
      listResultSchema(problemReportSchema),
      (query) =>
        paginate(
          this.emptyIfRequested(this.data.problemReports).filter(
            (report) =>
              includesSearch(query.search, [
                report.id,
                report.title,
                report.description,
                report.userName,
                report.businessName,
                report.deviceIdentifierMasked,
                report.appVersionName,
                report.assignedAdminName,
              ]) &&
              (query.severity === undefined ||
                report.severity === query.severity) &&
              (query.category === undefined ||
                report.category === query.category) &&
              (query.status === undefined || report.status === query.status) &&
              (query.userId === undefined || report.userId === query.userId) &&
              (query.businessId === undefined ||
                report.businessId === query.businessId) &&
              (query.deviceId === undefined ||
                report.deviceId === query.deviceId) &&
              (query.assignedAdminId === undefined ||
                report.assignedAdminId === query.assignedAdminId),
          ),
          query,
        ),
    );
  }

  getProblemReport(
    reportId: string,
  ): Promise<ServiceResult<ProblemReportDetail>> {
    return this.execute(
      "getProblemReport",
      identifierSchema,
      reportId,
      problemReportDetailSchema,
      (id) => {
        const report =
          this.scenario === "empty"
            ? undefined
            : this.data.problemReports.find((candidate) => candidate.id === id);
        if (!report) {
          throw this.notFound("Problem report", id);
        }

        const user = this.data.users.find(
          (candidate) => candidate.id === report.userId,
        );
        const business = this.data.businesses.find(
          (candidate) => candidate.id === report.businessId,
        );
        const appVersion = this.data.appVersions.find(
          (candidate) => candidate.id === report.appVersionId,
        );
        if (!user || !business || !appVersion) {
          throw new MockServiceFault(
            "UNKNOWN",
            "The mock problem report relationships are invalid.",
          );
        }

        return {
          report,
          user,
          business,
          device:
            this.data.devices.find(
              (candidate) => candidate.id === report.deviceId,
            ) ?? null,
          appVersion,
          relatedSyncEvent:
            this.data.syncEvents.find(
              (candidate) => candidate.id === report.relatedSyncEventId,
            ) ?? null,
        };
      },
    );
  }

  updateProblemReportMock(
    input: UpdateProblemReportInput,
  ): Promise<ServiceResult<ProblemReportUpdateResult>> {
    return this.execute(
      "updateProblemReportMock",
      updateProblemReportInputSchema,
      input,
      problemReportUpdateResultSchema,
      (update) => {
        if (update.actor.role === "operations_viewer") {
          throw new MockServiceFault(
            "FORBIDDEN",
            "The operations viewer role cannot update problem reports.",
          );
        }

        const report = this.data.problemReports.find(
          (candidate) => candidate.id === update.reportId,
        );
        if (!report || this.scenario === "empty") {
          throw this.notFound("Problem report", update.reportId);
        }

        if (
          update.status !== undefined &&
          update.status !== report.status &&
          !problemStatusTransitions[report.status].includes(update.status)
        ) {
          throw new MockServiceFault(
            "CONFLICT",
            `Problem report status cannot move from ${report.status} to ${update.status}.`,
            false,
            { currentStatus: report.status, requestedStatus: update.status },
          );
        }

        const assignedAdmin =
          update.assignedAdminId === undefined ||
          update.assignedAdminId === null
            ? null
            : this.data.administrators.find(
                (administrator) =>
                  administrator.id === update.assignedAdminId &&
                  administrator.status === "active",
              );
        if (
          update.assignedAdminId !== undefined &&
          update.assignedAdminId !== null &&
          !assignedAdmin
        ) {
          throw new MockServiceFault(
            "VALIDATION_ERROR",
            "The assigned administrator must reference an active mock administrator.",
            false,
            { assignedAdminId: update.assignedAdminId },
          );
        }

        const nextStatus = update.status ?? report.status;
        const nextResolution =
          update.resolution === undefined
            ? report.resolution
            : update.resolution;
        if (
          (nextStatus === "resolved" || nextStatus === "closed") &&
          nextResolution === null
        ) {
          throw new MockServiceFault(
            "VALIDATION_ERROR",
            "A resolution is required before resolving or closing a report.",
          );
        }
        if (
          update.resolution !== undefined &&
          update.resolution !== null &&
          nextStatus !== "resolved" &&
          nextStatus !== "closed"
        ) {
          throw new MockServiceFault(
            "VALIDATION_ERROR",
            "Resolution text can only be set on a resolved or closed report.",
          );
        }

        const assignmentChanges =
          update.assignedAdminId !== undefined &&
          update.assignedAdminId !== report.assignedAdminId;
        const changes =
          (update.status !== undefined && update.status !== report.status) ||
          (update.severity !== undefined &&
            update.severity !== report.severity) ||
          assignmentChanges ||
          update.internalNote !== undefined ||
          (update.resolution !== undefined &&
            update.resolution !== report.resolution);
        if (!changes) {
          throw new MockServiceFault(
            "VALIDATION_ERROR",
            "The update does not change the problem report.",
          );
        }

        this.mutationCounter += 1;
        const mutationTimestamp = new Date(
          Date.parse(MOCK_CLOCK_ISO) + this.mutationCounter * 60_000,
        ).toISOString();
        const beforeState = {
          status: report.status,
          severity: report.severity,
          assignedAdminId: report.assignedAdminId,
          resolutionProvided: report.resolution !== null,
          internalNoteCount: report.internalNotes.length,
        };

        if (update.status !== undefined) {
          report.status = update.status;
        }
        if (update.severity !== undefined) {
          report.severity = update.severity;
        }
        if (update.assignedAdminId !== undefined) {
          report.assignedAdminId = update.assignedAdminId;
          report.assignedAdminName = assignedAdmin?.displayName ?? null;
        }
        if (update.resolution !== undefined) {
          report.resolution = update.resolution;
        }
        if (update.internalNote !== undefined) {
          report.internalNotes.push({
            id: `note-mutation-${String(this.mutationCounter).padStart(4, "0")}`,
            reportId: report.id,
            authorAdminId: update.actor.id,
            authorName: update.actor.displayName,
            body: update.internalNote,
            createdAt: mutationTimestamp,
          });
        }
        report.updatedAt = mutationTimestamp;
        const relatedDevice =
          this.data.devices.find((device) => device.id === report.deviceId) ??
          null;
        const relatedVersion =
          this.data.appVersions.find(
            (version) => version.id === report.appVersionId,
          ) ?? null;

        const auditEvent: AuditEvent = {
          id: `audit-mutation-${String(this.mutationCounter).padStart(4, "0")}`,
          actorUserId: update.actor.id,
          actorName: update.actor.displayName,
          actorRole: update.actor.role,
          action:
            update.status === "resolved"
              ? "problem_report.resolved"
              : "problem_report.updated",
          targetType: "problem_report",
          targetId: report.id,
          targetLabel: report.title,
          businessId: report.businessId,
          stallId: relatedDevice?.stallId ?? null,
          reasonCode:
            update.status === "resolved"
              ? "support_case_resolution"
              : "support_case_update",
          reasonNote: update.reason,
          beforeState,
          afterState: {
            status: report.status,
            severity: report.severity,
            assignedAdminId: report.assignedAdminId,
            resolutionProvided: report.resolution !== null,
            internalNoteCount: report.internalNotes.length,
          },
          outcome: "succeeded",
          occurredAt: mutationTimestamp,
          sourceIpMasked: "203.0.113.***",
          deviceId: report.deviceId,
          appVersionCode: relatedVersion?.versionCode ?? null,
          correlationId: `corr-mutation-${String(this.mutationCounter).padStart(
            5,
            "0",
          )}`,
        };
        this.data.auditEvents.unshift(auditEvent);

        return { report, auditEvent };
      },
    );
  }

  listAppVersions(
    filters: AppVersionListFilters = {},
  ): Promise<ServiceResult<ListResult<AppVersion>>> {
    return this.execute(
      "listAppVersions",
      appVersionListFiltersSchema,
      filters,
      listResultSchema(appVersionSchema),
      (query) =>
        paginate(
          this.emptyIfRequested(this.data.appVersions).filter(
            (version) =>
              includesSearch(query.search, [
                version.id,
                version.versionName,
                version.releaseChannel,
              ]) &&
              (query.releaseChannel === undefined ||
                version.releaseChannel === query.releaseChannel) &&
              (query.supported === undefined ||
                version.isSupported === query.supported) &&
              (query.outdatedOnly !== true || version.outdatedDeviceCount > 0),
          ),
          query,
        ),
    );
  }

  listAuditEvents(
    filters: AuditEventListFilters = {},
  ): Promise<ServiceResult<ListResult<AuditEvent>>> {
    return this.execute(
      "listAuditEvents",
      auditEventListFiltersSchema,
      filters,
      listResultSchema(auditEventSchema),
      (query) => {
        const from = auditRangeStart(query.from);
        const to = auditRangeEnd(query.to);

        return paginate(
          this.emptyIfRequested(this.data.auditEvents)
            .filter(
              (event) =>
                includesSearch(query.search, [
                  event.id,
                  event.actorName,
                  event.action,
                  event.targetLabel,
                  event.reasonCode,
                  event.reasonNote,
                  event.correlationId,
                ]) &&
                (query.actorRole === undefined ||
                  event.actorRole === query.actorRole) &&
                (query.action === undefined || event.action === query.action) &&
                (query.targetType === undefined ||
                  event.targetType === query.targetType) &&
                (query.outcome === undefined ||
                  event.outcome === query.outcome) &&
                Date.parse(event.occurredAt) >= from &&
                Date.parse(event.occurredAt) <= to,
            )
            .sort((left, right) =>
              right.occurredAt.localeCompare(left.occurredAt),
            ),
          query,
        );
      },
    );
  }

  listAdministrators(
    filters: AdministratorListFilters = {},
  ): Promise<ServiceResult<ListResult<Administrator>>> {
    return this.execute(
      "listAdministrators",
      administratorListFiltersSchema,
      filters,
      listResultSchema(administratorSchema),
      (query) =>
        paginate(
          this.emptyIfRequested(this.data.administrators).filter(
            (administrator) =>
              includesSearch(query.search, [
                administrator.id,
                administrator.displayName,
                administrator.emailMasked,
              ]) &&
              (query.role === undefined || administrator.role === query.role) &&
              (query.status === undefined ||
                administrator.status === query.status),
          ),
          query,
        ),
    );
  }

  getSystemHealth(): Promise<ServiceResult<SystemHealth>> {
    return this.execute(
      "getSystemHealth",
      z.undefined(),
      undefined,
      systemHealthSchema,
      () => this.data.systemHealth,
    );
  }

  private emptyIfRequested<T>(items: T[]): T[] {
    return this.scenario === "empty" ? [] : items;
  }

  private notFound(entity: string, id: string): MockServiceFault {
    return new MockServiceFault(
      "NOT_FOUND",
      `${entity} ${id} was not found in mock data.`,
      false,
      { id },
    );
  }

  private nextMeta(): ServiceMeta {
    this.requestCounter += 1;
    const currentTime =
      Date.parse(MOCK_CLOCK_ISO) +
      this.requestCounter * 1_000 -
      (this.scenario === "stale_data" ? 24 * 60 * 60 * 1_000 : 0);

    return {
      requestId: `mock-${this.scenario}-${String(this.requestCounter).padStart(
        6,
        "0",
      )}`,
      source: "mock",
      generatedAt: new Date(currentTime).toISOString(),
      scenario: this.scenario,
      stale: this.scenario === "stale_data",
      latencyMs: this.latencyMs,
      warnings: this.scenarioWarnings(),
    };
  }

  private scenarioWarnings(): string[] {
    switch (this.scenario) {
      case "partial_failure":
        return ["Some mock service methods are intentionally unavailable."];
      case "maintenance":
        return ["The mock platform is in maintenance mode."];
      case "stale_data":
        return ["Mock responses represent data that is 24 hours old."];
      case "high_sync_failure":
        return ["A deterministic synchronization failure spike is active."];
      case "outdated_version_spike":
        return ["A deterministic outdated-version spike is active."];
      default:
        return [];
    }
  }

  private scenarioFault(method: AdminServiceMethod): MockServiceFault | null {
    const controlledFailure = this.options.failure;
    if (controlledFailure?.methods.includes(method)) {
      return new MockServiceFault(
        controlledFailure.code ?? "SERVICE_UNAVAILABLE",
        controlledFailure.message ??
          `A controlled mock failure was requested for ${method}.`,
        controlledFailure.retryable ?? true,
        { method, controlled: true },
      );
    }

    if (this.scenario === "backend_unavailable") {
      return new MockServiceFault(
        "SERVICE_UNAVAILABLE",
        "The mock administrative backend is unavailable.",
        true,
        { method },
      );
    }
    if (this.scenario === "permission_denied") {
      return new MockServiceFault(
        "FORBIDDEN",
        "The current mock scenario denies this operation.",
        false,
        { method },
      );
    }
    if (this.scenario === "maintenance" && method !== "getSystemHealth") {
      return new MockServiceFault(
        "MAINTENANCE",
        "The mock platform is currently in maintenance mode.",
        true,
        { method },
      );
    }
    if (
      this.scenario === "partial_failure" &&
      (method === "listSyncEvents" || method === "listProblemReports")
    ) {
      return new MockServiceFault(
        "SERVICE_UNAVAILABLE",
        `${method} is intentionally unavailable in the partial-failure scenario.`,
        true,
        { method, partial: true },
      );
    }

    return null;
  }

  private async execute<Input, Output>(
    method: AdminServiceMethod,
    inputSchema: z.ZodType<Input>,
    input: unknown,
    outputSchema: z.ZodType<Output>,
    operation: (validatedInput: Input) => Output,
  ): Promise<ServiceResult<Output>> {
    const meta = this.nextMeta();
    if (this.latencyMs > 0) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, this.latencyMs);
      });
    }

    const inputResult = inputSchema.safeParse(input);
    if (!inputResult.success) {
      return this.failureResult(outputSchema, meta, {
        code: "VALIDATION_ERROR",
        message: `Invalid input for ${method}.`,
        retryable: false,
        details: {
          issues: inputResult.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      });
    }

    const scenarioFault = this.scenarioFault(method);
    if (scenarioFault) {
      return this.failureResult(outputSchema, meta, scenarioFault);
    }

    try {
      const data = outputSchema.parse(operation(inputResult.data));
      return serviceResultSchema(outputSchema).parse({
        ok: true,
        data,
        meta,
      }) as ServiceResult<Output>;
    } catch (error: unknown) {
      if (error instanceof MockServiceFault) {
        return this.failureResult(outputSchema, meta, error);
      }

      return this.failureResult(outputSchema, meta, {
        code: "UNKNOWN",
        message: "The mock service produced an invalid response.",
        retryable: false,
        details:
          error instanceof z.ZodError
            ? {
                issues: error.issues.map((issue) => ({
                  path: issue.path.join("."),
                  message: issue.message,
                })),
              }
            : undefined,
      });
    }
  }

  private failureResult<Output>(
    outputSchema: z.ZodType<Output>,
    meta: ServiceMeta,
    error: {
      code: ServiceErrorCode;
      message: string;
      retryable: boolean;
      details?: Record<string, unknown>;
    },
  ): ServiceResult<Output> {
    return serviceResultSchema(outputSchema).parse({
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        retryable: error.retryable,
        correlationId: meta.requestId,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
      meta,
    }) as ServiceResult<Output>;
  }
}

export const createMockAdminService = (
  options: MockAdminServiceOptions = {},
): AdminService => new MockAdminService(options);
