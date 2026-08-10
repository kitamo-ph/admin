# Mock-First Implementation Plan

## Purpose

This document preserves the six pre-build artifacts that governed the mock-first KitaMo Admin Platform implementation. The secure mock-first beta represented by baseline commit `b946085` is now complete; final quality, accessibility, responsive, and dependency evidence is recorded in [mock-first-beta-closure.md](./mock-first-beta-closure.md). Production integration and deployment remain separate future gates.

## 1. Proposed repository structure

The existing Next.js scaffold may keep the App Router at the repository root. The intended production-structured boundary is:

```text
admin/
├── app/
│   ├── (auth)/
│   │   └── sign-in/
│   ├── (admin)/
│   │   ├── layout.tsx
│   │   ├── overview/
│   │   ├── users/
│   │   │   └── [userId]/
│   │   ├── businesses/
│   │   │   └── [businessId]/
│   │   ├── devices/                  # labeled “Stalls & Devices”
│   │   ├── synchronization/
│   │   ├── problem-reports/
│   │   │   └── [reportId]/
│   │   ├── app-versions/
│   │   ├── audit-log/
│   │   ├── settings/
│   │   └── health/
│   ├── api/
│   │   └── health/
│   ├── access-denied/
│   ├── maintenance/
│   ├── error.tsx
│   ├── global-error.tsx
│   ├── loading.tsx
│   └── not-found.tsx
├── components/
│   ├── layout/
│   ├── ui/
│   ├── data-display/
│   ├── filters/
│   ├── feedback/
│   └── domain/
├── lib/
│   ├── auth/
│   │   ├── principal.ts
│   │   ├── development-adapter.ts
│   │   └── clerk-adapter.ts          # future, fail-closed placeholder
│   ├── authorization/
│   │   ├── capabilities.ts
│   │   ├── policy.ts
│   │   └── guards.ts
│   ├── domain/
│   │   ├── schemas.ts
│   │   ├── types.ts
│   │   └── queries.ts
│   ├── services/
│   │   ├── admin-service.ts
│   │   ├── service-result.ts
│   │   ├── factory.ts
│   │   ├── mock/
│   │   │   ├── mock-admin-service.ts
│   │   │   ├── seed.ts
│   │   │   ├── scenarios.ts
│   │   │   └── store.ts
│   │   └── supabase/                 # future adapter only; no guessed schema
│   ├── actions/
│   │   └── problem-reports.ts
│   ├── errors/
│   └── config/
├── tests/
│   ├── unit/
│   ├── contract/
│   ├── accessibility/
│   └── e2e/
├── docs/
├── public/
├── .env.example
├── next.config.ts
├── playwright.config.ts
├── vitest.config.ts
└── package.json
```

The exact folders may be collapsed where a module is small, but the dependency direction is fixed:

```text
pages/components
  -> typed AdminService
  -> MockAdminService now
  -> SupabaseAdminService later
```

Presentation code does not import seeds or Supabase clients.

## 2. Implementation sequence

1. **Repository foundation:** strict TypeScript, linting, formatting, Vitest, Playwright, environment validation, security headers, and documented commands.
2. **Application shell:** KitaMo operational design tokens, responsive sidebar/mobile navigation, breadcrumbs, accessible tables/cards/filters, and shared loading/empty/error/stale/maintenance/denied patterns.
3. **Domain and result contracts:** TypeScript types, Zod schemas, query/mutation schemas, `ServiceResult`, and adapter-independent contract tests.
4. **Mock scenario engine:** fixed-seed fictional data, relationship validation, named `MockScenario` controls, bounded latency, controlled failures, and isolated process-local store instances.
5. **Authorization shell:** centralized capabilities, development/test principal adapter, protected routes, action guards, sign-in placeholder, access denied, and production fail-closed behavior.
6. **Overview:** operational aggregates, freshness, version posture, and recent activity.
7. **Users:** search, filters, pagination, limited detail, memberships, app/device posture, and support context.
8. **Businesses:** search/filter list and consolidated detail without merchant workflows or full transactions.
9. **Stalls & Devices:** dedicated operational page with safe device identifiers, Android/app posture, stale state, and links to sync events.
10. **Synchronization:** filterable success, pending, retrying, failed, stale, and conflict events.
11. **Problem Reports:** list/detail and the only allowed non-destructive mock mutation, with audit creation.
12. **App Versions and Audit Log:** release posture, issue indicators, minimum-supported marker, and bounded auditable activity.
13. **Settings and Health:** read-only/disabled mock settings, protected maintenance view, and minimal public liveness endpoint.
14. **State and accessibility completion:** all named scenarios, keyboard operation, WCAG 2.2 AA practices, 200% zoom, screen-reader spot checks, mobile/tablet/desktop behavior, and reduced motion.
15. **Quality verification:** formatting, lint, type checking, unit/contract tests, Playwright role/smoke tests, build, secret/bundle scans, and docs reconciliation.
16. **Commit preparation:** small logical commits only after the working tree is reviewed. No production deployment in this iteration.

