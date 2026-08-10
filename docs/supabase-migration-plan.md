# Supabase Migration Plan

## Status

No production Supabase integration or migration is part of the mock-first iteration. This document is a gated plan, not SQL and not a proposed production schema.

The earlier empty-workspace dependency finding correctly blocked invention of production tables and identity mappings. The approved mock-first brief supersedes only the decision to stop all UI and contract work: development may proceed against fictional services without waiting for production schema access. The dependency finding remains in force for Clerk/Supabase integration and production deployment.

## Non-negotiable inputs

Before writing a production adapter or migration, obtain and inspect:

1. The authoritative Supabase repository/project and complete migration history.
2. Current schemas, tables, views, functions, triggers, indexes, grants, and RLS policies.
3. The known Android persisted models and migrations, plus approved Android-to-canonical compatibility mappings and the still-missing production synchronization contract.
4. The Clerk-to-Supabase user mapping, including stable identifiers and lifecycle behavior.
5. The authoritative administrator assignment source and revocation process.
6. Existing problem-report, synchronization, app-version, and audit records/contracts.
7. Required audit fields, retention, immutability, incident, and access-review rules.
8. Environment ownership, test/staging access, backup/restore, and rollback procedures.
9. The shared-contract repository, machine-readable schemas, compatibility rules, and currently approved contract/schema versions.

If any required contract is unavailable or contradictory, stop that integration slice and issue a dependency/conflict report. Do not fill gaps with guessed tables, foreign keys, roles, metadata claims, or RPC contracts.

## Migration principles

- Freeze domain-facing use cases before mapping storage.
- Reconcile every mapped field with the approved Shared Data Contract Baseline; Admin view contracts cannot redefine shared semantics.
- Map database rows to validated domain models on the server.
- Keep pages independent of Supabase row types and clients.
- Migrate read paths before writes.
- Keep RLS enabled and prefer user-scoped access.
- Treat a service-role credential as an exceptional server-only mechanism, not normal browser access.
- Make privileged mutations auditable and, where possible, transactional with their audit record.
- Run the same behavioral contract suite against mock and Supabase adapters.
- Select the adapter in trusted server configuration, never inside a page or from arbitrary client input.
- Roll out incrementally with observability and a tested rollback.

## Stage 0: discovery and reconciliation

Produce an evidence-backed mapping workbook or document with:

| Domain need               | Existing source | Existing identifier | Existing authorization/RLS | Required fields                              | Ambiguity  |
| ------------------------- | --------------- | ------------------- | -------------------------- | -------------------------------------------- | ---------- |
| Administrator principal   | To inspect      | To inspect          | To inspect                 | Clerk subject, approved admin role/status    | Unresolved |
| User support summary      | To inspect      | To inspect          | To inspect                 | Only fields in the validated domain contract | Unresolved |
| Business/membership/stall | To inspect      | To inspect          | To inspect                 | Existing relationships only                  | Unresolved |
| Device and sync posture   | To inspect      | To inspect          | To inspect                 | Safe operational metadata                    | Unresolved |
| Problem reports           | To inspect      | To inspect          | To inspect                 | Existing workflow/status/audit contract      | Unresolved |
| App versions              | To inspect      | To inspect          | To inspect                 | Existing release/install posture             | Unresolved |
| Audit events              | To inspect      | To inspect          | To inspect                 | Existing required evidence and retention     | Unresolved |
| Health indicators         | To inspect      | To inspect          | To inspect                 | Approved aggregate signals only              | Unresolved |

Resolve conflicts with the owners of the Android, Supabase, identity, support, and security systems. Update the decision log before implementation.

## Stage 1: freeze domain contracts

- Review every model, enum, optional/nullable field, filter, page-size bound, ordering rule, and error.
- Define aggregate metric semantics and freshness.
- Confirm privacy classifications and masking rules.
- Confirm canonical stall terminology, business timezone behavior, temporal field meanings, global-ID strategy, and shared-contract version compatibility.
- Confirm that no page requires complete transaction or ledger access.
- Stabilize `ServiceResult`, error codes, and metadata.
- Establish adapter-independent contract tests.

