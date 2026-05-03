---
owner: 'Platform Team'
last_reviewed: '2026-04-30'
status: 'active'
doc_type: 'index'
scope: 'cross-feature'
canonical: true
---

# Image Studio Product Integration Improvement Track

This track keeps Product modal Image Studio integration work inside the
improvement portfolio, covering Studio project persistence, Product-to-Studio
handoff, generated variant intake, and runtime stability of the Studio controls.

## Use This Track When

- the Product modal Studio tab fails to render, send, open, or accept variants
- Studio project selection causes repeated autosave or render-loop behavior
- Product Studio service preflight, sequencing, variants, or audit contracts need focused validation

## Key Entry Points

- [`scan-latest.md`](./scan-latest.md)
- [`scan-latest.json`](./scan-latest.json)
- [`inventory-latest.csv`](./inventory-latest.csv)

## Core Commands

- `npm run improvements:image-studio`
- `npm run improvements:plan -- --track image-studio-product-integration`
- `npm run improvements:dry-run -- --track image-studio-product-integration`
- `npm run test:image-studio-product`

## Related Docs

- Shared improvement orchestration guide:
  [`../../general-improvements.md`](../../general-improvements.md)
- Improvement portfolio hub:
  [`../README.md`](../README.md)