## 3. Domain model list

| Model                                | Purpose and limits                                                                                                                                                          |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AdminSession`                       | Server-resolved fictional administrator principal and one approved admin role.                                                                                              |
| `Administrator`                      | Fictional administrator directory entry for assignment and read-only settings; not proof of caller identity.                                                                |
| `PlatformUser`                       | Limited support view: account type/status, memberships, activity, app version, devices, and support count.                                                                  |
| `BusinessMembershipSummary`          | Existing-style link between a user and business/stall; not a Clerk Organization.                                                                                            |
| `BusinessSummary` / `BusinessDetail` | Operational business context, owners/sellers, stalls/devices, sync, reports, versions, and audit links.                                                                     |
| `StallSummary`                       | Stall identity, state, device count, and last sync.                                                                                                                         |
| `DeviceSummary`                      | Support-safe device model, Android/app version, activity, and sync posture.                                                                                                 |
| `SyncEvent`                          | Immutable named sync event with UTC occurrence/completion time, retry/error/conflict context, safe applicable metadata, and correlation ID; no payload/transaction details. |
| `ProblemReport` / `SupportNote`      | Severity, workflow status, context, assignment, notes, and resolution summary.                                                                                              |
| `AppVersion` / `AppVersionReference` | Version code/name, channel, installs, issues, crash indicator, outdated and minimum-supported posture.                                                                      |
| `AuditEvent` / `AuditEntry`          | Actor, role, action, target, time, reason, outcome, masked source, and correlation ID.                                                                                      |
| `SystemHealth` / health indicator    | Safe overall and component health with freshness; mock fixtures are explicitly not real monitoring.                                                                         |
| `DashboardSummary` / overview data   | Operational aggregates and recent activity; synchronized transaction count is aggregate-only.                                                                               |
| Query and pagination models          | Validated search, filters, ordering, page bounds, and stable list results.                                                                                                  |
| `ServiceError` / `ServiceResult<T>`  | Closed error categories and safe metadata that all pages render without parsing message strings.                                                                            |

Initial enum vocabulary includes the three admin roles plus account, business, synchronization, problem severity/status, release channel, and audit outcome values defined by Zod.

The service surface is:

- `getDashboardSummary`
- `listUsers` and `getUser`
- `listBusinesses` and `getBusiness`
- `listStalls` and `listDevices` for the dedicated Stalls & Devices page
- `listSyncEvents`
- `listProblemReports`, `getProblemReport`, and `updateProblemReportMock`
- `listAppVersions`
- `listAuditEvents`
- `listAdministrators`
- `getSystemHealth`

## 4. Permission matrix

Capabilities are centralized and deny by default. “View” always means limited administrative data, not credentials, raw financial records, or unrestricted transactions.

| Capability                                      |    `super_admin`     | `support_admin` | `operations_viewer` |
| ----------------------------------------------- | :------------------: | :-------------: | :-----------------: |
| Overview                                        |        Allow         |      Allow      |        Allow        |
| Users and user detail (limited/masked DTOs)     |        Allow         |      Allow      |        Allow        |
| Businesses and limited detail                   |        Allow         |      Allow      |        Allow        |
| Stalls & Devices                                |        Allow         |      Allow      |        Allow        |
| Synchronization                                 |        Allow         |      Allow      |        Allow        |
| Problem Reports                                 |        Allow         |      Allow      |        Allow        |
| Update mock Problem Reports                     |        Allow         |      Allow      |        Deny         |
| App Versions                                    |        Allow         |      Allow      |        Allow        |
| Audit Log                                       |        Allow         |      Allow      |        Allow        |
| System Health / maintenance                     |        Allow         |      Allow      |        Allow        |
| Settings                                        | Read-only mock shell |      Deny       |        Deny         |
| Change settings                                 |         Deny         |      Deny       |        Deny         |
| Account suspension/restoration                  |       Disabled       |    Disabled     |      Disabled       |
| Impersonation/destructive/remote-device actions |       Disabled       |    Disabled     |      Disabled       |

The original roadmap's “limited” viewer/support cells are implemented conservatively through limited domain DTOs and action denial; the executable capability map remains authoritative. Route and mutation permissions are tested separately. The dedicated navigation label is **Stalls & Devices** and its route is `/devices`.

The sign-in placeholder, access-denied page, and minimal `/api/health` liveness response are public. Detailed health is protected. In production, mock identity is ignored and access fails closed until Clerk is connected.

## 5. Mock-data plan

### Minimum deterministic dataset

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

The fixed seed uses fictional Filipino-context business and administrator records. It covers owners and sellers, multiple business types and statuses, users with varied membership/device counts, realistic low-end Android models, current and outdated versions, and healthy/degraded operational relationships. Production exports are prohibited.

### Exact scenario set

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

Scenarios change adapter behavior without page changes. Optional latency is deterministic and bounded. Named failures produce structured results; no unseeded randomness is used in automated tests.

### Mutation behavior

Each mock service instance works from its own mutable copy of immutable seeds. An authorized report update validates a required reason plus any supplied status, severity, fictional administrator assignment, internal note, or resolution; the server supplies the actor from the current session. It applies only that safe non-destructive update and appends an audit event with actor/action/target/reason/outcome and a request/correlation identifier.

Mutation state is process-local: it resets on service reconstruction, hot reload, cold start, build, or deployment, and is not reliably shared between serverless instances. It is not production persistence or a compliance audit trail.

### Preview controls

Local and later authorized preview environments may expose role, scenario, delay, seed-reset, data-reset, and environment controls. Production builds must exclude them and production servers must reject their inputs. This iteration does not deploy a preview or production site.

## 6. Risks and assumptions

| Risk or assumption                                                                                                  | Impact                                                               | Mitigation / gate                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Production schema, migrations, RLS, Clerk mapping, admin-role source, and audit requirements are still unavailable. | A guessed adapter could expose data or corrupt production contracts. | Proceed only with mock/domain work; require discovery before any Supabase/Clerk code or migration.                |
| Mock contracts may diverge from production behavior.                                                                | UI assumptions may not map cleanly.                                  | Keep contracts minimal, use mappers, inspect real systems, and run shared adapter contract tests.                 |
| Process-local mutations are non-durable and instance-local.                                                         | Reviewers may see reset or inconsistent state.                       | Label simulation, isolate tests, never claim production success, and use Supabase transactions later.             |
| Development/preview controls could leak into production.                                                            | Authorization or operational bypass.                                 | Environment-gate, server-reject, production bundle test, and apply ADM-025.                                       |
| Service-result/schema validation may be skipped by a shortcut.                                                      | Runtime drift and brittle error handling.                            | Parse every adapter response with Zod and prohibit casts at the boundary.                                         |
| Role checks may become scattered.                                                                                   | Inconsistent access and bypasses.                                    | Named centralized capabilities; deny unknown routes/actions; test every role pair.                                |
| Mock personal data might resemble a real person.                                                                    | Privacy/reputation risk.                                             | Deterministic fictional generators, masked fields, no copied exports, review fixtures.                            |
| Scope may drift into merchant workflows or financial analytics.                                                     | Duplicates Android product and broadens sensitive access.            | Enforce documented non-goals; require a new decision for elevated financial visibility.                           |
| Dense tables may fail mobile or accessible use.                                                                     | Support workflows become unusable.                                   | Shared responsive alternatives and WCAG 2.2 AA target, including keyboard, 200% zoom, and non-color cues.         |
| Health/scenario fixtures may be mistaken for live platform status.                                                  | Incorrect operational decisions.                                     | Clearly label mock environment and freshness; minimal public liveness; no production use.                         |
| Dashboard metrics may receive different production definitions.                                                     | Misleading comparisons after migration.                              | Calculate in adapters, document definitions/freshness, and do not derive metrics in components.                   |
| Vercel's runtime is ephemeral and horizontally scaled.                                                              | In-memory mutation inconsistency.                                    | Treat deployment as read/demo only until durable adapter exists; production deployment is outside this iteration. |
| Security headers may conflict with future Clerk assets.                                                             | Broken sign-in or weakened CSP.                                      | Start restrictive, add only documented Clerk origins/nonces after integration, test header behavior.              |
| Roadmap recommends preview deployments, but the current instruction says no deployment.                             | Accidental external state change.                                    | Build for Vercel compatibility only; deployment requires a separate user instruction and readiness review.        |

The working assumption is that the mock-first brief intentionally supersedes the earlier “stop entirely” response. It does not authorize any production schema invention, real secrets, real data, migrations, or deployment.