The contract describes administrative product needs, not guessed database rows.

## Stage 2: implement server-side mapping

For each approved source:

```text
Supabase row/view/RPC result
  -> server-only mapper
  -> Zod validation
  -> domain model
  -> ServiceResult
```

Mappers own storage-specific nullability, enum translation, and joins. A schema mismatch produces a structured server error and diagnostic evidence; it is not silently cast.

## Stage 3: implement read-only slices

Migrate one bounded slice at a time, in the recommended order:

1. App versions
2. System health and overview aggregates
3. Businesses, stalls, and devices
4. Users and memberships
5. Synchronization events
6. Problem reports
7. Audit events

For each slice:

- identify the existing RLS path;
- query the minimum fields;
- enforce pagination and filters;
- compare results with approved fixtures;
- verify redaction and empty/not-found behavior;
- add monitoring for latency, failure, and schema-parse errors.

## Stage 4: connect Clerk identity

- Verify Clerk sessions server-side.
- Map immutable Clerk subjects to the existing user identity contract.
- Resolve administrator assignments from the approved source.
- Translate only approved active assignments into `AdminPrincipal`.
- Define revocation/session-freshness behavior.
- Ensure unauthenticated, unmapped, inactive, malformed, and revoked identities fail closed.
- Keep business/stall/membership roles in Supabase; do not model them with Clerk Organizations.

## Stage 5: dual-adapter contract testing

The mock and Supabase services run the same tests for:

- successful reads;
- pagination, search, filter, and stable ordering semantics;
- schema validation;
- empty and not-found behavior;
- structured errors and metadata;
- stale/degraded/unavailable conditions where applicable;
- authorization-independent data minimization.

Adapter-specific tests additionally verify RLS, grants, mapper behavior, query bounds, and secret isolation.

## Stage 6: trusted adapter selection

Choose the data source in a validated, server-only configuration factory. Pages receive `AdminService` and cannot choose mock versus production. Production must reject mock role, scenario, delay, seed-reset, and data-reset controls.

A gradual environment rollout may use mock locally, an approved Supabase test project in integration, and production Supabase only after readiness review. No real production credentials belong in local examples or source control.

## Stage 7: introduce approved mutations

Only after read paths, Clerk mapping, administrator assignment, RLS, and audit requirements are stable, consider:

- problem-report assignment;
- status transition;
- internal note;
- resolution update.

Each operation needs:

- a dedicated capability;
- independent server authorization;
- Zod input validation and transition validation;
- concurrency/conflict semantics;
- durable actor, reason code/note, outcome, UTC occurrence time, and correlation evidence;
- a transaction or approved equivalent coupling the mutation and audit event;
- rate/payload bounds;
- tests for denial, retries, rollback, and partial failure.

Account suspension/restoration, impersonation, destructive actions, remote device control, production settings changes, subscriptions, and elevated financial access remain separate future decisions.

## Stage 8: production readiness

Before any production deployment, review:

- RLS and grants with least-privilege evidence;
- service-role necessity, isolation, and narrow use;
- Clerk verification and administrator revocation;
- audit completeness, retention, integrity, and access;
- secret storage and rotation;
- logs, alerts, health checks, and incident procedures;
- backups, restore tests, and rollback;
- privacy/data minimization;
- performance and query limits;
- CSP/security headers and cache behavior;
- removal of mock controls and process-local mutation behavior;
- quality-gate and accessibility evidence.

The target domain is `admin.kitamo.online`, but this iteration explicitly does not deploy there. Preview and beta deployment recommendations in the roadmap are later work and require separate authorization.

## Rollback strategy

Read-only adapter rollout should be reversible at a trusted environment boundary. Never let a browser choose the adapter. Once real mutations exist, rollback must account for already-persisted changes and audit evidence; switching back to the process-local mock adapter is not a data rollback.

Every production migration requires a forward plan, rollback/mitigation plan, verification query or approved observation, and owner. No migration is applied merely to make the mock UI fit.
