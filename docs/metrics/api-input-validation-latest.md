---
owner: 'Platform Team'
last_reviewed: '2026-03-10'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# API Input Validation Check

Generated at: 2026-03-10T08:15:31.415Z

## Summary

- Status: WARN
- Files scanned: 701
- Total handlers: 675
- Validated handlers: 675
- **Coverage: 100%**
- Errors: 0
- Warnings: 13

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| query-param-unvalidated | 0 | 13 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| WARN | query-param-unvalidated | src/app/api/agent/approval-gates/route.ts:12 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/agent/approval-gates/route.ts:32 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/agent/leases/route.ts:32 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/agent/leases/route.ts:33 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/agent/leases/route.ts:58 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/agent/leases/route.ts:66 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/agent/leases/route.ts:67 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/agent/resources/route.ts:25 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/agent/resources/route.ts:46 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/agent/resources/route.ts:47 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/agent/resources/route.ts:48 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/agentcreator/personas/avatar/handler.ts:130 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/ai-paths/trigger-buttons/handler.ts:67 | searchParams.get() used without Zod schema validation. |

## Notes

- `req-json-no-schema` (error): All request body parsing should use `parseJsonBody()` with a Zod schema.
- `url-param-unvalidated` (warn): Dynamic route params `[param]` should be validated with Zod.
- `query-param-unvalidated` (warn): Query string params via `searchParams.get()` should be validated.
