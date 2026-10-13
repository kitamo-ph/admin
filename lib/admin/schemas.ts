import { z } from "zod";

const idSchema = z.string().trim().min(1).max(100);
const displayNameSchema = z.string().trim().min(1).max(160);
export const utcDateTimeSchema = z
  .string()
  .datetime({ offset: false })
  .regex(/Z$/, "Timestamp must be normalized to UTC with a Z suffix");
const isoDateOrDateTimeSchema = z.union([z.string().date(), utcDateTimeSchema]);
const nullableIsoDateTimeSchema = utcDateTimeSchema.nullable();
const maskedEmailSchema = z
  .string()
  .trim()
  .min(5)
  .max(254)
  .regex(/\*/, "Email addresses must be masked");
const maskedIpAddressSchema = z
  .string()
  .trim()
  .min(7)
  .max(64)
  .regex(/\*/, "IP addresses must be masked");
const maskedDeviceIdentifierSchema = z
  .string()
  .trim()
  .min(5)
  .max(100)
  .regex(/\*/, "Device identifiers must be masked");

export const ianaTimezoneSchema = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value }).format();
      return true;
    } catch {
      return false;
    }
  }, "Timezone must be a valid IANA timezone");

export const adminRoleSchema = z.enum([
  "super_admin",
  "support_admin",
  "operations_viewer",
]);

export const administratorStatusSchema = z.enum(["active", "inactive"]);

export const administratorSchema = z
  .object({
    id: idSchema,
    displayName: displayNameSchema,
    emailMasked: maskedEmailSchema,
    role: adminRoleSchema,
    status: administratorStatusSchema,
  })
  .strict();

export const accountStatusSchema = z.enum([
  "active",
  "invited",
  "suspended",
  "disabled",
]);

export const membershipRoleSchema = z.enum(["owner", "manager", "seller"]);
export const membershipStatusSchema = z.enum(["active", "inactive", "invited"]);

export const userSchema = z
  .object({
    id: idSchema,
    displayName: displayNameSchema,
    emailMasked: maskedEmailSchema,
    accountStatus: accountStatusSchema,
    membershipRoles: z.array(membershipRoleSchema),
    businessNames: z.array(z.string().trim().min(1).max(180)),
    businessMembershipCount: z.number().int().nonnegative(),
    deviceCount: z.number().int().nonnegative(),
    currentAppVersionId: idSchema.nullable(),
    currentAppVersionName: z.string().trim().min(1).max(60).nullable(),
    supportHistoryCount: z.number().int().nonnegative(),
    createdAt: utcDateTimeSchema,
    lastActiveAt: nullableIsoDateTimeSchema,
  })
  .strict();

export const membershipSchema = z
  .object({
    id: idSchema,
    userId: idSchema,
    userName: displayNameSchema,
    businessId: idSchema,
    businessName: z.string().trim().min(1).max(180),
    stallId: idSchema.nullable(),
    stallName: z.string().trim().min(1).max(180).nullable(),
    role: membershipRoleSchema,
    status: membershipStatusSchema,
    joinedAt: utcDateTimeSchema,
  })
  .strict();

export const businessStatusSchema = z.enum([
  "active",
  "inactive",
  "suspended",
  "under_review",
]);
export const syncHealthStatusSchema = z.enum([
  "healthy",
  "degraded",
  "critical",
  "unknown",
]);
export const businessTypeSchema = z.enum([
  "sari_sari_store",
  "karinderia",
  "market_vendor",
  "kiosk",
  "food_seller",
  "other",
]);

export const businessSchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1).max(180),
    type: businessTypeSchema,
    ownerUserId: idSchema,
    ownerName: displayNameSchema,
    timezone: ianaTimezoneSchema,
    status: businessStatusSchema,
    syncHealth: syncHealthStatusSchema,
    stallCount: z.number().int().nonnegative(),
    sellerCount: z.number().int().nonnegative(),
    connectedDeviceCount: z.number().int().nonnegative(),
    createdAt: utcDateTimeSchema,
    lastActivityAt: nullableIsoDateTimeSchema,
  })
  .strict();

