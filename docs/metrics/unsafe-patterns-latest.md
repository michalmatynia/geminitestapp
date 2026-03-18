---
owner: 'Platform Team'
last_reviewed: '2026-03-18'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Unsafe Patterns Check

Generated at: 2026-03-18T19:19:36.926Z

## Summary

- Status: PASSED
- Files scanned: 5525
- Errors: 0
- Warnings: 0
- Info: 15

## Trend Counters

| Metric | Count |
| --- | ---: |
| doubleAssertionCount | 0 |
| anyCount | 1 |
| eslintDisableCount | 7 |
| nonNullAssertionCount | 7 |
| tsIgnoreCount | 0 |
| tsExpectErrorCount | 0 |

## Top Disabled ESLint Rules

| Rule | Count |
| --- | ---: |
| @typescript-eslint/no-explicit-any | 7 |
| -- | 6 |
| route | 6 |
| modules | 6 |
| define | 6 |
| their | 6 |
| own | 6 |
| param | 6 |
| shapes. | 6 |
| @typescript-eslint/no-unsafe-assignment | 1 |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| eslint-disable | 0 | 0 | 7 |
| explicit-any | 0 | 0 | 1 |
| non-null-assertion | 0 | 0 | 7 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| INFO | eslint-disable | src/app/api/ai-paths/[[...path]]/route.ts:48 | eslint-disable comment disabling: @typescript-eslint/no-explicit-any -- route modules define their own param shapes. |
| INFO | non-null-assertion | src/app/api/ai-paths/runs/enqueue/handler.ts:172 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | eslint-disable | src/app/api/chatbot/[[...path]]/route.ts:31 | eslint-disable comment disabling: @typescript-eslint/no-explicit-any -- route modules define their own param shapes. |
| INFO | eslint-disable | src/app/api/databases/[[...path]]/route.ts:40 | eslint-disable comment disabling: @typescript-eslint/no-explicit-any -- route modules define their own param shapes. |
| INFO | eslint-disable | src/app/api/image-studio/[[...path]]/route.ts:53 | eslint-disable comment disabling: @typescript-eslint/no-explicit-any -- route modules define their own param shapes. |
| INFO | eslint-disable | src/app/api/v2/integrations/[[...path]]/route.ts:59 | eslint-disable comment disabling: @typescript-eslint/no-explicit-any -- route modules define their own param shapes. |
| INFO | eslint-disable | src/app/api/v2/products/[[...path]]/route.ts:73 | eslint-disable comment disabling: @typescript-eslint/no-explicit-any -- route modules define their own param shapes. |
| INFO | non-null-assertion | src/features/cms/context-registry/page-builder.ts:231 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | non-null-assertion | src/features/kangur/duels/server.db.ts:543 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | non-null-assertion | src/features/kangur/server/social-posts-docs.ts:180 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | non-null-assertion | src/features/kangur/server/social-posts-docs.ts:212 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | non-null-assertion | src/features/kangur/ui/login-page/use-turnstile.ts:107 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | non-null-assertion | src/shared/lib/ai-paths/core/normalization/stored-trigger-path-config.ts:360 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | eslint-disable | src/shared/lib/db/legacy-sql-client.ts:1 | eslint-disable comment disabling: @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment |
| INFO | explicit-any | src/shared/lib/db/legacy-sql-client.ts:17 | Explicit `any` type usage. Consider using a specific type or `unknown`. |

## Notes

- `double-assertion` (error): `as unknown as` bypasses type safety. Use type guards or proper narrowing.
- `ts-ignore-no-reason` / `ts-expect-error-no-reason` (warn): Always explain why a suppression is needed.
- `explicit-any` (info): Track trend over time. Prefer `unknown` or specific types.
- `eslint-disable` (info): Track which rules are most frequently disabled.
- `non-null-assertion` (info): Prefer optional chaining `?.` or explicit null checks.
