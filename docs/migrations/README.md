---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'index'
scope: 'cross-feature'
canonical: true
---

# Migration Execution

This directory holds execution artifacts for migration waves after planning is
already underway. It is the operational companion to
[`docs/plans/`](../plans/README.md), not a replacement for planning docs.

## What Lives Here

- migration wave status updates
- verification summaries and dry-run/write evidence
- stabilization-window tracking
- migration-scoped decision records
- machine-readable reports under `reports/`

## Key Entry Points

- [`decision-filemaker-normalizer-compat-options-2026-03-05.md`](./decision-filemaker-normalizer-compat-options-2026-03-05.md)
- [`decision-products-ai-worker-model-fallback-2026-03-05.md`](./decision-products-ai-worker-model-fallback-2026-03-05.md)
- [`decision-products-migrate-runtime-endpoint-2026-03-05.md`](./decision-products-migrate-runtime-endpoint-2026-03-05.md)
- [`script-lifecycle-register-2026-03-05.md`](./script-lifecycle-register-2026-03-05.md)
- [`wave-execution-status-2026-04-17.md`](./wave-execution-status-2026-04-17.md)
- [`wave-execution-status-2026-03-05.md`](./wave-execution-status-2026-03-05.md)
- [`stabilization-window-2026-04-17.md`](./stabilization-window-2026-04-17.md)
- [`script-lifecycle-register-2026-04-17.md`](./script-lifecycle-register-2026-04-17.md)

## Placement Rule

- New migration planning docs belong in [`docs/plans/`](../plans/README.md).
- Use this directory for execution, verification, and stabilization follow-through.
- Keep machine-readable migration evidence under `docs/migrations/reports/`.
- This hub should enumerate direct markdown files in the folder; add new direct
  docs here when migration execution expands.
- Remove one-off markdown summaries when later wave-status docs or retained
  machine-readable reports already preserve the needed evidence.
