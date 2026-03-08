# Security Authorization Matrix Report

Generated at: 2026-03-08T14:43:47.649Z

## Summary

- Status: FAILED
- Route files scanned: 330
- Route methods scanned: 474
- Public methods: 14
- Protected methods: 444
- Signed ingress methods: 1
- Actor-scoped methods: 15
- Errors: 378
- Warnings: 0

## Route Classification

| Route | Method | Expected Access | Evidence |
| --- | --- | --- | --- |
| agentcreator/agent/[runId]/assets/[file] | GET | protected | - |
| agentcreator/agent/[runId]/audits | GET | protected | - |
| agentcreator/agent/[runId]/controls | POST | protected | - |
| agentcreator/agent/[runId]/logs | GET | protected | - |
| agentcreator/agent/[runId] | GET | protected | - |
| agentcreator/agent/[runId] | POST | protected | - |
| agentcreator/agent/[runId] | DELETE | protected | - |
| agentcreator/agent/[runId]/snapshots | GET | protected | - |
| agentcreator/agent/[runId]/stream | GET | protected | - |
| agentcreator/agent | GET | protected | - |
| agentcreator/agent | POST | protected | - |
| agentcreator/agent | DELETE | protected | - |
| agentcreator/agent/snapshots/[snapshotId] | GET | protected | - |
| agentcreator/personas/[personaId]/memory | GET | protected | - |
| agentcreator/personas/avatar | POST | protected | - |
| agentcreator/teaching/agents/[agentId] | PATCH | protected | - |
| agentcreator/teaching/agents/[agentId] | DELETE | protected | - |
| agentcreator/teaching/agents | GET | protected | - |
| agentcreator/teaching/agents | POST | protected | - |
| agentcreator/teaching/chat | POST | protected | - |
| agentcreator/teaching/collections/[collectionId]/documents/[documentId] | DELETE | protected | - |
| agentcreator/teaching/collections/[collectionId]/documents | GET | protected | - |
| agentcreator/teaching/collections/[collectionId]/documents | POST | protected | - |
| agentcreator/teaching/collections/[collectionId] | PATCH | protected | - |
| agentcreator/teaching/collections/[collectionId] | DELETE | protected | - |
| agentcreator/teaching/collections/[collectionId]/search | POST | protected | - |
| agentcreator/teaching/collections | GET | protected | - |
| agentcreator/teaching/collections | POST | protected | - |
| ai/actions/execute | POST | protected | - |
| ai/actions/propose | POST | protected | - |
| ai/context/related/[id] | GET | protected | - |
| ai/context/resolve | POST | protected | - |
| ai/context/search | POST | protected | - |
| ai/schema/[entity] | GET | protected | - |
| ai-insights/notifications | GET | protected | - |
| ai-insights/notifications | DELETE | protected | - |
| ai-paths/db-action | POST | protected | - |
| ai-paths/health | GET | protected | `access helper` |
| ai-paths/playwright/[runId]/artifacts/[file] | GET | protected | `access helper` |
| ai-paths/playwright/[runId] | GET | protected | `access helper` |
| ai-paths/playwright | POST | protected | - |
| ai-paths/portable-engine/remediation-dead-letters/replay-history | GET | protected | `access helper` |
| ai-paths/portable-engine/remediation-dead-letters | GET | protected | `access helper` |
| ai-paths/portable-engine/remediation-dead-letters | POST | protected | `access helper` |
| ai-paths/portable-engine/remediation-webhook | POST | signed | `signature verification` |
| ai-paths/portable-engine/schema/diff | GET | protected | `access helper` |
| ai-paths/portable-engine/schema | GET | protected | `access helper` |
| ai-paths/portable-engine/trend-snapshots | GET | protected | `access helper` |
| ai-paths/runs/[runId]/cancel | POST | protected | `access helper` |
| ai-paths/runs/[runId]/resume | POST | protected | `access helper` |
| ai-paths/runs/[runId]/retry-node | POST | protected | `access helper` |
| ai-paths/runs/[runId] | GET | protected | `access helper` |
| ai-paths/runs/[runId] | DELETE | protected | `access helper` |
| ai-paths/runs/[runId]/stream | GET | protected | `access helper` |
| ai-paths/runs/dead-letter/requeue | POST | protected | `permission/isElevated`, `access helper` |
| ai-paths/runs/enqueue | POST | protected | `access helper` |
| ai-paths/runs/queue-status | GET | protected | `access helper` |
| ai-paths/runs | GET | protected | `access helper` |
| ai-paths/runs | DELETE | protected | `access helper` |
| ai-paths/runtime-analytics/insights | GET | protected | `access helper` |
| ai-paths/runtime-analytics/insights | POST | protected | `access helper` |
| ai-paths/runtime-analytics/summary | GET | protected | `access helper` |
| ai-paths/settings/maintenance | GET | protected | - |
| ai-paths/settings/maintenance | POST | protected | - |
| ai-paths/settings | GET | protected | - |
| ai-paths/settings | POST | protected | - |
| ai-paths/settings | DELETE | protected | - |
| ai-paths/trigger-buttons/[id] | PATCH | protected | `access helper` |
| ai-paths/trigger-buttons/[id] | DELETE | protected | `access helper` |
| ai-paths/trigger-buttons/reorder | POST | protected | `access helper` |
| ai-paths/trigger-buttons | GET | protected | `access helper` |
| ai-paths/trigger-buttons | POST | protected | `access helper` |
| ai-paths/update | POST | protected | - |
| ai-paths/validation/docs-snapshot | GET | protected | `access helper` |
| analytics/events | POST | public | - |
| analytics/events | GET | session | `auth()`, `session.user` |
| analytics/insights | GET | session | - |
| analytics/insights | POST | session | - |
| analytics/summary | GET | session | `auth()`, `session.user` |
| assets3d/[id]/file | GET | protected | - |
| assets3d/[id] | GET | protected | - |
| assets3d/[id] | PATCH | protected | - |
| assets3d/[id] | DELETE | protected | - |
| assets3d/categories | GET | protected | - |
| assets3d/reindex | POST | protected | - |
| assets3d | GET | protected | - |
| assets3d | POST | protected | - |
| assets3d/tags | GET | protected | - |
| auth/[...nextauth] | GET | public | - |
| auth/[...nextauth] | POST | public | - |
| auth/mfa/disable | POST | protected | `auth()`, `session.user` |
| auth/mfa/setup | POST | protected | `auth()`, `session.user` |
| auth/mfa/verify | POST | protected | `auth()`, `session.user` |
| auth/mock-signin | POST | protected | `auth()`, `session.user`, `permission/isElevated` |
| auth/register | POST | public | - |
| auth/users/[id] | PATCH | protected | `auth()`, `session.user`, `permission/isElevated` |
| auth/users/[id] | DELETE | protected | `auth()`, `session.user`, `permission/isElevated` |
| auth/users/[id]/security | GET | protected | `auth()`, `session.user`, `permission/isElevated` |
| auth/users/[id]/security | PATCH | protected | `auth()`, `session.user`, `permission/isElevated` |
| auth/users | GET | protected | `auth()`, `session.user`, `permission/isElevated` |
| auth/verify-credentials | POST | public | - |
| brain/models | GET | protected | - |
| brain/operations/overview | GET | protected | - |
| case-resolver/assets/extract-pdf | POST | protected | - |
| case-resolver/assets/upload | POST | protected | - |
| case-resolver/documents/export-pdf | POST | protected | - |
| case-resolver/ocr/jobs/[jobId] | GET | protected | - |
| case-resolver/ocr/jobs/[jobId] | POST | protected | - |
| case-resolver/ocr/jobs | POST | protected | - |
| case-resolver/ocr/models | GET | protected | - |
| case-resolver/ocr/observability | GET | protected | - |
| chatbot/agent/[runId]/[action] | GET | protected | - |
| chatbot/agent/[runId]/[action] | POST | protected | - |
| chatbot/agent/[runId]/assets/[file] | GET | protected | - |
| chatbot/agent/[runId] | GET | protected | - |
| chatbot/agent/[runId] | POST | protected | - |
| chatbot/agent/[runId] | DELETE | protected | - |
| chatbot/agent | GET | protected | - |
| chatbot/agent | POST | protected | - |
| chatbot/agent | DELETE | protected | - |
| chatbot/context | POST | protected | - |
| chatbot/jobs/[jobId] | GET | protected | - |
| chatbot/jobs/[jobId] | POST | protected | - |
| chatbot/jobs/[jobId] | DELETE | protected | - |
| chatbot/jobs | GET | protected | - |
| chatbot/jobs | POST | protected | - |
| chatbot/jobs | DELETE | protected | - |
| chatbot/memory | GET | protected | - |
| chatbot | GET | protected | - |
| chatbot | POST | protected | - |
| chatbot/sessions/[sessionId]/messages | GET | protected | - |
| chatbot/sessions/[sessionId]/messages | POST | protected | - |
| chatbot/sessions/[sessionId] | GET | protected | - |
| chatbot/sessions | POST | protected | - |
| chatbot/sessions | GET | protected | - |
| chatbot/sessions | PATCH | protected | - |
| chatbot/sessions | DELETE | protected | - |
| chatbot/settings | GET | protected | - |
| chatbot/settings | POST | protected | - |
| client-errors | POST | public | - |
| cms/css-ai/stream | POST | protected | - |
| cms/domains/[id] | DELETE | protected | - |
| cms/domains/[id] | PUT | protected | - |
| cms/domains | GET | protected | - |
| cms/domains | POST | protected | - |
| cms/media | POST | protected | - |
| cms/pages/[id] | GET | protected | - |
| cms/pages/[id] | PUT | protected | - |
| cms/pages/[id] | DELETE | protected | - |
| cms/pages | GET | protected | - |
| cms/pages | POST | protected | - |
| cms/slugs/[id]/domains | GET | protected | - |
| cms/slugs/[id]/domains | PUT | protected | - |
| cms/slugs/[id] | GET | protected | - |
| cms/slugs/[id] | DELETE | protected | - |
| cms/slugs/[id] | PUT | protected | - |
| cms/slugs | GET | protected | - |
| cms/slugs | POST | protected | - |
| cms/themes/[id] | GET | protected | - |
| cms/themes/[id] | PUT | protected | - |
| cms/themes/[id] | DELETE | protected | - |
| cms/themes | GET | protected | - |
| cms/themes | POST | protected | - |
| databases/backup | POST | protected | `access helper` |
| databases/backups | GET | protected | `access helper` |
| databases/browse | GET | protected | - |
| databases/copy-collection | POST | protected | `auth()`, `session.user`, `permission/isElevated` |
| databases/copy-collection | GET | protected | - |
| databases/crud | POST | protected | - |
| databases/delete | POST | protected | `access helper` |
| databases/engine/backup-scheduler/run-now | POST | protected | `auth()`, `session.user`, `permission/isElevated` |
| databases/engine/backup-scheduler/status | GET | protected | - |
| databases/engine/backup-scheduler/tick | POST | protected | `auth()`, `session.user`, `permission/isElevated` |
| databases/engine/operations/jobs/[jobId]/cancel | POST | protected | `auth()`, `session.user`, `permission/isElevated` |
| databases/engine/operations/jobs | GET | protected | `auth()`, `session.user`, `permission/isElevated` |
| databases/engine/provider-preview | GET | protected | - |
| databases/engine/status | GET | protected | - |
| databases/execute | POST | protected | - |
| databases/json-backup | POST | protected | `access helper` |
| databases/json-backup | GET | protected | `access helper` |
| databases/json-restore | POST | protected | `access helper` |
| databases/preview | POST | protected | - |
| databases/redis | GET | protected | - |
| databases/restore | POST | protected | `access helper` |
| databases/schema | GET | protected | - |
| databases/upload | POST | protected | `access helper` |
| drafts/[id] | GET | protected | - |
| drafts/[id] | PUT | protected | - |
| drafts/[id] | DELETE | protected | - |
| drafts | GET | protected | - |
| drafts | POST | protected | - |
| files/[id] | DELETE | protected | - |
| files/[id] | PATCH | protected | - |
| files/preview | GET | protected | - |
| files | GET | protected | - |
| health | GET | public | - |
| image-studio/cards/backfill | POST | protected | - |
| image-studio/composite | POST | protected | - |
| image-studio/mask/ai | POST | protected | `auth()`, `session.user`, `permission/isElevated` |
| image-studio/models | GET | protected | - |
| image-studio/projects/[projectId]/assets/delete | POST | protected | - |
| image-studio/projects/[projectId]/assets/import | POST | protected | - |
| image-studio/projects/[projectId]/assets/move | POST | protected | - |
| image-studio/projects/[projectId]/assets | GET | protected | - |
| image-studio/projects/[projectId]/assets | POST | protected | - |
| image-studio/projects/[projectId]/folders | POST | protected | - |
| image-studio/projects/[projectId]/folders | DELETE | protected | - |
| image-studio/projects/[projectId] | DELETE | protected | - |
| image-studio/projects/[projectId] | PATCH | protected | - |
| image-studio/projects/[projectId]/slots/ensure-from-upload | POST | protected | - |
| image-studio/projects/[projectId]/slots | GET | protected | - |
| image-studio/projects/[projectId]/slots | POST | protected | - |
| image-studio/projects/[projectId]/variants/delete | POST | protected | - |
| image-studio/projects | GET | protected | - |
| image-studio/projects | POST | protected | - |
| image-studio/prompt-extract | POST | protected | `auth()`, `session.user`, `permission/isElevated` |
| image-studio/run | POST | protected | - |
| image-studio/runs/[runId] | GET | protected | - |
| image-studio/runs/[runId]/stream | GET | protected | - |
| image-studio/runs | GET | protected | - |
| image-studio/sequences/[runId]/cancel | POST | protected | - |
| image-studio/sequences/[runId] | GET | protected | - |
| image-studio/sequences/[runId]/stream | GET | protected | - |
| image-studio/sequences | GET | protected | - |
| image-studio/sequences/run | POST | protected | - |
| image-studio/slots/[slotId]/analysis | POST | protected | - |
| image-studio/slots/[slotId]/autoscale | POST | protected | - |
| image-studio/slots/[slotId]/center | POST | protected | - |
| image-studio/slots/[slotId]/crop | POST | protected | - |
| image-studio/slots/[slotId]/masks | POST | protected | - |
| image-studio/slots/[slotId] | PATCH | protected | - |
| image-studio/slots/[slotId] | DELETE | protected | - |
| image-studio/slots/[slotId]/screenshot | POST | protected | - |
| image-studio/slots/[slotId]/upscale | POST | protected | - |
| image-studio/slots/base64 | POST | protected | - |
| image-studio/ui-extractor | POST | protected | `auth()`, `session.user`, `permission/isElevated` |
| image-studio/validation-patterns/learn | POST | protected | `auth()`, `session.user`, `permission/isElevated` |
| kangur/ai-tutor/chat | POST | actor | `access helper`, `actor/session resolver` |
| kangur/ai-tutor/usage | GET | actor | `access helper`, `actor/session resolver` |
| kangur/assignments/[id] | PATCH | actor | `access helper` |
| kangur/assignments | GET | actor | `access helper` |
| kangur/assignments | POST | actor | `access helper` |
| kangur/auth/learner-signin | POST | public | - |
| kangur/auth/learner-signout | POST | public | - |
| kangur/auth/me | GET | actor | `access helper`, `actor/session resolver` |
| kangur/learners/[id] | PATCH | actor | `access helper`, `actor/session resolver` |
| kangur/learners | GET | actor | `access helper` |
| kangur/learners | POST | actor | `access helper` |
| kangur/observability/summary | GET | protected | `auth()` |
| kangur/progress | GET | actor | `access helper`, `actor/session resolver` |
| kangur/progress | PATCH | actor | `access helper`, `actor/session resolver` |
| kangur/scores | GET | actor | - |
| kangur/scores | POST | actor | `access helper`, `actor/session resolver` |
| kangur/tts/probe | POST | protected | `access helper`, `actor/session resolver` |
| kangur/tts | POST | actor | `access helper`, `actor/session resolver` |
| kangur/tts/status | POST | actor | `access helper`, `actor/session resolver` |
| marketplace/[resource] | GET | protected | - |
| marketplace/categories/fetch | POST | protected | - |
| marketplace/mappings/[id] | GET | protected | - |
| marketplace/mappings/[id] | PUT | protected | - |
| marketplace/mappings/[id] | DELETE | protected | - |
| marketplace/mappings/bulk | POST | protected | - |
| marketplace/mappings | GET | protected | - |
| marketplace/mappings | POST | protected | - |
| marketplace/producer-mappings/bulk | POST | protected | - |
| marketplace/producer-mappings | GET | protected | - |
| marketplace/producer-mappings | POST | protected | - |
| marketplace/producers/fetch | POST | protected | - |
| marketplace/tag-mappings/bulk | POST | protected | - |
| marketplace/tag-mappings | GET | protected | - |
| marketplace/tag-mappings | POST | protected | - |
| marketplace/tags/fetch | POST | protected | - |
| notes/[id]/files/[slotIndex] | DELETE | protected | - |
| notes/[id]/files | GET | protected | - |
| notes/[id]/files | POST | protected | - |
| notes/[id] | GET | protected | - |
| notes/[id] | PATCH | protected | - |
| notes/[id] | DELETE | protected | - |
| notes/categories/[id] | PATCH | protected | - |
| notes/categories/[id] | DELETE | protected | - |
| notes/categories | GET | protected | - |
| notes/categories | POST | protected | - |
| notes/categories/tree | GET | protected | - |
| notes/import-folder | POST | protected | - |
| notes/lookup | GET | protected | - |
| notes/notebooks/[id] | PATCH | protected | - |
| notes/notebooks/[id] | DELETE | protected | - |
| notes/notebooks | GET | protected | - |
| notes/notebooks | POST | protected | - |
| notes | GET | protected | - |
| notes | POST | protected | - |
| notes/tags/[id] | PATCH | protected | - |
| notes/tags/[id] | DELETE | protected | - |
| notes/tags | GET | protected | - |
| notes/tags | POST | protected | - |
| notes/themes/[id] | GET | protected | - |
| notes/themes/[id] | PATCH | protected | - |
| notes/themes/[id] | DELETE | protected | - |
| notes/themes | GET | protected | - |
| notes/themes | POST | protected | - |
| prompt-runtime/health | GET | public | - |
| public/products/[id] | GET | public | - |
| public/products/categories | GET | public | - |
| public/products/parameters | GET | public | - |
| query-telemetry | POST | public | - |
| search | POST | protected | - |
| settings/cache | GET | protected | - |
| settings/database/sync | POST | protected | `auth()`, `session.user`, `permission/isElevated` |
| settings/heavy | GET | protected | - |
| settings/lite | GET | protected | - |
| settings/migrate/backfill-keys | POST | protected | `auth()`, `session.user`, `permission/isElevated` |
| settings/providers | GET | protected | - |
| settings | GET | protected | - |
| settings | POST | protected | - |
| system/activity | GET | protected | - |
| system/diagnostics/mongo-indexes | GET | protected | - |
| system/diagnostics/mongo-indexes | POST | protected | - |
| system/logs/insights | GET | protected | - |
| system/logs/insights | POST | protected | - |
| system/logs/interpret | POST | protected | - |
| system/logs/metrics | GET | protected | - |
| system/logs | GET | protected | - |
| system/logs | POST | protected | - |
| system/logs | DELETE | protected | - |
| system/upload-events | GET | protected | - |
| user/preferences | GET | session | `auth()`, `session.user` |
| user/preferences | PATCH | session | `auth()`, `session.user` |
| user/preferences | POST | session | `auth()`, `session.user` |
| v2/integrations/[id]/connections/[connectionId]/allegro/authorize | GET | protected | - |
| v2/integrations/[id]/connections/[connectionId]/allegro/callback | GET | protected | - |
| v2/integrations/[id]/connections/[connectionId]/allegro/disconnect | POST | protected | - |
| v2/integrations/[id]/connections/[connectionId]/allegro/request | POST | protected | - |
| v2/integrations/[id]/connections/[connectionId]/allegro/test | POST | protected | - |
| v2/integrations/[id]/connections/[connectionId]/base/inventories | GET | protected | - |
| v2/integrations/[id]/connections/[connectionId]/base/products | POST | protected | - |
| v2/integrations/[id]/connections/[connectionId]/base/request | POST | protected | - |
| v2/integrations/[id]/connections/[connectionId]/base/test | POST | protected | - |
| v2/integrations/[id]/connections/[connectionId]/test | POST | protected | - |
| v2/integrations/[id]/connections | GET | protected | - |
| v2/integrations/[id]/connections | POST | protected | - |
| v2/integrations/connections/[id] | PUT | protected | - |
| v2/integrations/connections/[id] | DELETE | protected | `auth()`, `session.user` |
| v2/integrations/connections/[id]/session | GET | protected | - |
| v2/integrations/exports/base/[setting] | GET | protected | - |
| v2/integrations/exports/base/[setting] | POST | protected | - |
| v2/integrations/images/sync-base/all | POST | protected | - |
| v2/integrations/imports/base/[setting] | GET | protected | - |
| v2/integrations/imports/base/[setting] | POST | protected | - |
| v2/integrations/imports/base/parameters | POST | protected | - |
| v2/integrations/imports/base/parameters | GET | protected | - |
| v2/integrations/imports/base | POST | protected | - |
| v2/integrations/imports/base/runs/[runId]/cancel | POST | protected | - |
| v2/integrations/imports/base/runs/[runId]/report | GET | protected | - |
| v2/integrations/imports/base/runs/[runId]/resume | POST | protected | - |
| v2/integrations/imports/base/runs/[runId] | GET | protected | - |
| v2/integrations/imports/base/runs | GET | protected | - |
| v2/integrations/imports/base/runs | POST | protected | - |
| v2/integrations/imports/base/sample-product | GET | protected | - |
| v2/integrations/imports/base/sample-product | POST | protected | - |
| v2/integrations/jobs | GET | protected | - |
| v2/integrations/product-listings | GET | protected | - |
| v2/integrations/product-listings | POST | protected | - |
| v2/integrations/products/[id]/base/link-existing | POST | protected | - |
| v2/integrations/products/[id]/base/sku-check | POST | protected | - |
| v2/integrations/products/[id]/export-to-base | POST | protected | `session.user` |
| v2/integrations/products/[id]/listings/[listingId]/delete-from-base | POST | protected | `auth()`, `session.user` |
| v2/integrations/products/[id]/listings/[listingId]/purge | DELETE | protected | - |
| v2/integrations/products/[id]/listings/[listingId]/relist | POST | protected | - |
| v2/integrations/products/[id]/listings/[listingId] | DELETE | protected | - |
| v2/integrations/products/[id]/listings/[listingId] | PATCH | protected | - |
| v2/integrations/products/[id]/listings/[listingId]/sync-base-images | POST | protected | - |
| v2/integrations/products/[id]/listings | GET | protected | - |
| v2/integrations/products/[id]/listings | POST | protected | - |
| v2/integrations/queues/tradera | GET | protected | - |
| v2/integrations | GET | protected | - |
| v2/integrations | POST | protected | - |
| v2/integrations/with-connections | GET | protected | - |
| v2/metadata/[type]/[id] | GET | protected | - |
| v2/metadata/[type]/[id] | PUT | protected | - |
| v2/metadata/[type]/[id] | DELETE | protected | - |
| v2/metadata/[type] | GET | protected | - |
| v2/metadata/[type] | POST | protected | - |
| v2/products/[id]/duplicate | POST | protected | - |
| v2/products/[id]/images/[imageFileId] | DELETE | protected | - |
| v2/products/[id]/images/base64 | POST | protected | - |
| v2/products/[id]/images/link-to-file | POST | protected | - |
| v2/products/[id] | GET | protected | - |
| v2/products/[id] | PUT | protected | - |
| v2/products/[id] | PATCH | protected | - |
| v2/products/[id] | DELETE | protected | - |
| v2/products/[id]/studio/[action] | GET | protected | - |
| v2/products/[id]/studio/[action] | POST | protected | - |
| v2/products/[id]/studio | GET | protected | - |
| v2/products/[id]/studio | PUT | protected | - |
| v2/products/ai-jobs/[jobId] | GET | protected | - |
| v2/products/ai-jobs/[jobId] | POST | protected | - |
| v2/products/ai-jobs/[jobId] | DELETE | protected | - |
| v2/products/ai-jobs/bulk | POST | protected | - |
| v2/products/ai-jobs/enqueue | POST | protected | - |
| v2/products/ai-jobs | GET | protected | - |
| v2/products/ai-jobs | DELETE | protected | - |
| v2/products/ai-paths/description-context | GET | protected | - |
| v2/products/categories/[id] | GET | protected | - |
| v2/products/categories/[id] | PUT | protected | - |
| v2/products/categories/[id] | DELETE | protected | - |
| v2/products/categories/batch | GET | protected | - |
| v2/products/categories/migrate | POST | protected | - |
| v2/products/categories/reorder | POST | protected | - |
| v2/products/categories | GET | protected | - |
| v2/products/categories | POST | protected | - |
| v2/products/categories/tree | GET | protected | - |
| v2/products/count | GET | protected | - |
| v2/products/entities/[type]/[id] | GET | protected | - |
| v2/products/entities/[type]/[id] | PUT | protected | - |
| v2/products/entities/[type]/[id] | DELETE | protected | - |
| v2/products/entities/[type] | GET | protected | - |
| v2/products/entities/[type] | POST | protected | - |
| v2/products/entities/catalogs/assign | POST | protected | - |
| v2/products/images/base64/all | POST | protected | - |
| v2/products/images/base64 | POST | protected | - |
| v2/products/images/upload | POST | protected | - |
| v2/products/import/csv | POST | protected | - |
| v2/products/metadata/[type]/[id] | GET | protected | - |
| v2/products/metadata/[type]/[id] | PUT | protected | - |
| v2/products/metadata/[type]/[id] | DELETE | protected | - |
| v2/products/metadata/[type] | GET | protected | - |
| v2/products/metadata/[type] | POST | protected | - |
| v2/products/paged | GET | protected | - |
| v2/products/parameters/[id] | PUT | protected | - |
| v2/products/parameters/[id] | DELETE | protected | - |
| v2/products/parameters | GET | protected | - |
| v2/products/parameters | POST | protected | - |
| v2/products/producers/[id] | PUT | protected | - |
| v2/products/producers/[id] | DELETE | protected | - |
| v2/products/producers | GET | protected | - |
| v2/products/producers | POST | protected | - |
| v2/products | GET | protected | - |
| v2/products | POST | protected | - |
| v2/products/simple-parameters | GET | protected | - |
| v2/products/simple-parameters | POST | protected | - |
| v2/products/sync/profiles/[id] | GET | protected | - |
| v2/products/sync/profiles/[id] | PUT | protected | - |
| v2/products/sync/profiles/[id] | DELETE | protected | - |
| v2/products/sync/profiles/[id]/run | POST | protected | - |
| v2/products/sync/profiles | GET | protected | - |
| v2/products/sync/profiles | POST | protected | - |
| v2/products/sync/relink | POST | protected | - |
| v2/products/sync/runs/[runId] | GET | protected | - |
| v2/products/sync/runs | GET | protected | - |
| v2/products/tags/[id] | PUT | protected | - |
| v2/products/tags/[id] | DELETE | protected | - |
| v2/products/tags/all | GET | protected | - |
| v2/products/tags | GET | protected | - |
| v2/products/tags | POST | protected | - |
| v2/products/validation | POST | protected | - |
| v2/products/validation | GET | protected | - |
| v2/products/validator-config | GET | protected | - |
| v2/products/validator-decisions | POST | protected | - |
| v2/products/validator-patterns/[id] | PUT | protected | - |
| v2/products/validator-patterns/[id] | DELETE | protected | - |
| v2/products/validator-patterns/import | POST | protected | - |
| v2/products/validator-patterns/reorder | POST | protected | - |
| v2/products/validator-patterns | GET | protected | - |
| v2/products/validator-patterns | POST | protected | - |
| v2/products/validator-patterns/templates/[type] | POST | protected | - |
| v2/products/validator-patterns/templates/name-segment-category | POST | protected | - |
| v2/products/validator-patterns/templates/name-segment-dimensions | POST | protected | - |
| v2/products/validator-runtime/evaluate | POST | protected | - |
| v2/products/validator-settings | GET | protected | - |
| v2/products/validator-settings | PUT | protected | - |
| v2/templates/[type]/[id] | PUT | protected | - |
| v2/templates/[type]/[id] | DELETE | protected | - |
| v2/templates/[type] | GET | protected | - |
| v2/templates/[type] | POST | protected | - |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| authz-protected-route-missing-auth-check | 377 | 0 | 0 |
| authz-actor-route-missing-session-or-actor-check | 1 | 0 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/agentcreator/agent/[runId]/assets/[file]/route.ts:6:14 | GET agentcreator/agent/[runId]/assets/[file] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/agentcreator/agent/[runId]/audits/route.ts:6:14 | GET agentcreator/agent/[runId]/audits is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/agentcreator/agent/[runId]/controls/route.ts:6:14 | POST agentcreator/agent/[runId]/controls is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/agentcreator/agent/[runId]/logs/route.ts:6:14 | GET agentcreator/agent/[runId]/logs is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/agentcreator/agent/[runId]/route.ts:10:14 | GET agentcreator/agent/[runId] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/agentcreator/agent/[runId]/route.ts:11:14 | POST agentcreator/agent/[runId] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/agentcreator/agent/[runId]/route.ts:12:14 | DELETE agentcreator/agent/[runId] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/agentcreator/agent/[runId]/snapshots/route.ts:6:14 | GET agentcreator/agent/[runId]/snapshots is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/agentcreator/agent/[runId]/stream/route.ts:6:14 | GET agentcreator/agent/[runId]/stream is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/agentcreator/agent/route.ts:10:14 | GET agentcreator/agent is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/agentcreator/agent/route.ts:11:14 | POST agentcreator/agent is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/agentcreator/agent/route.ts:12:14 | DELETE agentcreator/agent is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/agentcreator/agent/snapshots/[snapshotId]/route.ts:6:14 | GET agentcreator/agent/snapshots/[snapshotId] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/agentcreator/personas/[personaId]/memory/route.ts:7:14 | GET agentcreator/personas/[personaId]/memory is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/agentcreator/personas/avatar/route.ts:8:14 | POST agentcreator/personas/avatar is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/agentcreator/teaching/agents/[agentId]/route.ts:7:14 | PATCH agentcreator/teaching/agents/[agentId] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/agentcreator/teaching/agents/[agentId]/route.ts:14:14 | DELETE agentcreator/teaching/agents/[agentId] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/agentcreator/teaching/agents/route.ts:7:14 | GET agentcreator/teaching/agents is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/agentcreator/teaching/agents/route.ts:11:14 | POST agentcreator/teaching/agents is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/agentcreator/teaching/chat/route.ts:7:14 | POST agentcreator/teaching/chat is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/agentcreator/teaching/collections/[collectionId]/documents/[documentId]/route.ts:7:14 | DELETE agentcreator/teaching/collections/[collectionId]/documents/[documentId] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/agentcreator/teaching/collections/[collectionId]/documents/route.ts:7:14 | GET agentcreator/teaching/collections/[collectionId]/documents is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/agentcreator/teaching/collections/[collectionId]/documents/route.ts:15:14 | POST agentcreator/teaching/collections/[collectionId]/documents is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/agentcreator/teaching/collections/[collectionId]/route.ts:7:14 | PATCH agentcreator/teaching/collections/[collectionId] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/agentcreator/teaching/collections/[collectionId]/route.ts:14:14 | DELETE agentcreator/teaching/collections/[collectionId] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/agentcreator/teaching/collections/[collectionId]/search/route.ts:7:14 | POST agentcreator/teaching/collections/[collectionId]/search is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/agentcreator/teaching/collections/route.ts:7:14 | GET agentcreator/teaching/collections is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/agentcreator/teaching/collections/route.ts:11:14 | POST agentcreator/teaching/collections is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/ai-insights/notifications/route.ts:7:14 | GET ai-insights/notifications is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/ai-insights/notifications/route.ts:10:14 | DELETE ai-insights/notifications is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/ai-paths/db-action/route.ts:7:14 | POST ai-paths/db-action is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/ai-paths/playwright/route.ts:7:14 | POST ai-paths/playwright is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/ai-paths/settings/maintenance/route.ts:7:14 | GET ai-paths/settings/maintenance is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/ai-paths/settings/maintenance/route.ts:11:14 | POST ai-paths/settings/maintenance is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/ai-paths/settings/route.ts:7:14 | GET ai-paths/settings is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/ai-paths/settings/route.ts:11:14 | POST ai-paths/settings is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/ai-paths/settings/route.ts:15:14 | DELETE ai-paths/settings is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/ai-paths/update/route.ts:7:14 | POST ai-paths/update is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/ai/actions/execute/route.ts:7:14 | POST ai/actions/execute is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/ai/actions/propose/route.ts:7:14 | POST ai/actions/propose is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/ai/context/related/[id]/route.ts:9:14 | GET ai/context/related/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/ai/context/resolve/route.ts:7:14 | POST ai/context/resolve is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/ai/context/search/route.ts:7:14 | POST ai/context/search is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/ai/schema/[entity]/route.ts:9:14 | GET ai/schema/[entity] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/analytics/insights/route.ts:7:14 | GET analytics/insights is classified as session but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/analytics/insights/route.ts:10:14 | POST analytics/insights is classified as session but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/assets3d/[id]/file/route.ts:7:14 | GET assets3d/[id]/file is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/assets3d/[id]/route.ts:8:14 | GET assets3d/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/assets3d/[id]/route.ts:12:14 | PATCH assets3d/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/assets3d/[id]/route.ts:16:14 | DELETE assets3d/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/assets3d/categories/route.ts:7:14 | GET assets3d/categories is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/assets3d/reindex/route.ts:7:14 | POST assets3d/reindex is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/assets3d/route.ts:8:14 | GET assets3d is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/assets3d/route.ts:13:14 | POST assets3d is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/assets3d/tags/route.ts:7:14 | GET assets3d/tags is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/brain/models/route.ts:7:14 | GET brain/models is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/brain/operations/overview/route.ts:7:14 | GET brain/operations/overview is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/case-resolver/assets/extract-pdf/route.ts:8:14 | POST case-resolver/assets/extract-pdf is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/case-resolver/assets/upload/route.ts:8:14 | POST case-resolver/assets/upload is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/case-resolver/documents/export-pdf/route.ts:8:14 | POST case-resolver/documents/export-pdf is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/case-resolver/ocr/jobs/[jobId]/route.ts:8:14 | GET case-resolver/ocr/jobs/[jobId] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/case-resolver/ocr/jobs/[jobId]/route.ts:12:14 | POST case-resolver/ocr/jobs/[jobId] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/case-resolver/ocr/jobs/route.ts:8:14 | POST case-resolver/ocr/jobs is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/case-resolver/ocr/models/route.ts:8:14 | GET case-resolver/ocr/models is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/case-resolver/ocr/observability/route.ts:8:14 | GET case-resolver/ocr/observability is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/chatbot/agent/[runId]/[action]/route.ts:70:14 | GET chatbot/agent/[runId]/[action] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/chatbot/agent/[runId]/[action]/route.ts:77:14 | POST chatbot/agent/[runId]/[action] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/chatbot/agent/[runId]/assets/[file]/route.ts:6:14 | GET chatbot/agent/[runId]/assets/[file] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/chatbot/agent/[runId]/route.ts:10:14 | GET chatbot/agent/[runId] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/chatbot/agent/[runId]/route.ts:11:14 | POST chatbot/agent/[runId] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/chatbot/agent/[runId]/route.ts:12:14 | DELETE chatbot/agent/[runId] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/chatbot/agent/route.ts:10:14 | GET chatbot/agent is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/chatbot/agent/route.ts:11:14 | POST chatbot/agent is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/chatbot/agent/route.ts:12:14 | DELETE chatbot/agent is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/chatbot/context/route.ts:7:14 | POST chatbot/context is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/chatbot/jobs/[jobId]/route.ts:7:14 | GET chatbot/jobs/[jobId] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/chatbot/jobs/[jobId]/route.ts:11:14 | POST chatbot/jobs/[jobId] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/chatbot/jobs/[jobId]/route.ts:15:14 | DELETE chatbot/jobs/[jobId] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/chatbot/jobs/route.ts:7:14 | GET chatbot/jobs is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/chatbot/jobs/route.ts:9:14 | POST chatbot/jobs is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/chatbot/jobs/route.ts:11:14 | DELETE chatbot/jobs is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/chatbot/memory/route.ts:7:14 | GET chatbot/memory is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/chatbot/route.ts:8:14 | GET chatbot is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/chatbot/route.ts:10:14 | POST chatbot is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/chatbot/sessions/[sessionId]/messages/route.ts:8:14 | GET chatbot/sessions/[sessionId]/messages is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/chatbot/sessions/[sessionId]/messages/route.ts:12:14 | POST chatbot/sessions/[sessionId]/messages is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/chatbot/sessions/[sessionId]/route.ts:7:14 | GET chatbot/sessions/[sessionId] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/chatbot/sessions/route.ts:8:14 | POST chatbot/sessions is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/chatbot/sessions/route.ts:10:14 | GET chatbot/sessions is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/chatbot/sessions/route.ts:12:14 | PATCH chatbot/sessions is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/chatbot/sessions/route.ts:16:14 | DELETE chatbot/sessions is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/chatbot/settings/route.ts:7:14 | GET chatbot/settings is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/chatbot/settings/route.ts:11:14 | POST chatbot/settings is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/cms/css-ai/stream/route.ts:8:14 | POST cms/css-ai/stream is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/cms/domains/[id]/route.ts:7:14 | DELETE cms/domains/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/cms/domains/[id]/route.ts:11:14 | PUT cms/domains/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/cms/domains/route.ts:7:14 | GET cms/domains is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/cms/domains/route.ts:8:14 | POST cms/domains is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/cms/media/route.ts:8:14 | POST cms/media is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/cms/pages/[id]/route.ts:8:14 | GET cms/pages/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/cms/pages/[id]/route.ts:12:14 | PUT cms/pages/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/cms/pages/[id]/route.ts:16:14 | DELETE cms/pages/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/cms/pages/route.ts:8:14 | GET cms/pages is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/cms/pages/route.ts:9:14 | POST cms/pages is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/cms/slugs/[id]/domains/route.ts:7:14 | GET cms/slugs/[id]/domains is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/cms/slugs/[id]/domains/route.ts:11:14 | PUT cms/slugs/[id]/domains is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/cms/slugs/[id]/route.ts:7:14 | GET cms/slugs/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/cms/slugs/[id]/route.ts:11:14 | DELETE cms/slugs/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/cms/slugs/[id]/route.ts:15:14 | PUT cms/slugs/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/cms/slugs/route.ts:7:14 | GET cms/slugs is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/cms/slugs/route.ts:12:14 | POST cms/slugs is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/cms/themes/[id]/route.ts:7:14 | GET cms/themes/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/cms/themes/[id]/route.ts:10:14 | PUT cms/themes/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/cms/themes/[id]/route.ts:13:14 | DELETE cms/themes/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/cms/themes/route.ts:7:14 | GET cms/themes is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/cms/themes/route.ts:8:14 | POST cms/themes is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/databases/browse/route.ts:8:14 | GET databases/browse is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/databases/copy-collection/route.ts:11:14 | GET databases/copy-collection is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/databases/crud/route.ts:7:14 | POST databases/crud is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/databases/engine/backup-scheduler/status/route.ts:7:14 | GET databases/engine/backup-scheduler/status is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/databases/engine/provider-preview/route.ts:7:14 | GET databases/engine/provider-preview is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/databases/engine/status/route.ts:8:14 | GET databases/engine/status is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/databases/execute/route.ts:7:14 | POST databases/execute is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/databases/preview/route.ts:8:14 | POST databases/preview is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/databases/redis/route.ts:7:14 | GET databases/redis is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/databases/schema/route.ts:8:14 | GET databases/schema is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/drafts/[id]/route.ts:8:14 | GET drafts/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/drafts/[id]/route.ts:13:14 | PUT drafts/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/drafts/[id]/route.ts:17:14 | DELETE drafts/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/drafts/route.ts:9:14 | GET drafts is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/drafts/route.ts:10:14 | POST drafts is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/files/[id]/route.ts:7:14 | DELETE files/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/files/[id]/route.ts:11:14 | PATCH files/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/files/preview/route.ts:7:14 | GET files/preview is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/files/route.ts:9:14 | GET files is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/cards/backfill/route.ts:7:14 | POST image-studio/cards/backfill is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/composite/route.ts:7:14 | POST image-studio/composite is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/models/route.ts:7:14 | GET image-studio/models is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/projects/[projectId]/assets/delete/route.ts:7:14 | POST image-studio/projects/[projectId]/assets/delete is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/projects/[projectId]/assets/import/route.ts:7:14 | POST image-studio/projects/[projectId]/assets/import is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/projects/[projectId]/assets/move/route.ts:7:14 | POST image-studio/projects/[projectId]/assets/move is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/projects/[projectId]/assets/route.ts:7:14 | GET image-studio/projects/[projectId]/assets is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/projects/[projectId]/assets/route.ts:11:14 | POST image-studio/projects/[projectId]/assets is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/projects/[projectId]/folders/route.ts:7:14 | POST image-studio/projects/[projectId]/folders is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/projects/[projectId]/folders/route.ts:11:14 | DELETE image-studio/projects/[projectId]/folders is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/projects/[projectId]/route.ts:7:14 | DELETE image-studio/projects/[projectId] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/projects/[projectId]/route.ts:11:14 | PATCH image-studio/projects/[projectId] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/projects/[projectId]/slots/ensure-from-upload/route.ts:7:14 | POST image-studio/projects/[projectId]/slots/ensure-from-upload is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/projects/[projectId]/slots/route.ts:7:14 | GET image-studio/projects/[projectId]/slots is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/projects/[projectId]/slots/route.ts:12:14 | POST image-studio/projects/[projectId]/slots is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/projects/[projectId]/variants/delete/route.ts:7:14 | POST image-studio/projects/[projectId]/variants/delete is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/projects/route.ts:7:14 | GET image-studio/projects is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/projects/route.ts:11:14 | POST image-studio/projects is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/run/route.ts:7:14 | POST image-studio/run is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/runs/[runId]/route.ts:7:14 | GET image-studio/runs/[runId] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/runs/[runId]/stream/route.ts:7:14 | GET image-studio/runs/[runId]/stream is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/runs/route.ts:8:14 | GET image-studio/runs is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/sequences/[runId]/cancel/route.ts:7:14 | POST image-studio/sequences/[runId]/cancel is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/sequences/[runId]/route.ts:7:14 | GET image-studio/sequences/[runId] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/sequences/[runId]/stream/route.ts:7:14 | GET image-studio/sequences/[runId]/stream is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/sequences/route.ts:8:14 | GET image-studio/sequences is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/sequences/run/route.ts:7:14 | POST image-studio/sequences/run is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/slots/[slotId]/analysis/route.ts:8:14 | POST image-studio/slots/[slotId]/analysis is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/slots/[slotId]/autoscale/route.ts:8:14 | POST image-studio/slots/[slotId]/autoscale is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/slots/[slotId]/center/route.ts:8:14 | POST image-studio/slots/[slotId]/center is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/slots/[slotId]/crop/route.ts:8:14 | POST image-studio/slots/[slotId]/crop is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/slots/[slotId]/masks/route.ts:7:14 | POST image-studio/slots/[slotId]/masks is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/slots/[slotId]/route.ts:7:14 | PATCH image-studio/slots/[slotId] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/slots/[slotId]/route.ts:11:14 | DELETE image-studio/slots/[slotId] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/slots/[slotId]/screenshot/route.ts:7:14 | POST image-studio/slots/[slotId]/screenshot is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/slots/[slotId]/upscale/route.ts:8:14 | POST image-studio/slots/[slotId]/upscale is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/image-studio/slots/base64/route.ts:7:14 | POST image-studio/slots/base64 is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-actor-route-missing-session-or-actor-check | src/app/api/kangur/scores/route.ts:8:14 | GET kangur/scores is classified as an actor-scoped route but no actor/session resolver was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/marketplace/[resource]/route.ts:29:14 | GET marketplace/[resource] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/marketplace/categories/fetch/route.ts:8:14 | POST marketplace/categories/fetch is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/marketplace/mappings/[id]/route.ts:7:14 | GET marketplace/mappings/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/marketplace/mappings/[id]/route.ts:10:14 | PUT marketplace/mappings/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/marketplace/mappings/[id]/route.ts:13:14 | DELETE marketplace/mappings/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/marketplace/mappings/bulk/route.ts:7:14 | POST marketplace/mappings/bulk is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/marketplace/mappings/route.ts:7:14 | GET marketplace/mappings is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/marketplace/mappings/route.ts:12:14 | POST marketplace/mappings is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/marketplace/producer-mappings/bulk/route.ts:7:14 | POST marketplace/producer-mappings/bulk is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/marketplace/producer-mappings/route.ts:7:14 | GET marketplace/producer-mappings is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/marketplace/producer-mappings/route.ts:12:14 | POST marketplace/producer-mappings is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/marketplace/producers/fetch/route.ts:8:14 | POST marketplace/producers/fetch is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/marketplace/tag-mappings/bulk/route.ts:7:14 | POST marketplace/tag-mappings/bulk is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/marketplace/tag-mappings/route.ts:7:14 | GET marketplace/tag-mappings is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/marketplace/tag-mappings/route.ts:12:14 | POST marketplace/tag-mappings is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/marketplace/tags/fetch/route.ts:8:14 | POST marketplace/tags/fetch is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/notes/[id]/files/[slotIndex]/route.ts:7:14 | DELETE notes/[id]/files/[slotIndex] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/notes/[id]/files/route.ts:7:14 | GET notes/[id]/files is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/notes/[id]/files/route.ts:11:14 | POST notes/[id]/files is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/notes/[id]/route.ts:8:14 | GET notes/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/notes/[id]/route.ts:11:14 | PATCH notes/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/notes/[id]/route.ts:14:14 | DELETE notes/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/notes/categories/[id]/route.ts:7:14 | PATCH notes/categories/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/notes/categories/[id]/route.ts:10:14 | DELETE notes/categories/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/notes/categories/route.ts:7:14 | GET notes/categories is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/notes/categories/route.ts:11:14 | POST notes/categories is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/notes/categories/tree/route.ts:7:14 | GET notes/categories/tree is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/notes/import-folder/route.ts:7:14 | POST notes/import-folder is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/notes/lookup/route.ts:7:14 | GET notes/lookup is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/notes/notebooks/[id]/route.ts:7:14 | PATCH notes/notebooks/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/notes/notebooks/[id]/route.ts:10:14 | DELETE notes/notebooks/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/notes/notebooks/route.ts:7:14 | GET notes/notebooks is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/notes/notebooks/route.ts:8:14 | POST notes/notebooks is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/notes/route.ts:8:14 | GET notes is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/notes/route.ts:13:14 | POST notes is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/notes/tags/[id]/route.ts:7:14 | PATCH notes/tags/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/notes/tags/[id]/route.ts:10:14 | DELETE notes/tags/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/notes/tags/route.ts:7:14 | GET notes/tags is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/notes/tags/route.ts:11:14 | POST notes/tags is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/notes/themes/[id]/route.ts:7:14 | GET notes/themes/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/notes/themes/[id]/route.ts:10:14 | PATCH notes/themes/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/notes/themes/[id]/route.ts:13:14 | DELETE notes/themes/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/notes/themes/route.ts:7:14 | GET notes/themes is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/notes/themes/route.ts:11:14 | POST notes/themes is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/search/route.ts:8:14 | POST search is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/settings/cache/route.ts:7:14 | GET settings/cache is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/settings/heavy/route.ts:8:14 | GET settings/heavy is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/settings/lite/route.ts:10:14 | GET settings/lite is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/settings/providers/route.ts:7:14 | GET settings/providers is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/settings/route.ts:8:14 | GET settings is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/settings/route.ts:14:14 | POST settings is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/system/activity/route.ts:9:14 | GET system/activity is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/system/diagnostics/mongo-indexes/route.ts:7:14 | GET system/diagnostics/mongo-indexes is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/system/diagnostics/mongo-indexes/route.ts:12:14 | POST system/diagnostics/mongo-indexes is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/system/logs/insights/route.ts:7:14 | GET system/logs/insights is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/system/logs/insights/route.ts:8:14 | POST system/logs/insights is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/system/logs/interpret/route.ts:7:14 | POST system/logs/interpret is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/system/logs/metrics/route.ts:8:14 | GET system/logs/metrics is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/system/logs/route.ts:8:14 | GET system/logs is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/system/logs/route.ts:10:14 | POST system/logs is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/system/logs/route.ts:12:14 | DELETE system/logs is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/system/upload-events/route.ts:7:14 | GET system/upload-events is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/[id]/connections/[connectionId]/allegro/authorize/route.ts:7:14 | GET v2/integrations/[id]/connections/[connectionId]/allegro/authorize is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/[id]/connections/[connectionId]/allegro/callback/route.ts:7:14 | GET v2/integrations/[id]/connections/[connectionId]/allegro/callback is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/[id]/connections/[connectionId]/allegro/disconnect/route.ts:7:14 | POST v2/integrations/[id]/connections/[connectionId]/allegro/disconnect is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/[id]/connections/[connectionId]/allegro/request/route.ts:7:14 | POST v2/integrations/[id]/connections/[connectionId]/allegro/request is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/[id]/connections/[connectionId]/allegro/test/route.ts:7:14 | POST v2/integrations/[id]/connections/[connectionId]/allegro/test is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/[id]/connections/[connectionId]/base/inventories/route.ts:7:14 | GET v2/integrations/[id]/connections/[connectionId]/base/inventories is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/[id]/connections/[connectionId]/base/products/route.ts:7:14 | POST v2/integrations/[id]/connections/[connectionId]/base/products is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/[id]/connections/[connectionId]/base/request/route.ts:7:14 | POST v2/integrations/[id]/connections/[connectionId]/base/request is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/[id]/connections/[connectionId]/base/test/route.ts:7:14 | POST v2/integrations/[id]/connections/[connectionId]/base/test is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/[id]/connections/[connectionId]/test/route.ts:8:14 | POST v2/integrations/[id]/connections/[connectionId]/test is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/[id]/connections/route.ts:7:14 | GET v2/integrations/[id]/connections is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/[id]/connections/route.ts:11:14 | POST v2/integrations/[id]/connections is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/connections/[id]/route.ts:7:14 | PUT v2/integrations/connections/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/connections/[id]/session/route.ts:7:14 | GET v2/integrations/connections/[id]/session is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/exports/base/[setting]/route.ts:7:14 | GET v2/integrations/exports/base/[setting] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/exports/base/[setting]/route.ts:11:14 | POST v2/integrations/exports/base/[setting] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/images/sync-base/all/route.ts:7:14 | POST v2/integrations/images/sync-base/all is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/imports/base/[setting]/route.ts:7:14 | GET v2/integrations/imports/base/[setting] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/imports/base/[setting]/route.ts:11:14 | POST v2/integrations/imports/base/[setting] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/imports/base/parameters/route.ts:7:14 | POST v2/integrations/imports/base/parameters is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/imports/base/parameters/route.ts:12:14 | GET v2/integrations/imports/base/parameters is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/imports/base/route.ts:8:14 | POST v2/integrations/imports/base is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/imports/base/runs/[runId]/cancel/route.ts:7:14 | POST v2/integrations/imports/base/runs/[runId]/cancel is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/imports/base/runs/[runId]/report/route.ts:8:14 | GET v2/integrations/imports/base/runs/[runId]/report is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/imports/base/runs/[runId]/resume/route.ts:7:14 | POST v2/integrations/imports/base/runs/[runId]/resume is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/imports/base/runs/[runId]/route.ts:8:14 | GET v2/integrations/imports/base/runs/[runId] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/imports/base/runs/route.ts:8:14 | GET v2/integrations/imports/base/runs is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/imports/base/runs/route.ts:13:14 | POST v2/integrations/imports/base/runs is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/imports/base/sample-product/route.ts:7:14 | GET v2/integrations/imports/base/sample-product is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/imports/base/sample-product/route.ts:11:14 | POST v2/integrations/imports/base/sample-product is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/jobs/route.ts:8:14 | GET v2/integrations/jobs is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/product-listings/route.ts:8:14 | GET v2/integrations/product-listings is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/product-listings/route.ts:14:14 | POST v2/integrations/product-listings is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/products/[id]/base/link-existing/route.ts:7:14 | POST v2/integrations/products/[id]/base/link-existing is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/products/[id]/base/sku-check/route.ts:7:14 | POST v2/integrations/products/[id]/base/sku-check is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/products/[id]/listings/[listingId]/purge/route.ts:7:14 | DELETE v2/integrations/products/[id]/listings/[listingId]/purge is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/products/[id]/listings/[listingId]/relist/route.ts:7:14 | POST v2/integrations/products/[id]/listings/[listingId]/relist is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/products/[id]/listings/[listingId]/route.ts:7:14 | DELETE v2/integrations/products/[id]/listings/[listingId] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/products/[id]/listings/[listingId]/route.ts:12:14 | PATCH v2/integrations/products/[id]/listings/[listingId] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/products/[id]/listings/[listingId]/sync-base-images/route.ts:7:14 | POST v2/integrations/products/[id]/listings/[listingId]/sync-base-images is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/products/[id]/listings/route.ts:7:14 | GET v2/integrations/products/[id]/listings is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/products/[id]/listings/route.ts:11:14 | POST v2/integrations/products/[id]/listings is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/queues/tradera/route.ts:8:14 | GET v2/integrations/queues/tradera is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/route.ts:8:14 | GET v2/integrations is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/route.ts:12:14 | POST v2/integrations is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/integrations/with-connections/route.ts:7:14 | GET v2/integrations/with-connections is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/metadata/[type]/[id]/route.ts:11:14 | GET v2/metadata/[type]/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/metadata/[type]/[id]/route.ts:15:14 | PUT v2/metadata/[type]/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/metadata/[type]/[id]/route.ts:19:14 | DELETE v2/metadata/[type]/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/metadata/[type]/route.ts:8:14 | GET v2/metadata/[type] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/metadata/[type]/route.ts:13:14 | POST v2/metadata/[type] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/[id]/duplicate/route.ts:7:14 | POST v2/products/[id]/duplicate is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/[id]/images/[imageFileId]/route.ts:7:14 | DELETE v2/products/[id]/images/[imageFileId] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/[id]/images/base64/route.ts:8:14 | POST v2/products/[id]/images/base64 is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/[id]/images/link-to-file/route.ts:7:14 | POST v2/products/[id]/images/link-to-file is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/[id]/route.ts:15:14 | GET v2/products/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/[id]/route.ts:21:14 | PUT v2/products/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/[id]/route.ts:27:14 | PATCH v2/products/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/[id]/route.ts:33:14 | DELETE v2/products/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/[id]/studio/[action]/route.ts:16:14 | GET v2/products/[id]/studio/[action] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/[id]/studio/[action]/route.ts:28:14 | POST v2/products/[id]/studio/[action] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/[id]/studio/route.ts:8:14 | GET v2/products/[id]/studio is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/[id]/studio/route.ts:13:14 | PUT v2/products/[id]/studio is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/ai-jobs/[jobId]/route.ts:11:14 | GET v2/products/ai-jobs/[jobId] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/ai-jobs/[jobId]/route.ts:14:14 | POST v2/products/ai-jobs/[jobId] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/ai-jobs/[jobId]/route.ts:17:14 | DELETE v2/products/ai-jobs/[jobId] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/ai-jobs/bulk/route.ts:8:14 | POST v2/products/ai-jobs/bulk is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/ai-jobs/enqueue/route.ts:7:14 | POST v2/products/ai-jobs/enqueue is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/ai-jobs/route.ts:13:14 | GET v2/products/ai-jobs is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/ai-jobs/route.ts:18:14 | DELETE v2/products/ai-jobs is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/ai-paths/description-context/route.ts:9:14 | GET v2/products/ai-paths/description-context is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/categories/[id]/route.ts:12:14 | GET v2/products/categories/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/categories/[id]/route.ts:16:14 | PUT v2/products/categories/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/categories/[id]/route.ts:22:14 | DELETE v2/products/categories/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/categories/batch/route.ts:7:14 | GET v2/products/categories/batch is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/categories/migrate/route.ts:7:14 | POST v2/products/categories/migrate is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/categories/reorder/route.ts:10:14 | POST v2/products/categories/reorder is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/categories/route.ts:12:14 | GET v2/products/categories is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/categories/route.ts:19:14 | POST v2/products/categories is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/categories/tree/route.ts:7:14 | GET v2/products/categories/tree is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/count/route.ts:9:14 | GET v2/products/count is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/entities/[type]/[id]/route.ts:11:14 | GET v2/products/entities/[type]/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/entities/[type]/[id]/route.ts:15:14 | PUT v2/products/entities/[type]/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/entities/[type]/[id]/route.ts:19:14 | DELETE v2/products/entities/[type]/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/entities/[type]/route.ts:10:14 | GET v2/products/entities/[type] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/entities/[type]/route.ts:14:14 | POST v2/products/entities/[type] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/entities/catalogs/assign/route.ts:7:14 | POST v2/products/entities/catalogs/assign is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/images/base64/all/route.ts:7:14 | POST v2/products/images/base64/all is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/images/base64/route.ts:7:14 | POST v2/products/images/base64 is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/images/upload/route.ts:6:14 | POST v2/products/images/upload is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/import/csv/route.ts:8:14 | POST v2/products/import/csv is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/metadata/[type]/[id]/route.ts:18:14 | GET v2/products/metadata/[type]/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/metadata/[type]/[id]/route.ts:23:14 | PUT v2/products/metadata/[type]/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/metadata/[type]/[id]/route.ts:28:14 | DELETE v2/products/metadata/[type]/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/metadata/[type]/route.ts:17:14 | GET v2/products/metadata/[type] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/metadata/[type]/route.ts:23:14 | POST v2/products/metadata/[type] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/paged/route.ts:8:14 | GET v2/products/paged is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/parameters/[id]/route.ts:11:14 | PUT v2/products/parameters/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/parameters/[id]/route.ts:17:14 | DELETE v2/products/parameters/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/parameters/route.ts:12:14 | GET v2/products/parameters is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/parameters/route.ts:19:14 | POST v2/products/parameters is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/producers/[id]/route.ts:11:14 | PUT v2/products/producers/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/producers/[id]/route.ts:17:14 | DELETE v2/products/producers/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/producers/route.ts:12:14 | GET v2/products/producers is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/producers/route.ts:14:14 | POST v2/products/producers is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/route.ts:8:14 | GET v2/products is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/route.ts:14:14 | POST v2/products is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/simple-parameters/route.ts:7:14 | GET v2/products/simple-parameters is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/simple-parameters/route.ts:12:14 | POST v2/products/simple-parameters is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/sync/profiles/[id]/route.ts:13:14 | GET v2/products/sync/profiles/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/sync/profiles/[id]/route.ts:18:14 | PUT v2/products/sync/profiles/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/sync/profiles/[id]/route.ts:24:14 | DELETE v2/products/sync/profiles/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/sync/profiles/[id]/run/route.ts:7:14 | POST v2/products/sync/profiles/[id]/run is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/sync/profiles/route.ts:12:14 | GET v2/products/sync/profiles is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/sync/profiles/route.ts:17:14 | POST v2/products/sync/profiles is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/sync/relink/route.ts:7:14 | POST v2/products/sync/relink is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/sync/runs/[runId]/route.ts:8:14 | GET v2/products/sync/runs/[runId] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/sync/runs/route.ts:8:14 | GET v2/products/sync/runs is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/tags/[id]/route.ts:11:14 | PUT v2/products/tags/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/tags/[id]/route.ts:17:14 | DELETE v2/products/tags/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/tags/all/route.ts:7:14 | GET v2/products/tags/all is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/tags/route.ts:13:14 | GET v2/products/tags is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/tags/route.ts:18:14 | POST v2/products/tags is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/validation/route.ts:7:14 | POST v2/products/validation is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/validation/route.ts:11:14 | GET v2/products/validation is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/validator-config/route.ts:7:14 | GET v2/products/validator-config is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/validator-decisions/route.ts:10:14 | POST v2/products/validator-decisions is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/validator-patterns/[id]/route.ts:11:14 | PUT v2/products/validator-patterns/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/validator-patterns/[id]/route.ts:17:14 | DELETE v2/products/validator-patterns/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/validator-patterns/import/route.ts:10:14 | POST v2/products/validator-patterns/import is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/validator-patterns/reorder/route.ts:10:14 | POST v2/products/validator-patterns/reorder is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/validator-patterns/route.ts:11:14 | GET v2/products/validator-patterns is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/validator-patterns/route.ts:16:14 | POST v2/products/validator-patterns is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/validator-patterns/templates/[type]/route.ts:7:14 | POST v2/products/validator-patterns/templates/[type] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/validator-patterns/templates/name-segment-category/route.ts:7:14 | POST v2/products/validator-patterns/templates/name-segment-category is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/validator-patterns/templates/name-segment-dimensions/route.ts:7:14 | POST v2/products/validator-patterns/templates/name-segment-dimensions is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/validator-runtime/evaluate/route.ts:11:14 | POST v2/products/validator-runtime/evaluate is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/validator-settings/route.ts:11:14 | GET v2/products/validator-settings is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/products/validator-settings/route.ts:16:14 | PUT v2/products/validator-settings is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/templates/[type]/[id]/route.ts:7:14 | PUT v2/templates/[type]/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/templates/[type]/[id]/route.ts:11:14 | DELETE v2/templates/[type]/[id] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/templates/[type]/route.ts:7:14 | GET v2/templates/[type] is classified as protected but no auth/session/access helper was found. |
| ERROR | authz-protected-route-missing-auth-check | src/app/api/v2/templates/[type]/route.ts:11:14 | POST v2/templates/[type] is classified as protected but no auth/session/access helper was found. |

## Notes

- This check validates that non-public API routes show explicit auth, access-helper, actor, or signature evidence in their handlers.
- Public exemptions are intentionally narrow and method-aware so browser telemetry and health routes do not mask broader auth drift.
- Strict mode fails on authz coverage errors. Use --fail-on-warnings to also gate privileged routes that rely only on basic session auth.
