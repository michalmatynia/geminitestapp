---
owner: 'Platform Team'
last_reviewed: '2026-03-30'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# API Error Sources Check

Generated at: 2026-03-30T15:09:29.120Z

## Summary

- Status: WARN
- Route files scanned: 298
- Handler files scanned: 417
- Errors: 0
- Warnings: 2

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| raw-new-response | 0 | 2 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| WARN | raw-new-response | src/app/api/filemaker/campaigns/click/handler.ts:27 | Direct `new Response()` usage. Consider using createErrorResponse/createSuccessResponse. |
| WARN | raw-new-response | src/app/api/filemaker/campaigns/open/handler.ts:25 | Direct `new Response()` usage. Consider using createErrorResponse/createSuccessResponse. |

## Notes

- `source-mismatch-handler` / `source-mismatch-error-response` (error): Handler source names must match the route path convention.
- `api-handler-missing-wrapper` (error): All API routes should use apiHandler/apiHandlerWithParams.
- `unchecked-req-json` (warn): Use parseJsonBody() with Zod schemas for consistent validation.
- `raw-new-response` (warn): Use createErrorResponse/createSuccessResponse for consistent error handling.
