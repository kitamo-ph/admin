import { z } from "zod";

import { utcDateTimeSchema } from "./schemas";

/**
 * R16 super-admin domain contract (ADM-048). Pages read these shapes only;
 * the Core adapter maps Core's allowlisted snake_case replies into them
 * (ADM-014) and the mock adapter produces them from fictional data.
 * Every object is strict: an unexpected key is a contract failure.
 */

export const coreIdSchema = z.guid();
const businessDaySchema = z.iso.date();
const labelSchema = z.string().trim().min(1).max(200);

export const accessLevelSchema = z.enum(["summary", "records"]);
export const reasonCodeSchema = z.enum([
  "support_request",
  "flag_review",
  "health_check",
  "legal_request",
  "data_fix",
]);
export const withholdCodeSchema = z.enum(["legal_request", "fraud_review"]);
export const flagKindSchema = z.enum([
  "health_mismatch",
  "unusual_activity",
  "report",
  "other",
]);
export const flagSourceSchema = z.enum(["health", "admin", "report"]);
/** The sources an administrator may pick in R16 (`report` waits for R23). */
export const raisableFlagSourceSchema = z.enum(["health", "admin"]);
export const flagStatusSchema = z.enum([
  "open",
  "reviewing",
  "dismissed",
  "confirmed",
]);
export const recordsKindSchema = z.enum(["sales", "credit", "staff", "audit"]);
export const auditSourceSchema = z.enum([
  "staff_events",
  "money_corrections",
  "owner_pin_events",
  "stock_transfers",
]);

export const liveAccessSchema = z.strictObject({
  accessId: coreIdSchema,
  businessId: coreIdSchema,
  businessName: labelSchema.nullable(),
  level: accessLevelSchema,
  reasonCode: reasonCodeSchema,
  expiresAt: utcDateTimeSchema,
});

export const adminSessionStateSchema = z.strictObject({
  label: labelSchema,
  accesses: z.array(liveAccessSchema).max(20),
});

export const directoryTotalsSchema = z.strictObject({
  businesses: z.int().nonnegative(),
  live: z.int().nonnegative(),
  hidden: z.int().nonnegative(),
  active7d: z.int().nonnegative(),
  withOpenFlags: z.int().nonnegative(),
});

export const overviewSchema = z.strictObject({
  totals: directoryTotalsSchema,
});

export const directoryRowSchema = z.strictObject({
  businessId: coreIdSchema,
  name: labelSchema,
  createdOn: businessDaySchema,
  lastSaleDay: businessDaySchema.nullable(),
  sales7d: z.int().nonnegative(),
  stallCount: z.int().nonnegative(),
  staffCount: z.int().nonnegative(),
  appsOn: z.array(labelSchema).max(50),
  openFlags: z.int().nonnegative(),
  hidden: z.boolean(),
});

export const directoryPageSchema = z.strictObject({
  totals: directoryTotalsSchema,
  rows: z.array(directoryRowSchema).max(100),
  next: coreIdSchema.nullable(),
});

export const directoryQuerySchema = z.strictObject({
  search: z.string().trim().max(60).optional(),
  after: coreIdSchema.optional(),
  limit: z.int().min(1).max(100).optional(),
});

