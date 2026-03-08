# API Contract Coverage Report

Generated at: 2026-03-08T14:44:28.388Z

## Summary

- Status: FAILED
- Route files scanned: 330
- Route methods scanned: 474
- Methods with adjacent tests: 76
- Mutations with body validation: 81
- Query routes with validation: 10
- Errors: 39
- Warnings: 242
- Info: 148

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| api-contract-mutation-missing-body-validation | 39 | 0 | 0 |
| api-contract-route-missing-tests | 0 | 238 | 148 |
| api-contract-query-route-missing-query-validation | 0 | 4 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/agentcreator/agent/route.ts:11:14 | POST agentcreator/agent reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/ai-paths/portable-engine/remediation-webhook/route.ts:7:14 | POST ai-paths/portable-engine/remediation-webhook reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/assets3d/[id]/route.ts:12:14 | PATCH assets3d/[id] reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/chatbot/agent/route.ts:11:14 | POST chatbot/agent reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/chatbot/jobs/route.ts:9:14 | POST chatbot/jobs reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/chatbot/route.ts:10:14 | POST chatbot reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/cms/css-ai/stream/route.ts:8:14 | POST cms/css-ai/stream reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/cms/media/route.ts:8:14 | POST cms/media reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/databases/backup/route.ts:7:14 | POST databases/backup reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/databases/copy-collection/route.ts:7:14 | POST databases/copy-collection reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/databases/crud/route.ts:7:14 | POST databases/crud reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/databases/execute/route.ts:7:14 | POST databases/execute reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/databases/json-restore/route.ts:7:14 | POST databases/json-restore reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/databases/preview/route.ts:8:14 | POST databases/preview reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/databases/restore/route.ts:7:14 | POST databases/restore reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/image-studio/projects/[projectId]/assets/import/route.ts:7:14 | POST image-studio/projects/[projectId]/assets/import reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/image-studio/projects/[projectId]/folders/route.ts:11:14 | DELETE image-studio/projects/[projectId]/folders reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/image-studio/slots/[slotId]/masks/route.ts:7:14 | POST image-studio/slots/[slotId]/masks reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/kangur/assignments/[id]/route.ts:8:14 | PATCH kangur/assignments/[id] reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/kangur/assignments/route.ts:15:14 | POST kangur/assignments reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/kangur/auth/learner-signin/route.ts:8:14 | POST kangur/auth/learner-signin reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/kangur/learners/[id]/route.ts:8:14 | PATCH kangur/learners/[id] reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/kangur/learners/route.ts:14:14 | POST kangur/learners reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/kangur/progress/route.ts:14:14 | PATCH kangur/progress reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/kangur/scores/route.ts:15:14 | POST kangur/scores reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/kangur/tts/probe/route.ts:8:14 | POST kangur/tts/probe reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/kangur/tts/route.ts:8:14 | POST kangur/tts reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/kangur/tts/status/route.ts:8:14 | POST kangur/tts/status reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/marketplace/categories/fetch/route.ts:8:14 | POST marketplace/categories/fetch reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/marketplace/producers/fetch/route.ts:8:14 | POST marketplace/producers/fetch reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/marketplace/tags/fetch/route.ts:8:14 | POST marketplace/tags/fetch reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/v2/integrations/[id]/connections/[connectionId]/allegro/test/route.ts:7:14 | POST v2/integrations/[id]/connections/[connectionId]/allegro/test reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/v2/integrations/[id]/connections/[connectionId]/test/route.ts:8:14 | POST v2/integrations/[id]/connections/[connectionId]/test reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/v2/metadata/[type]/route.ts:13:14 | POST v2/metadata/[type] reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/v2/products/[id]/route.ts:21:14 | PUT v2/products/[id] reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/v2/products/entities/[type]/[id]/route.ts:15:14 | PUT v2/products/entities/[type]/[id] reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/v2/products/import/csv/route.ts:8:14 | POST v2/products/import/csv reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/v2/products/metadata/[type]/route.ts:23:14 | POST v2/products/metadata/[type] reads request body data without explicit schema validation. |
| ERROR | api-contract-mutation-missing-body-validation | src/app/api/v2/products/route.ts:14:14 | POST v2/products reads request body data without explicit schema validation. |
| WARN | api-contract-query-route-missing-query-validation | src/app/api/agentcreator/agent/[runId]/audits/route.ts:6:14 | GET agentcreator/agent/[runId]/audits reads search params without a query schema or parse/safeParse guard. |
| WARN | api-contract-route-missing-tests | src/app/api/agentcreator/agent/[runId]/controls/route.ts:6:14 | POST agentcreator/agent/[runId]/controls has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/agentcreator/agent/[runId]/route.ts:11:14 | POST agentcreator/agent/[runId] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/agentcreator/agent/[runId]/route.ts:12:14 | DELETE agentcreator/agent/[runId] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/agentcreator/agent/route.ts:11:14 | POST agentcreator/agent has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/agentcreator/agent/route.ts:12:14 | DELETE agentcreator/agent has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/agentcreator/teaching/agents/[agentId]/route.ts:7:14 | PATCH agentcreator/teaching/agents/[agentId] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/agentcreator/teaching/agents/[agentId]/route.ts:14:14 | DELETE agentcreator/teaching/agents/[agentId] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/agentcreator/teaching/agents/route.ts:11:14 | POST agentcreator/teaching/agents has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/agentcreator/teaching/chat/route.ts:7:14 | POST agentcreator/teaching/chat has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/agentcreator/teaching/collections/[collectionId]/documents/[documentId]/route.ts:7:14 | DELETE agentcreator/teaching/collections/[collectionId]/documents/[documentId] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/agentcreator/teaching/collections/[collectionId]/documents/route.ts:15:14 | POST agentcreator/teaching/collections/[collectionId]/documents has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/agentcreator/teaching/collections/[collectionId]/route.ts:7:14 | PATCH agentcreator/teaching/collections/[collectionId] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/agentcreator/teaching/collections/[collectionId]/route.ts:14:14 | DELETE agentcreator/teaching/collections/[collectionId] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/agentcreator/teaching/collections/[collectionId]/search/route.ts:7:14 | POST agentcreator/teaching/collections/[collectionId]/search has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/agentcreator/teaching/collections/route.ts:11:14 | POST agentcreator/teaching/collections has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/ai-insights/notifications/route.ts:10:14 | DELETE ai-insights/notifications has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/ai-paths/db-action/route.ts:7:14 | POST ai-paths/db-action has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/ai-paths/playwright/route.ts:7:14 | POST ai-paths/playwright has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/ai-paths/runs/[runId]/cancel/route.ts:7:14 | POST ai-paths/runs/[runId]/cancel has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/ai-paths/runs/[runId]/resume/route.ts:7:14 | POST ai-paths/runs/[runId]/resume has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/ai-paths/runs/[runId]/retry-node/route.ts:7:14 | POST ai-paths/runs/[runId]/retry-node has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/ai-paths/runs/[runId]/route.ts:10:14 | DELETE ai-paths/runs/[runId] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/ai-paths/runs/dead-letter/requeue/route.ts:7:14 | POST ai-paths/runs/dead-letter/requeue has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/ai-paths/update/route.ts:7:14 | POST ai-paths/update has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/analytics/insights/route.ts:10:14 | POST analytics/insights has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/assets3d/[id]/route.ts:12:14 | PATCH assets3d/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/assets3d/[id]/route.ts:16:14 | DELETE assets3d/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/assets3d/reindex/route.ts:7:14 | POST assets3d/reindex has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/assets3d/route.ts:13:14 | POST assets3d has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/auth/mfa/disable/route.ts:7:14 | POST auth/mfa/disable has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/auth/mfa/setup/route.ts:7:14 | POST auth/mfa/setup has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/auth/mfa/verify/route.ts:7:14 | POST auth/mfa/verify has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/auth/mock-signin/route.ts:7:14 | POST auth/mock-signin has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/auth/users/[id]/route.ts:7:14 | PATCH auth/users/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/auth/users/[id]/route.ts:17:14 | DELETE auth/users/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/auth/users/[id]/security/route.ts:11:14 | PATCH auth/users/[id]/security has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/case-resolver/assets/extract-pdf/route.ts:8:14 | POST case-resolver/assets/extract-pdf has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/case-resolver/assets/upload/route.ts:8:14 | POST case-resolver/assets/upload has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/case-resolver/documents/export-pdf/route.ts:8:14 | POST case-resolver/documents/export-pdf has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/case-resolver/ocr/jobs/[jobId]/route.ts:12:14 | POST case-resolver/ocr/jobs/[jobId] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/case-resolver/ocr/jobs/route.ts:8:14 | POST case-resolver/ocr/jobs has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/chatbot/agent/[runId]/[action]/route.ts:77:14 | POST chatbot/agent/[runId]/[action] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/chatbot/agent/[runId]/route.ts:11:14 | POST chatbot/agent/[runId] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/chatbot/agent/[runId]/route.ts:12:14 | DELETE chatbot/agent/[runId] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/chatbot/agent/route.ts:11:14 | POST chatbot/agent has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/chatbot/agent/route.ts:12:14 | DELETE chatbot/agent has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/chatbot/context/route.ts:7:14 | POST chatbot/context has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/chatbot/jobs/[jobId]/route.ts:11:14 | POST chatbot/jobs/[jobId] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/chatbot/jobs/[jobId]/route.ts:15:14 | DELETE chatbot/jobs/[jobId] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/chatbot/sessions/[sessionId]/messages/route.ts:12:14 | POST chatbot/sessions/[sessionId]/messages has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/chatbot/sessions/route.ts:8:14 | POST chatbot/sessions has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/chatbot/sessions/route.ts:12:14 | PATCH chatbot/sessions has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/chatbot/sessions/route.ts:16:14 | DELETE chatbot/sessions has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/chatbot/settings/route.ts:11:14 | POST chatbot/settings has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/cms/css-ai/stream/route.ts:8:14 | POST cms/css-ai/stream has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/cms/domains/[id]/route.ts:7:14 | DELETE cms/domains/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/cms/domains/[id]/route.ts:11:14 | PUT cms/domains/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/cms/domains/route.ts:8:14 | POST cms/domains has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/cms/media/route.ts:8:14 | POST cms/media has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/cms/pages/[id]/route.ts:12:14 | PUT cms/pages/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/cms/pages/[id]/route.ts:16:14 | DELETE cms/pages/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/cms/pages/route.ts:9:14 | POST cms/pages has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/cms/slugs/[id]/domains/route.ts:11:14 | PUT cms/slugs/[id]/domains has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/cms/slugs/[id]/route.ts:11:14 | DELETE cms/slugs/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/cms/slugs/[id]/route.ts:15:14 | PUT cms/slugs/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/cms/slugs/route.ts:12:14 | POST cms/slugs has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/cms/themes/[id]/route.ts:10:14 | PUT cms/themes/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/cms/themes/[id]/route.ts:13:14 | DELETE cms/themes/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/cms/themes/route.ts:8:14 | POST cms/themes has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/databases/backup/route.ts:7:14 | POST databases/backup has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/databases/copy-collection/route.ts:7:14 | POST databases/copy-collection has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/databases/crud/route.ts:7:14 | POST databases/crud has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/databases/delete/route.ts:7:14 | POST databases/delete has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/databases/engine/backup-scheduler/run-now/route.ts:7:14 | POST databases/engine/backup-scheduler/run-now has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/databases/engine/backup-scheduler/tick/route.ts:7:14 | POST databases/engine/backup-scheduler/tick has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/databases/engine/operations/jobs/[jobId]/cancel/route.ts:7:14 | POST databases/engine/operations/jobs/[jobId]/cancel has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/databases/execute/route.ts:7:14 | POST databases/execute has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/databases/json-backup/route.ts:7:14 | POST databases/json-backup has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/databases/json-restore/route.ts:7:14 | POST databases/json-restore has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/databases/preview/route.ts:8:14 | POST databases/preview has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/databases/restore/route.ts:7:14 | POST databases/restore has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/databases/upload/route.ts:7:14 | POST databases/upload has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/drafts/[id]/route.ts:13:14 | PUT drafts/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/drafts/[id]/route.ts:17:14 | DELETE drafts/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/drafts/route.ts:10:14 | POST drafts has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/files/[id]/route.ts:7:14 | DELETE files/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/files/[id]/route.ts:11:14 | PATCH files/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/image-studio/cards/backfill/route.ts:7:14 | POST image-studio/cards/backfill has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/image-studio/composite/route.ts:7:14 | POST image-studio/composite has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/image-studio/mask/ai/route.ts:7:14 | POST image-studio/mask/ai has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/image-studio/projects/[projectId]/assets/delete/route.ts:7:14 | POST image-studio/projects/[projectId]/assets/delete has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/image-studio/projects/[projectId]/assets/import/route.ts:7:14 | POST image-studio/projects/[projectId]/assets/import has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/image-studio/projects/[projectId]/assets/move/route.ts:7:14 | POST image-studio/projects/[projectId]/assets/move has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/image-studio/projects/[projectId]/assets/route.ts:11:14 | POST image-studio/projects/[projectId]/assets has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/image-studio/projects/[projectId]/folders/route.ts:7:14 | POST image-studio/projects/[projectId]/folders has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/image-studio/projects/[projectId]/folders/route.ts:11:14 | DELETE image-studio/projects/[projectId]/folders has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/image-studio/projects/[projectId]/route.ts:7:14 | DELETE image-studio/projects/[projectId] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/image-studio/projects/[projectId]/route.ts:11:14 | PATCH image-studio/projects/[projectId] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/image-studio/projects/[projectId]/slots/ensure-from-upload/route.ts:7:14 | POST image-studio/projects/[projectId]/slots/ensure-from-upload has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/image-studio/projects/[projectId]/slots/route.ts:12:14 | POST image-studio/projects/[projectId]/slots has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/image-studio/projects/[projectId]/variants/delete/route.ts:7:14 | POST image-studio/projects/[projectId]/variants/delete has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/image-studio/projects/route.ts:11:14 | POST image-studio/projects has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/image-studio/prompt-extract/route.ts:7:14 | POST image-studio/prompt-extract has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/image-studio/run/route.ts:7:14 | POST image-studio/run has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/image-studio/sequences/[runId]/cancel/route.ts:7:14 | POST image-studio/sequences/[runId]/cancel has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/image-studio/sequences/run/route.ts:7:14 | POST image-studio/sequences/run has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/image-studio/slots/[slotId]/masks/route.ts:7:14 | POST image-studio/slots/[slotId]/masks has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/image-studio/slots/[slotId]/route.ts:7:14 | PATCH image-studio/slots/[slotId] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/image-studio/slots/[slotId]/route.ts:11:14 | DELETE image-studio/slots/[slotId] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/image-studio/slots/[slotId]/screenshot/route.ts:7:14 | POST image-studio/slots/[slotId]/screenshot has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/image-studio/slots/base64/route.ts:7:14 | POST image-studio/slots/base64 has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/image-studio/ui-extractor/route.ts:7:14 | POST image-studio/ui-extractor has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/image-studio/validation-patterns/learn/route.ts:7:14 | POST image-studio/validation-patterns/learn has no adjacent route/handler test coverage. |
| WARN | api-contract-query-route-missing-query-validation | src/app/api/kangur/observability/summary/route.ts:5:14 | GET kangur/observability/summary reads search params without a query schema or parse/safeParse guard. |
| WARN | api-contract-route-missing-tests | src/app/api/marketplace/categories/fetch/route.ts:8:14 | POST marketplace/categories/fetch has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/marketplace/mappings/[id]/route.ts:10:14 | PUT marketplace/mappings/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/marketplace/mappings/[id]/route.ts:13:14 | DELETE marketplace/mappings/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/marketplace/mappings/bulk/route.ts:7:14 | POST marketplace/mappings/bulk has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/marketplace/mappings/route.ts:12:14 | POST marketplace/mappings has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/marketplace/producer-mappings/bulk/route.ts:7:14 | POST marketplace/producer-mappings/bulk has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/marketplace/producer-mappings/route.ts:12:14 | POST marketplace/producer-mappings has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/marketplace/producers/fetch/route.ts:8:14 | POST marketplace/producers/fetch has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/marketplace/tag-mappings/bulk/route.ts:7:14 | POST marketplace/tag-mappings/bulk has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/marketplace/tag-mappings/route.ts:12:14 | POST marketplace/tag-mappings has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/marketplace/tags/fetch/route.ts:8:14 | POST marketplace/tags/fetch has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/notes/[id]/files/[slotIndex]/route.ts:7:14 | DELETE notes/[id]/files/[slotIndex] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/notes/[id]/files/route.ts:11:14 | POST notes/[id]/files has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/notes/[id]/route.ts:11:14 | PATCH notes/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/notes/[id]/route.ts:14:14 | DELETE notes/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/notes/categories/[id]/route.ts:7:14 | PATCH notes/categories/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/notes/categories/[id]/route.ts:10:14 | DELETE notes/categories/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/notes/categories/route.ts:11:14 | POST notes/categories has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/notes/import-folder/route.ts:7:14 | POST notes/import-folder has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/notes/notebooks/[id]/route.ts:7:14 | PATCH notes/notebooks/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/notes/notebooks/[id]/route.ts:10:14 | DELETE notes/notebooks/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/notes/notebooks/route.ts:8:14 | POST notes/notebooks has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/notes/route.ts:13:14 | POST notes has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/notes/tags/[id]/route.ts:7:14 | PATCH notes/tags/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/notes/tags/[id]/route.ts:10:14 | DELETE notes/tags/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/notes/tags/route.ts:11:14 | POST notes/tags has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/notes/themes/[id]/route.ts:10:14 | PATCH notes/themes/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/notes/themes/[id]/route.ts:13:14 | DELETE notes/themes/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/notes/themes/route.ts:11:14 | POST notes/themes has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/search/route.ts:8:14 | POST search has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/settings/database/sync/route.ts:7:14 | POST settings/database/sync has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/settings/migrate/backfill-keys/route.ts:7:14 | POST settings/migrate/backfill-keys has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/settings/route.ts:14:14 | POST settings has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/system/diagnostics/mongo-indexes/route.ts:12:14 | POST system/diagnostics/mongo-indexes has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/system/logs/insights/route.ts:8:14 | POST system/logs/insights has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/system/logs/route.ts:10:14 | POST system/logs has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/system/logs/route.ts:12:14 | DELETE system/logs has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/user/preferences/route.ts:17:14 | PATCH user/preferences has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/user/preferences/route.ts:20:14 | POST user/preferences has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/integrations/[id]/connections/[connectionId]/allegro/disconnect/route.ts:7:14 | POST v2/integrations/[id]/connections/[connectionId]/allegro/disconnect has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/integrations/[id]/connections/[connectionId]/allegro/request/route.ts:7:14 | POST v2/integrations/[id]/connections/[connectionId]/allegro/request has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/integrations/[id]/connections/[connectionId]/allegro/test/route.ts:7:14 | POST v2/integrations/[id]/connections/[connectionId]/allegro/test has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/integrations/[id]/connections/[connectionId]/base/products/route.ts:7:14 | POST v2/integrations/[id]/connections/[connectionId]/base/products has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/integrations/[id]/connections/[connectionId]/base/request/route.ts:7:14 | POST v2/integrations/[id]/connections/[connectionId]/base/request has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/integrations/[id]/connections/[connectionId]/base/test/route.ts:7:14 | POST v2/integrations/[id]/connections/[connectionId]/base/test has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/integrations/[id]/connections/[connectionId]/test/route.ts:8:14 | POST v2/integrations/[id]/connections/[connectionId]/test has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/integrations/[id]/connections/route.ts:11:14 | POST v2/integrations/[id]/connections has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/integrations/connections/[id]/route.ts:7:14 | PUT v2/integrations/connections/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/integrations/connections/[id]/route.ts:12:14 | DELETE v2/integrations/connections/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/integrations/exports/base/[setting]/route.ts:11:14 | POST v2/integrations/exports/base/[setting] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/integrations/images/sync-base/all/route.ts:7:14 | POST v2/integrations/images/sync-base/all has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/integrations/imports/base/[setting]/route.ts:11:14 | POST v2/integrations/imports/base/[setting] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/integrations/imports/base/parameters/route.ts:7:14 | POST v2/integrations/imports/base/parameters has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/integrations/imports/base/route.ts:8:14 | POST v2/integrations/imports/base has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/integrations/imports/base/runs/[runId]/cancel/route.ts:7:14 | POST v2/integrations/imports/base/runs/[runId]/cancel has no adjacent route/handler test coverage. |
| WARN | api-contract-query-route-missing-query-validation | src/app/api/v2/integrations/imports/base/runs/[runId]/report/route.ts:8:14 | GET v2/integrations/imports/base/runs/[runId]/report reads search params without a query schema or parse/safeParse guard. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/integrations/imports/base/runs/[runId]/resume/route.ts:7:14 | POST v2/integrations/imports/base/runs/[runId]/resume has no adjacent route/handler test coverage. |
| WARN | api-contract-query-route-missing-query-validation | src/app/api/v2/integrations/imports/base/runs/[runId]/route.ts:8:14 | GET v2/integrations/imports/base/runs/[runId] reads search params without a query schema or parse/safeParse guard. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/integrations/imports/base/runs/route.ts:13:14 | POST v2/integrations/imports/base/runs has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/integrations/imports/base/sample-product/route.ts:11:14 | POST v2/integrations/imports/base/sample-product has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/integrations/product-listings/route.ts:14:14 | POST v2/integrations/product-listings has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/integrations/products/[id]/base/link-existing/route.ts:7:14 | POST v2/integrations/products/[id]/base/link-existing has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/integrations/products/[id]/base/sku-check/route.ts:7:14 | POST v2/integrations/products/[id]/base/sku-check has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/integrations/products/[id]/export-to-base/route.ts:8:14 | POST v2/integrations/products/[id]/export-to-base has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/integrations/products/[id]/listings/[listingId]/delete-from-base/route.ts:7:14 | POST v2/integrations/products/[id]/listings/[listingId]/delete-from-base has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/integrations/products/[id]/listings/[listingId]/purge/route.ts:7:14 | DELETE v2/integrations/products/[id]/listings/[listingId]/purge has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/integrations/products/[id]/listings/[listingId]/relist/route.ts:7:14 | POST v2/integrations/products/[id]/listings/[listingId]/relist has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/integrations/products/[id]/listings/[listingId]/route.ts:7:14 | DELETE v2/integrations/products/[id]/listings/[listingId] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/integrations/products/[id]/listings/[listingId]/route.ts:12:14 | PATCH v2/integrations/products/[id]/listings/[listingId] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/integrations/products/[id]/listings/[listingId]/sync-base-images/route.ts:7:14 | POST v2/integrations/products/[id]/listings/[listingId]/sync-base-images has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/integrations/products/[id]/listings/route.ts:11:14 | POST v2/integrations/products/[id]/listings has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/integrations/route.ts:12:14 | POST v2/integrations has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/metadata/[type]/[id]/route.ts:15:14 | PUT v2/metadata/[type]/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/metadata/[type]/[id]/route.ts:19:14 | DELETE v2/metadata/[type]/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/[id]/images/[imageFileId]/route.ts:7:14 | DELETE v2/products/[id]/images/[imageFileId] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/[id]/images/base64/route.ts:8:14 | POST v2/products/[id]/images/base64 has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/[id]/images/link-to-file/route.ts:7:14 | POST v2/products/[id]/images/link-to-file has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/[id]/studio/[action]/route.ts:28:14 | POST v2/products/[id]/studio/[action] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/[id]/studio/route.ts:13:14 | PUT v2/products/[id]/studio has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/ai-jobs/[jobId]/route.ts:14:14 | POST v2/products/ai-jobs/[jobId] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/ai-jobs/[jobId]/route.ts:17:14 | DELETE v2/products/ai-jobs/[jobId] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/ai-jobs/bulk/route.ts:8:14 | POST v2/products/ai-jobs/bulk has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/ai-jobs/enqueue/route.ts:7:14 | POST v2/products/ai-jobs/enqueue has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/ai-jobs/route.ts:18:14 | DELETE v2/products/ai-jobs has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/categories/[id]/route.ts:16:14 | PUT v2/products/categories/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/categories/[id]/route.ts:22:14 | DELETE v2/products/categories/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/categories/migrate/route.ts:7:14 | POST v2/products/categories/migrate has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/categories/reorder/route.ts:10:14 | POST v2/products/categories/reorder has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/categories/route.ts:19:14 | POST v2/products/categories has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/entities/[type]/[id]/route.ts:15:14 | PUT v2/products/entities/[type]/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/entities/[type]/[id]/route.ts:19:14 | DELETE v2/products/entities/[type]/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/entities/[type]/route.ts:14:14 | POST v2/products/entities/[type] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/entities/catalogs/assign/route.ts:7:14 | POST v2/products/entities/catalogs/assign has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/images/base64/all/route.ts:7:14 | POST v2/products/images/base64/all has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/images/base64/route.ts:7:14 | POST v2/products/images/base64 has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/images/upload/route.ts:6:14 | POST v2/products/images/upload has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/import/csv/route.ts:8:14 | POST v2/products/import/csv has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/metadata/[type]/[id]/route.ts:23:14 | PUT v2/products/metadata/[type]/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/metadata/[type]/[id]/route.ts:28:14 | DELETE v2/products/metadata/[type]/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/producers/[id]/route.ts:11:14 | PUT v2/products/producers/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/producers/[id]/route.ts:17:14 | DELETE v2/products/producers/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/producers/route.ts:14:14 | POST v2/products/producers has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/route.ts:14:14 | POST v2/products has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/simple-parameters/route.ts:12:14 | POST v2/products/simple-parameters has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/sync/profiles/[id]/route.ts:18:14 | PUT v2/products/sync/profiles/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/sync/profiles/[id]/route.ts:24:14 | DELETE v2/products/sync/profiles/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/sync/profiles/[id]/run/route.ts:7:14 | POST v2/products/sync/profiles/[id]/run has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/sync/profiles/route.ts:17:14 | POST v2/products/sync/profiles has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/sync/relink/route.ts:7:14 | POST v2/products/sync/relink has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/tags/[id]/route.ts:11:14 | PUT v2/products/tags/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/tags/[id]/route.ts:17:14 | DELETE v2/products/tags/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/tags/route.ts:18:14 | POST v2/products/tags has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/validation/route.ts:7:14 | POST v2/products/validation has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/validator-decisions/route.ts:10:14 | POST v2/products/validator-decisions has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/validator-patterns/[id]/route.ts:11:14 | PUT v2/products/validator-patterns/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/validator-patterns/[id]/route.ts:17:14 | DELETE v2/products/validator-patterns/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/validator-patterns/import/route.ts:10:14 | POST v2/products/validator-patterns/import has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/validator-patterns/reorder/route.ts:10:14 | POST v2/products/validator-patterns/reorder has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/validator-patterns/route.ts:16:14 | POST v2/products/validator-patterns has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/validator-patterns/templates/[type]/route.ts:7:14 | POST v2/products/validator-patterns/templates/[type] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/validator-patterns/templates/name-segment-category/route.ts:7:14 | POST v2/products/validator-patterns/templates/name-segment-category has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/validator-patterns/templates/name-segment-dimensions/route.ts:7:14 | POST v2/products/validator-patterns/templates/name-segment-dimensions has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/validator-runtime/evaluate/route.ts:11:14 | POST v2/products/validator-runtime/evaluate has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/products/validator-settings/route.ts:16:14 | PUT v2/products/validator-settings has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/templates/[type]/[id]/route.ts:7:14 | PUT v2/templates/[type]/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/templates/[type]/[id]/route.ts:11:14 | DELETE v2/templates/[type]/[id] has no adjacent route/handler test coverage. |
| WARN | api-contract-route-missing-tests | src/app/api/v2/templates/[type]/route.ts:11:14 | POST v2/templates/[type] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/agentcreator/agent/[runId]/assets/[file]/route.ts:6:14 | GET agentcreator/agent/[runId]/assets/[file] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/agentcreator/agent/[runId]/audits/route.ts:6:14 | GET agentcreator/agent/[runId]/audits has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/agentcreator/agent/[runId]/logs/route.ts:6:14 | GET agentcreator/agent/[runId]/logs has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/agentcreator/agent/[runId]/route.ts:10:14 | GET agentcreator/agent/[runId] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/agentcreator/agent/[runId]/snapshots/route.ts:6:14 | GET agentcreator/agent/[runId]/snapshots has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/agentcreator/agent/[runId]/stream/route.ts:6:14 | GET agentcreator/agent/[runId]/stream has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/agentcreator/agent/route.ts:10:14 | GET agentcreator/agent has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/agentcreator/agent/snapshots/[snapshotId]/route.ts:6:14 | GET agentcreator/agent/snapshots/[snapshotId] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/agentcreator/personas/[personaId]/memory/route.ts:7:14 | GET agentcreator/personas/[personaId]/memory has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/agentcreator/teaching/agents/route.ts:7:14 | GET agentcreator/teaching/agents has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/agentcreator/teaching/collections/[collectionId]/documents/route.ts:7:14 | GET agentcreator/teaching/collections/[collectionId]/documents has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/agentcreator/teaching/collections/route.ts:7:14 | GET agentcreator/teaching/collections has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/ai-insights/notifications/route.ts:7:14 | GET ai-insights/notifications has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/ai-paths/health/route.ts:7:14 | GET ai-paths/health has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/ai-paths/playwright/[runId]/artifacts/[file]/route.ts:7:14 | GET ai-paths/playwright/[runId]/artifacts/[file] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/ai-paths/playwright/[runId]/route.ts:7:14 | GET ai-paths/playwright/[runId] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/ai-paths/runs/[runId]/route.ts:7:14 | GET ai-paths/runs/[runId] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/ai-paths/runs/[runId]/stream/route.ts:7:14 | GET ai-paths/runs/[runId]/stream has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/ai-paths/runs/queue-status/route.ts:7:14 | GET ai-paths/runs/queue-status has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/ai-paths/validation/docs-snapshot/route.ts:7:14 | GET ai-paths/validation/docs-snapshot has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/ai/context/related/[id]/route.ts:9:14 | GET ai/context/related/[id] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/ai/schema/[entity]/route.ts:9:14 | GET ai/schema/[entity] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/analytics/events/route.ts:13:14 | GET analytics/events has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/analytics/insights/route.ts:7:14 | GET analytics/insights has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/analytics/summary/route.ts:8:14 | GET analytics/summary has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/assets3d/[id]/route.ts:8:14 | GET assets3d/[id] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/assets3d/categories/route.ts:7:14 | GET assets3d/categories has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/assets3d/route.ts:8:14 | GET assets3d has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/assets3d/tags/route.ts:7:14 | GET assets3d/tags has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/auth/users/[id]/security/route.ts:7:14 | GET auth/users/[id]/security has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/auth/users/route.ts:8:14 | GET auth/users has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/case-resolver/ocr/jobs/[jobId]/route.ts:8:14 | GET case-resolver/ocr/jobs/[jobId] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/case-resolver/ocr/models/route.ts:8:14 | GET case-resolver/ocr/models has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/case-resolver/ocr/observability/route.ts:8:14 | GET case-resolver/ocr/observability has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/chatbot/agent/[runId]/[action]/route.ts:70:14 | GET chatbot/agent/[runId]/[action] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/chatbot/agent/[runId]/assets/[file]/route.ts:6:14 | GET chatbot/agent/[runId]/assets/[file] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/chatbot/agent/[runId]/route.ts:10:14 | GET chatbot/agent/[runId] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/chatbot/agent/route.ts:10:14 | GET chatbot/agent has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/chatbot/jobs/[jobId]/route.ts:7:14 | GET chatbot/jobs/[jobId] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/chatbot/memory/route.ts:7:14 | GET chatbot/memory has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/chatbot/sessions/[sessionId]/messages/route.ts:8:14 | GET chatbot/sessions/[sessionId]/messages has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/chatbot/sessions/[sessionId]/route.ts:7:14 | GET chatbot/sessions/[sessionId] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/chatbot/sessions/route.ts:10:14 | GET chatbot/sessions has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/chatbot/settings/route.ts:7:14 | GET chatbot/settings has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/cms/domains/route.ts:7:14 | GET cms/domains has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/cms/pages/[id]/route.ts:8:14 | GET cms/pages/[id] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/cms/pages/route.ts:8:14 | GET cms/pages has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/cms/slugs/[id]/domains/route.ts:7:14 | GET cms/slugs/[id]/domains has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/cms/slugs/[id]/route.ts:7:14 | GET cms/slugs/[id] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/cms/slugs/route.ts:7:14 | GET cms/slugs has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/cms/themes/[id]/route.ts:7:14 | GET cms/themes/[id] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/cms/themes/route.ts:7:14 | GET cms/themes has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/databases/backups/route.ts:8:14 | GET databases/backups has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/databases/browse/route.ts:8:14 | GET databases/browse has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/databases/copy-collection/route.ts:11:14 | GET databases/copy-collection has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/databases/engine/backup-scheduler/status/route.ts:7:14 | GET databases/engine/backup-scheduler/status has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/databases/engine/operations/jobs/route.ts:8:14 | GET databases/engine/operations/jobs has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/databases/engine/provider-preview/route.ts:7:14 | GET databases/engine/provider-preview has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/databases/engine/status/route.ts:8:14 | GET databases/engine/status has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/databases/json-backup/route.ts:9:14 | GET databases/json-backup has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/databases/redis/route.ts:7:14 | GET databases/redis has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/databases/schema/route.ts:8:14 | GET databases/schema has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/drafts/[id]/route.ts:8:14 | GET drafts/[id] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/drafts/route.ts:9:14 | GET drafts has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/files/preview/route.ts:7:14 | GET files/preview has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/files/route.ts:9:14 | GET files has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/image-studio/models/route.ts:7:14 | GET image-studio/models has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/image-studio/projects/[projectId]/assets/route.ts:7:14 | GET image-studio/projects/[projectId]/assets has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/image-studio/projects/[projectId]/slots/route.ts:7:14 | GET image-studio/projects/[projectId]/slots has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/image-studio/projects/route.ts:7:14 | GET image-studio/projects has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/image-studio/runs/[runId]/route.ts:7:14 | GET image-studio/runs/[runId] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/image-studio/runs/[runId]/stream/route.ts:7:14 | GET image-studio/runs/[runId]/stream has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/image-studio/runs/route.ts:8:14 | GET image-studio/runs has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/image-studio/sequences/[runId]/route.ts:7:14 | GET image-studio/sequences/[runId] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/image-studio/sequences/[runId]/stream/route.ts:7:14 | GET image-studio/sequences/[runId]/stream has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/image-studio/sequences/route.ts:8:14 | GET image-studio/sequences has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/marketplace/[resource]/route.ts:29:14 | GET marketplace/[resource] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/marketplace/mappings/[id]/route.ts:7:14 | GET marketplace/mappings/[id] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/marketplace/mappings/route.ts:7:14 | GET marketplace/mappings has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/marketplace/producer-mappings/route.ts:7:14 | GET marketplace/producer-mappings has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/marketplace/tag-mappings/route.ts:7:14 | GET marketplace/tag-mappings has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/notes/[id]/files/route.ts:7:14 | GET notes/[id]/files has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/notes/[id]/route.ts:8:14 | GET notes/[id] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/notes/categories/route.ts:7:14 | GET notes/categories has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/notes/categories/tree/route.ts:7:14 | GET notes/categories/tree has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/notes/lookup/route.ts:7:14 | GET notes/lookup has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/notes/notebooks/route.ts:7:14 | GET notes/notebooks has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/notes/route.ts:8:14 | GET notes has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/notes/tags/route.ts:7:14 | GET notes/tags has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/notes/themes/[id]/route.ts:7:14 | GET notes/themes/[id] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/notes/themes/route.ts:7:14 | GET notes/themes has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/settings/cache/route.ts:7:14 | GET settings/cache has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/settings/heavy/route.ts:8:14 | GET settings/heavy has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/settings/lite/route.ts:10:14 | GET settings/lite has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/settings/providers/route.ts:7:14 | GET settings/providers has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/settings/route.ts:8:14 | GET settings has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/system/activity/route.ts:9:14 | GET system/activity has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/system/diagnostics/mongo-indexes/route.ts:7:14 | GET system/diagnostics/mongo-indexes has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/system/logs/insights/route.ts:7:14 | GET system/logs/insights has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/system/logs/metrics/route.ts:8:14 | GET system/logs/metrics has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/system/logs/route.ts:8:14 | GET system/logs has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/system/upload-events/route.ts:7:14 | GET system/upload-events has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/user/preferences/route.ts:12:14 | GET user/preferences has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/integrations/[id]/connections/[connectionId]/allegro/authorize/route.ts:7:14 | GET v2/integrations/[id]/connections/[connectionId]/allegro/authorize has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/integrations/[id]/connections/[connectionId]/allegro/callback/route.ts:7:14 | GET v2/integrations/[id]/connections/[connectionId]/allegro/callback has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/integrations/[id]/connections/[connectionId]/base/inventories/route.ts:7:14 | GET v2/integrations/[id]/connections/[connectionId]/base/inventories has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/integrations/[id]/connections/route.ts:7:14 | GET v2/integrations/[id]/connections has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/integrations/connections/[id]/session/route.ts:7:14 | GET v2/integrations/connections/[id]/session has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/integrations/exports/base/[setting]/route.ts:7:14 | GET v2/integrations/exports/base/[setting] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/integrations/imports/base/[setting]/route.ts:7:14 | GET v2/integrations/imports/base/[setting] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/integrations/imports/base/parameters/route.ts:12:14 | GET v2/integrations/imports/base/parameters has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/integrations/imports/base/runs/[runId]/report/route.ts:8:14 | GET v2/integrations/imports/base/runs/[runId]/report has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/integrations/imports/base/runs/[runId]/route.ts:8:14 | GET v2/integrations/imports/base/runs/[runId] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/integrations/imports/base/runs/route.ts:8:14 | GET v2/integrations/imports/base/runs has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/integrations/imports/base/sample-product/route.ts:7:14 | GET v2/integrations/imports/base/sample-product has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/integrations/jobs/route.ts:8:14 | GET v2/integrations/jobs has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/integrations/product-listings/route.ts:8:14 | GET v2/integrations/product-listings has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/integrations/products/[id]/listings/route.ts:7:14 | GET v2/integrations/products/[id]/listings has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/integrations/queues/tradera/route.ts:8:14 | GET v2/integrations/queues/tradera has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/integrations/route.ts:8:14 | GET v2/integrations has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/integrations/with-connections/route.ts:7:14 | GET v2/integrations/with-connections has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/metadata/[type]/[id]/route.ts:11:14 | GET v2/metadata/[type]/[id] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/products/[id]/studio/[action]/route.ts:16:14 | GET v2/products/[id]/studio/[action] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/products/[id]/studio/route.ts:8:14 | GET v2/products/[id]/studio has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/products/ai-jobs/[jobId]/route.ts:11:14 | GET v2/products/ai-jobs/[jobId] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/products/ai-jobs/route.ts:13:14 | GET v2/products/ai-jobs has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/products/categories/[id]/route.ts:12:14 | GET v2/products/categories/[id] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/products/categories/batch/route.ts:7:14 | GET v2/products/categories/batch has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/products/categories/route.ts:12:14 | GET v2/products/categories has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/products/categories/tree/route.ts:7:14 | GET v2/products/categories/tree has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/products/count/route.ts:9:14 | GET v2/products/count has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/products/entities/[type]/[id]/route.ts:11:14 | GET v2/products/entities/[type]/[id] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/products/entities/[type]/route.ts:10:14 | GET v2/products/entities/[type] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/products/metadata/[type]/[id]/route.ts:18:14 | GET v2/products/metadata/[type]/[id] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/products/producers/route.ts:12:14 | GET v2/products/producers has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/products/route.ts:8:14 | GET v2/products has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/products/simple-parameters/route.ts:7:14 | GET v2/products/simple-parameters has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/products/sync/profiles/[id]/route.ts:13:14 | GET v2/products/sync/profiles/[id] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/products/sync/profiles/route.ts:12:14 | GET v2/products/sync/profiles has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/products/sync/runs/[runId]/route.ts:8:14 | GET v2/products/sync/runs/[runId] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/products/sync/runs/route.ts:8:14 | GET v2/products/sync/runs has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/products/tags/all/route.ts:7:14 | GET v2/products/tags/all has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/products/tags/route.ts:13:14 | GET v2/products/tags has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/products/validation/route.ts:11:14 | GET v2/products/validation has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/products/validator-config/route.ts:7:14 | GET v2/products/validator-config has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/products/validator-patterns/route.ts:11:14 | GET v2/products/validator-patterns has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/products/validator-settings/route.ts:11:14 | GET v2/products/validator-settings has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/v2/templates/[type]/route.ts:7:14 | GET v2/templates/[type] has no adjacent route/handler test coverage. |

