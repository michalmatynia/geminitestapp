---
owner: 'Platform Team'
last_reviewed: '2026-03-15'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# API Error Sources Check

Generated at: 2026-03-15T06:12:24.192Z

## Summary

- Status: PASSED
- Route files scanned: 350
- Handler files scanned: 335
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
