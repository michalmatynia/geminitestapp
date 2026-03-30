---
owner: 'Platform Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'reference'
scope: 'cross-feature'
canonical: true
---

# Migration Script Lifecycle Register (2026-03-05)

Date: 2026-03-05  
Owner: Platform Architecture + Domain Maintainers

This register is the executed March 5 baseline. Keep it as the historical
starting point for the hard-cut wave, but treat
[`script-lifecycle-register-2026-04-17.md`](./script-lifecycle-register-2026-04-17.md)
as the active reclassification draft paired with
[`stabilization-window-2026-04-17.md`](./stabilization-window-2026-04-17.md)
and [`docs/plans/canonical-closeout-2026-04-17.md`](../plans/canonical-closeout-2026-04-17.md).

## Status Legend

- `retain-active`: keep as standard migration/verification command in current cycle.
- `retain-breakglass`: keep for emergency remediation, not routine operation.
- `archive-history`: remove from primary scripts list, keep discoverable in docs/history.
- `remove-obsolete`: delete after validation window and owner approval.

## Current Decisions

Summary:

- `retain-active`: 22
- `retain-breakglass`: 11
- `archive-history`: 0
- `remove-obsolete`: 0

## Register

| Script | Status | Owner | Rationale | Review By |
| --- | --- | --- | --- | --- |
| `wave1:verify:prepare` | retain-active | platform | orchestrates canonical wave verification sequence | 2026-04-17 |
| `wave1:verify:dry-run` | retain-active | platform | required pre-write safety gate | 2026-04-17 |
| `wave1:verify:write` | retain-active | platform | controlled apply mode for verified migrations | 2026-04-17 |
| `products:normalize:v2` | retain-active | products | canonical product shape normalization | 2026-04-17 |
| `migrate:ai-paths:config-contract:v2` | retain-active | ai-paths | canonical AI Paths contract enforcement | 2026-04-17 |
| `migrate:agent-personas:snapshot-keys:v2` | retain-active | ai-brain | snapshot-key canonicalization | 2026-04-17 |
| `migrate:brain:provider-catalog:v2` | retain-active | ai-brain | canonical provider catalog entries contract | 2026-04-17 |
| `migrate:image-studio:settings-contract:v2` | retain-active | image-studio | canonical settings contract | 2026-04-17 |
| `migrate:image-studio:modes-contract:v2` | retain-active | image-studio | canonical mode markers | 2026-04-17 |
| `migrate:base-export-template-parameter-sources:v2` | retain-active | integrations | canonical export parameter-source mappings | 2026-04-17 |
| `migrate:base-active-template-preferences:v2` | retain-active | integrations | canonical active template preferences | 2026-04-17 |
| `migrate:base-connection-token-storage:v2` | retain-active | integrations | canonical Base token source | 2026-04-17 |
| `migrate:base-token-encryption:v2` | retain-active | integrations | canonical encrypted Base token storage | 2026-04-17 |
| `migrate:tradera-api-credential-storage:v2` | retain-active | integrations | canonical Tradera credential fields | 2026-04-17 |
| `migrate:tradera-api-user-id-storage:v2` | retain-active | integrations | canonical Tradera user id field | 2026-04-17 |
| `migrate:base-import-parameter-link-map:v2` | retain-active | integrations | canonical scoped link-map setting shape | 2026-04-17 |
| `migrate:base-import-run-connection-ids:v2` | retain-active | integrations | canonical run connection id hydration | 2026-04-17 |
| `migrate:base-export-warehouse-preferences:v2` | retain-active | integrations | canonical warehouse preference keying | 2026-04-17 |
| `migrate:cms:page-builder-template-settings:v2` | retain-active | cms | canonical template settings keys | 2026-04-17 |
| `migrate:case-resolver:workspace-detached-contract:v2` | retain-active | case-resolver | canonical detached schema v2 | 2026-04-17 |
| `migrate:master-folder-tree:profiles:v2` | retain-active | folder-tree | canonical per-instance profile contract | 2026-04-17 |
| `migrate:validator-pattern-feature:v2` | retain-active | validator | canonical validator runtime config shape | 2026-04-17 |
| `restore:base-listing-statuses` | retain-breakglass | products | corrective restore utility for listing-status regressions; not routine migration flow | 2026-04-17 |
| `backfill:ai-paths-input-contracts` | retain-breakglass | ai-paths | one-off backfill for non-canonical persisted inputs | 2026-04-17 |
| `backfill:ai-paths-sanitize-edges` | retain-breakglass | ai-paths | one-off edge-shape cleanup | 2026-04-17 |
| `backfill:ai-path-run-runtime-ports` | retain-breakglass | ai-paths | one-off runtime port backfill | 2026-04-17 |
| `backfill:image-studio-center-links` | retain-breakglass | image-studio | one-off relational link repair | 2026-04-17 |
| `backfill:image-studio-upscale-links` | retain-breakglass | image-studio | one-off relational link repair | 2026-04-17 |
| `cleanup:db-providers` | retain-breakglass | platform | operational cleanup; not part of standard migration cycle | 2026-04-17 |
| `cleanup:cms-blocks` | retain-breakglass | cms | destructive cleanup utility, keep restricted | 2026-04-17 |
| `cleanup:ai-paths-legacy-index-key` | retain-breakglass | ai-paths | legacy key cleanup in breakglass mode only | 2026-04-17 |
| `cleanup:category-mapping-duplicates` | retain-breakglass | integrations | corrective dedupe script | 2026-04-17 |
| `cleanup:image-studio-orphan-variants` | retain-breakglass | image-studio | corrective orphan cleanup | 2026-04-17 |

## Notes

1. No script is marked `remove-obsolete` in this revision because final cutover monitoring is still active.
2. Scripts marked `retain-breakglass` should be documented in runbooks with explicit operator approval gates.
3. The active reclassification work now lives in
   [`script-lifecycle-register-2026-04-17.md`](./script-lifecycle-register-2026-04-17.md);
   use this March register as the baseline comparison point, not the live tracker.
