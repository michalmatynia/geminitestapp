---
owner: 'Platform Team'
last_reviewed: '2026-04-15'
status: 'generated'
doc_type: 'generated'
scope: 'cross-feature'
canonical: true
---
# Products category and schema normalization Improvement Track

Generated at: 2026-04-15T10:54:26.142Z

## Snapshot

- Track id: `products-category-schema-normalization`
- Category: `data`
- Included in default read-only bundle: yes
- Overall status: `passed`
- Latest report timestamp: 2026-04-15T10:54:26.139Z

## Purpose

Surfaces the remaining category and parameter-schema decisions that cannot be auto-repaired safely from current live product data.

## Commands

- `npm run improvements:classify -- --track products-category-schema-normalization`
- `npm run improvements:dry-run -- --track products-category-schema-normalization`
- `npm run improvements:apply -- --track products-category-schema-normalization`

## Generated Artifacts

- `/tmp/product-parameter-manual-remediation-latest.json`
- `/tmp/product-parameter-curated-build-latest.json`
- `/tmp/product-parameter-curated-overrides-latest.json`

## Latest Phase Status

| Phase | Status | Steps | Automatic | Manual | Failed | Blocked |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `audit` | `not-selected` | 0 | 0 | 0 | 0 | 0 |
| `classify` | `passed` | 1 | 1 | 0 | 0 | 0 |
| `plan` | `manual` | 1 | 0 | 1 | 0 | 0 |
| `dry-run` | `passed` | 3 | 2 | 1 | 0 | 0 |
| `apply` | `passed` | 3 | 2 | 1 | 0 | 0 |

## Latest Steps

| Phase | Status | Mode | Step | Command |
| --- | --- | --- | --- | --- |
| `classify` | `passed` | `automatic` | `products-category-manual-remediation-report` | `products:report:parameter-remediation` |
| `plan` | `manual` | `manual` | `products-category-schema-plan` | manual |
| `dry-run` | `manual` | `manual` | `products-category-schema-curate-family-mappings` | manual |
| `dry-run` | `passed` | `automatic` | `products-category-schema-build-ready-curated-overrides` | `products:build:ready-parameter-curated-overrides` |
| `dry-run` | `passed` | `automatic` | `products-category-schema-preview-ready-curated-overrides` | `products:apply:parameter-curated-overrides` |
| `apply` | `manual` | `manual` | `products-category-schema-apply` | manual |
| `apply` | `passed` | `automatic` | `products-category-schema-build-ready-curated-overrides` | `products:build:ready-parameter-curated-overrides` |
| `apply` | `passed` | `automatic` | `products-category-schema-apply-ready-curated-overrides` | `products:apply:ready-parameter-curated-overrides` |

## Related Docs

- [`docs/build/general-improvements.md`](../../general-improvements.md)

## Notes

- `scan-latest.*` is generated from the latest `artifacts/improvements/*` reports.
- `inventory-latest.csv` is the machine-readable per-step surface for this track.
