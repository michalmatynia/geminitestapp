---
owner: 'Platform Operations'
last_reviewed: '2026-04-17'
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

## Open This Hub When

- an operational procedure spans multiple features or shared platform systems
- you need the right runbook before using metrics or ad hoc commands during an incident
- the needed procedure does not belong to one feature-owned docs folder
- you need to know whether a runbook should live here or under a feature-local `runbooks/` directory

## Placement Rule

- Feature-local runbooks should stay in their feature docs directory.
- Cross-feature operational runbooks should use `docs/runbooks/`.
- Do not add new runbook files directly under `docs/`.

## Current Docs

- [`application-performance-operations.md`](./application-performance-operations.md)
- [`testing-operations.md`](./testing-operations.md)

## Which Runbook To Use

| If you need to... | Open |
| --- | --- |
| respond to app-level performance degradation or runtime regressions | [`application-performance-operations.md`](./application-performance-operations.md) |
| coordinate testing failures, validation drift, or CI/test-health response | [`testing-operations.md`](./testing-operations.md) |
| troubleshoot a feature-specific operational issue | the owning feature runbook hub instead of this directory |

## Related Operational Surfaces

- Generated quality and performance artifacts:
  [`docs/metrics/README.md`](../metrics/README.md)
- Platform-wide engineering policy and runtime guidance:
  [`docs/platform/README.md`](../platform/README.md)
- Kangur-specific operational guidance:
  [`docs/kangur/observability-and-operations.md`](../kangur/observability-and-operations.md)
