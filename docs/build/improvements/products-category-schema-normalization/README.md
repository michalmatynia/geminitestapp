---
owner: 'Platform Team'
last_reviewed: '2026-04-17'
status: 'active'
doc_type: 'index'
scope: 'cross-feature'
canonical: true
---

# Products Category And Schema Normalization Improvement Track

This track keeps the remaining category and parameter-schema normalization work
inside the broader improvement portfolio while preserving the explicit manual
decision points.

## Use This Track When

- products category or schema normalization needs a dedicated classify/dry-run/apply workflow
- you need the latest generated inventory for that normalization program
- the work is broader than a one-off product bug fix and belongs in the improvement portfolio

## Key Entry Points

- [`scan-latest.md`](./scan-latest.md)
- [`scan-latest.json`](./scan-latest.json)
- [`inventory-latest.csv`](./inventory-latest.csv)

## Core Commands

- `npm run improvements:classify -- --track products-category-schema-normalization`
- `npm run improvements:dry-run -- --track products-category-schema-normalization`
- `npm run improvements:apply -- --track products-category-schema-normalization`

## Related Docs

- Shared improvement orchestration guide:
  [`../../general-improvements.md`](../../general-improvements.md)
- Improvement portfolio hub:
  [`../README.md`](../README.md)
