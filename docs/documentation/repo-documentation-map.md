---
owner: 'Platform Team'
last_reviewed: '2026-04-17'
status: 'active'
doc_type: 'reference'
scope: 'repo'
canonical: true
---

# Repo Documentation Map

This file is the maintained map of the repository documentation surface. Use it
to answer:

- which docs are the canonical entry points
- where application, feature, and operational docs live
- which surfaces are generated versus hand-maintained
- which residual historical surfaces are intentionally retained

## Root Entry Points

These are the only markdown files that should live directly under `docs/`:

| Surface | Purpose |
| --- | --- |
| [`docs/README.md`](../README.md) | Main repo documentation index |
| [`docs/documentation/README.md`](./README.md) | Documentation placement and maintenance policy |
| [`docs/OWNERS.md`](../OWNERS.md) | Ownership and review cadence |
| [`docs/AGENTS.md`](../AGENTS.md) | Agent-facing repo guidance |
| [`docs/CLAUDE.md`](../CLAUDE.md) | Claude overlay |
| [`docs/COPILOT.md`](../COPILOT.md) | Copilot overlay |

Do not add new feature, plan, or dated docs directly under `docs/`.

## Runtime And Workspace Docs

These docs answer what runs in the repo and how to start it.

| Surface | Canonical doc |
| --- | --- |
| Repo quick start and top-level commands | [`README.md`](../../README.md) |
| Application/workspace command semantics | [`docs/build/application-workspaces-and-commands.md`](../build/application-workspaces-and-commands.md) |
| Standalone StudiQ web workspace | [`apps/studiq-web/README.md`](../../apps/studiq-web/README.md) |
| Kangur mobile workspace | [`apps/mobile/README.md`](../../apps/mobile/README.md) |
| Reserved mobile-web workspace | [`apps/mobile-web/README.md`](../../apps/mobile-web/README.md) |
| Shared Kangur packages | [`packages/kangur-contracts/README.md`](../../packages/kangur-contracts/README.md), [`packages/kangur-core/README.md`](../../packages/kangur-core/README.md), [`packages/kangur-api-client/README.md`](../../packages/kangur-api-client/README.md), [`packages/kangur-platform/README.md`](../../packages/kangur-platform/README.md) |

## Feature Documentation Hubs

These are the maintained feature-owned documentation surfaces.

| Feature | Canonical hub | Primary use |
| --- | --- | --- |
| AI Features | [`docs/ai-features/README.md`](../ai-features/README.md) | High-level AI capability guides |
| AI Paths | [`docs/ai-paths/README.md`](../ai-paths/README.md) | Workflow engine docs, semantic grammar, node docs |
| Case Resolver | [`docs/case-resolver/index.md`](../case-resolver/index.md) | Feature overview, architecture, APIs, runbooks |
| Kangur | [`docs/kangur/README.md`](../kangur/README.md) | Learner product topology, admin, mobile, operations |
| Playwright automation | [`docs/playwright/README.md`](../playwright/README.md) | Step Sequencer history, code previews, registry bindings |
| Prompt Exploder | [`docs/prompt-exploder/README.md`](../prompt-exploder/README.md) | Prompt Exploder feature-owned docs |
| Validator | [`docs/validator/README.md`](../validator/README.md) | Validator architecture, generated references, semantic grammar |

## Cross-Cutting Documentation Hubs

These are the maintained shared-owner documentation surfaces.

| Hub | Canonical doc | Use for |
| --- | --- | --- |
| Build and toolchain | [`docs/build/README.md`](../build/README.md) | Build lanes, command maps, CI/toolchain guides |
| Platform guidance | [`docs/platform/README.md`](../platform/README.md) | Stable cross-cutting engineering guidance |
| Runbooks | [`docs/runbooks/README.md`](../runbooks/README.md) | Multi-feature operational procedures |
| Plans | [`docs/plans/README.md`](../plans/README.md) | Cross-feature forward-looking work plans |
| Decisions | [`docs/decisions/README.md`](../decisions/README.md) | ADR-style records and exception registers |
| Migrations | [`docs/migrations/README.md`](../migrations/README.md) | Migration execution and verification surfaces |
| Metrics | [`docs/metrics/README.md`](../metrics/README.md) | Generated repo health and quality outputs |

## Generated Surfaces

Treat these as script-owned unless a local hub says otherwise.

| Surface | Canonical entry |
| --- | --- |
| Repo metrics and latest quality artifacts | [`docs/metrics/README.md`](../metrics/README.md) |
| Metrics domain scans | [`docs/metrics/domain-scans/README.md`](../metrics/domain-scans/README.md) |
| Build improvement latest scans | [`docs/build/improvements/README.md`](../build/improvements/README.md) |
| AI Paths semantic grammar | [`docs/ai-paths/semantic-grammar/README.md`](../ai-paths/semantic-grammar/README.md) |
| Validator semantic grammar | [`docs/validator/semantic-grammar/README.md`](../validator/semantic-grammar/README.md) |

Rules:

- prefer stable `*-latest.md` aliases over timestamped history
- update generators instead of hand-editing generated markdown where possible
- if generator metadata drifts, repair the generator or use the shared
  normalization helpers instead of keeping manual forks

## Retained Historical Or Residual Surfaces

These surfaces still exist intentionally, but should not be treated as the main
operator onramp.

| Surface | Why it still exists |
| --- | --- |
| [`docs/platform/repo-deep-scan-2026-03-25.md`](../platform/repo-deep-scan-2026-03-25.md) | Archived repo scan snapshot retained as a dated reference |
| [`docs/ui-consolidation/README.md`](../ui-consolidation/README.md) | Residual program surface still linked from active build/improvement docs |
| [`docs/migrations/README.md`](../migrations/README.md) | Active migration execution surface with dated records by design |

When a residual or historical surface no longer has live repo consumers, remove
it instead of keeping it as passive shelfware.

## Consolidation And Pruning Rules

Use these defaults before creating new docs:

1. Update the existing canonical doc before creating a new one.
2. If two docs explain the same active behavior, merge them into the nearest
   owner hub and delete the weaker duplicate.
3. If a doc is only a historical execution note, move it under the correct
   dated surface (`docs/plans/`, `docs/decisions/`, or `docs/migrations/`) or
   delete it when superseded.
4. Do not keep root aliases once repo-internal links and scripts use the
   canonical location.
5. Keep generated history only when a task explicitly needs retained snapshots.

## Maintenance Workflow

When you change documentation structurally:

1. Update the nearest hub page.
2. If the doc is canonical, register it in
   `docs/documentation/structure-manifest.json`.
3. If the change touches generated metrics, prefer generator-owned fixes or
   `npm run docs:metrics:normalize-frontmatter`.
4. Run:

```bash
npm run docs:structure:audit:frontmatter
npm run docs:structure:check
```

## Related Docs

- Documentation architecture policy: [`docs/documentation/README.md`](./README.md)
- Repo docs index: [`docs/README.md`](../README.md)
- Documentation ownership: [`docs/OWNERS.md`](../OWNERS.md)
