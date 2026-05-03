---
owner: 'Platform Team'
last_reviewed: '2026-04-15'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# API Input Validation Check

Generated at: 2026-04-15T09:38:12.826Z

## Summary

- Status: WARN
- Files scanned: 1155
- Total handlers: 1027
- Validated handlers: 1027
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
| WARN | url-param-unvalidated | src/app/api/v2/products/scans/[scanId]/handler.ts | Dynamic route param "scanId" is used without Zod validation. |

## Notes

- `req-json-no-schema` (error): All request body parsing should use `parseJsonBody()` with a Zod schema.
- `url-param-unvalidated` (warn): Dynamic route params `[param]` should be validated with Zod.
- `query-param-unvalidated` (warn): Query string params via `searchParams.get()` should be validated.
