---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'draft'
doc_type: 'reference'
scope: 'cross-feature'
canonical: true
---

# Migration Script Lifecycle Register (2026-04-17)

Draft generated on: 2026-03-05  
Target effective date: 2026-04-17  
Status: Draft (pending owner sign-off)  
Owner: Platform Architecture + Domain Maintainers

## Status Legend

- `retain-active`: keep as standard migration/verification command.
- `retain-breakglass`: keep for controlled emergency operations only.
- `archive-history`: remove from primary script lifecycle; keep in history/docs.
- `remove-obsolete`: remove from supported script surface.

## Proposed Final Summary (Target 2026-04-17)

- `retain-active`: 22
- `retain-breakglass`: 5
- `archive-history`: 5
- `remove-obsolete`: 1

## Register

| Script | Current Status (2026-03-05) | Proposed Status (2026-04-17) | Owner | Rationale |
| --- | --- | --- | --- | --- |
| `wave1:verify:prepare` | retain-active | retain-active | platform | still required as preflight canonical verification runner |
| `wave1:verify:dry-run` | retain-active | retain-active | platform | still required as no-write safety gate |
| `wave1:verify:write` | retain-active | retain-active | platform | controlled apply mode remains required |
| `products:normalize:v2` | retain-active | retain-active | products | canonical shape normalizer remains operationally useful |
| `migrate:ai-paths:config-contract:v2` | retain-active | retain-active | ai-paths | canonical AI Paths contract enforcement |
| `migrate:agent-personas:snapshot-keys:v2` | retain-active | retain-active | ai-brain | canonical snapshot-key normalizer |
| `migrate:brain:provider-catalog:v2` | retain-active | retain-active | ai-brain | canonical provider-catalog normalizer |
| `migrate:image-studio:settings-contract:v2` | retain-active | retain-active | image-studio | canonical settings contract normalizer |
| `migrate:image-studio:modes-contract:v2` | retain-active | retain-active | image-studio | canonical mode contract normalizer |
| `migrate:base-export-template-parameter-sources:v2` | retain-active | retain-active | integrations | canonical export parameter mapping normalizer |
| `migrate:base-active-template-preferences:v2` | retain-active | retain-active | integrations | canonical scoped preference normalizer |
| `migrate:base-connection-token-storage:v2` | retain-active | retain-active | integrations | canonical Base token storage normalizer |
| `migrate:base-token-encryption:v2` | retain-active | retain-active | integrations | canonical token encryption normalizer |
| `migrate:tradera-api-credential-storage:v2` | retain-active | retain-active | integrations | canonical Tradera credential normalizer |
| `migrate:tradera-api-user-id-storage:v2` | retain-active | retain-active | integrations | canonical Tradera user-id normalizer |
| `migrate:base-import-parameter-link-map:v2` | retain-active | retain-active | integrations | canonical import parameter-link normalizer |
| `migrate:base-import-run-connection-ids:v2` | retain-active | retain-active | integrations | canonical run-connection id normalizer |
| `migrate:base-export-warehouse-preferences:v2` | retain-active | retain-active | integrations | canonical warehouse-preference normalizer |
| `migrate:cms:page-builder-template-settings:v2` | retain-active | retain-active | cms | canonical template settings normalizer |
| `migrate:case-resolver:workspace-detached-contract:v2` | retain-active | retain-active | case-resolver | canonical detached workspace contract normalizer |
| `migrate:master-folder-tree:profiles:v2` | retain-active | retain-active | folder-tree | canonical profile contract normalizer |
| `migrate:validator-pattern-feature:v2` | retain-active | retain-active | validator | canonical validator config normalizer |
| `restore:base-listing-statuses` | retain-breakglass | retain-breakglass | products | corrective restore utility for listing-status regressions; keep restricted as breakglass |
| `backfill:ai-paths-input-contracts` | retain-breakglass | archive-history | ai-paths | one-off backfill completed; keep historical runbook reference only |
| `backfill:ai-paths-sanitize-edges` | retain-breakglass | archive-history | ai-paths | one-off edge-shape repair completed; retain history only |
| `backfill:ai-path-run-runtime-ports` | retain-breakglass | archive-history | ai-paths | one-off runtime-port repair completed; retain history only |
| `backfill:image-studio-center-links` | retain-breakglass | archive-history | image-studio | one-off relational repair completed; retain history only |
| `backfill:image-studio-upscale-links` | retain-breakglass | archive-history | image-studio | one-off relational repair completed; retain history only |
| `cleanup:db-providers` | retain-breakglass | retain-breakglass | platform | operational corrective utility still needed occasionally |
| `cleanup:cms-blocks` | retain-breakglass | retain-breakglass | cms | destructive utility must remain restricted breakglass |
| `cleanup:ai-paths-legacy-index-key` | retain-breakglass | remove-obsolete | ai-paths | legacy key cleanup no longer needed after canonical hard-cut |
| `cleanup:category-mapping-duplicates` | retain-breakglass | retain-breakglass | integrations | corrective dedupe may still be required for external sync drift |
| `cleanup:image-studio-orphan-variants` | retain-breakglass | retain-breakglass | image-studio | corrective orphan cleanup remains operationally relevant |

## Preconditions For Finalizing This Register

1. Stabilization window on main completes without canonical regressions.
2. No active entries in `docs/decisions/legacy-compatibility-exception-register-2026-03-05.json`.
3. Final owner confirmation for each proposed status change.

## Owner Approval Matrix (Pending)

| Owner Group | Scope | Approval |
| --- | --- | --- |
| platform | `wave1:verify:*`, `cleanup:db-providers` | pending |
| products | `products:normalize:v2` | pending |
| ai-paths | `migrate:ai-paths:config-contract:v2`, `backfill:ai-paths-*`, `cleanup:ai-paths-legacy-index-key` | pending |
| ai-brain | `migrate:agent-personas:snapshot-keys:v2`, `migrate:brain:provider-catalog:v2` | pending |
| integrations | Base/Tradera migration scripts, `cleanup:category-mapping-duplicates` | pending |
| image-studio | image-studio migration/backfill/cleanup scripts | pending |
| cms | `migrate:cms:page-builder-template-settings:v2`, `cleanup:cms-blocks` | pending |
| case-resolver | `migrate:case-resolver:workspace-detached-contract:v2` | pending |
| folder-tree | `migrate:master-folder-tree:profiles:v2` | pending |
| validator | `migrate:validator-pattern-feature:v2` | pending |

## Sign-off (Pending)

1. Platform Architecture
2. Products
3. AI Paths
4. Integrations
5. Image Studio
6. CMS
7. Case Resolver
