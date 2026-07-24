# Mock Data Contracts

## Purpose

The mock dataset makes the complete administrative experience testable before KitaMo's production Clerk and Supabase contracts are available. It contains fictional Filipino micro-business scenarios and no real personal, credential, PIN, transaction-detail, or merchant financial data.

Mock data is application data for this iteration, but seed files are an adapter implementation detail. Pages and components must use `AdminService`; importing raw seed arrays into presentation code is prohibited.

## Contract rules

- Domain types have matching Zod schemas.
- Values entering or leaving an untyped boundary are parsed, not cast.
- Identifiers are opaque and stable within the seed.
- Timestamps are ISO 8601 UTC strings.
- Optional values use one consistent representation defined by the schema.
- Status, role, severity, channel, and outcome fields use closed enums.
- Relationships reference stable identifiers and must resolve during seed validation.
- List behavior is deterministic: the same seed and query produce the same result and order.
- User-facing records contain deliberately fictional names and contact data.
- Business views expose operational summaries, not raw sales or transaction records.

The approved **KitaMo Shared Data Contract Baseline v0.1** is authoritative for cross-system data meaning. The TypeScript and Zod definitions in this repository are executable Admin projection validators pinned to that baseline: they validate the deliberately limited mock and Admin-service views, but they do not replace the shared contract or define Android or Supabase persistence. Changes to these local projections must remain compatible with the approved shared-contract version and its explicit adapters.

## Shared-baseline projection rules

- `stall` is the canonical Admin term. A future compatibility adapter may map legacy Android `branch` fields, but new Admin contracts do not introduce `branch` terminology.
- Mock identifiers are stable, opaque fixture identifiers only. A production adapter must preserve existing legacy IDs, accept the approved collision-resistant canonical ID format for new records, and never infer an ID from a name, email, phone number, stall code, or device model.
- Actual instants use validated UTC timestamps. Business-calendar interpretation uses the business's explicit IANA timezone, defaulting to `Asia/Manila` only when the authoritative contract permits it; the administrator's browser timezone is not business truth.
- This Admin projection contains no monetary records. Any later approved monetary projection must follow the shared currency, integer-minor-unit, decimal-precision, and centralized rounding rules rather than define its own money semantics.
- Synchronization projections carry operational state, correlation, device, app-version, and timing context. `SyncEvent.recordsProcessed` and dashboard `syncRecordsProcessed` count generic records handled by mock synchronization; they are not merchant transactions, sales, revenue, or permission to inspect transaction payloads.
- Audit views are minimized projections over the shared append-only audit contract. Process-local mock audit entries are not durable canonical evidence.
- A future production synchronization boundary must validate the approved `contract_version` separately from the physical `schema_version`; local Admin schemas do not silently coerce an unknown breaking version.

The detailed projection mapping and remaining integration gates are recorded in [Shared Data Contract Alignment](./shared-data-contract-alignment.md).

## Domain model catalog

### Administrator context

`AdminSession` represents the server-resolved principal. It contains the actor identifier, display information needed by the shell or audit record, identity-provider kind, and one of the initial roles:

- `super_admin`
- `support_admin`
- `operations_viewer`

The principal is supplied by an identity adapter, never by the `AdminService` caller as proof of authorization. `Administrator` is the separate fictional directory model used for report assignments and the read-only settings view; a directory record does not establish the caller's identity.

### User

An administrative user summary supports search and filters for account status, role or membership, business association, last activity, app version, and device count. User detail may include related memberships, devices, sync posture, and support reports. It must not include a merchant PIN, password, authentication secret, or unrestricted transaction history.

### Business

A business summary includes the name, type, owner summary, validated IANA timezone, stall count, seller count, status, sync health, creation time, and last activity. The fictional fixture uses `Asia/Manila`, matching the shared baseline default. Business detail composes owner and membership summaries, stalls, connected devices, version posture, sync status, related support reports, and relevant audit events.

### Stall

A stall belongs to a business and provides the limited identity and operational state required for device, membership, and synchronization views. It is not an inventory, checkout, recipe, production, or sales aggregate.

### Device

A device associates a fictional user, business, and optionally a stall with Android model information, app version, connection state, and activity timestamps. Seed coverage includes low-end Android hardware and outdated versions.

### Membership

A membership links a user to a business and, where relevant, a stall with an operational business role and status. Business and stall roles are domain data in Supabase in the future; they are not Clerk Organizations and are not administrator roles.

### Synchronization event

