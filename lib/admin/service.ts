import type {
  Administrator,
  AdministratorListFilters,
  AppVersion,
  AppVersionListFilters,
  AuditEvent,
  AuditEventListFilters,
  Business,
  BusinessDetail,
  BusinessListFilters,
  DashboardSummary,
  Device,
  DeviceListFilters,
  ListResult,
  MockScenario,
  ProblemReport,
  ProblemReportDetail,
  ProblemReportListFilters,
  ProblemReportUpdateResult,
  ServiceErrorCode,
  ServiceResult,
  Stall,
  StallListFilters,
  SyncEvent,
  SyncEventListFilters,
  SystemHealth,
  UpdateProblemReportInput,
  User,
  UserDetail,
  UserListFilters,
} from "./schemas";

export const adminServiceMethods = [
  "getDashboardSummary",
  "listUsers",
  "getUser",
  "listBusinesses",
  "getBusiness",
  "listStalls",
  "listDevices",
  "listSyncEvents",
  "listProblemReports",
  "getProblemReport",
  "updateProblemReportMock",
  "listAppVersions",
  "listAuditEvents",
  "listAdministrators",
  "getSystemHealth",
] as const;

export type AdminServiceMethod = (typeof adminServiceMethods)[number];

export interface AdminService {
  getDashboardSummary(): Promise<ServiceResult<DashboardSummary>>;
  listUsers(
    filters?: UserListFilters,
  ): Promise<ServiceResult<ListResult<User>>>;
  getUser(userId: string): Promise<ServiceResult<UserDetail>>;
  listBusinesses(
    filters?: BusinessListFilters,
  ): Promise<ServiceResult<ListResult<Business>>>;
  getBusiness(businessId: string): Promise<ServiceResult<BusinessDetail>>;
  listStalls(
    filters?: StallListFilters,
  ): Promise<ServiceResult<ListResult<Stall>>>;
  listDevices(
    filters?: DeviceListFilters,
  ): Promise<ServiceResult<ListResult<Device>>>;
  listSyncEvents(
    filters?: SyncEventListFilters,
  ): Promise<ServiceResult<ListResult<SyncEvent>>>;
  listProblemReports(
    filters?: ProblemReportListFilters,
  ): Promise<ServiceResult<ListResult<ProblemReport>>>;
  getProblemReport(
    reportId: string,
  ): Promise<ServiceResult<ProblemReportDetail>>;
  updateProblemReportMock(
    input: UpdateProblemReportInput,
  ): Promise<ServiceResult<ProblemReportUpdateResult>>;
  listAppVersions(
    filters?: AppVersionListFilters,
  ): Promise<ServiceResult<ListResult<AppVersion>>>;
  listAuditEvents(
    filters?: AuditEventListFilters,
  ): Promise<ServiceResult<ListResult<AuditEvent>>>;
  listAdministrators(
    filters?: AdministratorListFilters,
  ): Promise<ServiceResult<ListResult<Administrator>>>;
  getSystemHealth(): Promise<ServiceResult<SystemHealth>>;
}

export interface MockFailureConfig {
  methods: readonly AdminServiceMethod[];
  code?: ServiceErrorCode;
  message?: string;
  retryable?: boolean;
}

export interface MockAdminServiceOptions {
  scenario?: MockScenario;
  /**
   * Fixed delay applied to every call. When omitted, only the `slow` scenario
   * adds latency. Keeping this deterministic makes loading-state tests stable.
   */
  latencyMs?: number;
  /**
   * Optional method-level failure injection. Scenario failures still apply.
   */
  failure?: MockFailureConfig;
}
