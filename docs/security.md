# Security and Threat Model

## Security posture

The mock-first KitaMo Admin Platform is production-structured but is not production-connected. It uses fictional operational data and development identity controls to exercise the product. It does not provide production Clerk authentication, Supabase access, durable audit storage, account suspension, impersonation, destructive operations, remote device control, or unrestricted merchant financial access.

The target production posture is Clerk-authenticated, server-authorized, Supabase-backed, RLS-enforced, least-privilege access on Vercel. Production readiness is a later gate. This iteration must not be deployed to the production domain.

## Protected assets

- Administrator identity and role assignments
- KitaMo user, business, membership, stall, device, sync, report, version, and audit metadata
- Internal support notes and operational incident context
- Clerk secrets, Supabase credentials, signing material, and deployment configuration
- Integrity of privileged support mutations and their audit trail
- Availability and trustworthiness of operational health information

Even fictional data should be handled through the same architectural boundaries so insecure prototype practices do not become production behavior.

## Trust boundaries

1. **Browser to Next.js server.** Browser input, cookies, query parameters, headers, form data, and client state are untrusted.
2. **Next.js server to identity provider.** The future Clerk integration must verify sessions server-side.
3. **Identity to administrator assignment.** A Clerk identity is not automatically an administrator; the approved role source must be resolved and revocable.
4. **Application to data adapter.** The UI consumes domain contracts; only the server-side adapter may access Supabase.
5. **Supabase API to PostgreSQL/RLS.** RLS remains enabled. Elevated credentials, if ever required, do not replace application authorization.
6. **Deployment configuration to runtime.** Public environment values and server secrets are separately validated.
7. **Mock controls to production.** Role, scenario, delay, seed-reset, and data-reset controls are test tooling and must be excluded from production builds.

## Threat analysis

| Threat                       | Example                                                                   | Required mitigation                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Broken access control        | A viewer posts directly to a report-update action                         | Re-resolve the principal and check the action capability on every server mutation.                                       |
| Role spoofing                | A request submits `super_admin` in form data or an edited cookie          | Accept roles only through the active server identity adapter; validate enums; ignore mock identity in production.        |
| Production fail-open         | Clerk is unavailable and the app grants a default role                    | Fail closed. No verified principal means no protected access.                                                            |
| Direct object reference      | An authorized user guesses a user/report ID outside their capability      | Authorize the resource type first, use opaque IDs, and query only permitted fields.                                      |
| Injection or malformed input | Filter or internal note contains unexpected input                         | Parse query and mutation input with Zod; parameterize future database queries; escape rendered text.                     |
| Secret disclosure            | A service-role key is imported into a client component                    | Keep secrets in server-only modules and deployment storage; inspect browser bundles and source control.                  |
| Overbroad data exposure      | Support view returns full transactions or authentication data             | Use minimal domain DTOs, masked email/IP fields, bounded queries, and explicit exclusions.                               |
| Audit tampering or omission  | A mutation changes a report without a corresponding event                 | Create audit evidence in the same service use case; future storage must make the mutation and audit write transactional. |
| Error leakage                | A failure page renders stack traces, SQL, or configuration                | Return structured safe errors and correlation/request IDs; retain diagnostic details in protected server logs only.      |
| Open redirect                | Sign-in accepts an external `returnTo` URL                                | Allow only validated local relative paths and reject reserved authentication loops.                                      |
| XSS                          | A support note or query string is rendered as HTML                        | Use React escaping, prohibit unsafe HTML by default, and adopt a restrictive content security policy.                    |
| CSRF                         | A third-party site triggers a cookie-authenticated mutation               | Use same-site cookies, origin/host validation where relevant, and framework-supported server-action protections.         |
| Clickjacking                 | Admin UI is framed by another origin                                      | Set `frame-ancestors 'none'` in CSP and/or `X-Frame-Options: DENY`.                                                      |
| Cache leakage                | Personalized admin responses are stored in a shared cache                 | Mark protected and mutation responses private/no-store; avoid public caching of identity-dependent content.              |
| Denial of service            | Unbounded filters or mock delay hold server resources                     | Bound pagination, search length, payload size, and artificial delay; add production rate limits later.                   |
| Scenario-control abuse       | A client enables `permission_denied` or resets shared state in production | Exclude preview controls from production bundles and reject mock scenario configuration in production.                   |
| Misleading health output     | Public health leaks dependencies or reports a fixture as real status      | Keep public liveness minimal; label mock health; protect detailed maintenance views.                                     |
| Serverless consistency error | A mock update appears on one Vercel instance only                         | Clearly label process-local simulation; do not use mock mutations for production or durable audit claims.                |
| Supply-chain compromise      | A package update introduces malicious code                                | Pin dependencies, review lockfile changes, run vulnerability/secret scanning, and minimize dependencies.                 |

## Authorization requirements

