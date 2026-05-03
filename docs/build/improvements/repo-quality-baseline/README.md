---
owner: 'Platform Team'
last_reviewed: '2026-04-17'
status: 'active'
doc_type: 'index'
scope: 'cross-feature'
canonical: true
---

# Repository Quality Baseline Improvement Track

This track keeps the repo-wide quality baseline inside the improvement
portfolio, covering API error-source coverage, canonical checks, lint, and
typecheck follow-up.

## Use This Track When

- you need repo-wide quality follow-up rather than feature-local lint or typecheck work
- you are using the improvement portfolio to classify or plan quality debt
- you need the latest generated inventory for canonical, lint, or typecheck-oriented cleanup

## Key Entry Points

- [`scan-latest.md`](./scan-latest.md)
- [`scan-latest.json`](./scan-latest.json)
- [`inventory-latest.csv`](./inventory-latest.csv)

## Core Commands

- `npm run improvements:audit -- --track repo-quality-baseline`
- `npm run improvements:classify -- --track repo-quality-baseline`
- `npm run improvements:plan -- --track repo-quality-baseline`

## Related Docs

- Shared improvement orchestration guide:
  [`../../general-improvements.md`](../../general-improvements.md)
- Generated metrics hub:
  [`../../../metrics/README.md`](../../../metrics/README.md)
- Improvement portfolio hub:
  [`../README.md`](../README.md)