A sync event is an immutable operational projection with a stable event name, status, retry state, device, business, stall, app version code, Android platform/source, UTC occurrence time, applicable completion time, error type, and conflict status. Seeds include `sync.started`, `sync.completed`, `sync.failed`, and `sync.conflict_detected`. Its `recordsProcessed` value is a generic count of records handled by the mock sync operation, not a count of merchant transactions. Payload contents and full merchant transaction records are excluded. Device-level last-success posture remains on the `Device` projection.

### Problem report

A problem report includes severity, category, status, reporting user, business, device, app version, submission time, assigned administrator, and internal notes. Seeds include unresolved cases and enough resolved or in-progress cases to exercise filters.

The permitted mock mutation may change an allowed report status, severity, fictional administrator assignment, internal operational note, or resolution after validating a required reason. The server boundary supplies the actor from the current administrator session rather than trusting client identity data. It does not suspend accounts, delete data, impersonate a user, or change merchant records.

### App version

An app-version record includes version name, version code, release channel, active installs, outdated-device count, issue count, and minimum-supported posture. The mock dataset includes current and outdated versions.

### Audit event

An audit event includes actor user and administrator role, stable action, target and applicable business/stall context, reason code and note, bounded redacted before/after state, outcome, normalized UTC occurrence time, masked source IP, applicable device/app-version context, and correlation ID. Seed events are fictional. Every successful allowed report mutation appends an event in the same mock service use case. Denied and failed examples also exist in the seed for review; future policy must define which rejected production attempts are durably recorded. In-memory audit events are demonstration data, not a compliance record. The Admin DTO is a minimized projection over the canonical shared audit contract; its explicit production field mapping is documented in [shared-data-contract-alignment.md](./shared-data-contract-alignment.md).

### System health

System health contains overall state and bounded indicators suitable for an operations view. Seeds cover healthy and degraded conditions without exposing secrets, internal connection strings, or diagnostic stack traces.

### Dashboard summary

The dashboard composes validated aggregates for registered users, active businesses, active stalls, connected seller devices, generic synchronized records, sync success rate, failed attempts, unresolved reports, version distribution, generated-at freshness, and recent activity. Detailed health indicators come from `getSystemHealth`. `syncRecordsProcessed` is an operational synchronization count and must not be labeled or interpreted as merchant transactions.

Generic synchronization aggregates do not authorize transaction-level access.

## `AdminService`

The UI-facing service surface consists of:

| Method                    | Responsibility                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| `getDashboardSummary`     | Return operational summary cards, distributions, health, and recent activity.              |
| `listUsers`               | Apply validated user search and filters and return deterministic summaries.                |
| `getUser`                 | Return one limited administrative detail view or a typed not-found result.                 |
| `listBusinesses`          | Apply validated business search and filters and return summaries.                          |
| `getBusiness`             | Return one limited business detail composition or a typed not-found result.                |
| `listStalls`              | Return validated stall summaries for the dedicated Stalls & Devices view.                  |
| `listDevices`             | Apply device, business, stall, version, performance, and sync-state filters.               |
| `listSyncEvents`          | Apply synchronization status and operational filters.                                      |
| `listProblemReports`      | Apply report status, severity, assignment, and related-entity filters.                     |
| `getProblemReport`        | Return one limited report detail composition or a typed not-found result.                  |
| `updateProblemReportMock` | Validate and apply the authorized process-local mock transition and create audit evidence. |
| `listAppVersions`         | Return validated release and install-posture records.                                      |
| `listAuditEvents`         | Apply bounded audit filters and return newest-first events.                                |
| `listAdministrators`      | Return fictional administrators for report assignment and read-only settings.              |
| `getSystemHealth`         | Return a safe, validated health summary.                                                   |

Method signatures, query schemas, result schemas, and structured errors live with the domain/service code. Callers must not depend on mock-only storage layout.

The dedicated `/devices` page uses `listDevices` through this boundary; `listStalls` remains available for stall-focused composition. Neither page nor component reads stall or device seed arrays.

## Service result envelope

Every service method resolves to a discriminated `ServiceResult<T>` and validates the complete envelope:

```ts
type ServiceResult<T> =
  | {
      ok: true;
      data: T;
      meta: ServiceMeta;
    }
  | {
      ok: false;
      error: {
        code: ServiceErrorCode;
        message: string;
        correlationId: string;
        retryable: boolean;
        details?: Record<string, unknown>;
      };
      meta: ServiceMeta;
    };

type ServiceMeta = {
  source: "mock";
  requestId: string;
  generatedAt: string;
  scenario: MockScenario;
  stale: boolean;
  latencyMs: number;
  warnings: string[];
};
```

