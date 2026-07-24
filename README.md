# KitaMo Admin Platform

Internal, mock-first support and platform-operations application for KitaMo.
The intended production host is `admin.kitamo.online`.

This application helps authorized administrators inspect users and businesses,
monitor connected devices and synchronization health, triage problem reports,
review app-version adoption, and follow an auditable operational trail. It is
not the merchant Owner dashboard: checkout, inventory, recipes, production,
sales or expense entry, subscriptions, detailed merchant financial reporting,
account impersonation, and destructive account operations are intentionally
outside its scope.

The current iteration uses deterministic fictional data. It does not connect
to production Clerk or Supabase, create database tables, or apply migrations.

## Technology

- Next.js App Router, React, and TypeScript
- Tailwind CSS
- Zod runtime validation
- Vitest unit and service tests
- Playwright route and role-access tests
- ESLint and Prettier
- Vercel-compatible Next.js configuration

Node.js `>=20.19.0` is required.

## Local setup

```bash
git clone https://github.com/kitamo-ph/admin.git
cd admin
npm ci
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000/sign-in](http://localhost:3000/sign-in). In a
development runtime, choose one of the three fictional administrator roles.
No Clerk or Supabase credentials are required for mock-mode development.

`.env.local` is optional for the default, zero-latency `normal` mock scenario.
Keep it untracked. Never paste production credentials into source files, test
fixtures, issue descriptions, screenshots, or commits.

## Architecture

All UI data follows one replaceable boundary:

```text
App Router pages and components
              |
              v
        AdminService
              |
              +-- MockAdminService (current)
              |
              +-- SupabaseAdminService (future)
