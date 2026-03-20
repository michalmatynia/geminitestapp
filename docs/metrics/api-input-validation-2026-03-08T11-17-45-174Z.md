# API Input Validation Check

Generated at: 2026-03-08T11:17:45.174Z

## Summary

- Status: WARN
- Files scanned: 673
- Total handlers: 648
- Validated handlers: 648
- **Coverage: 100%**
- Errors: 0
- Warnings: 38

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| query-param-unvalidated | 0 | 38 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| WARN | query-param-unvalidated | src/app/api/agentcreator/teaching/collections/[collectionId]/documents/handler.ts:31 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/agentcreator/teaching/collections/[collectionId]/documents/handler.ts:32 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/portable-engine/remediation-dead-letters/handler.ts:133 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/portable-engine/remediation-dead-letters/handler.ts:134 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/portable-engine/remediation-dead-letters/handler.ts:135 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/portable-engine/remediation-webhook/handler.ts:66 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/portable-engine/schema/diff/handler.ts:49 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/portable-engine/schema/handler.ts:49 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/runs/[runId]/stream/handler.ts:316 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/runtime-analytics/summary/handler.ts:18 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/case-resolver/ocr/observability/handler.ts:18 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/chatbot/jobs/[jobId]/handler.ts:76 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/chatbot/jobs/handler.ts:129 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/chatbot/settings/handler.ts:47 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/databases/backups/handler.ts:64 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/databases/engine/operations/jobs/handler.ts:87 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/databases/engine/provider-preview/handler.ts:17 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/databases/redis/handler.ts:58 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/databases/redis/handler.ts:59 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/databases/restore/handler.ts:50 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/databases/schema/handler.ts:351 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/databases/schema/handler.ts:352 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/files/preview/handler.ts:15 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/image-studio/projects/[projectId]/folders/handler.ts:84 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/image-studio/slots/[slotId]/handler.ts:104 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/marketplace/categories/handler.ts:19 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/marketplace/categories/handler.ts:20 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/marketplace/mappings/handler.ts:23 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/marketplace/mappings/handler.ts:24 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/marketplace/producer-mappings/handler.ts:22 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/marketplace/producers/handler.ts:18 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/marketplace/tag-mappings/handler.ts:22 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/marketplace/tags/handler.ts:18 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/prompt-runtime/health/handler.ts:22 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/settings/lite/handler.ts:131 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/user/preferences/handler.ts:118 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/v2/integrations/connections/[id]/handler.ts:298 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/v2/integrations/product-listings/handler.ts:86 | searchParams.get() used without Zod schema validation. |

## Notes

- `req-json-no-schema` (error): All request body parsing should use `parseJsonBody()` with a Zod schema.
- `url-param-unvalidated` (warn): Dynamic route params `[param]` should be validated with Zod.
- `query-param-unvalidated` (warn): Query string params via `searchParams.get()` should be validated.