## Route Inventory

| Route | Method | Access | Tests | Body Validation | Query Validation |
| --- | --- | --- | --- | --- | --- |
| agentcreator/agent/[runId]/assets/[file] | GET | protected | no | - | - |
| agentcreator/agent/[runId]/audits | GET | protected | no | - | no |
| agentcreator/agent/[runId]/controls | POST | protected | no | - | - |
| agentcreator/agent/[runId]/logs | GET | protected | no | - | - |
| agentcreator/agent/[runId] | GET | protected | no | - | - |
| agentcreator/agent/[runId] | POST | protected | no | - | - |
| agentcreator/agent/[runId] | DELETE | protected | no | - | - |
| agentcreator/agent/[runId]/snapshots | GET | protected | no | - | - |
| agentcreator/agent/[runId]/stream | GET | protected | no | - | - |
| agentcreator/agent | GET | protected | no | - | - |
| agentcreator/agent | POST | protected | no | no | - |
| agentcreator/agent | DELETE | protected | no | - | - |
| agentcreator/agent/snapshots/[snapshotId] | GET | protected | no | - | - |
| agentcreator/personas/[personaId]/memory | GET | protected | no | - | - |
| agentcreator/personas/avatar | POST | protected | yes | - | - |
| agentcreator/teaching/agents/[agentId] | PATCH | protected | no | - | - |
| agentcreator/teaching/agents/[agentId] | DELETE | protected | no | - | - |
| agentcreator/teaching/agents | GET | protected | no | - | - |
| agentcreator/teaching/agents | POST | protected | no | - | - |
| agentcreator/teaching/chat | POST | protected | no | - | - |
| agentcreator/teaching/collections/[collectionId]/documents/[documentId] | DELETE | protected | no | - | - |
| agentcreator/teaching/collections/[collectionId]/documents | GET | protected | no | - | - |
| agentcreator/teaching/collections/[collectionId]/documents | POST | protected | no | - | - |
| agentcreator/teaching/collections/[collectionId] | PATCH | protected | no | - | - |
| agentcreator/teaching/collections/[collectionId] | DELETE | protected | no | - | - |
| agentcreator/teaching/collections/[collectionId]/search | POST | protected | no | - | - |
| agentcreator/teaching/collections | GET | protected | no | - | - |
| agentcreator/teaching/collections | POST | protected | no | - | - |
| ai/actions/execute | POST | protected | yes | yes | - |
| ai/actions/propose | POST | protected | yes | yes | - |
| ai/context/related/[id] | GET | protected | no | - | - |
| ai/context/resolve | POST | protected | yes | yes | - |
| ai/context/search | POST | protected | yes | yes | - |
| ai/schema/[entity] | GET | protected | no | - | - |
| ai-insights/notifications | GET | protected | no | - | yes |
| ai-insights/notifications | DELETE | protected | no | - | - |
| ai-paths/db-action | POST | protected | no | - | - |
| ai-paths/health | GET | protected | no | - | - |
| ai-paths/playwright/[runId]/artifacts/[file] | GET | protected | no | - | - |
| ai-paths/playwright/[runId] | GET | protected | no | - | - |
| ai-paths/playwright | POST | protected | no | yes | - |
| ai-paths/portable-engine/remediation-dead-letters/replay-history | GET | protected | yes | - | - |
| ai-paths/portable-engine/remediation-dead-letters | GET | protected | yes | - | - |
| ai-paths/portable-engine/remediation-dead-letters | POST | protected | yes | yes | - |
| ai-paths/portable-engine/remediation-webhook | POST | signed | yes | no | - |
| ai-paths/portable-engine/schema/diff | GET | protected | yes | - | - |
| ai-paths/portable-engine/schema | GET | protected | yes | - | - |
| ai-paths/portable-engine/trend-snapshots | GET | protected | yes | - | - |
| ai-paths/runs/[runId]/cancel | POST | protected | no | - | - |
| ai-paths/runs/[runId]/resume | POST | protected | no | - | - |
| ai-paths/runs/[runId]/retry-node | POST | protected | no | - | - |
| ai-paths/runs/[runId] | GET | protected | no | - | - |
| ai-paths/runs/[runId] | DELETE | protected | no | - | - |
| ai-paths/runs/[runId]/stream | GET | protected | no | - | - |
| ai-paths/runs/dead-letter/requeue | POST | protected | no | - | - |
| ai-paths/runs/enqueue | POST | protected | yes | yes | - |
| ai-paths/runs/queue-status | GET | protected | no | - | - |
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
| ai-paths/trigger-buttons/reorder | POST | protected | yes | - | - |
| ai-paths/trigger-buttons | GET | protected | yes | - | - |
| ai-paths/trigger-buttons | POST | protected | yes | - | - |
| ai-paths/update | POST | protected | no | yes | - |
| ai-paths/validation/docs-snapshot | GET | protected | no | - | - |
| analytics/events | POST | public | no | - | - |
| analytics/events | GET | session | no | - | - |
| analytics/insights | GET | session | no | - | yes |
| analytics/insights | POST | session | no | - | - |
| analytics/summary | GET | session | no | - | - |
| assets3d/[id]/file | GET | protected | yes | - | - |
| assets3d/[id] | GET | protected | no | - | - |
| assets3d/[id] | PATCH | protected | no | no | - |
| assets3d/[id] | DELETE | protected | no | - | - |
| assets3d/categories | GET | protected | no | - | - |
| assets3d/reindex | POST | protected | no | - | - |
| assets3d | GET | protected | no | - | - |
| assets3d | POST | protected | no | - | - |
| assets3d/tags | GET | protected | no | - | - |
| auth/[...nextauth] | GET | public | no | - | - |
| auth/[...nextauth] | POST | public | no | - | - |
| auth/mfa/disable | POST | protected | no | yes | - |
| auth/mfa/setup | POST | protected | no | - | - |
| auth/mfa/verify | POST | protected | no | yes | - |
| auth/mock-signin | POST | protected | no | yes | - |
| auth/register | POST | public | no | yes | - |
| auth/users/[id] | PATCH | protected | no | yes | - |
| auth/users/[id] | DELETE | protected | no | yes | - |
| auth/users/[id]/security | GET | protected | no | - | - |
| auth/users/[id]/security | PATCH | protected | no | yes | - |
| auth/users | GET | protected | no | - | - |
| auth/verify-credentials | POST | public | no | yes | - |
| brain/models | GET | protected | yes | - | - |
| brain/operations/overview | GET | protected | yes | - | - |
| case-resolver/assets/extract-pdf | POST | protected | no | yes | - |
| case-resolver/assets/upload | POST | protected | no | - | - |
| case-resolver/documents/export-pdf | POST | protected | no | yes | - |
| case-resolver/ocr/jobs/[jobId] | GET | protected | no | - | - |
| case-resolver/ocr/jobs/[jobId] | POST | protected | no | yes | - |
| case-resolver/ocr/jobs | POST | protected | no | yes | - |
| case-resolver/ocr/models | GET | protected | no | - | - |
| case-resolver/ocr/observability | GET | protected | no | - | - |
| chatbot/agent/[runId]/[action] | GET | protected | no | - | - |
| chatbot/agent/[runId]/[action] | POST | protected | no | - | - |
| chatbot/agent/[runId]/assets/[file] | GET | protected | no | - | - |
| chatbot/agent/[runId] | GET | protected | no | - | - |
| chatbot/agent/[runId] | POST | protected | no | - | - |
| chatbot/agent/[runId] | DELETE | protected | no | - | - |
| chatbot/agent | GET | protected | no | - | - |
| chatbot/agent | POST | protected | no | no | - |
| chatbot/agent | DELETE | protected | no | - | - |
| chatbot/context | POST | protected | no | - | - |
| chatbot/jobs/[jobId] | GET | protected | no | - | - |
| chatbot/jobs/[jobId] | POST | protected | no | - | - |
| chatbot/jobs/[jobId] | DELETE | protected | no | - | - |
| chatbot/jobs | GET | protected | yes | - | - |
| chatbot/jobs | POST | protected | yes | no | - |
| chatbot/jobs | DELETE | protected | yes | - | - |
| chatbot/memory | GET | protected | no | - | - |
| chatbot | GET | protected | yes | - | - |
| chatbot | POST | protected | yes | no | - |
| chatbot/sessions/[sessionId]/messages | GET | protected | no | - | - |
| chatbot/sessions/[sessionId]/messages | POST | protected | no | yes | - |
| chatbot/sessions/[sessionId] | GET | protected | no | - | - |
| chatbot/sessions | POST | protected | no | - | - |
| chatbot/sessions | GET | protected | no | - | - |
| chatbot/sessions | PATCH | protected | no | - | - |
| chatbot/sessions | DELETE | protected | no | - | - |
| chatbot/settings | GET | protected | no | - | - |
| chatbot/settings | POST | protected | no | yes | - |
| client-errors | POST | public | no | yes | - |
| cms/css-ai/stream | POST | protected | no | no | - |
| cms/domains/[id] | DELETE | protected | no | - | - |
| cms/domains/[id] | PUT | protected | no | - | - |
| cms/domains | GET | protected | no | - | - |
| cms/domains | POST | protected | no | - | - |
| cms/media | POST | protected | no | no | - |
| cms/pages/[id] | GET | protected | no | - | - |
| cms/pages/[id] | PUT | protected | no | - | - |
| cms/pages/[id] | DELETE | protected | no | - | - |
| cms/pages | GET | protected | no | - | - |
| cms/pages | POST | protected | no | - | - |
| cms/slugs/[id]/domains | GET | protected | no | - | - |
| cms/slugs/[id]/domains | PUT | protected | no | - | - |
| cms/slugs/[id] | GET | protected | no | - | - |
| cms/slugs/[id] | DELETE | protected | no | - | - |
| cms/slugs/[id] | PUT | protected | no | - | - |
| cms/slugs | GET | protected | no | - | - |
| cms/slugs | POST | protected | no | - | - |
| cms/themes/[id] | GET | protected | no | - | - |
| cms/themes/[id] | PUT | protected | no | - | - |
| cms/themes/[id] | DELETE | protected | no | - | - |
| cms/themes | GET | protected | no | - | - |
| cms/themes | POST | protected | no | - | - |
| databases/backup | POST | protected | no | no | - |
| databases/backups | GET | protected | no | - | - |
| databases/browse | GET | protected | no | - | - |
| databases/copy-collection | POST | protected | no | no | - |
| databases/copy-collection | GET | protected | no | - | - |
| databases/crud | POST | protected | no | no | - |
| databases/delete | POST | protected | no | - | - |
| databases/engine/backup-scheduler/run-now | POST | protected | no | yes | - |
| databases/engine/backup-scheduler/status | GET | protected | no | - | - |
| databases/engine/backup-scheduler/tick | POST | protected | no | - | - |
| databases/engine/operations/jobs/[jobId]/cancel | POST | protected | no | - | - |
| databases/engine/operations/jobs | GET | protected | no | - | - |
| databases/engine/provider-preview | GET | protected | no | - | - |
| databases/engine/status | GET | protected | no | - | - |
| databases/execute | POST | protected | no | no | - |
| databases/json-backup | POST | protected | no | - | - |
| databases/json-backup | GET | protected | no | - | - |
| databases/json-restore | POST | protected | no | no | - |
| databases/preview | POST | protected | no | no | - |
| databases/redis | GET | protected | no | - | - |
| databases/restore | POST | protected | no | no | - |
| databases/schema | GET | protected | no | - | - |
| databases/upload | POST | protected | no | - | - |
| drafts/[id] | GET | protected | no | - | - |
| drafts/[id] | PUT | protected | no | - | - |
| drafts/[id] | DELETE | protected | no | - | - |
| drafts | GET | protected | no | - | - |
| drafts | POST | protected | no | - | - |
| files/[id] | DELETE | protected | no | - | - |
| files/[id] | PATCH | protected | no | - | - |
| files/preview | GET | protected | no | - | - |
| files | GET | protected | no | - | - |
| health | GET | public | no | - | - |
| image-studio/cards/backfill | POST | protected | no | yes | - |
| image-studio/composite | POST | protected | no | yes | - |
| image-studio/mask/ai | POST | protected | no | - | - |
| image-studio/models | GET | protected | no | - | - |
| image-studio/projects/[projectId]/assets/delete | POST | protected | no | yes | - |
| image-studio/projects/[projectId]/assets/import | POST | protected | no | no | - |
| image-studio/projects/[projectId]/assets/move | POST | protected | no | yes | - |
| image-studio/projects/[projectId]/assets | GET | protected | no | - | - |
| image-studio/projects/[projectId]/assets | POST | protected | no | - | - |
| image-studio/projects/[projectId]/folders | POST | protected | no | yes | - |
| image-studio/projects/[projectId]/folders | DELETE | protected | no | no | - |
| image-studio/projects/[projectId] | DELETE | protected | no | - | - |
| image-studio/projects/[projectId] | PATCH | protected | no | yes | - |
| image-studio/projects/[projectId]/slots/ensure-from-upload | POST | protected | no | yes | - |
| image-studio/projects/[projectId]/slots | GET | protected | no | - | - |
| image-studio/projects/[projectId]/slots | POST | protected | no | yes | - |
| image-studio/projects/[projectId]/variants/delete | POST | protected | no | yes | - |
| image-studio/projects | GET | protected | no | - | - |
| image-studio/projects | POST | protected | no | yes | - |
| image-studio/prompt-extract | POST | protected | no | - | - |
| image-studio/run | POST | protected | no | yes | - |
| image-studio/runs/[runId] | GET | protected | no | - | - |
| image-studio/runs/[runId]/stream | GET | protected | no | - | - |
| image-studio/runs | GET | protected | no | - | - |
| image-studio/sequences/[runId]/cancel | POST | protected | no | - | - |
| image-studio/sequences/[runId] | GET | protected | no | - | - |
| image-studio/sequences/[runId]/stream | GET | protected | no | - | - |
| image-studio/sequences | GET | protected | no | - | - |
| image-studio/sequences/run | POST | protected | no | yes | - |
| image-studio/slots/[slotId]/analysis | POST | protected | yes | yes | - |
| image-studio/slots/[slotId]/autoscale | POST | protected | yes | yes | - |
| image-studio/slots/[slotId]/center | POST | protected | yes | yes | - |
| image-studio/slots/[slotId]/crop | POST | protected | yes | yes | - |
| image-studio/slots/[slotId]/masks | POST | protected | no | no | - |
| image-studio/slots/[slotId] | PATCH | protected | no | yes | - |
| image-studio/slots/[slotId] | DELETE | protected | no | - | - |
| image-studio/slots/[slotId]/screenshot | POST | protected | no | yes | - |
| image-studio/slots/[slotId]/upscale | POST | protected | yes | yes | - |
| image-studio/slots/base64 | POST | protected | no | yes | - |
| image-studio/ui-extractor | POST | protected | no | - | - |
| image-studio/validation-patterns/learn | POST | protected | no | - | - |
| kangur/ai-tutor/chat | POST | actor | yes | - | - |
| kangur/ai-tutor/usage | GET | actor | yes | - | - |
| kangur/assignments/[id] | PATCH | actor | yes | no | - |
| kangur/assignments | GET | actor | yes | - | - |
| kangur/assignments | POST | actor | yes | no | - |
| kangur/auth/learner-signin | POST | public | yes | no | - |
| kangur/auth/learner-signout | POST | public | no | - | - |
| kangur/auth/me | GET | actor | yes | - | - |
| kangur/learners/[id] | PATCH | actor | yes | no | - |
| kangur/learners | GET | actor | yes | - | - |
| kangur/learners | POST | actor | yes | no | - |
| kangur/observability/summary | GET | protected | yes | - | no |
| kangur/progress | GET | actor | yes | - | - |
| kangur/progress | PATCH | actor | yes | no | - |
| kangur/scores | GET | actor | yes | - | - |
| kangur/scores | POST | actor | yes | no | - |
| kangur/tts/probe | POST | protected | yes | no | - |
| kangur/tts | POST | actor | yes | no | - |
| kangur/tts/status | POST | actor | yes | no | - |
| marketplace/[resource] | GET | protected | no | - | - |
| marketplace/categories/fetch | POST | protected | no | no | - |
| marketplace/mappings/[id] | GET | protected | no | - | - |
| marketplace/mappings/[id] | PUT | protected | no | yes | - |
| marketplace/mappings/[id] | DELETE | protected | no | - | - |
| marketplace/mappings/bulk | POST | protected | no | - | - |
| marketplace/mappings | GET | protected | no | - | yes |
| marketplace/mappings | POST | protected | no | - | - |
| marketplace/producer-mappings/bulk | POST | protected | no | - | - |
| marketplace/producer-mappings | GET | protected | no | - | yes |
| marketplace/producer-mappings | POST | protected | no | - | - |
| marketplace/producers/fetch | POST | protected | no | no | - |
| marketplace/tag-mappings/bulk | POST | protected | no | - | - |
| marketplace/tag-mappings | GET | protected | no | - | yes |
| marketplace/tag-mappings | POST | protected | no | - | - |
| marketplace/tags/fetch | POST | protected | no | no | - |
| notes/[id]/files/[slotIndex] | DELETE | protected | no | - | - |
| notes/[id]/files | GET | protected | no | - | - |
| notes/[id]/files | POST | protected | no | - | - |
| notes/[id] | GET | protected | no | - | - |
| notes/[id] | PATCH | protected | no | yes | - |
| notes/[id] | DELETE | protected | no | - | - |
| notes/categories/[id] | PATCH | protected | no | - | - |
| notes/categories/[id] | DELETE | protected | no | - | - |
| notes/categories | GET | protected | no | - | - |
| notes/categories | POST | protected | no | - | - |
| notes/categories/tree | GET | protected | no | - | - |
| notes/import-folder | POST | protected | no | - | - |
| notes/lookup | GET | protected | no | - | - |
| notes/notebooks/[id] | PATCH | protected | no | - | - |
| notes/notebooks/[id] | DELETE | protected | no | - | - |
| notes/notebooks | GET | protected | no | - | - |
| notes/notebooks | POST | protected | no | - | - |
| notes | GET | protected | no | - | - |
| notes | POST | protected | no | - | - |
| notes/tags/[id] | PATCH | protected | no | - | - |
| notes/tags/[id] | DELETE | protected | no | - | - |
| notes/tags | GET | protected | no | - | - |
| notes/tags | POST | protected | no | - | - |
| notes/themes/[id] | GET | protected | no | - | - |
| notes/themes/[id] | PATCH | protected | no | - | - |
| notes/themes/[id] | DELETE | protected | no | - | - |
| notes/themes | GET | protected | no | - | - |
| notes/themes | POST | protected | no | - | - |
| prompt-runtime/health | GET | public | no | - | - |
| public/products/[id] | GET | public | no | - | - |
| public/products/categories | GET | public | no | - | yes |
| public/products/parameters | GET | public | no | - | yes |
| query-telemetry | POST | public | yes | yes | - |
| search | POST | protected | no | yes | - |
| settings/cache | GET | protected | no | - | - |
| settings/database/sync | POST | protected | no | - | - |
| settings/heavy | GET | protected | no | - | - |
| settings/lite | GET | protected | no | - | - |
| settings/migrate/backfill-keys | POST | protected | no | - | - |
| settings/providers | GET | protected | no | - | - |
| settings | GET | protected | no | - | - |
| settings | POST | protected | no | - | - |
| system/activity | GET | protected | no | - | - |
| system/diagnostics/mongo-indexes | GET | protected | no | - | - |
| system/diagnostics/mongo-indexes | POST | protected | no | - | - |
| system/logs/insights | GET | protected | no | - | yes |
| system/logs/insights | POST | protected | no | - | - |
| system/logs/interpret | POST | protected | yes | - | - |
| system/logs/metrics | GET | protected | no | - | yes |
| system/logs | GET | protected | no | - | yes |
| system/logs | POST | protected | no | - | - |
| system/logs | DELETE | protected | no | - | - |
| system/upload-events | GET | protected | no | - | - |
| user/preferences | GET | session | no | - | - |
| user/preferences | PATCH | session | no | yes | - |
| user/preferences | POST | session | no | yes | - |
| v2/integrations/[id]/connections/[connectionId]/allegro/authorize | GET | protected | no | - | - |
| v2/integrations/[id]/connections/[connectionId]/allegro/callback | GET | protected | no | - | - |
| v2/integrations/[id]/connections/[connectionId]/allegro/disconnect | POST | protected | no | - | - |
| v2/integrations/[id]/connections/[connectionId]/allegro/request | POST | protected | no | yes | - |
| v2/integrations/[id]/connections/[connectionId]/allegro/test | POST | protected | no | no | - |
| v2/integrations/[id]/connections/[connectionId]/base/inventories | GET | protected | no | - | - |
| v2/integrations/[id]/connections/[connectionId]/base/products | POST | protected | no | - | - |
| v2/integrations/[id]/connections/[connectionId]/base/request | POST | protected | no | yes | - |
| v2/integrations/[id]/connections/[connectionId]/base/test | POST | protected | no | - | - |
| v2/integrations/[id]/connections/[connectionId]/test | POST | protected | no | no | - |
| v2/integrations/[id]/connections | GET | protected | no | - | - |
| v2/integrations/[id]/connections | POST | protected | no | - | - |
| v2/integrations/connections/[id] | PUT | protected | no | - | - |
| v2/integrations/connections/[id] | DELETE | protected | no | - | - |
| v2/integrations/connections/[id]/session | GET | protected | no | - | - |
| v2/integrations/exports/base/[setting] | GET | protected | no | - | - |
| v2/integrations/exports/base/[setting] | POST | protected | no | - | - |
| v2/integrations/images/sync-base/all | POST | protected | no | - | - |
| v2/integrations/imports/base/[setting] | GET | protected | no | - | - |
| v2/integrations/imports/base/[setting] | POST | protected | no | - | - |
| v2/integrations/imports/base/parameters | POST | protected | no | yes | - |
| v2/integrations/imports/base/parameters | GET | protected | no | - | - |
| v2/integrations/imports/base | POST | protected | no | yes | - |
| v2/integrations/imports/base/runs/[runId]/cancel | POST | protected | no | - | - |
| v2/integrations/imports/base/runs/[runId]/report | GET | protected | no | - | no |
| v2/integrations/imports/base/runs/[runId]/resume | POST | protected | no | yes | - |
| v2/integrations/imports/base/runs/[runId] | GET | protected | no | - | no |
| v2/integrations/imports/base/runs | GET | protected | no | - | - |
| v2/integrations/imports/base/runs | POST | protected | no | yes | - |
| v2/integrations/imports/base/sample-product | GET | protected | no | - | - |
| v2/integrations/imports/base/sample-product | POST | protected | no | yes | - |
| v2/integrations/jobs | GET | protected | no | - | - |
| v2/integrations/product-listings | GET | protected | no | - | - |
| v2/integrations/product-listings | POST | protected | no | - | - |
| v2/integrations/products/[id]/base/link-existing | POST | protected | no | - | - |
| v2/integrations/products/[id]/base/sku-check | POST | protected | no | - | - |
| v2/integrations/products/[id]/export-to-base | POST | protected | no | - | - |
| v2/integrations/products/[id]/listings/[listingId]/delete-from-base | POST | protected | no | - | - |
| v2/integrations/products/[id]/listings/[listingId]/purge | DELETE | protected | no | - | - |
| v2/integrations/products/[id]/listings/[listingId]/relist | POST | protected | no | - | - |
| v2/integrations/products/[id]/listings/[listingId] | DELETE | protected | no | - | - |
| v2/integrations/products/[id]/listings/[listingId] | PATCH | protected | no | - | - |
| v2/integrations/products/[id]/listings/[listingId]/sync-base-images | POST | protected | no | - | - |
| v2/integrations/products/[id]/listings | GET | protected | no | - | - |
| v2/integrations/products/[id]/listings | POST | protected | no | - | - |
| v2/integrations/queues/tradera | GET | protected | no | - | - |
| v2/integrations | GET | protected | no | - | - |
| v2/integrations | POST | protected | no | - | - |
| v2/integrations/with-connections | GET | protected | no | - | - |
| v2/metadata/[type]/[id] | GET | protected | no | - | - |
| v2/metadata/[type]/[id] | PUT | protected | no | - | - |
| v2/metadata/[type]/[id] | DELETE | protected | no | - | - |
| v2/metadata/[type] | GET | protected | yes | - | - |
| v2/metadata/[type] | POST | protected | yes | no | - |
| v2/products/[id]/duplicate | POST | protected | yes | - | - |
| v2/products/[id]/images/[imageFileId] | DELETE | protected | no | - | - |
| v2/products/[id]/images/base64 | POST | protected | no | - | - |
| v2/products/[id]/images/link-to-file | POST | protected | no | - | - |
| v2/products/[id] | GET | protected | yes | - | - |
| v2/products/[id] | PUT | protected | yes | no | - |
| v2/products/[id] | PATCH | protected | yes | - | - |
| v2/products/[id] | DELETE | protected | yes | - | - |
| v2/products/[id]/studio/[action] | GET | protected | no | - | - |
| v2/products/[id]/studio/[action] | POST | protected | no | - | - |
| v2/products/[id]/studio | GET | protected | no | - | - |
| v2/products/[id]/studio | PUT | protected | no | yes | - |
| v2/products/ai-jobs/[jobId] | GET | protected | no | - | - |
| v2/products/ai-jobs/[jobId] | POST | protected | no | - | - |
| v2/products/ai-jobs/[jobId] | DELETE | protected | no | - | - |
| v2/products/ai-jobs/bulk | POST | protected | no | - | - |
| v2/products/ai-jobs/enqueue | POST | protected | no | yes | - |
| v2/products/ai-jobs | GET | protected | no | - | - |
| v2/products/ai-jobs | DELETE | protected | no | - | - |
| v2/products/ai-paths/description-context | GET | protected | yes | - | - |
| v2/products/categories/[id] | GET | protected | no | - | - |
| v2/products/categories/[id] | PUT | protected | no | yes | - |
| v2/products/categories/[id] | DELETE | protected | no | - | - |
| v2/products/categories/batch | GET | protected | no | - | - |
| v2/products/categories/migrate | POST | protected | no | - | - |
| v2/products/categories/reorder | POST | protected | no | yes | - |
| v2/products/categories | GET | protected | no | - | - |
| v2/products/categories | POST | protected | no | yes | - |
| v2/products/categories/tree | GET | protected | no | - | - |
| v2/products/count | GET | protected | no | - | - |
| v2/products/entities/[type]/[id] | GET | protected | no | - | - |
| v2/products/entities/[type]/[id] | PUT | protected | no | no | - |
| v2/products/entities/[type]/[id] | DELETE | protected | no | - | - |
| v2/products/entities/[type] | GET | protected | no | - | - |
| v2/products/entities/[type] | POST | protected | no | - | - |
| v2/products/entities/catalogs/assign | POST | protected | no | - | - |
| v2/products/images/base64/all | POST | protected | no | - | - |
| v2/products/images/base64 | POST | protected | no | - | - |
| v2/products/images/upload | POST | protected | no | - | - |
| v2/products/import/csv | POST | protected | no | no | - |
| v2/products/metadata/[type]/[id] | GET | protected | no | - | - |
| v2/products/metadata/[type]/[id] | PUT | protected | no | - | - |
| v2/products/metadata/[type]/[id] | DELETE | protected | no | - | - |
| v2/products/metadata/[type] | GET | protected | yes | - | - |
| v2/products/metadata/[type] | POST | protected | yes | no | - |
| v2/products/paged | GET | protected | yes | - | - |
| v2/products/parameters/[id] | PUT | protected | yes | yes | - |
| v2/products/parameters/[id] | DELETE | protected | yes | - | - |
| v2/products/parameters | GET | protected | yes | - | - |
| v2/products/parameters | POST | protected | yes | yes | - |
| v2/products/producers/[id] | PUT | protected | no | yes | - |
| v2/products/producers/[id] | DELETE | protected | no | - | - |
| v2/products/producers | GET | protected | no | - | - |
| v2/products/producers | POST | protected | no | yes | - |
| v2/products | GET | protected | no | - | - |
| v2/products | POST | protected | no | no | - |
| v2/products/simple-parameters | GET | protected | no | - | - |
| v2/products/simple-parameters | POST | protected | no | - | - |
| v2/products/sync/profiles/[id] | GET | protected | no | - | - |
| v2/products/sync/profiles/[id] | PUT | protected | no | yes | - |
| v2/products/sync/profiles/[id] | DELETE | protected | no | - | - |
| v2/products/sync/profiles/[id]/run | POST | protected | no | - | - |
| v2/products/sync/profiles | GET | protected | no | - | - |
| v2/products/sync/profiles | POST | protected | no | yes | - |
| v2/products/sync/relink | POST | protected | no | yes | - |
| v2/products/sync/runs/[runId] | GET | protected | no | - | - |
| v2/products/sync/runs | GET | protected | no | - | - |
| v2/products/tags/[id] | PUT | protected | no | yes | - |
| v2/products/tags/[id] | DELETE | protected | no | - | - |
| v2/products/tags/all | GET | protected | no | - | - |
| v2/products/tags | GET | protected | no | - | - |
| v2/products/tags | POST | protected | no | yes | - |
| v2/products/validation | POST | protected | no | - | - |
| v2/products/validation | GET | protected | no | - | - |
| v2/products/validator-config | GET | protected | no | - | - |
| v2/products/validator-decisions | POST | protected | no | yes | - |
| v2/products/validator-patterns/[id] | PUT | protected | no | yes | - |
| v2/products/validator-patterns/[id] | DELETE | protected | no | - | - |
| v2/products/validator-patterns/import | POST | protected | no | yes | - |
| v2/products/validator-patterns/reorder | POST | protected | no | yes | - |
| v2/products/validator-patterns | GET | protected | no | - | - |
| v2/products/validator-patterns | POST | protected | no | yes | - |
| v2/products/validator-patterns/templates/[type] | POST | protected | no | - | - |
| v2/products/validator-patterns/templates/name-segment-category | POST | protected | no | - | - |
| v2/products/validator-patterns/templates/name-segment-dimensions | POST | protected | no | - | - |
| v2/products/validator-runtime/evaluate | POST | protected | no | yes | - |
| v2/products/validator-settings | GET | protected | no | - | - |
| v2/products/validator-settings | PUT | protected | no | yes | - |
| v2/templates/[type]/[id] | PUT | protected | no | - | - |
| v2/templates/[type]/[id] | DELETE | protected | no | - | - |
| v2/templates/[type] | GET | protected | no | - | - |
| v2/templates/[type] | POST | protected | no | - | - |

## Notes

- This check looks for explicit request validation and nearby handler/route tests for each API method.
- Strict mode fails on missing body validation errors. Add --fail-on-warnings to also gate missing tests and query validation warnings.