```

Pages and components must not import seed arrays or a Supabase client. Domain
models and Zod schemas define the application-facing contract; adapters map
their own storage representation into those validated models. This keeps the
mock implementation useful while avoiding guessed production tables,
relationships, roles, or API contracts.

Important areas:

```text
app/                    App Router pages, layouts, route handlers, and errors
components/             Shared layout, filters, feedback, and UI primitives
lib/admin/              Domain schemas, service contract, and service adapters
lib/auth/               Central roles, permissions, sessions, and route rules
tests/unit/             Authorization, schema, service, and utility coverage
tests/e2e/              Public/protected route and role-access smoke coverage
docs/                   Architecture, authorization, security, and migration plans
scripts/                Repository security checks
```

The browser is untrusted. Protected pages resolve the administrator session on
the server, route access is checked centrally, and every allowed mock mutation
rechecks its action permission at a server boundary. Hiding navigation or an
update form is only a usability measure, not authorization.

See [Architecture](docs/architecture.md),
[Shared data contract alignment](docs/shared-data-contract-alignment.md),
[Mock data contracts](docs/mock-data-contracts.md), and
[Decision log](docs/decision-log.md) for the detailed design.

## Mock mode

All names, email addresses, businesses, devices, support reports, and audit
events are synthetic. The fixed dataset includes Filipino micro-business
examples, healthy and failed synchronization, pending retries, low-end Android
devices, old app versions, unresolved reports, and healthy/degraded health
indicators. It must never be replaced with a production export.

Mock behavior is selected through trusted server environment variables and is
never accepted from an arbitrary browser query, form value, or client bundle:

| Variable                | Purpose                                                         |
| ----------------------- | --------------------------------------------------------------- |
| `MOCK_ADMIN_SCENARIO`   | Named deterministic scenario; defaults to `normal` when absent  |
| `MOCK_ADMIN_LATENCY_MS` | Fixed artificial latency, bounded from 0 to 10,000 milliseconds |

Supported scenarios:

| Scenario                 | Intended state                                                   |
| ------------------------ | ---------------------------------------------------------------- |
| `normal`                 | Complete, current, successful mock responses                     |
| `slow`                   | Deterministic latency for loading-state review                   |
| `empty`                  | Valid responses with no list records                             |
| `partial_failure`        | Bounded partial-data behavior with a structured warning or error |
| `backend_unavailable`    | Safe, retryable service-unavailable behavior                     |
| `maintenance`            | Controlled maintenance response                                  |
| `stale_data`             | Successful results marked with stale metadata                    |
| `permission_denied`      | Controlled service-level denial                                  |
| `high_sync_failure`      | A dataset weighted toward failed synchronization                 |
| `outdated_version_spike` | A dataset weighted toward old application versions               |

For example, stop the development server and restart it with a scenario:

```bash
MOCK_ADMIN_SCENARIO=empty npm run dev
MOCK_ADMIN_SCENARIO=backend_unavailable npm run dev
MOCK_ADMIN_LATENCY_MS=800 npm run dev
```

Mock problem-report updates and their audit entries are process-local. They do
not survive a restart, rebuild, serverless cold start, or deployment, and they
are not compliance-grade audit storage.

## Development authentication and roles

The role chooser and role switcher exist only when `NODE_ENV` is
`development` or `test`. The server accepts the HttpOnly
`kitamo_admin_mock_role` cookie only in those environments. A production
runtime ignores it and fails closed until Clerk is connected.

| Capability                                            | Super admin | Support admin | Operations viewer |
| ----------------------------------------------------- | :---------: | :-----------: | :---------------: |
| Overview, users, businesses, devices, sync, versions  |    Read     |     Read      |       Read        |
| Problem reports                                       | Read/update |  Read/update  |       Read        |
| Audit log and detailed health                         |    Read     |     Read      |       Read        |
| Read-only mock settings                               |    Read     |    Denied     |      Denied       |
| Settings mutation, impersonation, destructive actions |   Denied    |    Denied     |      Denied       |

Business, stall, membership, Owner, and Seller roles remain Supabase domain
concepts. Clerk Organizations must not be used to model KitaMo businesses.
The executable permission matrix in `lib/auth/authorization.ts` is
authoritative; [Authorization](docs/authorization.md) records its rationale.

## Routes

Public:

- `/sign-in`
- `/access-denied`
- `/api/health` — minimal mock liveness only; no dependency or secret details

Protected:

- `/overview`
- `/users` and `/users/[userId]`
- `/businesses` and `/businesses/[businessId]`
- `/devices`
- `/synchronization`
- `/problem-reports` and `/problem-reports/[reportId]`
- `/app-versions`
- `/audit-log`
- `/settings` — `super_admin` only
- `/health` and `/maintenance`

Unauthenticated protected navigation redirects to `/sign-in` with a validated
same-origin return path. Authenticated requests without a route capability go
to `/access-denied`. A page or action must still perform its own server-side
check; the request proxy is defense in depth.

## Environment variables

`.env.example` intentionally contains variable names with blank values only.
Classify them before use:

| Variable                            | Exposure    | Current purpose                                    |
| ----------------------------------- | ----------- | -------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`               | Browser     | Canonical application URL                          |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Browser     | Future Clerk publishable key                       |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`     | Browser     | Future Clerk sign-in route                         |
| `CLERK_SECRET_KEY`                  | Server only | Future Clerk server authentication                 |
| `CLERK_WEBHOOK_SIGNING_SECRET`      | Server only | Future Clerk webhook verification                  |
| `SUPABASE_URL`                      | Server only | Future Supabase project URL                        |
| `SUPABASE_ANON_KEY`                 | Server only | Future user-scoped/RLS client in this architecture |
| `SUPABASE_SERVICE_ROLE_KEY`         | Server only | Future privileged adapter, if narrowly approved    |
| `MOCK_ADMIN_ENABLED`                | Server only | Reserved marker; never grants administrator access |
| `MOCK_ADMIN_SCENARIO`               | Server only | Controlled mock scenario                           |
| `MOCK_ADMIN_LATENCY_MS`             | Server only | Controlled mock delay                              |

Only variables deliberately prefixed `NEXT_PUBLIC_` may reach browser code.
Never rename a secret with that prefix. In particular,
`SUPABASE_SERVICE_ROLE_KEY`, `CLERK_SECRET_KEY`, and webhook signing material
must stay in server-only modules and deployment secret storage.

The repository security check rejects privileged variable names in browser
modules:

```bash
npm run security:check
```

See [Security and threat model](docs/security.md) for the complete controls and
known production gaps.

## Testing and quality gates

Install the Playwright browser once:

```bash
npx playwright install chromium
```

Run individual gates:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run security:check
npm run build
npm run test:e2e
```

