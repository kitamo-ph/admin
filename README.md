# KitaMo Admin Platform

Internal, mock-first support and platform-operations application for KitaMo.
The intended production host is `admin.kitamo.online`.

**Current phase: R16, the Core-backed super admin (ADM-048, signed off by
the lead on 2026-10-14).** The secure mock-first beta is complete and closed.
For R16 only, ADM-048 lifts ADM-041, ADM-044 (in part) and ADM-047: a
read-only super-admin site that signs in with KitaMo's Auth at `aal2` and
reads only through Core's `km_admin_*` RPCs with the administrator's own
token. No service-role key, no Clerk, no module schema. The canonical local
repository path is `~/Documents/KitaMo-ph/admin`, and the authoritative
remote is `kitamo-ph/admin`.

This application helps authorized administrators inspect users and businesses,
monitor connected devices and synchronization health, triage problem reports,
review app-version adoption, and follow an auditable operational trail. It is
not the merchant Owner dashboard: checkout, inventory, recipes, production,
sales or expense entry, subscriptions, detailed merchant financial reporting,
account impersonation, and destructive account operations are intentionally
outside its scope.

In R16 the site has two adapters behind one `AdminService`:

- **Core** (production): every call is one `POST /rest/v1/rpc/<fn>` to
  KitaMo's Supabase with the anon key and the signed-in administrator's own
  `aal2` token. Core's `km_admin_can` is the gate and logs every read; the
  site's own checks only route the browser. Replies are parsed with strict
  zod schemas that fail closed on an unknown key.
- **Mock** (development and tests only): deterministic fictional data with
  Core's rules. A production runtime never serves it.

This repository creates no tables and applies no migrations; Core's
`0083_admin_expand` and `0084_admin` live in seller-web.

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
runtime ignores it; there, only a KitaMo `aal2` session that Core accepts is
an administrator (R16 uses only `super_admin`, ADM-048).

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

- `/sign-in`, `/mfa` and `/mfa/enroll` (the last two need a KitaMo password
  session)
- `/access-denied`
- `/api/session` (sign-in, sign-out, MFA; same-origin only)
- `/api/health` — minimal liveness only; no dependency or secret details

Protected, R16 (every link `prefetch={false}`):

