---
owner: 'Platform Team'
last_reviewed: '2026-04-11'
status: 'generated'
doc_type: 'generated'
scope: 'cross-feature'
canonical: true
---
# Products parameter integrity Improvement Track

Generated at: 2026-04-11T14:40:26.139Z

## Snapshot

- Track id: `products-parameter-integrity`
- Category: `data`
- Included in default read-only bundle: yes
- Overall status: `passed`
- Latest report timestamp: 2026-04-11T09:41:24.435Z

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
| `classify` | `passed` | 8 | 8 | 0 | 0 | 0 |
| `plan` | `not-selected` | 0 | 0 | 0 | 0 | 0 |
| `dry-run` | `passed` | 3 | 3 | 0 | 0 | 0 |
| `apply` | `manual` | 1 | 0 | 1 | 0 | 0 |

## Latest Steps

| Phase | Status | Mode | Step | Command |
| --- | --- | --- | --- | --- |
| `classify` | `passed` | `automatic` | `products-parameter-recovery-classification` | `products:classify:parameter-recovery` |
| `classify` | `passed` | `automatic` | `products-parameter-source-report` | `products:report:parameter-source-recovery` |
| `classify` | `passed` | `automatic` | `products-parameter-source-summary` | `products:summarize:parameter-source-recovery` |
| `classify` | `passed` | `automatic` | `products-parameter-source-template` | `products:generate:parameter-source-recovery-template` |
| `classify` | `passed` | `automatic` | `products-parameter-source-batch-split` | `products:split:parameter-source-recovery-template` |
| `classify` | `passed` | `automatic` | `products-parameter-family-mapping-packs` | `products:generate:parameter-family-mapping-pack` |
| `classify` | `passed` | `automatic` | `products-parameter-family-mapping-index` | `products:build:parameter-family-mapping-index` |
| `classify` | `passed` | `automatic` | `products-parameter-family-mapping-checklist` | `products:render:parameter-family-mapping-checklist` |
| `dry-run` | `passed` | `automatic` | `products-parameter-recovery-classification` | `products:classify:parameter-recovery` |
| `dry-run` | `passed` | `automatic` | `products-parameter-source-report` | `products:report:parameter-source-recovery` |
| `dry-run` | `passed` | `automatic` | `products-parameter-source-summary` | `products:summarize:parameter-source-recovery` |
| `apply` | `manual` | `manual` | `products-parameter-integrity-apply` | manual |

## Related Docs

- [`docs/build/general-improvements.md`](../../general-improvements.md)

## Notes

- `scan-latest.*` is generated from the latest `artifacts/improvements/*` reports.
- `inventory-latest.csv` is the machine-readable per-step surface for this track.
