---
owner: 'Platform Team'
last_reviewed: '2026-05-10'
status: 'generated'
doc_type: 'generated'
scope: 'cross-feature'
canonical: true
---
# Products parameter integrity Improvement Track

Generated at: 2026-05-10T01:05:02.194Z

## Snapshot

- Track id: `products-parameter-integrity`
- Category: `data`
- Included in default read-only bundle: yes
- Overall status: `failed`
- Latest report timestamp: 2026-05-10T01:05:02.191Z

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
| `audit` | `passed` | 1 | 1 | 0 | 0 | 0 |
| `classify` | `failed` | 8 | 8 | 0 | 8 | 0 |
| `plan` | `manual` | 1 | 0 | 1 | 0 | 0 |
| `dry-run` | `not-selected` | 0 | 0 | 0 | 0 | 0 |
| `apply` | `manual` | 1 | 0 | 1 | 0 | 0 |

## Latest Steps

| Phase | Status | Mode | Step | Command |
| --- | --- | --- | --- | --- |
| `audit` | `passed` | `automatic` | `products-parameter-audit` | `products:audit:missing-parameters` |
| `classify` | `failed` | `automatic` | `products-parameter-recovery-classification` | `products:classify:parameter-recovery` |
| `classify` | `failed` | `automatic` | `products-parameter-source-report` | `products:report:parameter-source-recovery` |
| `classify` | `failed` | `automatic` | `products-parameter-source-summary` | `products:summarize:parameter-source-recovery` |
| `classify` | `failed` | `automatic` | `products-parameter-source-template` | `products:generate:parameter-source-recovery-template` |
| `classify` | `failed` | `automatic` | `products-parameter-source-batch-split` | `products:split:parameter-source-recovery-template` |
| `classify` | `failed` | `automatic` | `products-parameter-family-mapping-packs` | `products:generate:parameter-family-mapping-pack` |
| `classify` | `failed` | `automatic` | `products-parameter-family-mapping-index` | `products:build:parameter-family-mapping-index` |
| `classify` | `failed` | `automatic` | `products-parameter-family-mapping-checklist` | `products:render:parameter-family-mapping-checklist` |
| `plan` | `manual` | `manual` | `products-parameter-integrity-plan-review` | manual |
| `apply` | `manual` | `manual` | `products-parameter-integrity-apply` | manual |

## Related Docs

- [`docs/build/general-improvements.md`](../../general-improvements.md)

## Notes

- `scan-latest.*` is generated from the latest `artifacts/improvements/*` reports.
- `inventory-latest.csv` is the machine-readable per-step surface for this track.
