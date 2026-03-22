---
owner: 'Platform Team'
last_reviewed: '2026-03-22'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# API Input Validation Check

Generated at: 2026-03-22T10:14:24.977Z

## Summary

- Status: WARN
- Files scanned: 941
- Total handlers: 893
- Validated handlers: 893
- **Coverage: 100%**
- Errors: 0
- Warnings: 1

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| url-param-unvalidated | 0 | 1 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| WARN | url-param-unvalidated | src/app/api/v2/products/categories/[id]/handler.ts | Dynamic route param "id" is used without Zod validation. |

## Notes

- `req-json-no-schema` (error): All request body parsing should use `parseJsonBody()` with a Zod schema.
- `url-param-unvalidated` (warn): Dynamic route params `[param]` should be validated with Zod.
- `query-param-unvalidated` (warn): Query string params via `searchParams.get()` should be validated.
