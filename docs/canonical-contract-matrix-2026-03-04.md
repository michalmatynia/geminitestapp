# Canonical Contract Matrix (2026-03-04)

Date: 2026-03-04  
Owner: Platform architecture owners + feature maintainers

## Purpose

Single source of truth for canonical runtime contracts during legacy-compatibility retirement.

## Matrix

| Domain | Canonical Runtime Contract | Canonical Persistence / Keys | Canonical API Surface | Canonical Migration Entry Points | Guardrail |
| --- | --- | --- | --- | --- | --- |
| AI Paths | canonical node identities, canonical ports, canonical runtime metadata | `ai_paths_index`, `ai_paths_config_*` | `/api/ai-paths/*` and `/api/v2/products/ai-paths/*` | `migrate:ai-paths:config-contract:v2`, `cleanup:ai-paths-legacy-index-key`, `backfill:ai-paths-*` | `npm run ai-paths:check:canonical` |
| Products | v2-only products contracts | canonical product document shape (no legacy nested name/description/categories) | `/api/v2/products/*` | `products:normalize:v2` | parity tests + legacy shape guard |
| Integrations (Base/Tradera) | canonical token/user-id/credential/runtime mapping contracts | `baseApiToken`, canonical Tradera API fields, scoped import/export preferences | `/api/v2/integrations/*` | `migrate:base-*:v2`, `migrate:tradera-api-*:v2` | route parity + runtime prune tests |
| Prompt Exploder | canonical runtime scope + stack + bridge contracts | canonical prompt-engine payload shape | prompt-exploder feature runtime only | completed migration wave (legacy adapters removed) | runtime prune tests |
| Case Resolver | detached sidecar schema v2 + canonical workspace payloads | `case_resolver_workspace_detached_*_v2` schemas | `/api/case-resolver/*` | `migrate:case-resolver:workspace-detached-contract:v2` | workspace regression + migration tests |
| AI Brain | canonical provider catalog `entries` envelope | `ai_brain_provider_catalog` | `/api/brain/*` + dependent runtime readers | migration by rewrite to canonical `entries` payloads | sitewide canonical guard (Wave 0 scaffold) |
| CMS + Folder Tree | per-instance folder-tree profile persistence + canonical page-builder settings keys | `folder_tree_profile::{instance}`, `cms_section_templates.v2`, `cms_grid_templates.v2` | `/api/cms/*` | `migrate:master-folder-tree:profiles:v2`, `migrate:cms:page-builder-template-settings:v2` | folder-tree runtime prune tests |
| Observability | shared observability core contracts only | canonical observability event/store structures | `/api/system/*`, instrumentation paths | n/a (compat shims removed) | `npm run observability:check` |

## Change Control

1. New runtime compatibility behavior is blocked by default.
2. Temporary compatibility is allowed only when added to the exception register:
   - `docs/legacy-compatibility-exception-register-2026-03-04.json`
3. Any new temporary exception must include:
   - owner
   - sunset date
   - explicit runtime file scope
   - exact guard token for CI enforcement
