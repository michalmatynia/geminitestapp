---
owner: 'Case Resolver Team'
last_reviewed: '2026-02-20'
status: 'active'
related_components:
  - 'src/features/case-resolver/pages/AdminCaseResolverCasesPage.tsx'
---

# Runbook: Case List Degradation

## Purpose

Use this runbook when case list search/filter/sort interactions become slow or UI stalls on large datasets.

## Indicators

- Slow filter response or typing lag.
- Large CPU usage on cases page.
- Long first paint for hierarchy rendering.

## 5-Minute Triage

1. Measure whether issue occurs in `hierarchy` only or both `hierarchy`/`list`.
2. Check active filter complexity (content search + multi-filter sets).
3. Confirm root batching behavior (`Load more cases`).
4. Inspect dataset size and folder depth.

## Immediate Actions

1. Switch to `Flat List` if hierarchy-specific slowdown is observed.
2. Narrow search scope from `all` to `name` where possible.
3. Reduce active multi-select filters temporarily during incident.

## Engineering Checks

- Verify deferred search query path is active.
- Verify map/set lookup path is used for tag/category/identifier labels.
- Verify root batching (`visibleCaseRootCount`) resets correctly.

## Exit Criteria

- Interaction latency back below `p95 < 100ms`.
- No user-visible stutter for standard operator dataset.

## Escalation

- Primary: Case Resolver frontend owner.
- Secondary: performance/platform support.

## Post-Incident

- Add benchmark fixture for reported dataset size.
- Capture tuning changes in performance docs and changelog.
