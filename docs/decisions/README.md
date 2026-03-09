---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
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

## Placement Rule

- Feature-local decisions can live under feature folders when ownership is clear.
- Cross-feature decisions should use `docs/decisions/`.
- Date-stamped decision records should not be added at the root `docs/` level.

## Current Docs

- [`canonical-contract-matrix-2026-03-04.md`](./canonical-contract-matrix-2026-03-04.md)
- [`canonical-contract-matrix-2026-03-05.md`](./canonical-contract-matrix-2026-03-05.md)
- [`legacy-compatibility-exception-register-2026-03-04.md`](./legacy-compatibility-exception-register-2026-03-04.md)
- [`legacy-compatibility-exception-register-2026-03-05.md`](./legacy-compatibility-exception-register-2026-03-05.md)
