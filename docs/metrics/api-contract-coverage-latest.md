---
owner: 'Platform Team'
last_reviewed: '2026-03-11'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# API Contract Coverage Report

Generated at: 2026-03-11T04:30:45.474Z

## Summary

- Status: PASSED
- Route files scanned: 346
- Route methods scanned: 494
- Methods with adjacent tests: 437
- Mutations with body validation: 128
- Query routes with validation: 12
- Errors: 0
- Warnings: 0
- Info: 46

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| api-contract-route-missing-tests | 0 | 0 | 46 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| INFO | api-contract-route-missing-tests | src/app/api/agentcreator/personas/[personaId]/memory/route.ts:7:14 | GET agentcreator/personas/[personaId]/memory has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/ai-paths/health/route.ts:7:14 | GET ai-paths/health has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/ai-paths/playwright/[runId]/artifacts/[file]/route.ts:7:14 | GET ai-paths/playwright/[runId]/artifacts/[file] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/ai-paths/playwright/[runId]/route.ts:7:14 | GET ai-paths/playwright/[runId] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/ai-paths/validation/docs-snapshot/route.ts:7:14 | GET ai-paths/validation/docs-snapshot has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/ai/context/related/[id]/route.ts:9:14 | GET ai/context/related/[id] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/ai/schema/[entity]/route.ts:9:14 | GET ai/schema/[entity] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/analytics/events/route.ts:13:14 | GET analytics/events has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/analytics/summary/route.ts:8:14 | GET analytics/summary has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/assets3d/categories/route.ts:7:14 | GET assets3d/categories has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/assets3d/tags/route.ts:7:14 | GET assets3d/tags has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/auth/users/route.ts:8:14 | GET auth/users has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/case-resolver/ocr/models/route.ts:8:14 | GET case-resolver/ocr/models has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/case-resolver/ocr/observability/route.ts:8:14 | GET case-resolver/ocr/observability has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/chatbot/memory/route.ts:7:14 | GET chatbot/memory has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/databases/backups/route.ts:8:14 | GET databases/backups has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/databases/browse/route.ts:8:14 | GET databases/browse has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/databases/engine/backup-scheduler/status/route.ts:7:14 | GET databases/engine/backup-scheduler/status has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/databases/engine/operations/jobs/route.ts:8:14 | GET databases/engine/operations/jobs has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/databases/engine/provider-preview/route.ts:7:14 | GET databases/engine/provider-preview has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/databases/engine/status/route.ts:8:14 | GET databases/engine/status has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/databases/redis/route.ts:7:14 | GET databases/redis has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/databases/schema/route.ts:8:14 | GET databases/schema has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/files/preview/route.ts:7:14 | GET files/preview has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/files/route.ts:9:14 | GET files has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/image-studio/models/route.ts:7:14 | GET image-studio/models has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/image-studio/runs/[runId]/route.ts:7:14 | GET image-studio/runs/[runId] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/image-studio/runs/[runId]/stream/route.ts:7:14 | GET image-studio/runs/[runId]/stream has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/image-studio/runs/route.ts:8:14 | GET image-studio/runs has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/image-studio/sequences/route.ts:8:14 | GET image-studio/sequences has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/marketplace/[resource]/route.ts:29:14 | GET marketplace/[resource] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/notes/categories/tree/route.ts:7:14 | GET notes/categories/tree has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/notes/lookup/route.ts:7:14 | GET notes/lookup has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/settings/cache/route.ts:7:14 | GET settings/cache has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/settings/heavy/route.ts:8:14 | GET settings/heavy has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/settings/lite/route.ts:10:14 | GET settings/lite has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/settings/providers/route.ts:7:14 | GET settings/providers has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/system/activity/route.ts:9:14 | GET system/activity has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/system/logs/metrics/route.ts:8:14 | GET system/logs/metrics has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/system/upload-events/route.ts:7:14 | GET system/upload-events has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/integrations/jobs/route.ts:8:14 | GET v2/integrations/jobs has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/integrations/queues/tradera/route.ts:8:14 | GET v2/integrations/queues/tradera has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/integrations/with-connections/route.ts:7:14 | GET v2/integrations/with-connections has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/products/count/route.ts:9:14 | GET v2/products/count has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/products/ids/route.ts:8:14 | GET v2/products/ids has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/products/validator-config/route.ts:7:14 | GET v2/products/validator-config has no adjacent route/handler test coverage. |

## Route Inventory

