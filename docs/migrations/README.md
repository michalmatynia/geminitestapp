---
owner: 'Platform Team'
last_reviewed: '2026-04-17'
status: 'active'
doc_type: 'index'
scope: 'cross-feature'
canonical: true
---

# Migration Execution

This directory holds execution artifacts for migration waves after planning is
already underway. It is the operational companion to
[`docs/plans/`](../plans/README.md), not a replacement for planning docs.

Treat the contents here as dated execution records unless a file explicitly says it
is the active tracker for an in-flight wave.

## Open This Hub When

- a migration is already approved and you need execution or stabilization tracking
- you need the latest wave status, script-lifecycle register, or migration closeout
- you need to know whether a dated migration file is still current or only historical
- you need to verify whether there is machine-readable evidence under `reports/`

## What Lives Here

- migration wave status updates
- verification summaries and dry-run/write evidence
- stabilization-window tracking
- migration-scoped decision records
- machine-readable reports under `reports/`

## Key Entry Points

Current execution trackers:

- [`wave-execution-status-2026-04-17.md`](./wave-execution-status-2026-04-17.md)
- [`stabilization-window-2026-04-17.md`](./stabilization-window-2026-04-17.md)
- [`script-lifecycle-register-2026-04-17.md`](./script-lifecycle-register-2026-04-17.md)

Historical migration records:

- [`decision-filemaker-normalizer-compat-options-2026-03-05.md`](./decision-filemaker-normalizer-compat-options-2026-03-05.md)
- [`decision-products-ai-worker-model-fallback-2026-03-05.md`](./decision-products-ai-worker-model-fallback-2026-03-05.md)
- [`decision-products-migrate-runtime-endpoint-2026-03-05.md`](./decision-products-migrate-runtime-endpoint-2026-03-05.md)
- [`script-lifecycle-register-2026-03-05.md`](./script-lifecycle-register-2026-03-05.md)
- [`wave-execution-status-2026-03-05.md`](./wave-execution-status-2026-03-05.md)

Supporting cross-feature plan:

- [`docs/plans/canonical-closeout-2026-04-17.md`](../plans/canonical-closeout-2026-04-17.md)

Machine-readable evidence:

- `docs/migrations/reports/` is intentionally empty except for `.gitkeep` right now.
  Add retained report artifacts there only when a migration task explicitly
  produces them.

## Placement Rule

- New migration planning docs belong in [`docs/plans/`](../plans/README.md).
- Use this directory for execution, verification, and stabilization follow-through.
- Keep machine-readable migration evidence under `docs/migrations/reports/`.
- When `docs/migrations/reports/` is empty, keep that state intentional rather than
  backfilling placeholder files; the markdown trackers should point to retained evidence if it exists.
- This hub should enumerate direct markdown files in the folder; add new direct
  docs here when migration execution expands.
- Remove one-off markdown summaries when later wave-status docs or retained
  machine-readable reports already preserve the needed evidence.
