---
owner: 'Platform Team'
last_reviewed: '2026-04-11'
status: 'generated'
doc_type: 'generated'
scope: 'cross-feature'
canonical: true
---
# UI consolidation Improvement Track

Generated at: 2026-04-11T03:03:06.007Z

## Snapshot

- Track id: `ui-consolidation`
- Category: `ui`
- Included in default read-only bundle: yes
- Overall status: `failed`
- Latest report timestamp: 2026-04-11T02:59:25.778Z

## Purpose

Runs the shared UI consolidation guardrail so broad improvement sweeps account for cross-feature component convergence, not only data and repo baselines.

## Commands

- `npm run improvements:audit -- --track ui-consolidation`
- `npm run check:ui-consolidation`
- `bun run bun:check:ui-consolidation`

## Generated Artifacts

- `docs/ui-consolidation/scan-latest.md`
- `docs/ui-consolidation/scan-latest.json`
- `docs/ui-consolidation/inventory-latest.csv`

## Latest Phase Status

| Phase | Status | Steps | Automatic | Manual | Failed | Blocked |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `audit` | `failed` | 1 | 1 | 0 | 1 | 0 |
| `classify` | `not-configured` | 0 | 0 | 0 | 0 | 0 |
| `plan` | `manual` | 1 | 0 | 1 | 0 | 0 |
| `dry-run` | `not-selected` | 0 | 0 | 0 | 0 | 0 |
| `apply` | `not-selected` | 0 | 0 | 0 | 0 | 0 |

## Latest Steps

| Phase | Status | Mode | Step | Command |
| --- | --- | --- | --- | --- |
| `audit` | `failed` | `automatic` | `ui-consolidation-guardrail` | `check:ui-consolidation` |
| `plan` | `manual` | `manual` | `ui-consolidation-plan` | manual |

## Related Docs

- [`docs/ui-consolidation/README.md`](../../../ui-consolidation/README.md)
- [`docs/platform/component-patterns.md`](../../../platform/component-patterns.md)

## Notes

- `scan-latest.*` is generated from the latest `artifacts/improvements/*` reports.
- `inventory-latest.csv` is the machine-readable per-step surface for this track.
