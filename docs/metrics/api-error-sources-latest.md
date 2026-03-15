---
owner: 'Platform Team'
last_reviewed: '2026-03-15'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# API Error Sources Check

Generated at: 2026-03-15T13:59:22.828Z

## Summary

- Status: WARN
- Route files scanned: 353
- Handler files scanned: 338
- Errors: 0
- Warnings: 1

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| unchecked-req-json | 0 | 1 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| WARN | unchecked-req-json | src/app/api/kangur/learner-activity/handler.ts:49 | req.json() without parseJsonBody or Zod schema. Use parseJsonBody() for consistent validation. |

## Notes

- `source-mismatch-handler` / `source-mismatch-error-response` (error): Handler source names must match the route path convention.
- `api-handler-missing-wrapper` (error): All API routes should use apiHandler/apiHandlerWithParams.
- `unchecked-req-json` (warn): Use parseJsonBody() with Zod schemas for consistent validation.
- `raw-new-response` (warn): Use createErrorResponse/createSuccessResponse for consistent error handling.
