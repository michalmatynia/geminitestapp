---
owner: 'Platform Team'
last_reviewed: '2026-03-10'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Security Authorization Matrix Report

Generated at: 2026-03-10T20:22:30.424Z

## Summary

- Status: PASSED
- Route files scanned: 346
- Route methods scanned: 494
- Public methods: 14
- Protected methods: 464
- Signed ingress methods: 1
- Actor-scoped methods: 15
- Errors: 0
- Warnings: 0

## Route Classification

| Route | Method | Expected Access | Evidence |
| --- | --- | --- | --- |
| agent/approval-gates | GET | protected | - |
| agent/capabilities | GET | protected | - |
| agent/leases | GET | protected | - |
| agent/leases | POST | protected | - |
| agent/resources | GET | protected | - |
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
| agentcreator/personas/[personaId]/visuals | GET | protected | - |
| agentcreator/personas/avatar | POST | protected | - |
| agentcreator/personas/avatar | DELETE | protected | - |
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
| ai/context/bundle | POST | protected | - |
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
| ai-paths/trigger-buttons/cleanup-fixtures | POST | protected | `access helper` |
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
| databases/browse | GET | protected | `access helper` |
| databases/copy-collection | POST | protected | `access helper` |
| databases/copy-collection | GET | protected | `access helper` |
| databases/crud | POST | protected | `access helper` |
| databases/delete | POST | protected | `access helper` |
| databases/engine/backup-scheduler/run-now | POST | protected | `auth()`, `session.user`, `permission/isElevated` |
| databases/engine/backup-scheduler/status | GET | protected | `access helper` |
| databases/engine/backup-scheduler/tick | POST | protected | `auth()`, `session.user`, `permission/isElevated` |
| databases/engine/operations/jobs/[jobId]/cancel | POST | protected | `auth()`, `session.user`, `permission/isElevated` |
| databases/engine/operations/jobs | GET | protected | `auth()`, `session.user`, `permission/isElevated` |
| databases/engine/provider-preview | GET | protected | `access helper` |
| databases/engine/status | GET | protected | `access helper` |
| databases/execute | POST | protected | `access helper` |
| databases/json-backup | POST | protected | `access helper` |
| databases/json-backup | GET | protected | `access helper` |
| databases/json-restore | POST | protected | `access helper` |
| databases/preview | POST | protected | `access helper` |
| databases/redis | GET | protected | `access helper` |
| databases/restore | POST | protected | `access helper` |
| databases/schema | GET | protected | `access helper` |
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
| kangur/ai-tutor/content | GET | protected | - |
| kangur/ai-tutor/content | POST | protected | `access helper`, `actor/session resolver` |
| kangur/ai-tutor/guest-intro | GET | protected | `auth()`, `actor/session resolver` |
| kangur/ai-tutor/native-guide | GET | protected | - |
| kangur/ai-tutor/native-guide | POST | protected | `access helper`, `actor/session resolver` |
| kangur/ai-tutor/usage | GET | actor | `access helper`, `actor/session resolver` |
| kangur/assignments/[id] | PATCH | actor | `access helper` |
| kangur/assignments | GET | actor | `access helper` |
| kangur/assignments | POST | actor | `access helper` |
| kangur/auth/learner-signin | POST | public | - |
| kangur/auth/learner-signout | POST | public | - |
| kangur/auth/logout | POST | protected | `auth()` |
| kangur/auth/me | GET | actor | `access helper`, `actor/session resolver` |
| kangur/auth/parent-account/create | POST | protected | `auth()` |
| kangur/auth/parent-account/resend | POST | protected | `auth()` |
| kangur/auth/parent-email/verify | POST | protected | `auth()` |
| kangur/auth/parent-magic-link/exchange | POST | protected | `auth()` |
| kangur/auth/parent-magic-link/request | POST | protected | `auth()` |
| kangur/auth/parent-password | POST | protected | `access helper`, `actor/session resolver` |
| kangur/learners/[id] | PATCH | actor | `access helper`, `actor/session resolver` |
| kangur/learners | GET | actor | `access helper` |
| kangur/learners | POST | actor | `access helper` |
| kangur/observability/summary | GET | protected | `auth()` |
| kangur/progress | GET | actor | `access helper`, `actor/session resolver` |
| kangur/progress | PATCH | actor | `access helper`, `actor/session resolver` |
| kangur/scores | GET | actor | `access helper`, `actor/session resolver` |
| kangur/scores | POST | actor | `access helper`, `actor/session resolver` |
| kangur/tts/probe | POST | protected | `access helper`, `actor/session resolver` |
| kangur/tts | POST | actor | `access helper` |
| kangur/tts/status | POST | actor | `access helper` |
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
| settings/cache | GET | protected | `access helper` |
| settings/database/sync | POST | protected | `auth()`, `session.user`, `permission/isElevated` |
| settings/heavy | GET | protected | `access helper` |
| settings/lite | GET | protected | `access helper` |
| settings/migrate/backfill-keys | POST | protected | `auth()`, `session.user`, `permission/isElevated` |
| settings/providers | GET | protected | `access helper` |
| settings | GET | protected | `access helper` |
| settings | POST | protected | `access helper` |
| system/activity | GET | protected | `access helper` |
| system/diagnostics/mongo-indexes | GET | protected | `access helper` |
| system/diagnostics/mongo-indexes | POST | protected | `access helper` |
| system/logs/insights | GET | protected | `access helper` |
| system/logs/insights | POST | protected | `access helper` |
| system/logs/interpret | POST | protected | `access helper` |
| system/logs/metrics | GET | protected | `access helper` |
| system/logs | GET | protected | `access helper` |
| system/logs | POST | protected | `access helper` |
| system/logs | DELETE | protected | `access helper` |
| system/upload-events | GET | protected | `access helper` |
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
| v2/products/ids | GET | protected | - |
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

## Issues

No authorization coverage issues detected.

## Notes

- This check validates that non-public API routes show explicit auth, access-helper, actor, or signature evidence in their handlers.
- Public exemptions are intentionally narrow and method-aware so browser telemetry and health routes do not mask broader auth drift.
- Strict mode fails on authz coverage errors. Use --fail-on-warnings to also gate privileged routes that rely only on basic session auth.
