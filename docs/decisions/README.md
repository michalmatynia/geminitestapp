---
owner: 'Platform Team'
last_reviewed: '2026-04-17'
status: 'active'
doc_type: 'index'
scope: 'cross-feature'
canonical: true
---

# Cross-Feature Decisions

Use this directory for durable records such as:

- architecture decisions
- exception registers
- compatibility decisions
- cross-feature matrices

Machine-readable companion artifacts for those records can also live here when a
decision is backed by JSON or another tooling-facing format.

## Open This Hub When

- you need the durable repo-wide policy baseline rather than an implementation plan
- you need to know which compatibility exceptions are still allowed
- you need the canonical contract matrix that other migrations or plans should point back to
- you need to decide whether a new document belongs in `docs/decisions/`, `docs/plans/`, or `docs/migrations/`

## Placement Rule

- Feature-local decisions can live under feature folders when ownership is clear.
- Cross-feature decisions should use `docs/decisions/`.
- Date-stamped decision records should not be added at the root `docs/` level.

## Current Docs

- [`canonical-contract-matrix-2026-03-05.md`](./canonical-contract-matrix-2026-03-05.md)
- [`legacy-compatibility-exception-register-2026-03-05.md`](./legacy-compatibility-exception-register-2026-03-05.md)

## Which Doc To Use

| Question | Canonical doc |
| --- | --- |
| What are the durable canonical contract boundaries? | [`canonical-contract-matrix-2026-03-05.md`](./canonical-contract-matrix-2026-03-05.md) |
| Which temporary legacy exceptions are still permitted? | [`legacy-compatibility-exception-register-2026-03-05.md`](./legacy-compatibility-exception-register-2026-03-05.md) |
| Where should migration progress or execution evidence live instead? | [`../migrations/README.md`](../migrations/README.md) |
| Where should work planning or closeout records live instead? | [`../plans/README.md`](../plans/README.md) |

The active cross-feature decisions surface is intentionally small. Execution
records, migration logs, and implementation closeouts should usually live under
`docs/migrations/` or `docs/plans/` unless they establish a durable
cross-feature policy baseline.

In practice, the two files here play different roles:

- the contract matrix defines the durable canonical boundary
- the exception register defines the only allowed temporary escape hatch

Migration progress, stabilization status, and closeout evidence should point at
these decisions, not duplicate them.

## Structure Notes

- Keep the currently enforced decision baseline here.
- Remove older dated decision iterations once a newer canonical record replaces
  them and tooling no longer points at the older version.