export const openAccessInputSchema = z
  .strictObject({
    businessId: coreIdSchema,
    level: accessLevelSchema,
    reasonCode: reasonCodeSchema,
    reasonText: z.string().trim().min(20).max(500),
    flagId: coreIdSchema.nullable(),
    reference: z
      .string()
      .regex(/^[A-Za-z0-9#:/._-]{4,60}$/)
      .nullable(),
    withholdCode: withholdCodeSchema.nullable(),
    withholdDays: z.int().min(1).max(90).nullable(),
    clientRequestId: coreIdSchema,
  })
  .superRefine((input, context) => {
    // Break-glass (D27 §4.2): Records only with a flag or a reference.
    if (
      input.level === "records" &&
      input.flagId === null &&
      input.reference === null
    ) {
      context.addIssue({
        code: "custom",
        path: ["flagId"],
        message: "Records need a flag or a reference",
      });
    }
    if (input.reasonCode === "flag_review" && input.flagId === null) {
      context.addIssue({
        code: "custom",
        path: ["flagId"],
        message: "A flag review names the flag",
      });
    }
    if ((input.withholdCode === null) !== (input.withholdDays === null)) {
      context.addIssue({
        code: "custom",
        path: ["withholdDays"],
        message: "A hold has a reason and a number of days",
      });
    }
    if (
      input.withholdCode !== null &&
      input.reasonCode !== "legal_request" &&
      input.reasonCode !== "flag_review"
    ) {
      context.addIssue({
        code: "custom",
        path: ["withholdCode"],
        message: "Only a legal request or a flag review may hold disclosure",
      });
    }
  });

export const openedAccessSchema = z.strictObject({
  accessId: coreIdSchema,
  businessId: coreIdSchema,
  level: accessLevelSchema,
  openedAt: utcDateTimeSchema,
  expiresAt: utcDateTimeSchema,
  withheldUntil: utcDateTimeSchema.nullable(),
});

export const closeAccessInputSchema = z.strictObject({
  accessId: coreIdSchema,
  clientRequestId: coreIdSchema,
});

export const closedAccessSchema = z.strictObject({
  accessId: coreIdSchema,
  state: z.enum(["closed", "expired"]),
  endedAt: utcDateTimeSchema.nullable(),
});

const countSchema = z.int().nonnegative();
const centsSchema = z.int().min(-1_000_000_000_000).max(1_000_000_000_000);

export const summaryFlagSchema = z.strictObject({
  flagId: coreIdSchema,
  kind: flagKindSchema,
  source: flagSourceSchema,
  status: flagStatusSchema,
  createdAt: utcDateTimeSchema,
});

export const businessSummarySchema = z.strictObject({
  business: z.strictObject({
    businessId: coreIdSchema,
    name: labelSchema,
    createdOn: businessDaySchema,
    timezone: z.string().trim().min(3).max(64),
    hiddenSince: utcDateTimeSchema.nullable(),
  }),
  stalls: z
    .array(z.strictObject({ stallId: coreIdSchema, name: labelSchema }))
    .max(200),
  staffCount: countSchema,
  days: z
    .array(
      z.strictObject({
        day: businessDaySchema,
        salesCount: countSchema,
        salesCents: centsSchema,
        returnsCount: countSchema,
        returnsCents: centsSchema,
      }),
    )
    .length(14),
  health: z.strictObject({
    stockUseIssues7d: countSchema,
    ticketIssues7d: countSchema,
    problemReports7d: countSchema,
    staffCodeFailures1d: countSchema,
    correctionRequestsOpen: countSchema,
  }),
  apps: z
    .array(
      z.strictObject({
        grantee: labelSchema,
        scope: labelSchema,
        since: utcDateTimeSchema,
      }),
    )
    .max(100),
  settings: z.strictObject({
    ticketMode: z.string().trim().min(1).max(40),
    ownerPinSet: z.boolean(),
    paymentQrCount: countSchema,
  }),
  flags: z.array(summaryFlagSchema).max(200),
});

export const recordsQuerySchema = z
  .strictObject({
    businessId: coreIdSchema,
    kind: recordsKindSchema,
    from: businessDaySchema.nullable(),
    to: businessDaySchema.nullable(),
  })
  .superRefine((query, context) => {
    const dated = query.kind === "sales" || query.kind === "audit";
    if (!dated) {
      if (query.from !== null || query.to !== null) {
        context.addIssue({
          code: "custom",
          path: ["from"],
          message: "Credit and staff take no dates",
        });
      }
      return;
    }
    if (query.from === null || query.to === null) {
      context.addIssue({
        code: "custom",
        path: ["from"],
        message: "Sales and audit need a date window",
      });
      return;
    }
    const span =
      (Date.parse(`${query.to}T00:00:00Z`) -
        Date.parse(`${query.from}T00:00:00Z`)) /
      86_400_000;
    if (span < 0 || span > 30) {
      context.addIssue({
        code: "custom",
        path: ["to"],
        message: "The window is at most 31 days, oldest first",
      });
    }
  });

export const saleRecordSchema = z.strictObject({
  saleId: coreIdSchema,
  happenedAt: utcDateTimeSchema,
  stallId: coreIdSchema.nullable(),
  transactionNo: z.string().trim().min(1).max(60).nullable(),
  amountCents: centsSchema,
  discountCents: centsSchema,
  paymentMethod: z.string().trim().min(1).max(40),
  voidedAt: utcDateTimeSchema.nullable(),
  returnKind: z.string().trim().min(1).max(40).nullable(),
  returnCents: centsSchema.nullable(),
  customerId: coreIdSchema.nullable(),
  customerName: labelSchema.nullable(),
  lineCount: countSchema,
  recordedByLabel: labelSchema.nullable(),
});

export const creditRecordSchema = z.strictObject({
  customerId: coreIdSchema,
  name: labelSchema,
  balanceCents: centsSchema,
  oldestUnpaidOn: businessDaySchema.nullable(),
  lastPaymentAt: utcDateTimeSchema.nullable(),
});

export const staffRecordSchema = z.strictObject({
  staffMemberId: coreIdSchema,
  label: labelSchema,
  stallIds: z.array(coreIdSchema).max(200),
  powers: z.array(z.string().trim().min(1).max(40)).max(40),
  createdAt: utcDateTimeSchema,
  endedAt: utcDateTimeSchema.nullable(),
  lastSessionAt: utcDateTimeSchema.nullable(),
});

export const auditRecordSchema = z.strictObject({
  source: auditSourceSchema,
  kind: z.string().trim().min(1).max(60),
  at: utcDateTimeSchema,
  actorLabel: labelSchema.nullable(),
  subjectId: coreIdSchema.nullable(),
});

const recordsWindow = {
  from: businessDaySchema.nullable(),
  to: businessDaySchema.nullable(),
  more: z.boolean(),
};

export const recordsPageSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("sales"),
    ...recordsWindow,
    rows: z.array(saleRecordSchema).max(200),
  }),
  z.strictObject({
    kind: z.literal("credit"),
    ...recordsWindow,
    rows: z.array(creditRecordSchema).max(200),
  }),
  z.strictObject({
    kind: z.literal("staff"),
    ...recordsWindow,
    rows: z.array(staffRecordSchema).max(100),
  }),
  z.strictObject({
    kind: z.literal("audit"),
    ...recordsWindow,
    rows: z.array(auditRecordSchema).max(200),
  }),
]);

