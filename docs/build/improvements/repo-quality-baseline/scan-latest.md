---
owner: 'Platform Team'
last_reviewed: '2026-04-30'
status: 'generated'
doc_type: 'generated'
scope: 'cross-feature'
canonical: true
---
# Repository quality baseline Improvement Track

Generated at: 2026-04-30T09:41:39.599Z

## Snapshot

- Track id: `repo-quality-baseline`
- Category: `quality`
- Included in default read-only bundle: yes
- Overall status: `attention`
- Latest report timestamp: 2026-04-15T10:54:26.139Z

## Purpose

Runs the core read-only quality checks that establish the current repository baseline.

## Commands

- `npm run improvements:audit -- --track repo-quality-baseline`
- `npm run improvements:classify -- --track repo-quality-baseline`
- `npm run improvements:plan -- --track repo-quality-baseline`

## Generated Artifacts

- `docs/metrics/api-error-sources-latest.md`
- `docs/metrics/api-error-sources-latest.json`

## Latest Phase Status

| Phase | Status | Steps | Automatic | Manual | Failed | Blocked |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `audit` | `not-selected` | 0 | 0 | 0 | 0 | 0 |
| `classify` | `not-selected` | 0 | 0 | 0 | 0 | 0 |
| `plan` | `not-selected` | 0 | 0 | 0 | 0 | 0 |
| `dry-run` | `not-selected` | 0 | 0 | 0 | 0 | 0 |
| `apply` | `manual` | 1 | 0 | 1 | 0 | 0 |

## Latest Steps

| Phase | Status | Mode | Step | Command |
| --- | --- | --- | --- | --- |
| `apply` | `manual` | `manual` | `repo-quality-baseline-apply` | manual |

## Related Docs

- [`docs/build/general-improvements.md`](../../general-improvements.md)
- [`docs/metrics/README.md`](../../../metrics/README.md)

## Notes

- `scan-latest.*` is generated from the latest `artifacts/improvements/*` reports.
- `inventory-latest.csv` is the machine-readable per-step surface for this track.