`npm run test:e2e` starts an isolated development server at
`http://127.0.0.1:3100` unless one is already running there. It runs desktop
Chromium and a Pixel 7 profile. The tests set the development role cookie
directly to verify authentication and authorization without coupling every
case to the sign-in form.

Combined commands:

```bash
npm run quality  # formatting, lint, types, unit tests, secret check, build
npm run verify   # quality plus Playwright
```

CI runs `quality` and Chromium smoke tests for pull requests and pushes to
`main`. Passing tests do not make the mock identity or in-memory data suitable
for production.

## Security posture

- No production secrets or real personal data belong in the repository.
- The Supabase service-role key must never enter a client component or bundle.
- Clerk secrets and raw sessions remain server-only.
- Production Supabase Row Level Security stays enabled.
- Privileged actions require fresh server authentication, authorization, Zod
  validation, and an audit record.
- No unrestricted merchant financial data, credentials, PINs, impersonation,
  account suspension, destructive actions, or remote device controls exist.
- Known errors use structured, browser-safe responses and correlation IDs.
- Security headers deny framing, disable unused browser capabilities, restrict
  content sources, prevent MIME sniffing, and limit referrer disclosure.

The public health endpoint reports only application liveness and mock mode.
Operational health details remain behind administrator access.

## Future Clerk and Supabase integration

Production integration is intentionally gated on inspecting the existing
Android repository, Supabase migration history and RLS policies,
Clerk-to-Supabase identity mapping, administrator-assignment source, sync and
problem-report contracts, audit requirements, and the versioned,
machine-readable artifacts governed by the approved KitaMo Shared Data
Contract Baseline.

When those dependencies are available:

1. Freeze and contract-test the domain-facing `AdminService`.
2. Verify Clerk sessions in the server identity adapter.
3. Map Clerk's immutable subject to the existing KitaMo user mapping.
4. Resolve active administrator assignments from the approved authoritative
   source; do not trust browser-editable metadata.
5. Implement a server-only `SupabaseAdminService` that maps existing rows,
   views, or approved RPC results into Zod-validated domain models.
6. Keep RLS enabled, prefer user-scoped access, and use a service-role client
   only for a narrowly reviewed server use case.
7. Run the same service contract suite against mock and Supabase adapters.
8. Migrate reads before writes. Add durable report mutations only after their
   authorization, concurrency, RLS, and transactional audit behavior are
   approved.
9. Remove mock identity, scenarios, and process-local mutation behavior from
   production.

Do not create tables, relationships, policies, administrator metadata, or
migrations merely to fit the mock UI. The full gate is documented in the
[Supabase migration plan](docs/supabase-migration-plan.md).

## Future Vercel deployment

This iteration is deployment-compatible but must not be deployed to the
production domain yet.

Before a Vercel deployment:

- connect the GitHub repository and require the CI quality gates;
- configure environment variables separately for Development, Preview, and
  Production in Vercel rather than committing `.env.local`;
- use a restricted internal preview or beta hostname first;
- verify the security headers and Clerk-compatible CSP in that environment;
- verify that production builds show no role/scenario controls and ignore mock
  cookies;
- configure Clerk allowed origins, callbacks, and the custom domain;
- complete Supabase/RLS, audit, logging, monitoring, backup, incident, and
  rollback reviews;
- only then attach `admin.kitamo.online`.

Vercel instances do not make the in-memory mock mutation store durable or
consistent. A successful preview is product-review evidence, not production
readiness.

## Documentation

- [Architecture](docs/architecture.md)
- [Shared data contract alignment](docs/shared-data-contract-alignment.md)
- [Authorization](docs/authorization.md)
- [Security and threat model](docs/security.md)
- [Mock data contracts](docs/mock-data-contracts.md)
- [Supabase migration plan](docs/supabase-migration-plan.md)
- [Implementation plan](docs/implementation-plan.md)
- [Decision log](docs/decision-log.md)