export const stallStatusSchema = z.enum(["active", "inactive"]);

export const stallSchema = z
  .object({
    id: idSchema,
    businessId: idSchema,
    businessName: z.string().trim().min(1).max(180),
    name: z.string().trim().min(1).max(180),
    locationLabel: z.string().trim().min(1).max(180),
    status: stallStatusSchema,
    createdAt: utcDateTimeSchema,
    lastActivityAt: nullableIsoDateTimeSchema,
  })
  .strict();

export const deviceStatusSchema = z.enum(["active", "inactive"]);
export const devicePerformanceTierSchema = z.enum([
  "low_end",
  "mid_range",
  "high_end",
]);
export const syncStateSchema = z.enum([
  "healthy",
  "pending",
  "retrying",
  "failed",
  "stale",
  "conflict",
]);

export const deviceSchema = z
  .object({
    id: idSchema,
    deviceIdentifierMasked: maskedDeviceIdentifierSchema,
    userId: idSchema,
    businessId: idSchema,
    businessName: z.string().trim().min(1).max(180),
    stallId: idSchema.nullable(),
    stallName: z.string().trim().min(1).max(180).nullable(),
    manufacturer: z.string().trim().min(1).max(100),
    model: z.string().trim().min(1).max(120),
    androidVersion: z.string().trim().min(1).max(40),
    performanceTier: devicePerformanceTierSchema,
    status: deviceStatusSchema,
    appVersionId: idSchema,
    appVersionName: z.string().trim().min(1).max(60),
    lastSuccessfulSyncAt: nullableIsoDateTimeSchema,
    syncState: syncStateSchema,
    registeredAt: utcDateTimeSchema,
    lastSeenAt: nullableIsoDateTimeSchema,
  })
  .strict();

export const syncStatusSchema = z.enum(["success", "failed", "pending"]);
export const retryStateSchema = z.enum([
  "not_required",
  "scheduled",
  "in_progress",
  "exhausted",
]);
export const conflictStatusSchema = z.enum(["none", "detected", "resolved"]);
export const syncErrorTypeSchema = z.enum([
  "network_timeout",
  "authentication_expired",
  "payload_validation",
  "version_unsupported",
  "conflict",
  "server_unavailable",
]);
export const syncEventNameSchema = z.enum([
  "sync.started",
  "sync.completed",
  "sync.failed",
  "sync.conflict_detected",
]);

export const syncEventSchema = z
  .object({
    id: idSchema,
    eventName: syncEventNameSchema,
    deviceId: idSchema,
    deviceIdentifierMasked: maskedDeviceIdentifierSchema,
    userId: idSchema,
    businessId: idSchema,
    businessName: z.string().trim().min(1).max(180),
    stallId: idSchema.nullable(),
    stallName: z.string().trim().min(1).max(180).nullable(),
    appVersionId: idSchema,
    appVersionName: z.string().trim().min(1).max(60),
    appVersionCode: z.number().int().positive(),
    platform: z.literal("android"),
    source: z.literal("android_client"),
    state: syncStateSchema,
    status: syncStatusSchema,
    retryState: retryStateSchema,
    occurredAt: utcDateTimeSchema,
    syncedAt: nullableIsoDateTimeSchema,
    errorType: syncErrorTypeSchema.nullable(),
    conflictStatus: conflictStatusSchema,
    recordsProcessed: z.number().int().nonnegative(),
    ipAddressMasked: maskedIpAddressSchema,
    correlationId: idSchema,
  })
  .strict();

export const reportSeveritySchema = z.enum([
  "low",
  "medium",
  "high",
  "critical",
]);
export const reportCategorySchema = z.enum([
  "synchronization",
  "account_access",
  "device_performance",
  "app_crash",
  "data_conflict",
  "other",
]);
export const reportStatusSchema = z.enum([
  "new",
  "triaged",
  "in_progress",
  "waiting_for_user",
  "resolved",
  "closed",
]);

