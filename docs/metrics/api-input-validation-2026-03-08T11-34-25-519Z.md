# API Input Validation Check

Generated at: 2026-03-08T11:34:25.519Z

## Summary

- Status: WARN
- Files scanned: 673
- Total handlers: 648
- Validated handlers: 648
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
| WARN | query-param-unvalidated | src/app/api/marketplace/categories/handler.ts:19 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/marketplace/categories/handler.ts:20 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/marketplace/mappings/handler.ts:23 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/marketplace/mappings/handler.ts:24 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/marketplace/producer-mappings/handler.ts:22 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/marketplace/producers/handler.ts:18 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/marketplace/tag-mappings/handler.ts:22 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/marketplace/tags/handler.ts:18 | searchParams.get() used without Zod schema validation. |

## Notes

- `req-json-no-schema` (error): All request body parsing should use `parseJsonBody()` with a Zod schema.
- `url-param-unvalidated` (warn): Dynamic route params `[param]` should be validated with Zod.
- `query-param-unvalidated` (warn): Query string params via `searchParams.get()` should be validated.
