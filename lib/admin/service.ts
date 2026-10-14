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
import type {
  AccessLog,
  AccessLogQuery,
  AddOfficerInput,
  AdminSessionState,
  Association,
  AssociationChanged,
  AssociationChangeInput,
  AssociationDetail,
  BusinessSummary,
  CloseAccessInput,
  ClosedAccess,
  CreateAssociationInput,
  CreatedAssociation,
  DirectoryPage,
  DirectoryQuery,
  EndOfficerInput,
  Flag,
  FlagsQuery,
  OpenAccessInput,
  OpenedAccess,
  Overview,
  RaiseFlagInput,
  RaisedFlag,
  RecordsPage,
  RecordsQuery,
  ReviewFlagInput,
  ReviewedFlag,
} from "./r16-schemas";

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
  "getSession",
  "getOverview",
  "listDirectory",
  "openAccess",
  "closeAccess",
  "getBusinessSummary",
  "getBusinessRecords",
  "listFlags",
  "raiseFlag",
  "reviewFlag",
  "listAccessLog",
  "listAssociations",
  "getAssociation",
  "createAssociation",
  "addAssociationOfficer",
  "endAssociationOfficer",
  "rotateAssociationCode",
  "closeAssociation",
] as const;

/**
 * The mock-first methods that R16's Core adapter does not serve: they answer
 * NOT_AVAILABLE there and their pages stay out of the production navigation
 * until R23 (ADM-048).
 */
export const parkedAdminServiceMethods = [
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
] as const satisfies readonly AdminServiceMethod[];

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

  // R16 super admin (ADM-048). In the Core adapter each is one PostgREST RPC
  // POSTed with the administrator's own aal2 token; Core's km_admin_can is
  // the gate and logs every read.
  /** km_admin_session: the label and the live accesses (drives the banner). */
  getSession(): Promise<ServiceResult<AdminSessionState>>;
  /** km_admin_directory's totals (counts only). */
  getOverview(): Promise<ServiceResult<Overview>>;
  /** km_admin_directory: no reason needed; every view is logged by Core. */
  listDirectory(query?: DirectoryQuery): Promise<ServiceResult<DirectoryPage>>;
  /** open_admin_access: a reason, 30 minutes, records only with evidence. */
  openAccess(input: OpenAccessInput): Promise<ServiceResult<OpenedAccess>>;
  /** close_admin_access. */
  closeAccess(input: CloseAccessInput): Promise<ServiceResult<ClosedAccess>>;
  /** km_admin_business_summary (needs a live access). */
  getBusinessSummary(
    businessId: string,
  ): Promise<ServiceResult<BusinessSummary>>;
  /** km_admin_business_records (needs a live records access). */
  getBusinessRecords(query: RecordsQuery): Promise<ServiceResult<RecordsPage>>;
  /** km_admin_flags. */
  listFlags(query?: FlagsQuery): Promise<ServiceResult<Flag[]>>;
  /** raise_admin_flag (from a Summary with a live access). */
  raiseFlag(input: RaiseFlagInput): Promise<ServiceResult<RaisedFlag>>;
  /** review_admin_flag. */
  reviewFlag(input: ReviewFlagInput): Promise<ServiceResult<ReviewedFlag>>;
  /** km_admin_access_log. */
  listAccessLog(query?: AccessLogQuery): Promise<ServiceResult<AccessLog>>;
  // The HOA level (0086, D18). Each answers NOT_AVAILABLE until Core has it.
  // The writes change association records only, never a business's (OQ21).
  /** km_admin_associations: a bare array, kind included (§12.12). */
  listAssociations(): Promise<ServiceResult<Association[]>>;
  /** km_admin_association: the detail behind the officer and code actions (§12.15). */
  getAssociation(
    associationId: string,
  ): Promise<ServiceResult<AssociationDetail>>;
  /** admin_create_association, after checking the association's letter. */
  createAssociation(
    input: CreateAssociationInput,
  ): Promise<ServiceResult<CreatedAssociation>>;
  /** admin_add_association_officer, by the officer's KitaMo email. */
  addAssociationOfficer(
    input: AddOfficerInput,
  ): Promise<ServiceResult<AssociationChanged>>;
  /** admin_end_association_officer. */
  endAssociationOfficer(
    input: EndOfficerInput,
  ): Promise<ServiceResult<AssociationChanged>>;
  /** admin_rotate_association_code: members stay; the old code stops joins. */
  rotateAssociationCode(
    input: AssociationChangeInput,
  ): Promise<ServiceResult<AssociationChanged>>;
  /** admin_close_association. */
  closeAssociation(
    input: AssociationChangeInput,
  ): Promise<ServiceResult<AssociationChanged>>;
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
  /** The R16 mock's clock (accesses last 30 minutes); tests pass a fixed one. */
  now?: () => number;
}
