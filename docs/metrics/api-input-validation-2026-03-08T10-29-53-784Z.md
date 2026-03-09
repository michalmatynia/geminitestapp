---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: false
---
# API Input Validation Check

Generated at: 2026-03-08T10:29:53.784Z

## Summary

- Status: WARN
- Files scanned: 673
- Total handlers: 648
- Validated handlers: 648
- **Coverage: 100%**
- Errors: 0
- Warnings: 197

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| query-param-unvalidated | 0 | 171 | 0 |
| url-param-unvalidated | 0 | 26 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| WARN | query-param-unvalidated | src/app/api/agentcreator/personas/[personaId]/memory/handler.ts:25 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/agentcreator/personas/[personaId]/memory/handler.ts:26 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/agentcreator/personas/[personaId]/memory/handler.ts:43 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/agentcreator/teaching/collections/[collectionId]/documents/handler.ts:31 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/agentcreator/teaching/collections/[collectionId]/documents/handler.ts:32 | searchParams.get() used without Zod schema validation. |
| WARN | url-param-unvalidated | src/app/api/ai-paths/playwright/[runId]/artifacts/[file]/handler.ts | Dynamic route param "runId" is used without Zod validation. |
| WARN | url-param-unvalidated | src/app/api/ai-paths/playwright/[runId]/artifacts/[file]/handler.ts | Dynamic route param "file" is used without Zod validation. |
| WARN | url-param-unvalidated | src/app/api/ai-paths/playwright/[runId]/handler.ts | Dynamic route param "runId" is used without Zod validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/portable-engine/remediation-dead-letters/handler.ts:133 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/portable-engine/remediation-dead-letters/handler.ts:134 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/portable-engine/remediation-dead-letters/handler.ts:135 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/portable-engine/remediation-dead-letters/replay-history/handler.ts:529 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/portable-engine/remediation-dead-letters/replay-history/handler.ts:530 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/portable-engine/remediation-dead-letters/replay-history/handler.ts:531 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/portable-engine/remediation-dead-letters/replay-history/handler.ts:539 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/portable-engine/remediation-dead-letters/replay-history/handler.ts:542 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/portable-engine/remediation-dead-letters/replay-history/handler.ts:543 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/portable-engine/remediation-dead-letters/replay-history/handler.ts:544 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/portable-engine/remediation-webhook/handler.ts:66 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/portable-engine/schema/diff/handler.ts:49 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/portable-engine/schema/handler.ts:49 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/portable-engine/trend-snapshots/handler.ts:300 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/portable-engine/trend-snapshots/handler.ts:301 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/portable-engine/trend-snapshots/handler.ts:302 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/portable-engine/trend-snapshots/handler.ts:303 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/portable-engine/trend-snapshots/handler.ts:307 | searchParams.get() used without Zod schema validation. |
| WARN | url-param-unvalidated | src/app/api/ai-paths/runs/[runId]/cancel/handler.ts | Dynamic route param "runId" is used without Zod validation. |
| WARN | url-param-unvalidated | src/app/api/ai-paths/runs/[runId]/handler.ts | Dynamic route param "runId" is used without Zod validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/runs/[runId]/stream/handler.ts:316 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/runs/handler.ts:106 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/runs/handler.ts:108 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/runs/handler.ts:109 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/runs/handler.ts:110 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/runs/handler.ts:111 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/runs/handler.ts:112 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/runs/handler.ts:113 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/runs/handler.ts:115 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/runs/handler.ts:119 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/runs/handler.ts:120 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/runs/handler.ts:121 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/runs/handler.ts:127 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/runs/handler.ts:196 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/runs/handler.ts:198 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/runs/handler.ts:199 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/runs/handler.ts:200 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/runs/queue-status/handler.ts:28 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/runs/queue-status/handler.ts:30 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/runtime-analytics/summary/handler.ts:18 | searchParams.get() used without Zod schema validation. |
| WARN | url-param-unvalidated | src/app/api/ai/context/related/[id]/route.ts | Dynamic route param "id" is used without Zod validation. |
| WARN | url-param-unvalidated | src/app/api/ai/schema/[entity]/route.ts | Dynamic route param "entity" is used without Zod validation. |
| WARN | query-param-unvalidated | src/app/api/analytics/events/handler.ts:185 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/analytics/events/handler.ts:191 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/analytics/summary/handler.ts:30 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/analytics/summary/handler.ts:36 | searchParams.get() used without Zod schema validation. |
| WARN | url-param-unvalidated | src/app/api/assets3d/[id]/handler.ts | Dynamic route param "id" is used without Zod validation. |
| WARN | query-param-unvalidated | src/app/api/assets3d/handler.ts:14 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/assets3d/handler.ts:15 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/assets3d/handler.ts:16 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/assets3d/handler.ts:17 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/assets3d/handler.ts:18 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/brain/models/handler.ts:9 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/brain/models/handler.ts:10 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/brain/models/handler.ts:11 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/case-resolver/ocr/observability/handler.ts:18 | searchParams.get() used without Zod schema validation. |
| WARN | url-param-unvalidated | src/app/api/chatbot/agent/[runId]/[action]/route.ts | Dynamic route param "runId" is used without Zod validation. |
| WARN | url-param-unvalidated | src/app/api/chatbot/agent/[runId]/[action]/route.ts | Dynamic route param "action" is used without Zod validation. |
| WARN | query-param-unvalidated | src/app/api/chatbot/jobs/[jobId]/handler.ts:76 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/chatbot/jobs/handler.ts:129 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/chatbot/memory/handler.ts:16 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/chatbot/memory/handler.ts:17 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/chatbot/memory/handler.ts:18 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/chatbot/memory/handler.ts:19 | searchParams.get() used without Zod schema validation. |
| WARN | url-param-unvalidated | src/app/api/chatbot/sessions/[sessionId]/handler.ts | Dynamic route param "sessionId" is used without Zod validation. |
| WARN | query-param-unvalidated | src/app/api/chatbot/settings/handler.ts:47 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/cms/slugs/handler.ts:21 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/cms/slugs/handler.ts:64 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/cms/slugs/handler.ts:64 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/databases/backups/handler.ts:64 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/databases/browse/handler.ts:169 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/databases/browse/handler.ts:170 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/databases/browse/handler.ts:171 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/databases/browse/handler.ts:172 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/databases/browse/handler.ts:173 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/databases/engine/operations/jobs/handler.ts:87 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/databases/engine/provider-preview/handler.ts:17 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/databases/redis/handler.ts:58 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/databases/redis/handler.ts:59 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/databases/restore/handler.ts:50 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/databases/schema/handler.ts:351 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/databases/schema/handler.ts:352 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/files/handler.ts:12 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/files/handler.ts:13 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/files/handler.ts:14 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/files/handler.ts:15 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/files/preview/handler.ts:15 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/image-studio/projects/[projectId]/folders/handler.ts:84 | searchParams.get() used without Zod schema validation. |
| WARN | url-param-unvalidated | src/app/api/image-studio/runs/[runId]/handler.ts | Dynamic route param "runId" is used without Zod validation. |
| WARN | query-param-unvalidated | src/app/api/image-studio/runs/handler.ts:18 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/image-studio/runs/handler.ts:19 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/image-studio/runs/handler.ts:20 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/image-studio/runs/handler.ts:25 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/image-studio/runs/handler.ts:26 | searchParams.get() used without Zod schema validation. |
| WARN | url-param-unvalidated | src/app/api/image-studio/sequences/[runId]/cancel/handler.ts | Dynamic route param "runId" is used without Zod validation. |
| WARN | url-param-unvalidated | src/app/api/image-studio/sequences/[runId]/handler.ts | Dynamic route param "runId" is used without Zod validation. |
| WARN | query-param-unvalidated | src/app/api/image-studio/sequences/handler.ts:24 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/image-studio/sequences/handler.ts:25 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/image-studio/sequences/handler.ts:26 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/image-studio/sequences/handler.ts:31 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/image-studio/sequences/handler.ts:32 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/image-studio/slots/[slotId]/handler.ts:104 | searchParams.get() used without Zod schema validation. |
| WARN | url-param-unvalidated | src/app/api/kangur/assignments/[id]/handler.ts | Dynamic route param "id" is used without Zod validation. |
| WARN | query-param-unvalidated | src/app/api/kangur/assignments/handler.ts:24 | searchParams.get() used without Zod schema validation. |
| WARN | url-param-unvalidated | src/app/api/kangur/learners/[id]/handler.ts | Dynamic route param "id" is used without Zod validation. |
| WARN | query-param-unvalidated | src/app/api/kangur/scores/handler.ts:32 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/kangur/scores/handler.ts:33 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/kangur/scores/handler.ts:34 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/kangur/scores/handler.ts:35 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/kangur/scores/handler.ts:36 | searchParams.get() used without Zod schema validation. |
| WARN | url-param-unvalidated | src/app/api/marketplace/[resource]/route.ts | Dynamic route param "resource" is used without Zod validation. |
| WARN | query-param-unvalidated | src/app/api/marketplace/categories/handler.ts:19 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/marketplace/categories/handler.ts:20 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/marketplace/mappings/handler.ts:23 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/marketplace/mappings/handler.ts:24 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/marketplace/producer-mappings/handler.ts:22 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/marketplace/producers/handler.ts:18 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/marketplace/tag-mappings/handler.ts:22 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/marketplace/tags/handler.ts:18 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/notes/categories/[id]/handler.ts:46 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/notes/categories/handler.ts:16 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/notes/categories/tree/handler.ts:12 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/notes/handler.ts:17 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/notes/handler.ts:19 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/notes/handler.ts:28 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/notes/handler.ts:32 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/notes/handler.ts:39 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/notes/handler.ts:43 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/notes/handler.ts:47 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/notes/handler.ts:51 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/notes/handler.ts:55 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/notes/lookup/handler.ts:16 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/notes/tags/handler.ts:16 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/notes/themes/handler.ts:16 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/prompt-runtime/health/handler.ts:22 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/public/products/categories/handler.ts:36 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/public/products/parameters/handler.ts:52 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/settings/handler.ts:423 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/settings/handler.ts:424 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/settings/handler.ts:426 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/settings/handler.ts:427 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/settings/handler.ts:432 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/settings/handler.ts:444 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/settings/handler.ts:477 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/settings/lite/handler.ts:131 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/system/upload-events/handler.ts:16 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/system/upload-events/handler.ts:17 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/system/upload-events/handler.ts:18 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/system/upload-events/handler.ts:19 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/system/upload-events/handler.ts:20 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/system/upload-events/handler.ts:21 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/system/upload-events/handler.ts:22 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/system/upload-events/handler.ts:23 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/user/preferences/handler.ts:118 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/v2/integrations/[id]/connections/[connectionId]/allegro/callback/handler.ts:45 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/v2/integrations/[id]/connections/[connectionId]/allegro/callback/handler.ts:47 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/v2/integrations/[id]/connections/[connectionId]/allegro/callback/handler.ts:51 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/v2/integrations/[id]/connections/[connectionId]/allegro/callback/handler.ts:52 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/v2/integrations/connections/[id]/handler.ts:298 | searchParams.get() used without Zod schema validation. |
| WARN | url-param-unvalidated | src/app/api/v2/integrations/exports/base/[setting]/handler.ts | Dynamic route param "setting" is used without Zod validation. |
| WARN | url-param-unvalidated | src/app/api/v2/integrations/imports/base/[setting]/handler.ts | Dynamic route param "setting" is used without Zod validation. |
| WARN | url-param-unvalidated | src/app/api/v2/integrations/imports/base/runs/[runId]/cancel/handler.ts | Dynamic route param "runId" is used without Zod validation. |
| WARN | query-param-unvalidated | src/app/api/v2/integrations/product-listings/handler.ts:86 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/v2/products/[id]/handler.ts:54 | searchParams.get() used without Zod schema validation. |
| WARN | url-param-unvalidated | src/app/api/v2/products/[id]/images/[imageFileId]/handler.ts | Dynamic route param "id" is used without Zod validation. |
| WARN | url-param-unvalidated | src/app/api/v2/products/[id]/images/[imageFileId]/handler.ts | Dynamic route param "imageFileId" is used without Zod validation. |
| WARN | url-param-unvalidated | src/app/api/v2/products/[id]/images/base64/handler.ts | Dynamic route param "id" is used without Zod validation. |
| WARN | query-param-unvalidated | src/app/api/v2/products/ai-jobs/handler.ts:28 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/v2/products/ai-jobs/handler.ts:46 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/v2/products/ai-jobs/handler.ts:97 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/v2/products/ai-paths/description-context/handler.ts:104 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/v2/products/ai-paths/description-context/handler.ts:105 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/v2/products/ai-paths/description-context/handler.ts:107 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/v2/products/categories/batch/handler.ts:17 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/v2/products/categories/batch/handler.ts:34 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/v2/products/categories/handler.ts:50 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/v2/products/categories/handler.ts:56 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/v2/products/categories/tree/handler.ts:16 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/v2/products/categories/tree/handler.ts:22 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/v2/products/handler.ts:53 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/v2/products/metadata/handler.ts:199 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/v2/products/paged/handler.ts:40 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/v2/products/parameters/handler.ts:73 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/v2/products/parameters/handler.ts:79 | searchParams.get() used without Zod schema validation. |
| WARN | url-param-unvalidated | src/app/api/v2/products/producers/[id]/handler.ts | Dynamic route param "id" is used without Zod validation. |
| WARN | url-param-unvalidated | src/app/api/v2/products/sync/profiles/[id]/run/handler.ts | Dynamic route param "id" is used without Zod validation. |
| WARN | url-param-unvalidated | src/app/api/v2/products/tags/[id]/handler.ts | Dynamic route param "id" is used without Zod validation. |
| WARN | query-param-unvalidated | src/app/api/v2/products/tags/handler.ts:18 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/v2/products/validator-config/handler.ts:8 | searchParams.get() used without Zod schema validation. |

## Notes

- `req-json-no-schema` (error): All request body parsing should use `parseJsonBody()` with a Zod schema.
- `url-param-unvalidated` (warn): Dynamic route params `[param]` should be validated with Zod.
- `query-param-unvalidated` (warn): Query string params via `searchParams.get()` should be validated.