/** Flag evidence (D27 §6): counts, record ids and a check name; never text. */
export const FORBIDDEN_EVIDENCE_KEY = /cents|amount|peso|total|balance|cost/;
export const flagEvidenceSchema = z.strictObject({
  counts: z
    .record(
      z
        .string()
        .regex(/^[a-z0-9_]{1,40}$/)
        .refine((key) => !FORBIDDEN_EVIDENCE_KEY.test(key), {
          message: "Evidence never carries money",
        }),
      z.int().min(0).max(1_000_000_000),
    )
    .refine((counts) => Object.keys(counts).length <= 20, {
      message: "At most 20 counts",
    })
    .optional(),
  record_ids: z.array(coreIdSchema).max(50).optional(),
  check: z
    .string()
    .regex(/^[a-z0-9_]{1,40}$/)
    .optional(),
});

export const flagSchema = z.strictObject({
  flagId: coreIdSchema,
  businessId: coreIdSchema,
  businessName: labelSchema.nullable(),
  kind: flagKindSchema,
  source: flagSourceSchema,
  status: flagStatusSchema,
  evidence: flagEvidenceSchema,
  createdAt: utcDateTimeSchema,
  closedAt: utcDateTimeSchema.nullable(),
});

export const flagListSchema = z.array(flagSchema).max(200);

export const flagsQuerySchema = z.strictObject({
  status: flagStatusSchema.nullable(),
});

export const raiseFlagInputSchema = z.strictObject({
  businessId: coreIdSchema,
  kind: flagKindSchema,
  source: raisableFlagSourceSchema,
  evidence: flagEvidenceSchema,
  clientRequestId: coreIdSchema,
});

