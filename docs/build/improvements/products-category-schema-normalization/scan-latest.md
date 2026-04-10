---
owner: 'Platform Team'
last_reviewed: '2026-04-10'
status: 'generated'
doc_type: 'generated'
scope: 'cross-feature'
canonical: true
---
# Products category and schema normalization Improvement Track

Generated at: 2026-04-10T11:37:21.555Z

## Snapshot

- Track id: `products-category-schema-normalization`
- Category: `data`
- Included in default read-only bundle: yes
- Overall status: `failed`
- Latest report timestamp: 2026-04-02T09:59:31.245Z

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
| `classify` | `not-selected` | 0 | 0 | 0 | 0 | 0 |
| `plan` | `not-selected` | 0 | 0 | 0 | 0 | 0 |
| `dry-run` | `passed` | 3 | 2 | 1 | 0 | 0 |
| `apply` | `failed` | 3 | 2 | 1 | 2 | 0 |

## Latest Steps

| Phase | Status | Mode | Step | Command |
| --- | --- | --- | --- | --- |
| `dry-run` | `manual` | `manual` | `products-category-schema-curate-family-mappings` | manual |
| `dry-run` | `passed` | `automatic` | `products-category-schema-build-ready-curated-overrides` | `products:build:ready-parameter-curated-overrides` |
| `dry-run` | `passed` | `automatic` | `products-category-schema-preview-ready-curated-overrides` | `products:apply:parameter-curated-overrides` |
| `apply` | `manual` | `manual` | `products-category-schema-apply` | manual |
| `apply` | `failed` | `automatic` | `products-category-schema-build-ready-curated-overrides` | `products:build:ready-parameter-curated-overrides` |
| `apply` | `failed` | `automatic` | `products-category-schema-apply-ready-curated-overrides` | `products:apply:ready-parameter-curated-overrides` |

## Related Docs

- [`docs/build/general-improvements.md`](../../general-improvements.md)

## Notes

- `scan-latest.*` is generated from the latest `artifacts/improvements/*` reports.
- `inventory-latest.csv` is the machine-readable per-step surface for this track.
