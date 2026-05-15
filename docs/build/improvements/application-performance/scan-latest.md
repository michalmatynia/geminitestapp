---
owner: 'Platform Team'
last_reviewed: '2026-05-14'
status: 'generated'
doc_type: 'generated'
scope: 'cross-feature'
canonical: true
---
# Application performance Improvement Track

Generated at: 2026-05-14T23:11:20.594Z

## Snapshot

- Track id: `application-performance`
- Category: `performance`
- Included in default read-only bundle: yes
- Overall status: `no-data`
- Latest report timestamp: not available

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
| `audit` | `not-selected` | 0 | 0 | 0 | 0 | 0 |
| `classify` | `no-data` | 0 | 0 | 0 | 0 | 0 |
| `plan` | `no-data` | 0 | 0 | 0 | 0 | 0 |
| `dry-run` | `no-data` | 0 | 0 | 0 | 0 | 0 |
| `apply` | `no-data` | 0 | 0 | 0 | 0 | 0 |

## Latest Steps

- No step data is available for this track yet.

## Related Docs

- [`docs/runbooks/application-performance-operations.md`](../../../runbooks/application-performance-operations.md)
- [`docs/metrics/README.md`](../../../metrics/README.md)

## Notes

- `scan-latest.*` is generated from the latest `artifacts/improvements/*` reports.
- `inventory-latest.csv` is the machine-readable per-step surface for this track.