export const internalNoteSchema = z
  .object({
    id: idSchema,
    reportId: idSchema,
    authorAdminId: idSchema,
    authorName: displayNameSchema,
    body: z.string().trim().min(1).max(2_000),
    createdAt: utcDateTimeSchema,
  })
  .strict();

export const problemReportSchema = z
  .object({
    id: idSchema,
    title: z.string().trim().min(1).max(180),
    description: z.string().trim().min(1).max(2_000),
    severity: reportSeveritySchema,
    category: reportCategorySchema,
    status: reportStatusSchema,
    userId: idSchema,
    userName: displayNameSchema,
    businessId: idSchema,
    businessName: z.string().trim().min(1).max(180),
    deviceId: idSchema.nullable(),
    deviceIdentifierMasked: maskedDeviceIdentifierSchema.nullable(),
    appVersionId: idSchema,
    appVersionName: z.string().trim().min(1).max(60),
    relatedSyncEventId: idSchema.nullable(),
    submittedAt: utcDateTimeSchema,
    updatedAt: utcDateTimeSchema,
    assignedAdminId: idSchema.nullable(),
    assignedAdminName: displayNameSchema.nullable(),
    internalNotes: z.array(internalNoteSchema),
    resolution: z.string().trim().min(1).max(2_000).nullable(),
  })
  .strict();

export const releaseChannelSchema = z.enum([
  "internal",
  "closed",
  "open",
  "production",
]);

export const appVersionSchema = z
  .object({
    id: idSchema,
    versionName: z.string().trim().min(1).max(60),
    versionCode: z.number().int().positive(),
    releaseChannel: releaseChannelSchema,
    releasedAt: utcDateTimeSchema,
    activeInstalls: z.number().int().nonnegative(),
    activeDeviceCount: z.number().int().nonnegative(),
    outdatedDeviceCount: z.number().int().nonnegative(),
    issueCount: z.number().int().nonnegative(),
    crashIndicator: z.enum(["none", "elevated", "critical"]),
    minimumSupportedVersion: z.string().trim().min(1).max(60),
    isMinimumSupported: z.boolean(),
    isSupported: z.boolean(),
  })
  .strict();

export const auditOutcomeSchema = z.enum(["succeeded", "denied", "failed"]);
export const auditTargetTypeSchema = z.enum([
  "user",
  "business",
  "problem_report",
  "sync_event",
  "app_version",
  "system",
]);
export const auditActionSchema = z.enum([
  "user.viewed",
  "business.viewed",
  "problem_report.reviewed",
  "problem_report.updated",
  "problem_report.resolved",
  "sync.inspected",
  "app_version.viewed",
  "system.health_checked",
]);
export const auditReasonCodeSchema = z.enum([
  "routine_review",
  "support_case_update",
  "support_case_resolution",
  "policy_denied",
  "health_review",
]);
const auditStateValueSchema = z.union([
  z.string().trim().max(160),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);
export const auditStateSnapshotSchema = z
  .record(z.string().trim().min(1).max(80), auditStateValueSchema)
  .refine(
    (snapshot) => Object.keys(snapshot).length <= 20,
    "Audit state snapshots are limited to 20 allowlisted fields",
  );

export const auditEventSchema = z
  .object({
    id: idSchema,
    actorUserId: idSchema,
    actorName: displayNameSchema,
    actorRole: adminRoleSchema,
    action: auditActionSchema,
    targetType: auditTargetTypeSchema,
    targetId: idSchema,
    targetLabel: z.string().trim().min(1).max(180),
    businessId: idSchema.nullable(),
    stallId: idSchema.nullable(),
    reasonCode: auditReasonCodeSchema,
    reasonNote: z.string().trim().min(1).max(1_000),
    beforeState: auditStateSnapshotSchema.nullable(),
    afterState: auditStateSnapshotSchema.nullable(),
    outcome: auditOutcomeSchema,
    occurredAt: utcDateTimeSchema,
    sourceIpMasked: maskedIpAddressSchema,
    deviceId: idSchema.nullable(),
    appVersionCode: z.number().int().positive().nullable(),
    correlationId: idSchema,
  })
  .strict();

export const healthStatusSchema = z.enum([
  "healthy",
  "degraded",
  "outage",
  "maintenance",
]);

export const healthIndicatorSchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1).max(120),
    status: healthStatusSchema,
    latencyMs: z.number().int().nonnegative().nullable(),
    message: z.string().trim().min(1).max(500),
    checkedAt: utcDateTimeSchema,
  })
  .strict();

