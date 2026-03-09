---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'index'
scope: 'cross-feature'
canonical: true
---

# UI Consolidation Program

This directory tracks the current UI consolidation scan surface for shared UI
convergence work across the repo.

## Key Entry Points

- [`scan-latest.md`](./scan-latest.md)
- [`scan-latest.json`](./scan-latest.json)
- [`inventory-latest.csv`](./inventory-latest.csv)

## Placement Rule

- Keep only the current generated scan artifacts here.
- Delete dated snapshot clutter once the latest aliases are updated, unless a
  specific historical snapshot is still referenced by an active plan or check.
- If a dated snapshot is intentionally needed, generate it explicitly rather
  than relying on default scanner output.
- New stable UI conventions belong in
  [`docs/platform/component-patterns.md`](../platform/component-patterns.md) or
  other canonical platform docs.
- Feature-specific follow-up work should move into the owning feature docs when
  the work stops being cross-feature program tracking.
