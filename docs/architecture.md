# Architecture

## Status and scope

This document describes the mock-first foundation for the KitaMo Admin Platform at `admin.kitamo.online`. The application is an internal support and platform-operations tool. It is not the KitaMo merchant Owner dashboard and does not implement checkout, inventory editing, recipes, production, sales or expense entry, subscriptions, detailed merchant financial reporting, impersonation, or destructive account operations.

The secure mock-first beta is complete at baseline commit `b946085`. It uses fictional, deterministic data and does not connect to Clerk or Supabase, define a production database schema, or apply production migrations. Later closure commits document and harden the milestone without changing that boundary. Production integrations must preserve the layers below rather than requiring the UI to be rewritten.

## Architectural principles

1. **The service contract is the data boundary.** Pages and components consume typed service methods or data passed from a server component. They never import seed arrays.
2. **Authorization is a server decision.** Hiding a link or button is only a usability feature. Every protected route and mutation independently validates the current principal and required permission.
3. **Runtime validation complements TypeScript.** Zod schemas validate service data, query inputs, mutation inputs, and boundary outputs where untyped data can enter.
4. **Mock and production adapters share contracts, not storage assumptions.** The future Supabase adapter must conform to the same domain-facing interface but may use database-specific query models internally.
5. **Least privilege is the default.** Read and mutation permissions are explicit. No role gets impersonation, raw-secret access, destructive account actions, or unrestricted merchant financial access.
6. **Operational behavior is observable.** Expected failures have structured, non-sensitive error codes and privileged mock mutations create mock audit events.
7. **Shared semantics remain upstream.** The approved KitaMo Shared Data Contract Baseline governs cross-system terminology, identifiers, time, money, synchronization, and audit meaning. Admin view contracts consume and minimize those semantics; they do not supersede them.

## System context

```text
Browser
  |
  | HTTPS
  v
Next.js App Router on Vercel
  |-- server components / protected layouts
  |-- server actions or route handlers
  |-- authorization policy
  |-- typed AdminService
          |
          +-- current: MockAdminService
          |
          +-- CoreAdminService (R16, ADM-048: Core km_admin_* RPCs, the admin's own aal2 token)
                         |
                         +-- Supabase PostgreSQL + RLS

Current development identity: validated development-only role selection
Future production identity: Clerk session -> verified admin principal/role mapping
```

The browser is an untrusted boundary. Client components may render authorized data already supplied by the server, but they cannot establish identity, grant a role, or perform a privileged write without a fresh server-side decision.

## Application layers

### Presentation

App Router pages, layouts, loading states, error boundaries, tables, filters, and forms comprise the presentation layer. Server components obtain data through the service factory. Client components receive serializable domain view models and invoke only narrow server mutation boundaries.

The navigation covers:

- Overview
- Users and user detail
- Businesses and business detail
- Stalls & Devices (`/devices`)
- Synchronization
- Problem Reports and report detail
- App Versions
- Audit Log
- Settings
- Health or maintenance

Sign-in, access-denied, not-found, loading, empty, and global error experiences sit outside or alongside the protected shell as appropriate.

### Domain contracts

Domain types and their Zod schemas define the vocabulary presented to administrators. The core models are `AdminSession`, `Administrator`, `User`, `Business`, `Stall`, `Device`, `Membership`, `SyncEvent`, `ProblemReport`, `AppVersion`, `AuditEvent`, `SystemHealth`, and `DashboardSummary`.

Identifiers are opaque strings. Timestamps cross boundaries as ISO 8601 UTC strings. Every business carries a validated IANA timezone, with `Asia/Manila` used by the fictional fixture. Relationships use identifiers and intentionally limited summaries rather than exposing storage joins or full transaction records.

The canonical cross-system term is `stall`; `branch` remains a legacy Android SQLite concern and is not introduced into new Admin contracts. UI-oriented fields such as `submittedAt` require explicit mapping to the shared temporal vocabulary in a future adapter. Audit and sync events use `occurredAt` as the Admin camelCase projection of canonical `occurred_at`. See [shared-data-contract-alignment.md](./shared-data-contract-alignment.md).

### Service boundary

The `AdminService` interface exposes the use cases required by the UI:

