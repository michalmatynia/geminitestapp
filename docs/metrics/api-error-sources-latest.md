---
owner: 'Platform Team'
last_reviewed: '2026-05-06'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# API Error Sources Check

Generated at: 2026-05-06T11:44:15.224Z

## Summary

- Status: WARN
- Route files scanned: 391
- Handler files scanned: 538
- Errors: 0
- Warnings: 5

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| unchecked-req-json | 0 | 4 | 0 |
| raw-new-response | 0 | 1 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| WARN | raw-new-response | src/app/api/ai-paths/runs/[runId]/stream/handler.ts:469 | Direct `new Response()` usage. Consider using createErrorResponse/createSuccessResponse. |
| WARN | unchecked-req-json | src/app/api/filemaker/cvs/export-pdf/handler.ts:16 | req.json() without parseJsonBody or Zod schema. Use parseJsonBody() for consistent validation. |
| WARN | unchecked-req-json | src/app/api/filemaker/invoices/export-pdf/handler.ts:21 | req.json() without parseJsonBody or Zod schema. Use parseJsonBody() for consistent validation. |
| WARN | unchecked-req-json | src/app/api/filemaker/organizations/job-board-scrape/classifications/handler.ts:10 | req.json() without parseJsonBody or Zod schema. Use parseJsonBody() for consistent validation. |
| WARN | unchecked-req-json | src/app/api/playwright/scripters/handler.ts:22 | req.json() without parseJsonBody or Zod schema. Use parseJsonBody() for consistent validation. |

## Notes

- `source-mismatch-handler` / `source-mismatch-error-response` (error): Handler source names must match the route path convention.
- `api-handler-missing-wrapper` (error): All API routes should use apiHandler/apiHandlerWithParams.
- `unchecked-req-json` (warn): Use parseJsonBody() with Zod schemas for consistent validation.
- `raw-new-response` (warn): Use createErrorResponse/createSuccessResponse for consistent error handling.
