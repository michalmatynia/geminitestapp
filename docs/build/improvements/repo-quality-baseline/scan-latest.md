---
owner: 'Platform Team'
last_reviewed: '2026-04-12'
status: 'generated'
doc_type: 'generated'
scope: 'cross-feature'
canonical: true
---
# Repository quality baseline Improvement Track

Generated at: 2026-04-12T13:47:05.832Z

## Snapshot

- Track id: `repo-quality-baseline`
- Category: `quality`
- Included in default read-only bundle: yes
- Overall status: `failed`
- Latest report timestamp: 2026-04-12T13:47:05.749Z

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
| `audit` | `passed` | 2 | 2 | 0 | 0 | 0 |
| `classify` | `failed` | 2 | 2 | 0 | 2 | 0 |
| `plan` | `manual` | 1 | 0 | 1 | 0 | 0 |
| `dry-run` | `passed` | 2 | 2 | 0 | 0 | 0 |
| `apply` | `manual` | 1 | 0 | 1 | 0 | 0 |

## Latest Steps

| Phase | Status | Mode | Step | Command |
| --- | --- | --- | --- | --- |
| `audit` | `passed` | `automatic` | `repo-quality-api-error-sources` | `check:api-error-sources` |
| `audit` | `passed` | `automatic` | `repo-quality-canonical-sitewide` | `canonical:check:sitewide` |
| `classify` | `failed` | `automatic` | `repo-quality-lint` | `quality:baseline:lint` |
| `classify` | `failed` | `automatic` | `repo-quality-typecheck` | `quality:baseline:typecheck` |
| `plan` | `manual` | `manual` | `repo-quality-baseline-plan` | manual |
| `dry-run` | `passed` | `automatic` | `repo-quality-api-error-sources` | `check:api-error-sources` |
| `dry-run` | `passed` | `automatic` | `repo-quality-canonical-sitewide` | `canonical:check:sitewide` |
| `apply` | `manual` | `manual` | `repo-quality-baseline-apply` | manual |

## Related Docs

- [`docs/build/general-improvements.md`](../../general-improvements.md)
- [`docs/metrics/README.md`](../../../metrics/README.md)

## Notes

- `scan-latest.*` is generated from the latest `artifacts/improvements/*` reports.
- `inventory-latest.csv` is the machine-readable per-step surface for this track.
