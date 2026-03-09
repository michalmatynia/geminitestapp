# API Input Validation Check

Generated at: 2026-03-09T06:12:23.285Z

## Summary

- Status: WARN
- Files scanned: 689
- Total handlers: 663
- Validated handlers: 663
- **Coverage: 100%**
- Errors: 0
- Warnings: 6

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| query-param-unvalidated | 0 | 6 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| WARN | query-param-unvalidated | src/app/api/agent/approval-gates/route.ts:11 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/agent/approval-gates/route.ts:31 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/agent/resources/route.ts:24 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/agent/resources/route.ts:45 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/agent/resources/route.ts:46 | searchParams.get() used without Zod schema validation. |
| WARN | query-param-unvalidated | src/app/api/agent/resources/route.ts:47 | searchParams.get() used without Zod schema validation. |

## Notes

- `req-json-no-schema` (error): All request body parsing should use `parseJsonBody()` with a Zod schema.
- `url-param-unvalidated` (warn): Dynamic route params `[param]` should be validated with Zod.
- `query-param-unvalidated` (warn): Query string params via `searchParams.get()` should be validated.
