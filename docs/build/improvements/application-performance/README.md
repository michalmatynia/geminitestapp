---
owner: 'Platform Team'
last_reviewed: '2026-04-17'
status: 'active'
doc_type: 'index'
scope: 'cross-feature'
canonical: true
---

# Application Performance Improvement Track

This track brings the app-level performance operations lane into the shared
improvement portfolio so broad improvement work keeps runtime health visible.

## Use This Track When

- you need performance-oriented improvement scans instead of a live incident runbook
- you are classifying or planning app-level performance follow-up work
- you need the generated latest inventory for runtime performance improvement tasks

## Key Entry Points

- [`scan-latest.md`](./scan-latest.md)
- [`scan-latest.json`](./scan-latest.json)
- [`inventory-latest.csv`](./inventory-latest.csv)

## Core Commands

- `npm run improvements:audit -- --track application-performance`
- `npm run improvements:classify -- --track application-performance`
- `npm run perf:ops:baseline`

## Related Docs

- Performance runbook:
  [`../../../runbooks/application-performance-operations.md`](../../../runbooks/application-performance-operations.md)
- Generated metrics hub:
  [`../../../metrics/README.md`](../../../metrics/README.md)
- Improvement portfolio hub:
  [`../README.md`](../README.md)