The current executable schema reports `source: "mock"`; the future adapter will widen that source discriminator to include `"supabase"` without changing page branching. `generatedAt` and `stale` support freshness UI; `scenario`, `latencyMs`, and `warnings` make controlled test behavior explicit; `requestId` traces the service invocation; and an error's `correlationId` is the browser-safe reference for diagnostics.

The current closed error-code enum is:

```ts
type ServiceErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "STALE_DATA"
  | "TIMEOUT"
  | "SERVICE_UNAVAILABLE"
  | "MAINTENANCE"
  | "UNKNOWN";
```

Pages branch on `ok` and `error.code`; they never parse `message` text. `details` must contain only browser-safe structured context, never secrets, stack traces, raw database errors, or unrestricted records. Any future enum change requires a deliberate shared-contract compatibility review plus updated projection and contract tests.

## Query behavior

Search is normalized consistently and is case-insensitive for documented text fields. Filters are combined using logical AND; values within a multi-select filter use logical OR unless the executable query schema states otherwise. Stable secondary ordering prevents records from moving between identical calls.

The adapter should return explicit empty collections for valid queries with no matches. Invalid filters are validation errors, not empty results. Missing detail identifiers are typed not-found failures.

## Seed plan and relationship integrity

The deterministic beta seed has these minimum sizes:

| Record                   | Minimum |
| ------------------------ | ------: |
| Platform users           |     120 |
| Businesses               |      35 |
| Stalls                   |      60 |
| Devices                  |      90 |
| Synchronization events   |     400 |
| Problem reports          |      45 |
| App versions             |       8 |
| Audit entries            |     150 |
| Fictional administrators |       8 |

The seed must include enough linked records to exercise:

- active and inactive user/account states;
- multiple business types, stalls, owners, sellers, and memberships;
- users with zero, one, and multiple devices;
- low-end Android devices and several app versions;
- successful, failed, pending, retrying, and conflict-affected syncs;
- current, outdated, and below-minimum version posture;
- unassigned, assigned, unresolved, in-progress, and resolved reports;
- recent audit events with success and denied or failed outcomes;
- healthy and degraded health indicators;
- populated, filtered-empty, and related-record-empty states.

A seed-validation test should reject duplicate identifiers, broken references, impossible enum values, malformed timestamps, and data that violates schema constraints.

## Process-local mutation semantics

The mock adapter creates a mutable working copy from immutable deterministic seeds. A report update affects only that running process. The mutation and its generated audit event are visible to later calls that resolve the same adapter/store instance.

No durability or cross-instance consistency is promised. Refresh behavior can differ after a process restart, hot reload, cold start, or request routed to another serverless instance. Tests must construct or reset an isolated service instance so they do not depend on execution order.

Concurrent updates are demonstration-only and have no production locking guarantee. Optimistic concurrency, database transactions, and durable audit ordering must be designed from the inspected Supabase schema during migration.

## Latency, failure, and health controls

Latency and failure injection are opt-in mock configuration, ideally passed to the service factory in tests or read from server-only development configuration. Controls must support a bounded delay and named failure scenarios for read and mutation error states. Random, unseeded failures are not allowed in automated tests.

The exact scenario vocabulary is:

```ts
type MockScenario =
  | "normal"
  | "slow"
  | "empty"
  | "partial_failure"
  | "backend_unavailable"
  | "maintenance"
  | "stale_data"
  | "permission_denied"
  | "high_sync_failure"
  | "outdated_version_spike";
```

Controlled failures return structured safe errors such as validation, denied, not found, conflict, or unavailable categories. They must not expose stack traces or secrets to the browser. Mock controls must not be enabled from arbitrary production client input.

Health scenarios are deterministic data variants. A degraded mock state is an operational UI fixture, not evidence of an actual KitaMo or Supabase incident.

## Production adapter compatibility

The future `SupabaseAdminService` must:

- implement the same domain-facing service interface;
- translate inspected production records from the authoritative shared contract into these pinned Admin projection validators;
- query only fields required for each view;
- enforce RLS and server-side administrator authorization;
- keep any service-role credential out of browser bundles;
- use durable transactional audit behavior for privileged mutations;
- preserve safe not-found and error semantics;
- add contract tests that run against an approved non-production environment.

The mock types do not define canonical cross-system meaning or production tables, column names, foreign keys, Clerk claims, RLS policies, or migrations.
