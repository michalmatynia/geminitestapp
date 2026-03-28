---
owner: 'Platform Team'
last_reviewed: '2026-03-28'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# API Input Validation Check

Generated at: 2026-03-28T14:12:27.782Z

## Summary

- Status: WARN
- Files scanned: 976
- Total handlers: 928
- Validated handlers: 928
- **Coverage: 100%**
- Errors: 0
- Warnings: 2

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| query-param-unvalidated | 0 | 2 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| WARN | query-param-unvalidated | src/app/api/filemaker/campaigns/click/handler.ts:35 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/filemaker/campaigns/open/handler.ts:36 | searchParams.get() used without Zod schema validation. |

## Notes

- `req-json-no-schema` (error): All request body parsing should use `parseJsonBody()` with a Zod schema.
- `url-param-unvalidated` (warn): Dynamic route params `[param]` should be validated with Zod.
- `query-param-unvalidated` (warn): Query string params via `searchParams.get()` should be validated.
