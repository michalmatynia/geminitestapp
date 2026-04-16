---
owner: 'Platform Team'
last_reviewed: '2026-04-10'
status: 'active'
doc_type: 'index'
scope: 'cross-feature'
canonical: true
---

# Improvement Operations Hub

This directory is the canonical cross-feature hub for broad improvement
operations in this repository.

It keeps the instruction layer and the latest generated portfolio scans
together, so improvement work can cover UI, performance, quality, testing, and
data recovery instead of drifting into a single-track workflow.

## Key Entry Points

- [`scan-latest.md`](./scan-latest.md)
- [`scan-latest.json`](./scan-latest.json)
- [`inventory-latest.csv`](./inventory-latest.csv)

## Track Directories

- [`application-performance/README.md`](./application-performance/README.md)
- [`products-category-schema-normalization/README.md`](./products-category-schema-normalization/README.md)
- [`products-parameter-integrity/README.md`](./products-parameter-integrity/README.md)
- [`repo-quality-baseline/README.md`](./repo-quality-baseline/README.md)
- [`testing-quality-baseline/README.md`](./testing-quality-baseline/README.md)
- [`ui-consolidation/README.md`](./ui-consolidation/README.md)

## Current Workflow

- Refresh the shared docs surface only:
  `npm run improvements:refresh-docs`
- Run the default broad read-only portfolio:
  `npm run improvements:read-only`
- Run the non-data application bundle:
  `npm run improvements:application`
- Run the product recovery bundle:
  `npm run improvements:products`
- Run a single phase or track directly when needed:
  `npm run improvements:audit -- --track ui-consolidation`

## Placement Rule

- Keep only stable generated `scan-latest.*` and `inventory-latest.csv` outputs
  in this hub.
- Do not hand-edit generated scan artifacts; regenerate them from the improvement
  runners or `npm run improvements:refresh-docs`.
- Read-only batches keep running through `audit`, `classify`, and `plan` even if
  an earlier phase fails, then exit non-cleanly with the complete batch report.
- Add new cross-feature improvement tracks here instead of creating more
  one-off top-level program folders.
- Continue using active feature or legacy program docs when they remain the
  authoritative source for implementation details.

## Related Docs

- Shared orchestration overview:
  [`../general-improvements.md`](../general-improvements.md)
- Legacy UI program surface still kept active:
  [`../../ui-consolidation/README.md`](../../ui-consolidation/README.md)
- Performance operations runbook:
  [`../../runbooks/application-performance-operations.md`](../../runbooks/application-performance-operations.md)
- Testing operations runbook:
  [`../../runbooks/testing-operations.md`](../../runbooks/testing-operations.md)
