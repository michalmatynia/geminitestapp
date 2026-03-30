---
owner: 'Platform Team'
last_reviewed: '2026-03-30'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# API Input Validation Check

Generated at: 2026-03-30T12:40:59.098Z

## Summary

- Status: WARN
- Files scanned: 1000
- Total handlers: 949
- Validated handlers: 949
- **Coverage: 100%**
- Errors: 0
- Warnings: 8

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| query-param-unvalidated | 0 | 8 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| WARN | query-param-unvalidated | src/app/api/filemaker/campaigns/click/handler.ts:35 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/filemaker/campaigns/open/handler.ts:36 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/filemaker/mail/folders/handler.ts:9 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/filemaker/mail/search/handler.ts:9 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/filemaker/mail/search/handler.ts:10 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/filemaker/mail/threads/handler.ts:9 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/filemaker/mail/threads/handler.ts:10 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/filemaker/mail/threads/handler.ts:11 | searchParams.get() used without Zod schema validation. |

## Notes

- `req-json-no-schema` (error): All request body parsing should use `parseJsonBody()` with a Zod schema.
- `url-param-unvalidated` (warn): Dynamic route params `[param]` should be validated with Zod.
- `query-param-unvalidated` (warn): Query string params via `searchParams.get()` should be validated.