- `getDashboardSummary`
- `listUsers`
- `getUser`
- `listBusinesses`
- `getBusiness`
- `listStalls`
- `listDevices`
- `listSyncEvents`
- `listProblemReports`
- `getProblemReport`
- `updateProblemReportMock`
- `listAppVersions`
- `listAuditEvents`
- `listAdministrators`
- `getSystemHealth`

List methods own search, filter, and ordering behavior. The mock adapter operates on deterministic seed data. A future Supabase adapter will translate these calls into verified queries without leaking Supabase-specific types into the UI.

### Authorization

A centralized policy maps roles to capabilities. Route guards protect page access; mutation handlers require an action capability. A principal is resolved on the server and is not accepted from form data, query strings, or a client-provided request body.

The current development role mechanism is an explicit mock aid, not production authentication. Production must fail closed until a verified Clerk session and an approved administrator-role source are configured. See [authorization.md](./authorization.md).

### Persistence

Mock reads begin from deterministic fictional seeds. Problem-report changes and the resulting audit entries are process-local, in-memory mutations. They are useful for interaction and authorization tests but:

- do not survive a restart, rebuild, serverless cold start, or deployment;
- are not shared reliably across Vercel instances;
- are not a durable or compliance-grade audit record;
- must not be presented as a successful production operation.

The future persistence adapter is Supabase PostgreSQL with RLS kept enabled. Privileged operations remain server-side, and any service-role credential is server-only. No production tables or policies are specified by the mock implementation.

## Read request flow

1. A request reaches a protected App Router layout or page.
2. The server resolves the current principal through the active identity adapter.
3. The authorization module checks the route capability.
4. The page obtains an `AdminService` through the server-side service factory.
5. The service validates filters, reads from its adapter, and returns validated domain data.
6. The server renders the page. Only the minimum required DTO reaches client components.
7. Known failures render bounded empty, denied, or error states; unexpected details remain in server logs.

## Mutation request flow

The only first-iteration business mutation is a mock problem-report update.

1. A server action or route handler receives the request.
2. The server resolves the principal again.
3. The policy requires the report-update capability.
4. The server supplies the actor from the current session; Zod validates the target identifier, required reason, and any status, severity, fictional assignment, internal note, or resolution.
5. The service verifies the target and allowed transition, then updates the process-local mock state.
6. The same service operation appends a mock audit event containing the actor user and role, stable action, target and applicable business/stall context, reason code and note, redacted before/after state, outcome, UTC occurrence time, masked source, applicable device/version context, and correlation ID.
7. The boundary returns a narrow success result or a structured safe error.

The UI's prior authorization state is never proof that the mutation is authorized.

## Controlled latency and failure behavior

The mock service supports opt-in latency and controlled failures through server-side configuration or dependency injection. Defaults should be fast and successful. Controls must be:

- deterministic enough for repeatable tests;
- bounded so a configured delay cannot tie up a request indefinitely;
- represented as structured service errors;
- disabled or unavailable in production builds;
- independent of browser-supplied role or privilege data.

This provides loading, empty, degraded, and error-state coverage without random test flakiness.

## Deployment architecture

The application is built for the Next.js Vercel runtime and the target host `admin.kitamo.online`. This iteration does not deploy production infrastructure. Before deployment:

- production authentication must be fail-closed and backed by Clerk;
- the administrator-role source and Clerk-to-Supabase mapping must be approved;
- the Supabase schema, migrations, and RLS policies must be inspected;
- mock role switching, mock failure controls, and process-local writes must be disabled or clearly isolated;
- secrets must be configured only in the deployment environment;
- security headers, logs, health responses, and error redaction must be verified.

Vercel's multi-instance and ephemeral runtime make the mock mutation store intentionally non-durable. It is not a substitute for Supabase.

## Quality strategy

Unit tests cover schemas, service contracts, filters, policy decisions, report updates, and audit creation. Playwright covers public/protected routing, role access, primary smoke paths, empty states, and controlled errors. Type checking, linting, formatting checks, unit tests, browser tests, and a production build are separate gates.

The interface targets WCAG 2.2 AA practices. Verification includes keyboard-only use, visible focus, semantic headings and tables, labels and announced state changes, non-color status cues, reduced motion, appropriate contrast/touch targets, 200% zoom, screen-reader spot checks, and mobile/tablet/desktop widths.

This architecture was reverified during mock-first beta closure. Current command results, test counts, accessibility/responsive scope, and remaining production gates are recorded in [mock-first-beta-closure.md](./mock-first-beta-closure.md).
