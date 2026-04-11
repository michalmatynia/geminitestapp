---
owner: 'Platform Team'
last_reviewed: '2026-04-11'
status: 'generated'
doc_type: 'generated'
scope: 'cross-feature'
canonical: true
---
# Application performance Improvement Track

Generated at: 2026-04-11T03:03:06.007Z

## Snapshot

- Track id: `application-performance`
- Category: `performance`
- Included in default read-only bundle: yes
- Overall status: `passed`
- Latest report timestamp: 2026-04-11T02:59:25.778Z

## Purpose

Adds app-level performance regression checks to the improvement portfolio so broad sweeps cover runtime health alongside UI, quality, and data recovery.

## Commands

- `npm run improvements:audit -- --track application-performance`
- `npm run improvements:classify -- --track application-performance`
- `npm run perf:ops:baseline`

## Generated Artifacts

- `docs/metrics/critical-path-performance-latest.md`
- `docs/metrics/critical-flow-tests-latest.md`
- `docs/metrics/unit-domain-timings-latest.md`
- `docs/metrics/route-hotspots.md`

## Latest Phase Status

| Phase | Status | Steps | Automatic | Manual | Failed | Blocked |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `audit` | `passed` | 1 | 1 | 0 | 0 | 0 |
| `classify` | `passed` | 1 | 1 | 0 | 0 | 0 |
| `plan` | `manual` | 1 | 0 | 1 | 0 | 0 |
| `dry-run` | `not-selected` | 0 | 0 | 0 | 0 | 0 |
| `apply` | `not-selected` | 0 | 0 | 0 | 0 | 0 |

## Latest Steps

| Phase | Status | Mode | Step | Command |
| --- | --- | --- | --- | --- |
| `audit` | `passed` | `automatic` | `application-performance-fast-gate` | `perf:ops:fast` |
| `classify` | `passed` | `automatic` | `application-performance-baseline` | `perf:ops:baseline` |
| `plan` | `manual` | `manual` | `application-performance-plan` | manual |

## Related Docs

- [`docs/runbooks/application-performance-operations.md`](../../../runbooks/application-performance-operations.md)
- [`docs/metrics/README.md`](../../../metrics/README.md)

## Notes

- `scan-latest.*` is generated from the latest `artifacts/improvements/*` reports.
- `inventory-latest.csv` is the machine-readable per-step surface for this track.
