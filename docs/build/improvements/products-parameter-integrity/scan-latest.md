---
owner: 'Platform Team'
last_reviewed: '2026-05-06'
status: 'generated'
doc_type: 'generated'
scope: 'cross-feature'
canonical: true
---
# Products parameter integrity Improvement Track

Generated at: 2026-05-06T11:44:17.516Z

## Snapshot

- Track id: `products-parameter-integrity`
- Category: `data`
- Included in default read-only bundle: yes
- Overall status: `attention`
- Latest report timestamp: 2026-04-15T10:54:26.139Z

## Purpose

Audits missing product parameters, refreshes recovery classification, and rebuilds the remaining source-recovery workspace.

## Commands

- `npm run improvements:audit -- --track products-parameter-integrity`
- `npm run improvements:classify -- --track products-parameter-integrity`
- `npm run improvements:plan -- --track products-parameter-integrity`

## Generated Artifacts

- `/tmp/product-missing-parameters-audit-latest.json`
- `/tmp/product-parameter-recovery-classification-latest.json`
- `/tmp/product-parameter-source-recovery-summary-latest.json`
- `/tmp/product-parameter-source-recovery-batches/family-mapping-index-checklist.md`

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
| `apply` | `manual` | `manual` | `products-parameter-integrity-apply` | manual |

## Related Docs

- [`docs/build/general-improvements.md`](../../general-improvements.md)

## Notes

- `scan-latest.*` is generated from the latest `artifacts/improvements/*` reports.
- `inventory-latest.csv` is the machine-readable per-step surface for this track.
