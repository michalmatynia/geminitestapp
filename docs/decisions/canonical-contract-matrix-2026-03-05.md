---
owner: 'Platform Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'decision'
scope: 'cross-feature'
canonical: true
---

# Canonical Contract Matrix (2026-03-05)

Date: 2026-03-05  
Owner: Platform architecture owners + feature maintainers

## Purpose

Current single source of truth for canonical runtime contracts and allowed migration surfaces.

This decision stays authoritative for contract shape, while the April closeout and
stabilization docs track whether the migration program remains fully closed.

## Matrix

| Domain | Canonical Runtime Contract | Canonical Persistence / Keys | Canonical API Surface | Canonical Migration Entry Points | Guardrail |
| --- | --- | --- | --- | --- | --- |
| AI Paths | canonical node identities, ports, runtime metadata and run graph | `ai_paths_index`, `ai_paths_config_*` | `/api/ai-paths/*`, `/api/v2/products/ai-paths/*` | `migrate:ai-paths:config-contract:v2`, `cleanup:ai-paths-legacy-index-key`, `backfill:ai-paths-*` | `npm run ai-paths:check:canonical` |
| Products | v2-only product contracts and canonical repository shapes | canonical product document fields only | `/api/v2/products/*` | `products:normalize:v2` | canonical route tests + shape guards |
| Integrations (Base/Tradera) | canonical token/user-id/credential contracts | `baseApiToken`, `traderaApiAppKey`, `traderaApiToken`, `traderaApiUserId`, canonical scoped preferences | `/api/v2/integrations/*` | `migrate:base-*:v2`, `migrate:tradera-api-*:v2`, `migrate:base-import-run-connection-ids:v2` | route parity + runtime prune tests |
| Prompt Exploder | canonical runtime scope/stack/bridge contracts | canonical prompt-engine payloads | prompt-exploder runtime only | migration wave completed; no runtime adapters | runtime prune tests |
| Case Resolver | detached sidecar schema v2 + canonical workspace payloads | `case_resolver_workspace_v2`, `case_resolver_workspace_v2_history`, `case_resolver_workspace_v2_documents` | `/api/case-resolver/*` plus shared settings persistence for workspace records | `migrate:case-resolver:workspace-detached-contract:v2` | workspace + parser regressions |
| AI Brain | canonical provider catalog `entries` envelope | `ai_brain_provider_catalog` | `/api/brain/*` and dependent runtime readers | `migrate:brain:provider-catalog:v2` | `npm run canonical:check:sitewide` |
| CMS + Folder Tree | canonical template/profile runtime contracts | `folder_tree_profile::{instance}`, `cms_section_templates.v2`, `cms_grid_templates.v2` | `/api/cms/*` | `migrate:master-folder-tree:profiles:v2`, `migrate:cms:page-builder-template-settings:v2` | runtime prune tests + sitewide checks |
| Observability | shared observability core contracts only | canonical event/store structures | `/api/system/*`, instrumentation paths | n/a | `npm run observability:check` |

## Verification Snapshot (Executed 2026-03-05)

1. `npm run canonical:check:sitewide` passed.
2. `npm run ai-paths:check:canonical` passed.
3. `npm run observability:check` passed.
4. `npm run wave1:verify:dry-run` passed (`10/10`).
5. `npm run wave1:verify:write` passed (`10/10`, no migration writes applied in local report).

## Change Control

1. New runtime compatibility behavior is blocked by default.
2. Any temporary compatibility must be declared in the current exception register.
3. Migration helpers must remain outside runtime source (`src/**`) unless explicitly approved and time-boxed.