export const systemHealthSchema = z
  .object({
    overallStatus: healthStatusSchema,
    checkedAt: utcDateTimeSchema,
    maintenanceMode: z.boolean(),
    indicators: z.array(healthIndicatorSchema),
  })
  .strict();

export const versionDistributionItemSchema = z
  .object({
    appVersionId: idSchema,
    versionName: z.string().trim().min(1).max(60),
    deviceCount: z.number().int().nonnegative(),
    percentage: z.number().min(0).max(100),
    outdated: z.boolean(),
  })
  .strict();

export const dashboardSummarySchema = z
  .object({
    registeredUsers: z.number().int().nonnegative(),
    activeBusinesses: z.number().int().nonnegative(),
    activeStalls: z.number().int().nonnegative(),
    connectedSellerDevices: z.number().int().nonnegative(),
    syncRecordsProcessed: z.number().int().nonnegative(),
    syncSuccessRate: z.number().min(0).max(100),
    failedSyncAttempts: z.number().int().nonnegative(),
    unresolvedProblemReports: z.number().int().nonnegative(),
    versionDistribution: z.array(versionDistributionItemSchema),
    recentActivity: z.array(auditEventSchema),
    generatedAt: utcDateTimeSchema,
  })
  .strict();

export const userDetailSchema = z
  .object({
    user: userSchema,
    memberships: z.array(membershipSchema),
    businesses: z.array(businessSchema),
    devices: z.array(deviceSchema),
    recentSyncEvents: z.array(syncEventSchema),
    problemReports: z.array(problemReportSchema),
  })
  .strict();

export const businessDetailSchema = z
  .object({
    business: businessSchema,
    owner: userSchema,
    memberships: z.array(membershipSchema),
    stalls: z.array(stallSchema),
    devices: z.array(deviceSchema),
    appVersions: z.array(appVersionSchema),
    recentSyncEvents: z.array(syncEventSchema),
    problemReports: z.array(problemReportSchema),
    auditEvents: z.array(auditEventSchema),
  })
  .strict();

export const problemReportDetailSchema = z
  .object({
    report: problemReportSchema,
    user: userSchema,
    business: businessSchema,
    device: deviceSchema.nullable(),
    appVersion: appVersionSchema,
    relatedSyncEvent: syncEventSchema.nullable(),
  })
  .strict();

export const listQuerySchema = z
  .object({
    search: z.string().trim().max(160).optional(),
    offset: z.number().int().nonnegative().optional(),
    limit: z.number().int().min(1).max(1_000).optional(),
  })
  .strict();

export const userListFiltersSchema = listQuerySchema
  .extend({
    role: membershipRoleSchema.optional(),
    accountStatus: accountStatusSchema.optional(),
    businessId: idSchema.optional(),
    appVersionId: idSchema.optional(),
  })
  .strict();

export const businessListFiltersSchema = listQuerySchema
  .extend({
    type: businessTypeSchema.optional(),
    status: businessStatusSchema.optional(),
    syncHealth: syncHealthStatusSchema.optional(),
  })
  .strict();

export const stallListFiltersSchema = listQuerySchema
  .extend({
    businessId: idSchema.optional(),
    status: stallStatusSchema.optional(),
  })
  .strict();

export const deviceListFiltersSchema = listQuerySchema
  .extend({
    status: deviceStatusSchema.optional(),
    performanceTier: devicePerformanceTierSchema.optional(),
    businessId: idSchema.optional(),
    stallId: idSchema.optional(),
    userId: idSchema.optional(),
    appVersionId: idSchema.optional(),
    syncState: syncStateSchema.optional(),
  })
  .strict();

