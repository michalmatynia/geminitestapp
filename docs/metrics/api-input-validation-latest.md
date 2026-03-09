---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# API Input Validation Check

Generated at: 2026-03-09T07:50:51.076Z

## Summary

- Status: WARN
- Files scanned: 691
- Total handlers: 665
- Validated handlers: 665
- **Coverage: 100%**
- Errors: 0
- Warnings: 11

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| query-param-unvalidated | 0 | 11 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| WARN | query-param-unvalidated | src/app/api/agent/approval-gates/route.ts:11 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/agent/approval-gates/route.ts:31 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/agent/leases/route.ts:31 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/agent/leases/route.ts:32 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/agent/leases/route.ts:57 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/agent/leases/route.ts:65 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/agent/leases/route.ts:66 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/agent/resources/route.ts:24 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/agent/resources/route.ts:45 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/agent/resources/route.ts:46 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/agent/resources/route.ts:47 | searchParams.get() used without Zod schema validation. |

## Notes

- `req-json-no-schema` (error): All request body parsing should use `parseJsonBody()` with a Zod schema.
- `url-param-unvalidated` (warn): Dynamic route params `[param]` should be validated with Zod.
- `query-param-unvalidated` (warn): Query string params via `searchParams.get()` should be validated.
