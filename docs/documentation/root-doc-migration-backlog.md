---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'plan'
scope: 'repo'
canonical: true
---

# Root Docs Migration Backlog

This file tracks the remaining root-level markdown surface under `docs/` and
classifies each item as:

- keep at root
- root compatibility stub already in place
- root legacy entrypoint still intentionally active
- root doc still pending migration

Use this backlog to continue reducing root sprawl without reclassifying the
entire tree from scratch each session.

## Keep At Root

These are canonical root docs and should remain there:

| Doc | Reason |
| --- | --- |
| `docs/README.md` | repo docs entrypoint |
| `docs/AGENTS.md` | agent overlay / repo operating guide |
| `docs/OWNERS.md` | documentation governance |
| `docs/CLAUDE.md` | agent overlay |
| `docs/COPILOT.md` | agent overlay |

## Root Compatibility Stubs Already In Place

These now have canonical homes elsewhere and should stay as short superseded
stubs until references are cleaned up naturally:

| Root Stub | Canonical Location |
| --- | --- |
| `docs/API_CACHING.md` | `docs/platform/api-caching.md` |
| `docs/DATA_FETCHING_CACHING.md` | `docs/platform/data-fetching-caching.md` |
| `docs/COMPONENT_PATTERNS.md` | `docs/platform/component-patterns.md` |
| `docs/BEST_PRACTICES.md` | `docs/platform/best-practices.md` |
| `docs/DEVELOPER_HANDBOOK.md` | `docs/platform/developer-handbook.md` |
| `docs/ARCHITECTURE_GUARDRAILS.md` | `docs/platform/architecture-guardrails.md` |
| `docs/TOOLTIP_DOCUMENTATION_PLATFORM.md` | `docs/platform/tooltip-documentation-platform.md` |
| `docs/application-performance-operations.md` | `docs/runbooks/application-performance-operations.md` |
| `docs/fastcomet-storage-plan.md` | `docs/plans/fastcomet-storage-plan.md` |
| `docs/PROMPT_EXPLODER_MASTER_PLAN.md` | `docs/prompt-exploder/master-plan.md` |
| `docs/case-resolver-performance-stability-runbook.md` | `docs/case-resolver/runbooks/performance-stability.md` |
| `docs/MIGRATION_CHECKLIST.md` | `docs/platform/migration-checklist.md` |
| `docs/IMAGE_STUDIO_OBJECT_LAYOUT_IMPROVEMENT_PLAN.md` | `docs/plans/image-studio-object-layout-improvement-plan.md` |
| `docs/canonical-closeout-2026-04-17.md` | `docs/plans/canonical-closeout-2026-04-17.md` |
| `docs/canonical-contract-matrix-2026-03-04.md` | `docs/decisions/canonical-contract-matrix-2026-03-04.md` |
| `docs/canonical-contract-matrix-2026-03-05.md` | `docs/decisions/canonical-contract-matrix-2026-03-05.md` |
| `docs/canonical-migration-inventory-2026-03-04.md` | `docs/plans/canonical-migration-inventory-2026-03-04.md` |
| `docs/master-folder-tree-migration-plan-2026-03-04.md` | `docs/plans/master-folder-tree-migration-plan-2026-03-04.md` |
| `docs/master-folder-tree-shell-phase1-parity-2026-03-05.md` | `docs/plans/master-folder-tree-shell-phase1-parity-2026-03-05.md` |
| `docs/master-folder-tree-shell-phase2-runtime-lifecycle-2026-03-05.md` | `docs/plans/master-folder-tree-shell-phase2-runtime-lifecycle-2026-03-05.md` |
| `docs/master-folder-tree-shell-phase3-browser-lifecycle-2026-03-05.md` | `docs/plans/master-folder-tree-shell-phase3-browser-lifecycle-2026-03-05.md` |
| `docs/prompt-exploder-migration-plan-2026-03-04.md` | `docs/prompt-exploder/migration-plan-2026-03-04.md` |
| `docs/site-wide-canonical-migration-plan-2026-03-04.md` | `docs/plans/site-wide-canonical-migration-plan-2026-03-04.md` |
| `docs/legacy-compatibility-exception-register-2026-03-04.md` | `docs/decisions/legacy-compatibility-exception-register-2026-03-04.md` |
| `docs/site-wide-canonical-migration-plan-2026-03-05.md` | `docs/plans/site-wide-canonical-migration-plan-2026-03-05.md` |
| `docs/legacy-compatibility-exception-register-2026-03-05.md` | `docs/decisions/legacy-compatibility-exception-register-2026-03-05.md` |

## Root Legacy Entry Points Still Intentionally Active

These still act as active entrypoints. They can later move behind stubs once the
feature-folder equivalents are promoted hard enough.

| Root Doc | Likely Long-Term Home |
| --- | --- |
| `docs/AI_PATHS.md` | `docs/ai-paths/` overview hub |
| `docs/AI_PATHS_EXTENDED_REFERENCE.md` | `docs/ai-paths/` reference hub |
| `docs/PROMPT_EXPLODER_FEATURE_DOCUMENTATION.md` | `docs/prompt-exploder/` overview hub |
| `docs/PROMPT_EXPLODER_OPERATIONS_RUNBOOK.md` | `docs/prompt-exploder/` runbook hub |
| `docs/PROMPT_EXPLODER_TOOLTIP_GUIDE.md` | `docs/prompt-exploder/` tooltip/reference hub |

## Pending Migration Candidates

No root-level markdown docs remain pending migration.
The remaining root surface is now compatibility-only.

## Non-Markdown Compatibility Copies

This root artifact now has a canonical home elsewhere and remains only as a
compatibility mirror:

| Root Copy | Canonical Location | Notes |
| --- | --- | --- |
| `docs/legacy-compatibility-exception-register-2026-03-04.json` | `docs/decisions/legacy-compatibility-exception-register-2026-03-04.json` | keep byte-identical until root consumers are cleaned up |
| `docs/legacy-compatibility-exception-register-2026-03-05.json` | `docs/decisions/legacy-compatibility-exception-register-2026-03-05.json` | keep byte-identical until root consumers are cleaned up |

When retaining compatibility copies:

1. update the canonical file first
2. update the root compatibility copy in the same change
3. point manifests and scripts at the canonical path
4. remove the compatibility copy only after downstream references are cleaned up

## Next Suggested Batch

If continuing from this point, the next low-risk moves are:

1. update downstream historical docs only when they are already being touched for other work
2. decide whether the root JSON compatibility copies still have external consumers
3. remove those root JSON copies once those consumers are gone