export const syncEventListFiltersSchema = listQuerySchema
  .extend({
    state: syncStateSchema.optional(),
    status: syncStatusSchema.optional(),
    retryState: retryStateSchema.optional(),
    businessId: idSchema.optional(),
    stallId: idSchema.optional(),
    deviceId: idSchema.optional(),
    appVersionId: idSchema.optional(),
    conflictStatus: conflictStatusSchema.optional(),
    errorType: syncErrorTypeSchema.optional(),
  })
  .strict();

export const problemReportListFiltersSchema = listQuerySchema
  .extend({
    severity: reportSeveritySchema.optional(),
    category: reportCategorySchema.optional(),
    status: reportStatusSchema.optional(),
    userId: idSchema.optional(),
    businessId: idSchema.optional(),
    deviceId: idSchema.optional(),
    assignedAdminId: idSchema.optional(),
  })
  .strict();

export const appVersionListFiltersSchema = listQuerySchema
  .extend({
    releaseChannel: releaseChannelSchema.optional(),
    supported: z.boolean().optional(),
    outdatedOnly: z.boolean().optional(),
  })
  .strict();

export const auditEventListFiltersSchema = listQuerySchema
  .extend({
    actorRole: adminRoleSchema.optional(),
    action: auditActionSchema.optional(),
    targetType: auditTargetTypeSchema.optional(),
    outcome: auditOutcomeSchema.optional(),
    from: isoDateOrDateTimeSchema.optional(),
    to: isoDateOrDateTimeSchema.optional(),
  })
  .strict()
  .superRefine((filters, context) => {
    if (
      filters.from !== undefined &&
      filters.to !== undefined &&
      Date.parse(filters.from) > Date.parse(filters.to)
    ) {
      context.addIssue({
        code: "custom",
        path: ["to"],
        message: "The end of the audit range must not precede the start",
      });
    }
  });

export const administratorListFiltersSchema = listQuerySchema
  .extend({
    role: adminRoleSchema.optional(),
    status: administratorStatusSchema.optional(),
  })
  .strict();

export const updateActorSchema = z
  .object({
    id: idSchema,
    displayName: displayNameSchema,
    role: adminRoleSchema,
  })
  .strict();

export const updateProblemReportInputSchema = z
  .object({
    reportId: idSchema,
    status: reportStatusSchema.optional(),
    severity: reportSeveritySchema.optional(),
    assignedAdminId: idSchema.nullable().optional(),
    internalNote: z.string().trim().min(3).max(2_000).optional(),
    resolution: z.string().trim().min(3).max(2_000).nullable().optional(),
    reason: z.string().trim().min(3).max(1_000),
    actor: updateActorSchema,
  })
  .strict()
  .superRefine((input, context) => {
    if (
      input.status === undefined &&
      input.severity === undefined &&
      input.assignedAdminId === undefined &&
      input.internalNote === undefined &&
      input.resolution === undefined
    ) {
      context.addIssue({
        code: "custom",
        message: "At least one problem report field must be updated",
      });
    }
  });

export const problemReportUpdateResultSchema = z
  .object({
    report: problemReportSchema,
    auditEvent: auditEventSchema,
  })
  .strict();

export const mockScenarioSchema = z.enum([
  "normal",
  "slow",
  "empty",
  "partial_failure",
  "backend_unavailable",
  "maintenance",
  "stale_data",
  "permission_denied",
  "high_sync_failure",
  "outdated_version_spike",
]);

export const serviceErrorCodeSchema = z.enum([
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_ERROR",
  "CONFLICT",
  "STALE_DATA",
  "TIMEOUT",
  "SERVICE_UNAVAILABLE",
  "MAINTENANCE",
  "NOT_AVAILABLE",
  "UNKNOWN",
]);

