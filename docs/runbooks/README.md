---
owner: 'Platform Operations'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'index'
scope: 'cross-feature'
canonical: true
---

# Cross-Feature Runbooks

Use this directory for multi-feature or platform-wide operational procedures:

- release coordination
- rollback procedures
- incident response playbooks
- multi-system recovery guides

## Placement Rule

- Feature-local runbooks should stay in their feature docs directory.
- Cross-feature operational runbooks should use `docs/runbooks/`.
- Do not add new runbook files directly under `docs/`.

## Current Docs

- [`application-performance-operations.md`](./application-performance-operations.md)

## Related Operational Surfaces

- Generated quality and performance artifacts:
  [`docs/metrics/README.md`](../metrics/README.md)
- Platform-wide engineering policy and runtime guidance:
  [`docs/platform/README.md`](../platform/README.md)
- Kangur-specific operational guidance:
  [`docs/kangur/observability-and-operations.md`](../kangur/observability-and-operations.md)
