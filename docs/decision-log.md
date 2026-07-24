# Decision Log

## Status

This log records approved architectural decisions for the mock-first beta. Changes that affect security, data scope, authorization, or the production migration path require a new entry or an explicit superseding decision.

| ID      | Decision                                                                        | Status   | Rationale                                                                                                                                                                         |
| ------- | ------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ADM-011 | Begin Admin Platform development immediately using mock services.               | Approved | Product and UX work can progress before production schema stabilization. This supersedes the earlier empty-workspace stop only for mock UI/contracts, not production integration. |
| ADM-012 | Pages must never import mock arrays directly.                                   | Approved | Prevents mock implementation details from contaminating page architecture.                                                                                                        |
| ADM-013 | All UI data access must use an `AdminService` interface.                        | Approved | Enables later Supabase replacement without page rewrites.                                                                                                                         |
| ADM-014 | Domain contracts will not mirror Supabase rows directly.                        | Approved | Protects the UI from database-schema changes and prevents guessed production schema.                                                                                              |
| ADM-015 | Mock data must be deterministic, realistic, fictional, and Filipino-contextual. | Approved | Enables repeatable tests and representative review without privacy risk.                                                                                                          |
| ADM-016 | Role switching is permitted only in development and preview environments.       | Approved | Supports testing without creating a production authorization bypass.                                                                                                              |
| ADM-017 | Authorization uses centralized capabilities rather than scattered role checks.  | Approved | Provides deny-by-default, testable route and action enforcement.                                                                                                                  |
| ADM-018 | Only non-destructive problem-report mutations are allowed in the mock beta.     | Approved | Exercises a support workflow without implying unsafe platform controls.                                                                                                           |
| ADM-019 | Account suspension and restoration remain disabled during the mock beta.        | Approved | Identity lifecycle, cloud contracts, and audit requirements are not confirmed.                                                                                                    |
| ADM-020 | Complete merchant transaction data will not appear in the mock-first beta.      | Approved | Preserves least privilege and avoids duplicating the merchant dashboard.                                                                                                          |
| ADM-021 | Mock and Supabase services must share contract tests.                           | Approved | Prevents behavioral divergence during adapter migration.                                                                                                                          |
| ADM-022 | Supabase migration begins with read-only services before mutations.             | Approved | Reduces authorization, integrity, and rollback risk.                                                                                                                              |
| ADM-023 | Every allowed mock mutation must generate an audit entry.                       | Approved | Establishes auditability as product behavior from the start. Mock audit data is not compliance-grade persistence.                                                                 |
| ADM-024 | Preview deployments may expose controlled scenario and role tools.              | Approved | Enables stakeholder and QA review of edge states. This iteration does not deploy, so execution is later work.                                                                     |
| ADM-025 | Production builds must exclude mock role and scenario controls.                 | Approved | Prevents test tooling from becoming a production vulnerability; delay and reset controls are excluded as well.                                                                    |

## Interpretation notes

### Empty-workspace dependency decision

The prior dependency report found no production Supabase schema, migrations, Clerk mapping, administrator-role source, synchronization/problem-report contracts, or audit requirements. That evidence remains valid.

ADM-011 changes the implementation response: the team proceeds with mock contracts and fictional data rather than stopping the entire application scaffold. It does not authorize production schema invention, Supabase migrations, real data access, production authentication assumptions, or deployment.

### Shared Data Contract Baseline v0.1

The approved **KitaMo Shared Data Contract Baseline v0.1** is the cross-system semantic authority for `owner-seller-mobile`, `platform-api`, `kitamo_admin`, and `shared-contracts`. This is an interpretation of the existing ADM decisions, especially ADM-012 through ADM-015 and ADM-021 through ADM-023; it does not create or change an ADM decision ID or status.

For Admin Platform work, v0.1 governs:

- `stall` as the canonical term outside legacy Android SQLite, with any `branch` compatibility mapping kept explicit;
- stable opaque identifiers, preservation of legacy IDs, and an approved globally collision-resistant format for new cloud-capable records;
- UTC storage for actual instants, explicit IANA business timezones, and business-date interpretation in the business timezone;
- currency codes, integer minor units for posted money where practical, at least six-decimal precision for rates/intermediate costing, and centralized/versioned final rounding;
- synchronization meanings, correlation context, and contract compatibility; generic processed-record counts are not merchant transaction counts;
- append-only canonical audit requirements for privileged, exceptional, and financially corrective actions; and
- separate `contract_version` and physical `schema_version` meanings and compatibility gates.

Local TypeScript/Zod schemas are executable, least-privilege Admin projection validators pinned to v0.1. They are not an independent cross-system source of truth and do not authorize the Admin Platform to redefine Android accounting, product, inventory, sales, refund, or synchronization semantics.

The baseline resolves canonical terminology and semantics but does not supply the physical production artifacts that remain gated: Android compatibility mappings and machine-readable shared contracts, Supabase schema/migrations/functions/grants/RLS, Clerk-to-Supabase identity mapping, the authoritative administrator-assignment source, or durable audit storage/retention controls. Missing or conflicting artifacts still stop the affected production integration slice; no local projection may invent them.

### Process-local mutations

ADM-018 and ADM-023 are implemented as a single mock service use case: a permitted problem-report update creates a corresponding in-memory audit entry. Neither record is durable across restarts or shared serverless instances. A production adapter requires transactional persistence based on the inspected schema.

### Preview versus production

ADM-016 and ADM-024 permit role/scenario/delay/reset tools only in local or explicitly designated preview environments. ADM-025 requires build- and server-level exclusion from production. The current instruction is no deployment, so preview and target-domain setup remain future recommendations.
