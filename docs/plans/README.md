---
owner: 'Platform Team'
last_reviewed: '2026-04-17'
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

## Open This Hub When

- you need the current cross-feature execution baseline or closeout
- you need to know whether a dated plan is still active or only retained history
- a workstream spans multiple features and does not belong under a single feature-owned `plans/` folder
- you need the planning counterpart to migration execution docs under [`docs/migrations/`](../migrations/README.md)

## Placement Rule

- Feature-local plans should prefer `docs/<feature>/plans/` when that exists.
- Cross-feature plans should use `docs/plans/`.
- Do not add new date-stamped plan files directly under `docs/`.

## Current Docs

Current baseline and closeout:

- [`repo-deep-scan-and-doc-refresh-plan-2026-03-25.md`](./repo-deep-scan-and-doc-refresh-plan-2026-03-25.md)
- [`canonical-closeout-2026-04-17.md`](./canonical-closeout-2026-04-17.md)

Retained historical plan records:

- [`fastcomet-storage-plan.md`](./fastcomet-storage-plan.md)
- [`image-studio-object-layout-improvement-plan.md`](./image-studio-object-layout-improvement-plan.md)
- [`bazel-bun-repo-integration-closeout-2026-03-11.md`](./bazel-bun-repo-integration-closeout-2026-03-11.md)
- [`eslint-10-migration-completed-2026-03-10.md`](./eslint-10-migration-completed-2026-03-10.md)
- [`site-wide-canonical-migration-plan-2026-03-05.md`](./site-wide-canonical-migration-plan-2026-03-05.md)

## Which Doc To Use

| Question | Canonical doc |
| --- | --- |
| What was the latest repo-wide doc refresh baseline? | [`repo-deep-scan-and-doc-refresh-plan-2026-03-25.md`](./repo-deep-scan-and-doc-refresh-plan-2026-03-25.md) |
| What is the latest closeout for the canonical documentation/migration wave? | [`canonical-closeout-2026-04-17.md`](./canonical-closeout-2026-04-17.md) |
| Where should active migration execution live instead of planning? | [`../migrations/README.md`](../migrations/README.md) |

## Structure Notes

- Keep only the current cross-feature plan baseline here.
- Delete superseded dated plan iterations once a later re-baseline or closeout
  document replaces them and no active repo consumers still depend on them.
- Feature-specific implementation waves should not linger here after completion.
- When a file is retained for historical context, say so explicitly at the top and
  link to the current owning runtime or operator docs.
- Retained closeout docs should prefer pointing to maintained hub docs rather than
  duplicating current command guidance inline.
