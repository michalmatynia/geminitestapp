---
owner: 'Platform Team'
last_reviewed: '2026-04-11'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# API Input Validation Check

Generated at: 2026-04-11T16:18:13.358Z

## Summary

- Status: PASSED
- Files scanned: 1138
- Total handlers: 1012
- Validated handlers: 1012
- **Coverage: 100%**
- Errors: 0
- Warnings: 0

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |

## Issues

All API handlers have proper input validation.

## Notes

- `req-json-no-schema` (error): All request body parsing should use `parseJsonBody()` with a Zod schema.
- `url-param-unvalidated` (warn): Dynamic route params `[param]` should be validated with Zod.
- `query-param-unvalidated` (warn): Query string params via `searchParams.get()` should be validated.
