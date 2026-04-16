---
owner: 'Platform Team'
last_reviewed: '2026-04-10'
status: 'active'
doc_type: 'index'
scope: 'cross-feature'
canonical: true
---

# Testing Quality Baseline Improvement Track

This track brings the testing inventory and quality snapshot into the same
improvement hub so broader improvement work can include validation-system
health.

## Key Entry Points

- [`scan-latest.md`](./scan-latest.md)
- [`scan-latest.json`](./scan-latest.json)
- [`inventory-latest.csv`](./inventory-latest.csv)

## Core Commands

- `npm run improvements:audit -- --track testing-quality-baseline`
- `npm run improvements:classify -- --track testing-quality-baseline`
- `npm run metrics:test-suite-inventory`

## Related Docs

- Testing operations runbook:
  [`../../../runbooks/testing-operations.md`](../../../runbooks/testing-operations.md)
- Testing policy:
  [`../../../platform/testing-policy.md`](../../../platform/testing-policy.md)
- Improvement portfolio hub:
  [`../README.md`](../README.md)