| Route | Method | Access | Tests | Body Validation | Query Validation |
| --- | --- | --- | --- | --- | --- |
| agent/approval-gates | GET | protected | yes | - | - |
| agent/capabilities | GET | protected | yes | - | - |
| agent/leases | GET | protected | yes | - | - |
| agent/leases | POST | protected | yes | yes | - |
| agent/resources | GET | protected | yes | - | - |
| agentcreator/agent/[runId]/assets/[file] | GET | protected | yes | - | - |
| agentcreator/agent/[runId]/audits | GET | protected | yes | - | - |
| agentcreator/agent/[runId]/controls | POST | protected | yes | - | - |
| agentcreator/agent/[runId]/logs | GET | protected | yes | - | - |
| agentcreator/agent/[runId] | GET | protected | yes | - | - |
| agentcreator/agent/[runId] | POST | protected | yes | - | - |
| agentcreator/agent/[runId] | DELETE | protected | yes | - | - |
| agentcreator/agent/[runId]/snapshots | GET | protected | yes | - | - |
| agentcreator/agent/[runId]/stream | GET | protected | yes | - | - |
| agentcreator/agent | GET | protected | yes | - | - |
| agentcreator/agent | POST | protected | yes | yes | - |
| agentcreator/agent | DELETE | protected | yes | - | - |
| agentcreator/agent/snapshots/[snapshotId] | GET | protected | yes | - | - |
| agentcreator/personas/[personaId]/memory | GET | protected | no | - | - |
| agentcreator/personas/[personaId]/visuals | GET | protected | yes | - | - |
| agentcreator/personas/avatar | POST | protected | yes | - | - |
| agentcreator/personas/avatar | DELETE | protected | yes | - | - |
| agentcreator/teaching/agents/[agentId] | PATCH | protected | yes | - | - |
| agentcreator/teaching/agents/[agentId] | DELETE | protected | yes | - | - |
| agentcreator/teaching/agents | GET | protected | yes | - | - |
| agentcreator/teaching/agents | POST | protected | yes | - | - |
| agentcreator/teaching/chat | POST | protected | yes | - | - |
| agentcreator/teaching/collections/[collectionId]/documents/[documentId] | DELETE | protected | yes | - | - |
| agentcreator/teaching/collections/[collectionId]/documents | GET | protected | yes | - | - |
| agentcreator/teaching/collections/[collectionId]/documents | POST | protected | yes | - | - |
| agentcreator/teaching/collections/[collectionId] | PATCH | protected | yes | - | - |
| agentcreator/teaching/collections/[collectionId] | DELETE | protected | yes | - | - |
| agentcreator/teaching/collections/[collectionId]/search | POST | protected | yes | - | - |
| agentcreator/teaching/collections | GET | protected | yes | - | - |
| agentcreator/teaching/collections | POST | protected | yes | - | - |
| ai/actions/execute | POST | protected | yes | yes | - |
| ai/actions/propose | POST | protected | yes | yes | - |
| ai/context/bundle | POST | protected | yes | yes | - |
| ai/context/related/[id] | GET | protected | no | - | - |
| ai/context/resolve | POST | protected | yes | yes | - |
| ai/context/search | POST | protected | yes | yes | - |
| ai/schema/[entity] | GET | protected | no | - | - |
| ai-insights/notifications | GET | protected | yes | - | yes |
| ai-insights/notifications | DELETE | protected | yes | - | - |
| ai-paths/db-action | POST | protected | yes | - | - |
| ai-paths/health | GET | protected | no | - | - |
| ai-paths/playwright/[runId]/artifacts/[file] | GET | protected | no | - | - |
| ai-paths/playwright/[runId] | GET | protected | no | - | - |
| ai-paths/playwright | POST | protected | yes | yes | - |
| ai-paths/portable-engine/remediation-dead-letters/replay-history | GET | protected | yes | - | - |
| ai-paths/portable-engine/remediation-dead-letters | GET | protected | yes | - | - |
| ai-paths/portable-engine/remediation-dead-letters | POST | protected | yes | yes | - |
| ai-paths/portable-engine/remediation-webhook | POST | signed | yes | yes | - |
| ai-paths/portable-engine/schema/diff | GET | protected | yes | - | - |
| ai-paths/portable-engine/schema | GET | protected | yes | - | - |
| ai-paths/portable-engine/trend-snapshots | GET | protected | yes | - | - |
| ai-paths/runs/[runId]/cancel | POST | protected | yes | - | - |
| ai-paths/runs/[runId]/resume | POST | protected | yes | - | - |
| ai-paths/runs/[runId]/retry-node | POST | protected | yes | - | - |
| ai-paths/runs/[runId] | GET | protected | yes | - | - |
| ai-paths/runs/[runId] | DELETE | protected | yes | - | - |
| ai-paths/runs/[runId]/stream | GET | protected | yes | - | - |
| ai-paths/runs/dead-letter/requeue | POST | protected | yes | - | - |
| ai-paths/runs/enqueue | POST | protected | yes | yes | - |
| ai-paths/runs/queue-status | GET | protected | yes | - | - |
| ai-paths/runs | GET | protected | yes | - | - |
| ai-paths/runs | DELETE | protected | yes | - | - |
| ai-paths/runtime-analytics/insights | GET | protected | yes | - | - |
| ai-paths/runtime-analytics/insights | POST | protected | yes | - | - |
| ai-paths/runtime-analytics/summary | GET | protected | yes | - | - |
| ai-paths/settings/maintenance | GET | protected | yes | - | - |
| ai-paths/settings/maintenance | POST | protected | yes | yes | - |
| ai-paths/settings | GET | protected | yes | - | - |
| ai-paths/settings | POST | protected | yes | yes | - |
| ai-paths/settings | DELETE | protected | yes | yes | - |
| ai-paths/trigger-buttons/[id] | PATCH | protected | yes | - | - |
| ai-paths/trigger-buttons/[id] | DELETE | protected | yes | - | - |
| ai-paths/trigger-buttons/cleanup-fixtures | POST | protected | yes | - | - |
| ai-paths/trigger-buttons/reorder | POST | protected | yes | - | - |
| ai-paths/trigger-buttons | GET | protected | yes | - | - |
| ai-paths/trigger-buttons | POST | protected | yes | - | - |
| ai-paths/update | POST | protected | yes | yes | - |
| ai-paths/validation/docs-snapshot | GET | protected | no | - | - |
| analytics/events | POST | public | no | - | - |
| analytics/events | GET | session | no | - | - |
| analytics/insights | GET | session | yes | - | yes |
| analytics/insights | POST | session | yes | - | - |
| analytics/summary | GET | session | no | - | - |
| assets3d/[id]/file | GET | protected | yes | - | - |
| assets3d/[id] | GET | protected | yes | - | - |
| assets3d/[id] | PATCH | protected | yes | yes | - |
| assets3d/[id] | DELETE | protected | yes | - | - |
| assets3d/categories | GET | protected | no | - | - |
| assets3d/reindex | POST | protected | yes | - | - |
| assets3d | GET | protected | yes | - | - |
| assets3d | POST | protected | yes | - | - |
| assets3d/tags | GET | protected | no | - | - |
| auth/[...nextauth] | GET | public | no | - | - |
| auth/[...nextauth] | POST | public | no | - | - |
| auth/mfa/disable | POST | protected | yes | yes | - |
| auth/mfa/setup | POST | protected | yes | - | - |
| auth/mfa/verify | POST | protected | yes | yes | - |
| auth/mock-signin | POST | protected | yes | yes | - |
| auth/register | POST | public | no | yes | - |
| auth/users/[id] | PATCH | protected | yes | yes | - |
| auth/users/[id] | DELETE | protected | yes | yes | - |
| auth/users/[id]/security | GET | protected | yes | - | - |
| auth/users/[id]/security | PATCH | protected | yes | yes | - |
| auth/users | GET | protected | no | - | - |
| auth/verify-credentials | POST | public | yes | yes | - |
| brain/models | GET | protected | yes | - | - |
| brain/operations/overview | GET | protected | yes | - | - |
| case-resolver/assets/extract-pdf | POST | protected | yes | yes | - |
| case-resolver/assets/upload | POST | protected | yes | - | - |
| case-resolver/documents/export-pdf | POST | protected | yes | yes | - |
| case-resolver/ocr/jobs/[jobId] | GET | protected | yes | - | - |
| case-resolver/ocr/jobs/[jobId] | POST | protected | yes | yes | - |
| case-resolver/ocr/jobs | POST | protected | yes | yes | - |
| case-resolver/ocr/models | GET | protected | no | - | - |
| case-resolver/ocr/observability | GET | protected | no | - | - |
| chatbot/agent/[runId]/[action] | GET | protected | yes | - | - |
| chatbot/agent/[runId]/[action] | POST | protected | yes | - | - |
| chatbot/agent/[runId]/assets/[file] | GET | protected | yes | - | - |
| chatbot/agent/[runId] | GET | protected | yes | - | - |
| chatbot/agent/[runId] | POST | protected | yes | - | - |
| chatbot/agent/[runId] | DELETE | protected | yes | - | - |
| chatbot/agent | GET | protected | yes | - | - |
| chatbot/agent | POST | protected | yes | yes | - |
| chatbot/agent | DELETE | protected | yes | - | - |
| chatbot/context | POST | protected | yes | - | - |
| chatbot/jobs/[jobId] | GET | protected | yes | - | - |
| chatbot/jobs/[jobId] | POST | protected | yes | - | - |
| chatbot/jobs/[jobId] | DELETE | protected | yes | - | - |
| chatbot/jobs | GET | protected | yes | - | - |
| chatbot/jobs | POST | protected | yes | yes | - |
| chatbot/jobs | DELETE | protected | yes | - | - |
| chatbot/memory | GET | protected | no | - | - |
| chatbot | GET | protected | yes | - | - |
| chatbot | POST | protected | yes | yes | - |
| chatbot/sessions/[sessionId]/messages | GET | protected | yes | - | - |
| chatbot/sessions/[sessionId]/messages | POST | protected | yes | yes | - |
| chatbot/sessions/[sessionId] | GET | protected | yes | - | - |
| chatbot/sessions | POST | protected | yes | - | - |
| chatbot/sessions | GET | protected | yes | - | - |
| chatbot/sessions | PATCH | protected | yes | - | - |
| chatbot/sessions | DELETE | protected | yes | - | - |
| chatbot/settings | GET | protected | yes | - | - |
| chatbot/settings | POST | protected | yes | yes | - |
| client-errors | POST | public | no | yes | - |
| cms/css-ai/stream | POST | protected | yes | yes | - |
| cms/domains/[id] | DELETE | protected | yes | - | - |
| cms/domains/[id] | PUT | protected | yes | - | - |
| cms/domains | GET | protected | yes | - | - |
| cms/domains | POST | protected | yes | - | - |
| cms/media | POST | protected | yes | yes | - |
| cms/pages/[id] | GET | protected | yes | - | - |
| cms/pages/[id] | PUT | protected | yes | - | - |
| cms/pages/[id] | DELETE | protected | yes | - | - |
| cms/pages | GET | protected | yes | - | - |
| cms/pages | POST | protected | yes | - | - |
| cms/slugs/[id]/domains | GET | protected | yes | - | - |
| cms/slugs/[id]/domains | PUT | protected | yes | - | - |
| cms/slugs/[id] | GET | protected | yes | - | - |
| cms/slugs/[id] | DELETE | protected | yes | - | - |
| cms/slugs/[id] | PUT | protected | yes | - | - |
| cms/slugs | GET | protected | yes | - | - |
| cms/slugs | POST | protected | yes | - | - |
| cms/themes/[id] | GET | protected | yes | - | - |
| cms/themes/[id] | PUT | protected | yes | - | - |
| cms/themes/[id] | DELETE | protected | yes | - | - |
| cms/themes | GET | protected | yes | - | - |
| cms/themes | POST | protected | yes | - | - |
| databases/backup | POST | protected | yes | yes | - |
| databases/backups | GET | protected | no | - | - |
| databases/browse | GET | protected | no | - | - |
| databases/copy-collection | POST | protected | yes | yes | - |
| databases/copy-collection | GET | protected | yes | - | - |
| databases/crud | POST | protected | yes | yes | - |
| databases/delete | POST | protected | yes | - | - |
| databases/engine/backup-scheduler/run-now | POST | protected | yes | yes | - |
| databases/engine/backup-scheduler/status | GET | protected | no | - | - |
| databases/engine/backup-scheduler/tick | POST | protected | yes | - | - |
| databases/engine/operations/jobs/[jobId]/cancel | POST | protected | yes | - | - |
| databases/engine/operations/jobs | GET | protected | no | - | - |
| databases/engine/provider-preview | GET | protected | no | - | - |
| databases/engine/status | GET | protected | no | - | - |
| databases/execute | POST | protected | yes | yes | - |
| databases/json-backup | POST | protected | yes | - | - |
| databases/json-backup | GET | protected | yes | - | - |
| databases/json-restore | POST | protected | yes | yes | - |
| databases/preview | POST | protected | yes | yes | - |
| databases/redis | GET | protected | no | - | - |
| databases/restore | POST | protected | yes | yes | - |
| databases/schema | GET | protected | no | - | - |
| databases/upload | POST | protected | yes | - | - |
| drafts/[id] | GET | protected | yes | - | - |
| drafts/[id] | PUT | protected | yes | - | - |
| drafts/[id] | DELETE | protected | yes | - | - |
| drafts | GET | protected | yes | - | - |
| drafts | POST | protected | yes | - | - |
| files/[id] | DELETE | protected | yes | - | - |
| files/[id] | PATCH | protected | yes | - | - |
| files/preview | GET | protected | no | - | - |
| files | GET | protected | no | - | - |
| health | GET | public | no | - | - |
| image-studio/cards/backfill | POST | protected | yes | yes | - |
| image-studio/composite | POST | protected | yes | yes | - |
| image-studio/mask/ai | POST | protected | yes | - | - |
| image-studio/models | GET | protected | no | - | - |
| image-studio/projects/[projectId]/assets/delete | POST | protected | yes | yes | - |
| image-studio/projects/[projectId]/assets/import | POST | protected | yes | yes | - |
| image-studio/projects/[projectId]/assets/move | POST | protected | yes | yes | - |
| image-studio/projects/[projectId]/assets | GET | protected | yes | - | - |
| image-studio/projects/[projectId]/assets | POST | protected | yes | - | - |
| image-studio/projects/[projectId]/folders | POST | protected | yes | yes | - |
| image-studio/projects/[projectId]/folders | DELETE | protected | yes | yes | - |
| image-studio/projects/[projectId] | DELETE | protected | yes | - | - |
| image-studio/projects/[projectId] | PATCH | protected | yes | yes | - |
| image-studio/projects/[projectId]/slots/ensure-from-upload | POST | protected | yes | yes | - |
| image-studio/projects/[projectId]/slots | GET | protected | yes | - | - |
| image-studio/projects/[projectId]/slots | POST | protected | yes | yes | - |
| image-studio/projects/[projectId]/variants/delete | POST | protected | yes | yes | - |
| image-studio/projects | GET | protected | yes | - | - |
| image-studio/projects | POST | protected | yes | yes | - |
| image-studio/prompt-extract | POST | protected | yes | - | - |
| image-studio/run | POST | protected | yes | yes | - |
| image-studio/runs/[runId] | GET | protected | no | - | - |
| image-studio/runs/[runId]/stream | GET | protected | no | - | - |
| image-studio/runs | GET | protected | no | - | - |
| image-studio/sequences/[runId]/cancel | POST | protected | yes | - | - |
| image-studio/sequences/[runId] | GET | protected | yes | - | - |
| image-studio/sequences/[runId]/stream | GET | protected | yes | - | - |
| image-studio/sequences | GET | protected | no | - | - |
| image-studio/sequences/run | POST | protected | yes | yes | - |
| image-studio/slots/[slotId]/analysis | POST | protected | yes | yes | - |
| image-studio/slots/[slotId]/autoscale | POST | protected | yes | yes | - |
| image-studio/slots/[slotId]/center | POST | protected | yes | yes | - |
| image-studio/slots/[slotId]/crop | POST | protected | yes | yes | - |
| image-studio/slots/[slotId]/masks | POST | protected | yes | yes | - |
| image-studio/slots/[slotId] | PATCH | protected | yes | yes | - |
| image-studio/slots/[slotId] | DELETE | protected | yes | - | - |
| image-studio/slots/[slotId]/screenshot | POST | protected | yes | yes | - |
| image-studio/slots/[slotId]/upscale | POST | protected | yes | yes | - |
| image-studio/slots/base64 | POST | protected | yes | yes | - |
| image-studio/ui-extractor | POST | protected | yes | - | - |
| image-studio/validation-patterns/learn | POST | protected | yes | - | - |
| kangur/ai-tutor/chat | POST | actor | yes | - | - |
| kangur/ai-tutor/content | GET | protected | yes | - | - |
| kangur/ai-tutor/content | POST | protected | yes | yes | - |
| kangur/ai-tutor/guest-intro | GET | protected | yes | - | - |
| kangur/ai-tutor/native-guide | GET | protected | yes | - | - |
| kangur/ai-tutor/native-guide | POST | protected | yes | yes | - |
| kangur/ai-tutor/usage | GET | actor | yes | - | - |
| kangur/assignments/[id] | PATCH | actor | yes | yes | - |
| kangur/assignments | GET | actor | yes | - | - |
| kangur/assignments | POST | actor | yes | yes | - |
| kangur/auth/learner-signin | POST | public | yes | yes | - |
| kangur/auth/learner-signout | POST | public | no | - | - |
| kangur/auth/logout | POST | protected | yes | - | - |
| kangur/auth/me | GET | actor | yes | - | - |
| kangur/auth/parent-account/create | POST | protected | yes | yes | - |
| kangur/auth/parent-account/resend | POST | protected | yes | yes | - |
| kangur/auth/parent-email/verify | POST | protected | yes | yes | - |
| kangur/auth/parent-magic-link/exchange | POST | protected | yes | - | - |
| kangur/auth/parent-magic-link/request | POST | protected | yes | - | - |
| kangur/auth/parent-password | POST | protected | yes | yes | - |
| kangur/learners/[id] | PATCH | actor | yes | yes | - |
| kangur/learners | GET | actor | yes | - | - |
| kangur/learners | POST | actor | yes | yes | - |
| kangur/observability/summary | GET | protected | yes | - | - |
| kangur/progress | GET | actor | yes | - | - |
| kangur/progress | PATCH | actor | yes | yes | - |
| kangur/scores | GET | actor | yes | - | - |
| kangur/scores | POST | actor | yes | yes | - |
| kangur/tts/probe | POST | protected | yes | yes | - |
| kangur/tts | POST | actor | yes | yes | - |
| kangur/tts/status | POST | actor | yes | yes | - |
| marketplace/[resource] | GET | protected | no | - | - |
| marketplace/categories/fetch | POST | protected | yes | yes | - |
| marketplace/mappings/[id] | GET | protected | yes | - | - |
| marketplace/mappings/[id] | PUT | protected | yes | yes | - |
| marketplace/mappings/[id] | DELETE | protected | yes | - | - |
| marketplace/mappings/bulk | POST | protected | yes | - | - |
| marketplace/mappings | GET | protected | yes | - | yes |
| marketplace/mappings | POST | protected | yes | - | - |
| marketplace/producer-mappings/bulk | POST | protected | yes | - | - |
| marketplace/producer-mappings | GET | protected | yes | - | yes |
| marketplace/producer-mappings | POST | protected | yes | - | - |
| marketplace/producers/fetch | POST | protected | yes | yes | - |
| marketplace/tag-mappings/bulk | POST | protected | yes | - | - |
| marketplace/tag-mappings | GET | protected | yes | - | yes |
| marketplace/tag-mappings | POST | protected | yes | - | - |
| marketplace/tags/fetch | POST | protected | yes | yes | - |
| notes/[id]/files/[slotIndex] | DELETE | protected | yes | - | - |
| notes/[id]/files | GET | protected | yes | - | - |
| notes/[id]/files | POST | protected | yes | - | - |
| notes/[id] | GET | protected | yes | - | - |
| notes/[id] | PATCH | protected | yes | yes | - |
| notes/[id] | DELETE | protected | yes | - | - |
| notes/categories/[id] | PATCH | protected | yes | - | - |
| notes/categories/[id] | DELETE | protected | yes | - | - |
| notes/categories | GET | protected | yes | - | - |
| notes/categories | POST | protected | yes | - | - |
| notes/categories/tree | GET | protected | no | - | - |
| notes/import-folder | POST | protected | yes | - | - |
| notes/lookup | GET | protected | no | - | - |
| notes/notebooks/[id] | PATCH | protected | yes | - | - |
| notes/notebooks/[id] | DELETE | protected | yes | - | - |
| notes/notebooks | GET | protected | yes | - | - |
| notes/notebooks | POST | protected | yes | - | - |
| notes | GET | protected | yes | - | - |
| notes | POST | protected | yes | - | - |
| notes/tags/[id] | PATCH | protected | yes | - | - |
| notes/tags/[id] | DELETE | protected | yes | - | - |
| notes/tags | GET | protected | yes | - | - |
| notes/tags | POST | protected | yes | - | - |
| notes/themes/[id] | GET | protected | yes | - | - |
| notes/themes/[id] | PATCH | protected | yes | - | - |
| notes/themes/[id] | DELETE | protected | yes | - | - |
| notes/themes | GET | protected | yes | - | - |
| notes/themes | POST | protected | yes | - | - |
| prompt-runtime/health | GET | public | no | - | - |
| public/products/[id] | GET | public | no | - | - |
| public/products/categories | GET | public | no | - | yes |
| public/products/parameters | GET | public | no | - | yes |
| query-telemetry | POST | public | yes | yes | - |
| search | POST | protected | yes | yes | - |
| settings/cache | GET | protected | no | - | - |
| settings/database/sync | POST | protected | yes | - | - |
| settings/heavy | GET | protected | no | - | - |
| settings/lite | GET | protected | no | - | - |
| settings/migrate/backfill-keys | POST | protected | yes | - | - |
| settings/providers | GET | protected | no | - | - |
| settings | GET | protected | yes | - | - |
| settings | POST | protected | yes | - | - |
| system/activity | GET | protected | no | - | - |
| system/diagnostics/mongo-indexes | GET | protected | yes | - | - |
| system/diagnostics/mongo-indexes | POST | protected | yes | - | - |
| system/logs/insights | GET | protected | yes | - | yes |
| system/logs/insights | POST | protected | yes | - | - |
| system/logs/interpret | POST | protected | yes | - | - |
| system/logs/metrics | GET | protected | no | - | yes |
| system/logs | GET | protected | yes | - | yes |
| system/logs | POST | protected | yes | - | - |
| system/logs | DELETE | protected | yes | - | - |
| system/upload-events | GET | protected | no | - | - |
| user/preferences | GET | session | yes | - | - |
| user/preferences | PATCH | session | yes | yes | - |
| user/preferences | POST | session | yes | yes | - |
| v2/integrations/[id]/connections/[connectionId]/allegro/authorize | GET | protected | yes | - | - |
| v2/integrations/[id]/connections/[connectionId]/allegro/callback | GET | protected | yes | - | - |
| v2/integrations/[id]/connections/[connectionId]/allegro/disconnect | POST | protected | yes | - | - |
| v2/integrations/[id]/connections/[connectionId]/allegro/request | POST | protected | yes | yes | - |
| v2/integrations/[id]/connections/[connectionId]/allegro/test | POST | protected | yes | yes | - |
| v2/integrations/[id]/connections/[connectionId]/base/inventories | GET | protected | yes | - | - |
| v2/integrations/[id]/connections/[connectionId]/base/products | POST | protected | yes | - | - |
| v2/integrations/[id]/connections/[connectionId]/base/request | POST | protected | yes | yes | - |
| v2/integrations/[id]/connections/[connectionId]/base/test | POST | protected | yes | - | - |
| v2/integrations/[id]/connections/[connectionId]/test | POST | protected | yes | yes | - |
| v2/integrations/[id]/connections | GET | protected | yes | - | - |
| v2/integrations/[id]/connections | POST | protected | yes | - | - |
| v2/integrations/connections/[id] | PUT | protected | yes | - | - |
| v2/integrations/connections/[id] | DELETE | protected | yes | - | - |
| v2/integrations/connections/[id]/session | GET | protected | yes | - | - |
| v2/integrations/exports/base/[setting] | GET | protected | yes | - | - |
| v2/integrations/exports/base/[setting] | POST | protected | yes | - | - |
| v2/integrations/images/sync-base/all | POST | protected | yes | - | - |
| v2/integrations/imports/base/[setting] | GET | protected | yes | - | - |
| v2/integrations/imports/base/[setting] | POST | protected | yes | - | - |
| v2/integrations/imports/base/parameters | POST | protected | yes | yes | - |
| v2/integrations/imports/base/parameters | GET | protected | yes | - | - |
| v2/integrations/imports/base | POST | protected | yes | yes | - |
| v2/integrations/imports/base/runs/[runId]/cancel | POST | protected | yes | - | - |
| v2/integrations/imports/base/runs/[runId]/report | GET | protected | yes | - | yes |
| v2/integrations/imports/base/runs/[runId]/resume | POST | protected | yes | yes | - |
| v2/integrations/imports/base/runs/[runId] | GET | protected | yes | - | yes |
| v2/integrations/imports/base/runs | GET | protected | yes | - | - |
| v2/integrations/imports/base/runs | POST | protected | yes | yes | - |
| v2/integrations/imports/base/sample-product | GET | protected | yes | - | - |
| v2/integrations/imports/base/sample-product | POST | protected | yes | yes | - |
| v2/integrations/jobs | GET | protected | no | - | - |
| v2/integrations/product-listings | GET | protected | yes | - | - |
| v2/integrations/product-listings | POST | protected | yes | - | - |
| v2/integrations/products/[id]/base/link-existing | POST | protected | yes | - | - |
| v2/integrations/products/[id]/base/sku-check | POST | protected | yes | - | - |
| v2/integrations/products/[id]/export-to-base | POST | protected | yes | - | - |
| v2/integrations/products/[id]/listings/[listingId]/delete-from-base | POST | protected | yes | - | - |
| v2/integrations/products/[id]/listings/[listingId]/purge | DELETE | protected | yes | - | - |
| v2/integrations/products/[id]/listings/[listingId]/relist | POST | protected | yes | - | - |
| v2/integrations/products/[id]/listings/[listingId] | DELETE | protected | yes | - | - |
| v2/integrations/products/[id]/listings/[listingId] | PATCH | protected | yes | - | - |
| v2/integrations/products/[id]/listings/[listingId]/sync-base-images | POST | protected | yes | - | - |
| v2/integrations/products/[id]/listings | GET | protected | yes | - | - |
| v2/integrations/products/[id]/listings | POST | protected | yes | - | - |
| v2/integrations/queues/tradera | GET | protected | no | - | - |
| v2/integrations | GET | protected | yes | - | - |
| v2/integrations | POST | protected | yes | - | - |
| v2/integrations/with-connections | GET | protected | no | - | - |
| v2/metadata/[type]/[id] | GET | protected | yes | - | - |
| v2/metadata/[type]/[id] | PUT | protected | yes | - | - |
| v2/metadata/[type]/[id] | DELETE | protected | yes | - | - |
| v2/metadata/[type] | GET | protected | yes | - | - |
| v2/metadata/[type] | POST | protected | yes | yes | - |
| v2/products/[id]/duplicate | POST | protected | yes | - | - |
| v2/products/[id]/images/[imageFileId] | DELETE | protected | yes | - | - |
| v2/products/[id]/images/base64 | POST | protected | yes | - | - |
| v2/products/[id]/images/link-to-file | POST | protected | yes | - | - |
| v2/products/[id] | GET | protected | yes | - | - |
| v2/products/[id] | PUT | protected | yes | yes | - |
| v2/products/[id] | PATCH | protected | yes | - | - |
| v2/products/[id] | DELETE | protected | yes | - | - |
| v2/products/[id]/studio/[action] | GET | protected | yes | - | - |
| v2/products/[id]/studio/[action] | POST | protected | yes | - | - |
| v2/products/[id]/studio | GET | protected | yes | - | - |
| v2/products/[id]/studio | PUT | protected | yes | yes | - |
| v2/products/ai-jobs/[jobId] | GET | protected | yes | - | - |
| v2/products/ai-jobs/[jobId] | POST | protected | yes | - | - |
| v2/products/ai-jobs/[jobId] | DELETE | protected | yes | - | - |
| v2/products/ai-jobs/bulk | POST | protected | yes | - | - |
| v2/products/ai-jobs/enqueue | POST | protected | yes | yes | - |
| v2/products/ai-jobs | GET | protected | yes | - | - |
| v2/products/ai-jobs | DELETE | protected | yes | - | - |
| v2/products/ai-paths/description-context | GET | protected | yes | - | - |
| v2/products/categories/[id] | GET | protected | yes | - | - |
| v2/products/categories/[id] | PUT | protected | yes | yes | - |
| v2/products/categories/[id] | DELETE | protected | yes | - | - |
| v2/products/categories/batch | GET | protected | yes | - | - |
| v2/products/categories/migrate | POST | protected | yes | - | - |
| v2/products/categories/reorder | POST | protected | yes | yes | - |
| v2/products/categories | GET | protected | yes | - | - |
| v2/products/categories | POST | protected | yes | yes | - |
| v2/products/categories/tree | GET | protected | yes | - | - |
| v2/products/count | GET | protected | no | - | - |
| v2/products/entities/[type]/[id] | GET | protected | yes | - | - |
| v2/products/entities/[type]/[id] | PUT | protected | yes | yes | - |
| v2/products/entities/[type]/[id] | DELETE | protected | yes | - | - |
| v2/products/entities/[type] | GET | protected | yes | - | - |
| v2/products/entities/[type] | POST | protected | yes | - | - |
| v2/products/entities/catalogs/assign | POST | protected | yes | - | - |
| v2/products/ids | GET | protected | no | - | - |
| v2/products/images/base64/all | POST | protected | yes | - | - |
| v2/products/images/base64 | POST | protected | yes | - | - |
| v2/products/images/upload | POST | protected | yes | - | - |
| v2/products/import/csv | POST | protected | yes | yes | - |
| v2/products/metadata/[type]/[id] | GET | protected | yes | - | - |
| v2/products/metadata/[type]/[id] | PUT | protected | yes | - | - |
| v2/products/metadata/[type]/[id] | DELETE | protected | yes | - | - |
| v2/products/metadata/[type] | GET | protected | yes | - | - |
| v2/products/metadata/[type] | POST | protected | yes | yes | - |
| v2/products/paged | GET | protected | yes | - | - |
| v2/products/parameters/[id] | PUT | protected | yes | yes | - |
| v2/products/parameters/[id] | DELETE | protected | yes | - | - |
| v2/products/parameters | GET | protected | yes | - | - |
| v2/products/parameters | POST | protected | yes | yes | - |
| v2/products/producers/[id] | PUT | protected | yes | yes | - |
| v2/products/producers/[id] | DELETE | protected | yes | - | - |
| v2/products/producers | GET | protected | yes | - | - |
| v2/products/producers | POST | protected | yes | yes | - |
| v2/products | GET | protected | yes | - | - |
| v2/products | POST | protected | yes | yes | - |
| v2/products/simple-parameters | GET | protected | yes | - | - |
| v2/products/simple-parameters | POST | protected | yes | - | - |
| v2/products/sync/profiles/[id] | GET | protected | yes | - | - |
| v2/products/sync/profiles/[id] | PUT | protected | yes | yes | - |
| v2/products/sync/profiles/[id] | DELETE | protected | yes | - | - |
| v2/products/sync/profiles/[id]/run | POST | protected | yes | - | - |
| v2/products/sync/profiles | GET | protected | yes | - | - |
| v2/products/sync/profiles | POST | protected | yes | yes | - |
| v2/products/sync/relink | POST | protected | yes | yes | - |
| v2/products/sync/runs/[runId] | GET | protected | yes | - | - |
| v2/products/sync/runs | GET | protected | yes | - | - |
| v2/products/tags/[id] | PUT | protected | yes | yes | - |
| v2/products/tags/[id] | DELETE | protected | yes | - | - |
| v2/products/tags/all | GET | protected | yes | - | - |
| v2/products/tags | GET | protected | yes | - | - |
| v2/products/tags | POST | protected | yes | yes | - |
| v2/products/validation | POST | protected | yes | - | - |
| v2/products/validation | GET | protected | yes | - | - |
| v2/products/validator-config | GET | protected | no | - | - |
| v2/products/validator-decisions | POST | protected | yes | yes | - |
| v2/products/validator-patterns/[id] | PUT | protected | yes | yes | - |
| v2/products/validator-patterns/[id] | DELETE | protected | yes | - | - |
| v2/products/validator-patterns/import | POST | protected | yes | yes | - |
| v2/products/validator-patterns/reorder | POST | protected | yes | yes | - |
| v2/products/validator-patterns | GET | protected | yes | - | - |
| v2/products/validator-patterns | POST | protected | yes | yes | - |
| v2/products/validator-patterns/templates/[type] | POST | protected | yes | - | - |
| v2/products/validator-runtime/evaluate | POST | protected | yes | yes | - |
| v2/products/validator-settings | GET | protected | yes | - | - |
| v2/products/validator-settings | PUT | protected | yes | yes | - |
| v2/templates/[type]/[id] | PUT | protected | yes | - | - |
| v2/templates/[type]/[id] | DELETE | protected | yes | - | - |
| v2/templates/[type] | GET | protected | yes | - | - |
| v2/templates/[type] | POST | protected | yes | - | - |

## Notes

- This check looks for explicit request validation and nearby handler/route tests for each API method.
- Strict mode fails on missing body validation errors. Add --fail-on-warnings to also gate missing tests and query validation warnings.