export const serviceErrorSchema = z
  .object({
    code: serviceErrorCodeSchema,
    message: z.string().trim().min(1).max(500),
    retryable: z.boolean(),
    correlationId: idSchema,
    details: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const serviceMetaSchema = z
  .object({
    requestId: idSchema,
    /** `core` is the R16 Core adapter (ADM-048); `mock` is fictional data. */
    source: z.enum(["mock", "core"]),
    generatedAt: utcDateTimeSchema,
    /** The mock scenario; null for the Core adapter. */
    scenario: mockScenarioSchema.nullable(),
    stale: z.boolean(),
    latencyMs: z.number().int().nonnegative(),
    warnings: z.array(z.string().trim().min(1).max(300)),
  })
  .strict();

export const listResultSchema = <T extends z.ZodType>(itemSchema: T) =>
  z
    .object({
      items: z.array(itemSchema),
      total: z.number().int().nonnegative(),
      offset: z.number().int().nonnegative(),
      limit: z.number().int().positive(),
      hasMore: z.boolean(),
    })
    .strict();

export const serviceResultSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.discriminatedUnion("ok", [
    z
      .object({
        ok: z.literal(true),
        data: dataSchema,
        meta: serviceMetaSchema,
      })
      .strict(),
    z
      .object({
        ok: z.literal(false),
        error: serviceErrorSchema,
        meta: serviceMetaSchema,
      })
      .strict(),
  ]);

export type AdminRole = z.infer<typeof adminRoleSchema>;
export type Administrator = z.infer<typeof administratorSchema>;
export type AccountStatus = z.infer<typeof accountStatusSchema>;
export type MembershipRole = z.infer<typeof membershipRoleSchema>;
export type Membership = z.infer<typeof membershipSchema>;
export type User = z.infer<typeof userSchema>;
export type Business = z.infer<typeof businessSchema>;
export type BusinessType = z.infer<typeof businessTypeSchema>;
export type Stall = z.infer<typeof stallSchema>;
export type Device = z.infer<typeof deviceSchema>;
export type SyncEvent = z.infer<typeof syncEventSchema>;
export type SyncStatus = z.infer<typeof syncStatusSchema>;
export type SyncState = z.infer<typeof syncStateSchema>;
export type ProblemReport = z.infer<typeof problemReportSchema>;
export type ReportStatus = z.infer<typeof reportStatusSchema>;
export type ReportSeverity = z.infer<typeof reportSeveritySchema>;
export type InternalNote = z.infer<typeof internalNoteSchema>;
export type AppVersion = z.infer<typeof appVersionSchema>;
export type AuditEvent = z.infer<typeof auditEventSchema>;
export type SystemHealth = z.infer<typeof systemHealthSchema>;
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
export type UserDetail = z.infer<typeof userDetailSchema>;
export type BusinessDetail = z.infer<typeof businessDetailSchema>;
export type ProblemReportDetail = z.infer<typeof problemReportDetailSchema>;
export type UserListFilters = z.infer<typeof userListFiltersSchema>;
export type BusinessListFilters = z.infer<typeof businessListFiltersSchema>;
export type StallListFilters = z.infer<typeof stallListFiltersSchema>;
export type DeviceListFilters = z.infer<typeof deviceListFiltersSchema>;
export type SyncEventListFilters = z.infer<typeof syncEventListFiltersSchema>;
export type ProblemReportListFilters = z.infer<
  typeof problemReportListFiltersSchema
>;
export type AppVersionListFilters = z.infer<typeof appVersionListFiltersSchema>;
export type AuditEventListFilters = z.infer<typeof auditEventListFiltersSchema>;
export type AdministratorListFilters = z.infer<
  typeof administratorListFiltersSchema
>;
export type UpdateActor = z.infer<typeof updateActorSchema>;
export type UpdateProblemReportInput = z.infer<
  typeof updateProblemReportInputSchema
>;
export type ProblemReportUpdateResult = z.infer<
  typeof problemReportUpdateResultSchema
>;
export type MockScenario = z.infer<typeof mockScenarioSchema>;
export type ServiceErrorCode = z.infer<typeof serviceErrorCodeSchema>;
export type ServiceError = z.infer<typeof serviceErrorSchema>;
export type ServiceMeta = z.infer<typeof serviceMetaSchema>;

export type ListResult<T> = {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
};

export type ServiceResult<T> =
  | { ok: true; data: T; meta: ServiceMeta }
  | { ok: false; error: ServiceError; meta: ServiceMeta };
