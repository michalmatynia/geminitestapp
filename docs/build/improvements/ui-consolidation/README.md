---
owner: 'Platform Team'
last_reviewed: '2026-04-17'
status: 'active'
doc_type: 'index'
scope: 'cross-feature'
canonical: true
---

# UI Consolidation Improvement Track

This track brings the shared UI consolidation guardrail into the broader
improvement portfolio so application improvement passes do not ignore cross-file
component convergence.

## Use This Track When

- you want the UI consolidation workflow as part of the shared improvement portfolio
- you need to run audit/classify style portfolio passes for UI convergence work
- you need the current portfolio-owned UI consolidation inventory rather than the legacy residual folder directly

## Key Entry Points

- [`scan-latest.md`](./scan-latest.md)
- [`scan-latest.json`](./scan-latest.json)
- [`inventory-latest.csv`](./inventory-latest.csv)

## Core Commands

- `npm run improvements:audit -- --track ui-consolidation`
- `npm run check:ui-consolidation`
- `bun run bun:check:ui-consolidation`

## Related Docs

- Canonical legacy UI program surface:
  [`../../../ui-consolidation/README.md`](../../../ui-consolidation/README.md)
- Shared component conventions:
  [`../../../platform/component-patterns.md`](../../../platform/component-patterns.md)
- Improvement portfolio hub:
  [`../README.md`](../README.md)
