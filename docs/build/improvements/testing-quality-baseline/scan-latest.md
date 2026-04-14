---
owner: 'Platform Team'
last_reviewed: '2026-04-14'
status: 'generated'
doc_type: 'generated'
scope: 'cross-feature'
canonical: true
---
# Testing quality baseline Improvement Track

Generated at: 2026-04-14T11:08:59.784Z

## Snapshot

- Track id: `testing-quality-baseline`
- Category: `testing`
- Included in default read-only bundle: no
- Overall status: `attention`
- Latest report timestamp: 2026-04-12T15:40:31.397Z

## Purpose

Tracks the testing inventory and quality snapshot so broader improvement work stays anchored to the current test-system health.

## Commands

- `npm run improvements:audit -- --track testing-quality-baseline`
- `npm run improvements:classify -- --track testing-quality-baseline`
- `npm run metrics:test-suite-inventory`

## Generated Artifacts

- `docs/metrics/testing-suite-inventory-latest.md`
- `docs/metrics/testing-quality-snapshot-latest.md`
- `docs/metrics/testing-run-ledger-latest.md`

## Latest Phase Status

| Phase | Status | Steps | Automatic | Manual | Failed | Blocked |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `audit` | `not-selected` | 0 | 0 | 0 | 0 | 0 |
| `classify` | `not-selected` | 0 | 0 | 0 | 0 | 0 |
| `plan` | `manual` | 1 | 0 | 1 | 0 | 0 |
| `dry-run` | `not-selected` | 0 | 0 | 0 | 0 | 0 |
| `apply` | `not-selected` | 0 | 0 | 0 | 0 | 0 |

## Latest Steps

| Phase | Status | Mode | Step | Command |
| --- | --- | --- | --- | --- |
| `plan` | `manual` | `manual` | `testing-quality-plan` | manual |

## Related Docs

- [`docs/runbooks/testing-operations.md`](../../../runbooks/testing-operations.md)
- [`docs/platform/testing-policy.md`](../../../platform/testing-policy.md)

## Notes

- `scan-latest.*` is generated from the latest `artifacts/improvements/*` reports.
- `inventory-latest.csv` is the machine-readable per-step surface for this track.
