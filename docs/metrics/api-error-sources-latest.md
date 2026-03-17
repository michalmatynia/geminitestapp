---
owner: 'Platform Team'
last_reviewed: '2026-03-17'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# API Error Sources Check

Generated at: 2026-03-17T11:42:40.728Z

## Summary

- Status: PASSED
- Route files scanned: 280
- Handler files scanned: 364
- Errors: 0
- Warnings: 0

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |

## Issues

All API error sources are consistent.

## Notes

- `source-mismatch-handler` / `source-mismatch-error-response` (error): Handler source names must match the route path convention.
- `api-handler-missing-wrapper` (error): All API routes should use apiHandler/apiHandlerWithParams.
- `unchecked-req-json` (warn): Use parseJsonBody() with Zod schemas for consistent validation.
- `raw-new-response` (warn): Use createErrorResponse/createSuccessResponse for consistent error handling.