export const raisedFlagSchema = z.strictObject({
  flagId: coreIdSchema,
  status: z.literal("open"),
});

export const reviewFlagInputSchema = z.strictObject({
  flagId: coreIdSchema,
  status: flagStatusSchema,
  note: z.string().trim().min(10).max(500).nullable(),
  clientRequestId: coreIdSchema,
});

export const reviewedFlagSchema = z.strictObject({
  flagId: coreIdSchema,
  status: flagStatusSchema,
});

export const accessLogEntrySchema = z.strictObject({
  accessId: coreIdSchema,
  adminLabel: labelSchema,
  businessId: coreIdSchema,
  businessName: labelSchema.nullable(),
  level: accessLevelSchema,
  reasonCode: reasonCodeSchema,
  reasonText: z.string().trim().min(1).max(500).nullable(),
  flagId: coreIdSchema.nullable(),
  reference: z.string().min(1).max(60).nullable(),
  openedAt: utcDateTimeSchema,
  expiresAt: utcDateTimeSchema,
  endedAt: utcDateTimeSchema.nullable(),
  endedHow: z.enum(["closed", "expired", "open"]),
  withheldUntil: utcDateTimeSchema.nullable(),
  reads: countSchema,
});

export const accessReadSchema = z.strictObject({
  fn: z.string().regex(/^km_admin_[a-z_]{1,40}$/),
  businessId: coreIdSchema.nullable(),
  accessId: coreIdSchema.nullable(),
  rowsReturned: countSchema.nullable(),
  at: utcDateTimeSchema,
});

export const accessLogSchema = z.strictObject({
  accesses: z.array(accessLogEntrySchema).max(100),
  reads: z.array(accessReadSchema).max(200),
});

export const accessLogQuerySchema = z.strictObject({
  before: utcDateTimeSchema.nullable(),
});

/**
 * The HOA level (0086, D18; the owner's D18 answers of 2026-10-14: a kind of
 * HOA or barangay). Until Core has it, every association method answers
 * not_available (PGRST202) and the page says so.
 */
export const associationKindSchema = z.enum(["hoa", "barangay"]);
/** The join code: 8 of A-Z without I, L and O, plus 2-9 (D18 §3), stored plain. */
export const joinCodeSchema = z.string().regex(/^[A-HJKMNP-Z2-9]{8}$/);
const associationStatusSchema = z.string().trim().min(1).max(40);

export const associationSchema = z.strictObject({
  associationId: coreIdSchema,
  name: labelSchema,
  kind: associationKindSchema,
  status: associationStatusSchema,
  memberStallCount: countSchema,
  officerCount: countSchema,
  codeRotatedAt: utcDateTimeSchema.nullable(),
});

export const associationListSchema = z.array(associationSchema).max(500);

/** An officer as km_admin_association names them (§12.15): never their email. */
export const associationOfficerSchema = z.strictObject({
  officerId: coreIdSchema,
  label: z.string().trim().min(1).max(60),
  addedAt: utcDateTimeSchema,
  acceptedAt: utcDateTimeSchema.nullable(),
  endedAt: utcDateTimeSchema.nullable(),
});

/** km_admin_association (§12.15): never an officer's email or a member stall's name. */
export const associationDetailSchema = z.strictObject({
  associationId: coreIdSchema,
  name: labelSchema,
  kind: associationKindSchema,
  status: associationStatusSchema,
  area: z.string().trim().max(120).nullable(),
  joinCode: joinCodeSchema.nullable(),
  codeRotatedAt: utcDateTimeSchema.nullable(),
  officers: z.array(associationOfficerSchema).max(50),
});

export const createAssociationInputSchema = z.strictObject({
  name: z.string().trim().min(1).max(80),
  kind: associationKindSchema,
  area: z.string().trim().min(1).max(120).nullable(),
  letterReference: z.string().trim().min(1).max(120),
  clientRequestId: coreIdSchema,
});

export const createdAssociationSchema = z.strictObject({
  associationId: coreIdSchema,
  joinCode: joinCodeSchema,
});

