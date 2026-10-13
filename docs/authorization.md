# Authorization

## Objective

Authorization protects KitaMo support and operations data independently of the interface. Navigation visibility and disabled controls explain access; they do not enforce it. Protected layouts, pages, server actions, and route handlers all use the centralized policy.

This iteration recognizes three administrator roles:

- `super_admin`
- `support_admin`
- `operations_viewer`

These administrator roles are distinct from Supabase business, stall, and membership roles. Clerk Organizations must not be used to represent KitaMo businesses or stalls.

## Identity and authorization boundary

The identity adapter resolves a server-side `AdminSession`, which is the current administrator principal. The authorization module then answers whether that principal has a named capability.

```text
request
  -> server-side identity adapter
  -> AdminSession or unauthenticated
  -> centralized capability policy
  -> allow, redirect/deny, or structured 401/403
```

A role or actor identifier submitted by a client is untrusted. Mutation code must resolve the principal from the request context again and must not accept a role switch value as production identity.

## Initial role intent

- **`super_admin`** administers the platform foundation and can perform every non-destructive capability implemented in this mock iteration.
- **`support_admin`** investigates users, businesses, devices, synchronization issues, and problem reports, and may perform the narrowly defined mock report update.
- **`operations_viewer`** monitors limited/masked user and business context, stalls/devices, operational health, synchronization, versions, reports, and audit posture without mutations.

No initial role may impersonate users, view credentials or merchant PINs, perform destructive account actions, or browse unrestricted merchant financial or transaction details.

## Permission matrix

The executable policy module is authoritative. The intended first-iteration matrix is:

| Capability                                             | `super_admin` | `support_admin` | `operations_viewer` |
| ------------------------------------------------------ | :-----------: | :-------------: | :-----------------: |
| View overview                                          |     Allow     |      Allow      |        Allow        |
| View users and user detail through limited/masked DTOs |     Allow     |      Allow      |        Allow        |
| View businesses and limited business detail            |     Allow     |      Allow      |        Allow        |
| View stalls and connected devices                      |     Allow     |      Allow      |        Allow        |
| View synchronization events                            |     Allow     |      Allow      |        Allow        |
| View problem reports and report detail                 |     Allow     |      Allow      |        Allow        |
| Update mock problem-report status or internal note     |     Allow     |      Allow      |        Deny         |
| View app versions                                      |     Allow     |      Allow      |        Allow        |
| View audit log                                         |     Allow     |      Allow      |        Allow        |
| View system health / maintenance                       |     Allow     |      Allow      |        Allow        |
| View read-only mock settings                           |     Allow     |      Deny       |        Deny         |
| Change settings                                        |     Deny      |      Deny       |        Deny         |

All destructive, impersonation, credential-access, raw-financial-data, and production-mutation capabilities are denied because they do not exist in this iteration.

Route access and action access are separate capabilities. For example, permission to read a problem report does not imply permission to update it.

The executable capability vocabulary is:

- `overview:read`
- `users:read`
- `businesses:read`
- `devices:read`
- `synchronization:read`
- `problem_reports:read`
- `problem_reports:update`
- `app_versions:read`
- `audit_log:read`
- `settings:read`
- `health:read`

There is deliberately no settings-update capability in the mock beta.

## Route behavior

Public routes include the sign-in placeholder and access-denied experience. A health route may be unauthenticated only if it returns a minimal liveness response with no dependency, configuration, build-secret, or user information; the richer health/maintenance page remains protected.

For protected pages:

- unauthenticated requests go to the sign-in placeholder with a safe relative return path;
- authenticated but unauthorized requests go to access denied or receive a `403`, depending on whether the request expects HTML or structured data;
- authorized requests continue to the page-level service call;
- unknown resources return not found only after the caller is allowed to access that resource type.

Redirect targets are restricted to local relative paths to prevent open redirects.

## Mutation behavior

Every mock problem-report update must:

1. resolve the current principal on the server;
2. require the report-update capability;
3. supply the actor from that session and parse the report ID, required reason, and any status, severity, assignment, note, or resolution fields with the mutation Zod schema;
4. verify the target, referenced fictional administrator, and requested transition are allowed;
5. update only the process-local mock store;
6. create a corresponding mock audit event with actor, role, reason/outcome, and correlation ID;
7. return a narrow serializable result or a structured, redacted error.

The server must reject the action even if a stale or modified browser displays an update control.

## Development-only role switching

The role switcher is a test and demonstration feature. In the current implementation it is enabled only when `NODE_ENV` is exactly `development` or `test`; a normal production build, including an unmodified Vercel production-mode build, ignores the mock-role cookie. Any later preview-mode support described by ADM-016/ADM-024 requires a separately reviewed, explicit preview identity mechanism that remains impossible to activate on the production domain.

The switcher must satisfy all of the following:

- rendered only outside production;
- accepts only the three enumerated roles;
- validates the selected role on the server;
- uses an explicit development identity adapter;
- is ignored or rejected when `NODE_ENV` is `production`;
- cannot become a fallback production administrator;
- does not model a real Clerk session or production role assignment.

The mock development session is not a security boundary against a local developer. It exists to exercise policy behavior. Browser and role-access tests should verify that invalid roles fail closed and that the switcher is absent from a production build.

## R16: Core is the gate (ADM-048)

A KitaMo session is the `super_admin` role. The site's checks only route the
browser; Core authorizes every read and write: each `km_admin_*` reader and
the four admin-log writers call `km_admin_can` first (the `admin` switch,
`aal2`, a live `platform_admins` row, no business owned, no live manager row)
and answer one `KM005` for every refusal. Summary and Records need a live
access of their own (30 minutes, a reason; Records also an open flag of the
business or a reference) and are never inherited.

The R16 permissions route the pages: `flags:read`, `flags:update`,
`business_access:open` (open and close an access) and `associations:read`.
`super_admin` holds all of them; the two mock roles read flags and
associations only. Parked mock-first sections answer 404 to a KitaMo session.

## Future Clerk and Supabase authorization

Production integration requires an approved mapping:

1. Clerk verifies the human session.
2. A stable Clerk user identifier maps to the existing KitaMo/Supabase user identity according to the inspected production contract.
3. The server resolves administrator assignment from the approved authoritative source.
4. The policy converts that assignment to the narrow `AdminSession` principal.
5. Supabase queries continue to run with RLS enabled.

Administrator roles must not be trusted solely from editable client metadata. The role-assignment source, revocation behavior, session freshness, break-glass process, and audit requirements are unresolved until the existing systems are inspected.

If a server-side Supabase service-role client is eventually necessary, it must be isolated to server-only modules, invoked only after application authorization, and limited to narrowly defined operations. It must never reach browser code. Prefer user-scoped/RLS-enforced access where the existing architecture supports it.

## Test expectations

Policy unit tests should cover every role/capability pair, unauthenticated principals, unknown or malformed roles, and deny-by-default behavior for new capabilities. Route tests should cover public, unauthenticated, authenticated-denied, and authorized cases. Mutation tests should prove that viewer and unauthenticated requests cannot change mock state or create a success audit event.

No passing status is asserted here; results belong in the implementation summary or CI output.