- `/overview` — the directory's totals, counts only
- `/businesses` — the directory (no reason; every view logged by Core)
- `/businesses/[businessId]` — the reason sheet, then the Summary
- `/businesses/[businessId]/records` — Records, behind a records access
- `/flags` — leads, not proof; review with a note
- `/audit-log` — the access log (nav label "Access log")
- `/associations` — a stub until the HOA level (the JR's 0086)

Parked until R23 (development role cookie only; a KitaMo session gets 404):
`/users`, `/devices`, `/synchronization`, `/problem-reports`,
`/app-versions`, `/settings`, `/health`. `/maintenance` stays.

Unauthenticated protected navigation redirects to `/sign-in` with a validated
same-origin return path. Authenticated requests without a route capability go
to `/access-denied`. A page or action must still perform its own server-side
check; the request proxy is defense in depth.

## Environment variables

`.env.example` intentionally contains variable names with blank values only.
Values live in Vercel's environment settings, never in the repository:

| Variable                         | Exposure    | Purpose                                                                     |
| -------------------------------- | ----------- | --------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`            | Browser     | Canonical application URL                                                   |
| `KITAMO_SUPABASE_URL`            | Server only | KitaMo's Supabase project URL (Auth and PostgREST)                          |
| `KITAMO_SUPABASE_ANON_KEY`       | Server only | KitaMo's anon key (public by design; the admin's token carries the rights)  |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Browser     | Turnstile on the sign-in (Cloudflare's test keys are refused in production) |
| `KITAMO_AUTH_TEST_CAPTCHA_TOKEN` | Server only | Local tests only, with a loopback Auth; never set in Vercel                 |
| `MOCK_ADMIN_ENABLED`             | Server only | Reserved marker; never grants administrator access                          |
| `MOCK_ADMIN_SCENARIO`            | Server only | Controlled mock scenario (development and tests)                            |
| `MOCK_ADMIN_LATENCY_MS`          | Server only | Controlled mock delay (development and tests)                               |

There is no service-role key (ADM-048). `npm run security:check` refuses any
service-role name in application code and in `.env.example`, and
`npm run security:bundle` refuses it, and the server-only env names, in the
browser bundle:

```bash
npm run security:check
```

See [Security and threat model](docs/security.md) for the complete controls and
known production gaps.

## Sign-in (R16)

Copied from Operations' console (D19's module sign-in, operations `dbe4ca6`):

1. `/sign-in`: email, password and Turnstile, posted to `/api/session`, which
   calls KitaMo's Auth by plain `fetch` (no SDK) and checks the token with the
   vendored ES256 check (`lib/auth/vendor/kitamo-login.ts`, sha256-pinned by
   `tests/unit/kitamo-login.test.ts`). Staff (anonymous) sign-ins are refused.
2. `/mfa/enroll` (first time) or `/mfa`: the authenticator-app (TOTP) code
   through Auth's `/factors` endpoints; the session becomes `aal2`.
3. Every request: the 30-minute idle, the ES256 check, `aal2`, then Core's
   `km_admin_session`. Core's `KM005` is one "Not permitted" page: not the
   admin account, an account that owns or manages a business, or the `admin`
   switch off.

Sessions live in host-only httpOnly cookies (`adm_at`, `adm_rt`, `adm_seen`).
The development role chooser still exists in development and test only.

## R16 operations runbook

1. **The first `platform_admins` row** is an operator SQL step with a reason;
   there is no client path (no grant, no function). In the SQL editor:

   ```sql
   insert into public.platform_admins (user_id, label, added_reason)
   select id, 'Owner', 'R16 (OQ14): the owner''s separate admin account, added by <operator> on <date>'
     from auth.users where email = '<the admin email>';
   ```

   Core's guard refuses an account that owns a business or has a live
   manager row. Ending one is
   `update … set ended_at = now(), ended_reason = '<why, 20+ characters>'`.

2. **TOTP must be on** for KitaMo's hosted Auth project (Authentication →
   Multi-Factor → "App Authenticator (TOTP)"). If it is off, `/mfa/enroll`
   says so in plain words (Auth's `mfa_totp_enroll_not_enabled`).
3. **The owner enrols TOTP** on the admin site's `/mfa/enroll`, on the admin
   account only.
4. **Never create a business on the admin account.** Opening the KitaMo app
   with it lands on `/setup`; creating a business there makes Core refuse the
   account here (fail-safe), and the account then needs a new
   `platform_admins` row on a clean account.
5. **The lead flips `admin`** after the smoke and the lawyer's OK (Q-L9):
   `update public.km_switches set enabled = true, changed_at = now(), note = '<why>' where name = 'admin'`.
   While it is off, every admin call answers `KM005` and the site shows "Not
   permitted".
6. **OQ22 (a rule, not a lock):** before reading or fixing one business's
   records in the SQL editor, open an access on this site with the reason.
   Release preflights stay counts only (D27 §4.4).
7. **Vercel Hobby:** links do not prefetch and nothing polls (the access
   banner's minutes tick on a local clock), so one administrator is a few
   thousand invocations a month.

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
npm run security:bundle
npm run test:e2e
```

`security:bundle` runs after a production build and verifies that browser
chunks contain neither privileged key names nor development mock-auth/scenario
controls. The combined `quality` command runs it in the correct order.

`npm run test:e2e` starts a loopback stub of KitaMo's Auth and Core
(`tests/e2e/stub/kitamo-stub.ts`, port 3199: GoTrue REST and PostgREST RPCs,
ES256 tokens signed with a key made at start-up) and an isolated development
server at `http://127.0.0.1:3100` pointed at it, unless they are already
running. No test calls a hosted service. `kitamo.spec.ts` drives the real
sign-in to `aal2` and the Core adapter; the other specs use the mock role
cookie. It runs desktop
Chromium, a Pixel 7 profile, and a dedicated responsive Chromium project over
320, 412, 768, 1440, and 1920 CSS-pixel widths. The tests set the development
role cookie directly to verify authentication and authorization without
coupling every case to the sign-in form. They include focused keyboard,
semantic, form-label, heading, navigation, table-overflow, and page-overflow
checks; these smokes complement rather than replace human assistive-technology
review.

Combined commands:

```bash
npm run quality  # format, lint, types, unit, source/bundle security, build
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

> **Superseded for R16 by ADM-048:** Clerk is dropped from the plan and the
> identity source is KitaMo's Auth; the Core adapter above replaces the
> service-role adapter described here. The rest of this section stays as the
> record of the mock-first gate for scope beyond R16.

The sibling Android repository at `kitamo-ph/owner-seller-mobile` has been
inspected as evidence of the current local-first SQLite domain, migrations,
repositories, protected workflows, local problem reports, and future
identity/cloud planning. It does not provide the missing production cloud
contracts. Production integration remains gated on the machine-readable
`kitamo-ph/shared-contracts` workstream, approved Android compatibility
mappings, Supabase migration history and RLS policies, Clerk-to-Supabase
identity mapping, administrator-assignment source, production sync envelope,
durable problem-report and audit contracts, and account lifecycle rules.

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

> **R16 (ADM-048):** `admin.kitamo.online` may be deployed as its own Vercel
> project, after the owner's DNS and Turnstile host steps (STEP5 §4), with
> the `admin` switch still off until the lead flips it.

Before R16 this iteration was deployment-compatible but not to be deployed to
the production domain.

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
- [Mock-first beta closure](docs/mock-first-beta-closure.md)