export const addOfficerInputSchema = z.strictObject({
  associationId: coreIdSchema,
  email: z.email().max(254),
  label: z.string().trim().min(1).max(60),
  clientRequestId: coreIdSchema,
});

export const endOfficerInputSchema = z.strictObject({
  officerId: coreIdSchema,
  clientRequestId: coreIdSchema,
});

/** Rotating the code and closing take the association and a request id. */
export const associationChangeInputSchema = z.strictObject({
  associationId: coreIdSchema,
  clientRequestId: coreIdSchema,
});

/**
 * The four association changes (add or end an officer, rotate the code,
 * close) show nothing of Core's reply: the page reads km_admin_association
 * again. So the site reads only that Core said yes.
 */
export const associationChangedSchema = z.strictObject({
  done: z.literal(true),
});

export type AccessLevel = z.infer<typeof accessLevelSchema>;
export type ReasonCode = z.infer<typeof reasonCodeSchema>;
export type WithholdCode = z.infer<typeof withholdCodeSchema>;
export type FlagKind = z.infer<typeof flagKindSchema>;
export type FlagSource = z.infer<typeof flagSourceSchema>;
export type FlagStatus = z.infer<typeof flagStatusSchema>;
export type RecordsKind = z.infer<typeof recordsKindSchema>;
export type LiveAccess = z.infer<typeof liveAccessSchema>;
export type AdminSessionState = z.infer<typeof adminSessionStateSchema>;
export type DirectoryTotals = z.infer<typeof directoryTotalsSchema>;
export type Overview = z.infer<typeof overviewSchema>;
export type DirectoryRow = z.infer<typeof directoryRowSchema>;
export type DirectoryPage = z.infer<typeof directoryPageSchema>;
export type DirectoryQuery = z.infer<typeof directoryQuerySchema>;
export type OpenAccessInput = z.infer<typeof openAccessInputSchema>;
export type OpenedAccess = z.infer<typeof openedAccessSchema>;
export type CloseAccessInput = z.infer<typeof closeAccessInputSchema>;
export type ClosedAccess = z.infer<typeof closedAccessSchema>;
export type BusinessSummary = z.infer<typeof businessSummarySchema>;
export type RecordsQuery = z.infer<typeof recordsQuerySchema>;
export type RecordsPage = z.infer<typeof recordsPageSchema>;
export type SaleRecord = z.infer<typeof saleRecordSchema>;
export type CreditRecord = z.infer<typeof creditRecordSchema>;
export type StaffRecord = z.infer<typeof staffRecordSchema>;
export type AuditRecord = z.infer<typeof auditRecordSchema>;
export type FlagEvidence = z.infer<typeof flagEvidenceSchema>;
export type Flag = z.infer<typeof flagSchema>;
export type FlagsQuery = z.infer<typeof flagsQuerySchema>;
export type RaiseFlagInput = z.infer<typeof raiseFlagInputSchema>;
export type RaisedFlag = z.infer<typeof raisedFlagSchema>;
export type ReviewFlagInput = z.infer<typeof reviewFlagInputSchema>;
export type ReviewedFlag = z.infer<typeof reviewedFlagSchema>;
export type AccessLogEntry = z.infer<typeof accessLogEntrySchema>;
export type AccessRead = z.infer<typeof accessReadSchema>;
export type AccessLog = z.infer<typeof accessLogSchema>;
export type AccessLogQuery = z.infer<typeof accessLogQuerySchema>;
export type Association = z.infer<typeof associationSchema>;
export type AssociationKind = z.infer<typeof associationKindSchema>;
export type AssociationOfficer = z.infer<typeof associationOfficerSchema>;
export type AssociationDetail = z.infer<typeof associationDetailSchema>;
export type CreateAssociationInput = z.infer<
  typeof createAssociationInputSchema
>;
export type CreatedAssociation = z.infer<typeof createdAssociationSchema>;
export type AddOfficerInput = z.infer<typeof addOfficerInputSchema>;
export type EndOfficerInput = z.infer<typeof endOfficerInputSchema>;
export type AssociationChangeInput = z.infer<
  typeof associationChangeInputSchema
>;
export type AssociationChanged = z.infer<typeof associationChangedSchema>;
