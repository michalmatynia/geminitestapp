---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'index'
scope: 'cross-feature'
canonical: true
---

# Cross-Feature Plans

Use this directory for cross-feature or repo-wide:

- implementation plans
- refactor waves
- migration plans
- closeout summaries

## Placement Rule

- Feature-local plans should prefer `docs/<feature>/plans/` when that exists.
- Cross-feature plans should use `docs/plans/`.
- Do not add new date-stamped plan files directly under `docs/`.

## Current Docs

- [`fastcomet-storage-plan.md`](./fastcomet-storage-plan.md)
- [`image-studio-object-layout-improvement-plan.md`](./image-studio-object-layout-improvement-plan.md)
- [`canonical-closeout-2026-04-17.md`](./canonical-closeout-2026-04-17.md)
- [`eslint-10-migration-completed-2026-03-10.md`](./eslint-10-migration-completed-2026-03-10.md)
- [`site-wide-canonical-migration-plan-2026-03-05.md`](./site-wide-canonical-migration-plan-2026-03-05.md)

## Structure Notes

- Keep only the current cross-feature plan baseline here.
- Delete superseded dated plan iterations once a later re-baseline or closeout
  document replaces them and no active repo consumers still depend on them.
- Feature-specific implementation waves should not linger here after completion.