Authorization uses named capabilities and denies by default. Direct route navigation and server mutations are protected independently. The role matrix and development behavior are in [authorization.md](./authorization.md).

No role in the mock beta can:

- impersonate a merchant or administrator;
- view passwords, PINs, tokens, signing material, or raw sessions;
- suspend, restore, delete, or remotely control an account/device;
- browse complete merchant transaction or financial ledgers;
- manage production role assignments or RLS policy through the UI.

The settings area is read-only for `super_admin` and denied to the other roles in the mock beta. There is no settings-mutation capability. Any later privileged setting mutation requires its own capability, validation, audit requirement, and decision record.

## Identity controls

### Current mock identity

The development role switcher is not real authentication. It is allowed only in local development, test, and explicitly designated preview builds. Values are validated on the server and limited to the three known roles.

Production code must ignore or reject a mock-role cookie and fail closed until the Clerk resolver is wired. A build-level check should verify that role, scenario, delay, seed-reset, and data-reset controls do not appear in the production bundle or rendered UI.

### Future Clerk identity

The production integration must:

- validate the Clerk session on the server;
- use a stable subject identifier rather than mutable email as the primary mapping;
- resolve administrator status from the approved authoritative source;
- define assignment, revocation, stale-session, and emergency-access procedures;
- avoid trusting browser-readable or user-editable metadata for authorization;
- keep Clerk secret keys server-only.

Clerk Organizations are not the source of KitaMo business, stall, membership, or operational roles.

## Supabase and RLS requirements

- Inspect the existing schema, migration history, RLS policies, functions, triggers, and grants before implementing the adapter.
- Keep RLS enabled on all production data paths.
- Prefer user-scoped, RLS-enforced access.
- If a service-role client is approved, isolate it in a server-only module after application authorization and expose only narrow use cases.
- Never prefix a service-role or Clerk secret as a public environment variable.
- Select only fields needed for the current domain DTO.
- Validate the approved shared-contract/schema version and fail closed on an unknown breaking version.
- Parameterize queries and bound pagination.
- Make privileged mutation and audit persistence atomic where the existing schema supports it.
- Do not create guessed tables, relationships, roles, or production migrations.

## Data minimization and privacy

Visible mock records may include fictional display names, masked contact data, business/stall names, account and membership state, safe device/app metadata, sync status, support metadata, and audit metadata.

Excluded data includes credentials, tokens, private keys, full IP addresses where unnecessary, raw device identifiers, complete transaction details, ledgers, payment credentials, and sensitive attachments. Production exports must never be reused as fixtures.

The protected KitaMo net-profit formula and merchant accounting remain Android responsibilities. This platform does not recalculate or expose the underlying financial ledger. If a later approved administrative aggregate includes money, the adapter must preserve integer minor units, currency, calculation stage, and shared rounding semantics; the browser must not derive accounting truth with floating-point arithmetic.

## Structured errors and logs

Service failures use a closed error-code enum and a `ServiceResult` envelope. Pages branch on error codes, never message-string parsing. Browser-safe responses include a request or correlation identifier and retryability, while internal logs may contain additional redacted diagnostics.

Logs must not include secrets, session tokens, support-note contents by default, raw personal contact details, or full request bodies. Audit events and diagnostic logs serve different purposes and must not be conflated.

## Security headers

The application should set and verify:

- a restrictive Content Security Policy, including `frame-ancestors 'none'`;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: strict-origin-when-cross-origin` or stricter;
- an explicit `Permissions-Policy` disabling unused browser features;
- `X-Frame-Options: DENY` for legacy defense in depth;
- HSTS only on trusted HTTPS production/approved staging hosts;
- private/no-store cache behavior on identity-dependent pages and mutations.

The CSP must be tested with Next.js, Vercel, and future Clerk requirements. Do not weaken it broadly to silence violations.

## Accessibility and security

The beta targets WCAG 2.2 AA practices. Accessible labels, announced errors, visible focus, non-color status cues, keyboard operation, and adequate touch targets are also security-relevant: administrators must be able to understand the actor, target, action, and consequence before submitting a support mutation.

## Verification checklist

- Secret scan finds no real credentials or production exports.
- Browser bundles contain no server-only key names or privileged values.
- Every protected route has unauthenticated and denied tests.
- Every mutation has authorization, validation, safe-failure, and audit tests.
- Unknown roles and capabilities deny by default.
- Production build excludes mock role/scenario/delay/reset controls.
- Health output contains no secrets or sensitive dependency details.
- Security headers are asserted.
- Query/payload bounds and output escaping are tested.
- No destructive, impersonation, remote-device, or full-transaction endpoint exists.

The mock-first closure pass verified this checklist where the current mock-only scope permits. Exact command evidence, accessibility limitations, and protected production gates are recorded in [mock-first-beta-closure.md](./mock-first-beta-closure.md); that evidence is not production authorization.
