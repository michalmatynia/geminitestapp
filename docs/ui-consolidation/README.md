---
owner: 'Platform Team'
last_reviewed: '2026-04-17'
status: 'active'
doc_type: 'index'
scope: 'cross-feature'
canonical: true
---

# UI Consolidation Program

This directory tracks the current UI consolidation scan surface for shared UI
convergence work across the repo.

This folder is intentionally alias-only: it should expose the current generated
scan outputs, not accumulate dated historical snapshots.

## Open This Hub When

- an existing task, script, or document still points at the legacy UI consolidation surface
- you need the alias-only latest scan outputs for the legacy program path
- you are confirming how this residual surface differs from the newer improvement-track hub

For new cross-feature improvement work, prefer
[`docs/build/improvements/ui-consolidation/README.md`](../build/improvements/ui-consolidation/README.md).
This folder remains active only as the residual program surface while internal
consumers still reference it.

## Key Entry Points

- [`scan-latest.md`](./scan-latest.md)
- [`scan-latest.json`](./scan-latest.json)
- [`inventory-latest.csv`](./inventory-latest.csv)

## Current Workflow

- Guardrail/check command: `npm run check:ui-consolidation`
- Bun compatibility lane: `bun run bun:check:ui-consolidation`
- The guardrail command refreshes the latest markdown, JSON, and CSV aliases before enforcing thresholds.
- Use `node scripts/architecture/check-ui-consolidation.mjs --no-write --summary-json` only when you intentionally need a read-only check run.

## Residual Surface Rule

- Use this folder as the compatibility-facing alias surface.
- Use [`../build/improvements/ui-consolidation/README.md`](../build/improvements/ui-consolidation/README.md)
  for the improvement-portfolio entrypoint and track commands.
- Keep these two surfaces aligned until the residual program folder can be fully retired.

## Placement Rule

- Keep only the current generated scan artifacts here.
- Delete dated snapshot clutter once the latest aliases are updated, unless a
  specific historical snapshot is still referenced by an active plan or check.
- If a dated snapshot is intentionally needed, generate it explicitly rather
  than relying on default scanner output.
- Do not hand-edit `scan-latest.md`, `scan-latest.json`, or `inventory-latest.csv`;
  regenerate them from the scanner/check workflow.
- New stable UI conventions belong in
  [`docs/platform/component-patterns.md`](../platform/component-patterns.md) or
  other canonical platform docs.
- Feature-specific follow-up work should move into the owning feature docs when
  the work stops being cross-feature program tracking.
