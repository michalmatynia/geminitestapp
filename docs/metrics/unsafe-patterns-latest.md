---
owner: 'Platform Team'
last_reviewed: '2026-03-23'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Unsafe Patterns Check

Generated at: 2026-03-23T12:16:12.333Z

## Summary

- Status: PASSED
- Files scanned: 5703
- Errors: 0
- Warnings: 0
- Info: 4

## Trend Counters

| Metric | Count |
| --- | ---: |
| doubleAssertionCount | 0 |
| anyCount | 2 |
| eslintDisableCount | 2 |
| nonNullAssertionCount | 0 |
| tsIgnoreCount | 0 |
| tsExpectErrorCount | 0 |

## Top Disabled ESLint Rules

| Rule | Count |
| --- | ---: |
| @typescript-eslint/no-unsafe-assignment | 1 |
| @typescript-eslint/no-unsafe-call | 1 |
| @typescript-eslint/no-explicit-any | 1 |
| -- | 1 |
| catch-all | 1 |
| route | 1 |
| modules | 1 |
| define | 1 |
| their | 1 |
| own | 1 |
| param | 1 |
| shapes. | 1 |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| eslint-disable | 0 | 0 | 2 |
| explicit-any | 0 | 0 | 2 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| INFO | eslint-disable | src/features/products/performance/monitoring.ts:294 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call |
| INFO | eslint-disable | src/shared/lib/api/catch-all-route-types.ts:12 | eslint-disable comment disabling: @typescript-eslint/no-explicit-any -- catch-all route modules define their own param shapes. |
| INFO | explicit-any | src/shared/lib/db/services/sync/chatbot-sync.ts:84 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/shared/lib/db/services/sync/chatbot-sync.ts:88 | Explicit `any` type usage. Consider using a specific type or `unknown`. |

## Notes

- `double-assertion` (error): `as unknown as` bypasses type safety. Use type guards or proper narrowing.
- `ts-ignore-no-reason` / `ts-expect-error-no-reason` (warn): Always explain why a suppression is needed.
- `explicit-any` (info): Track trend over time. Prefer `unknown` or specific types.
- `eslint-disable` (info): Track which rules are most frequently disabled.
- `non-null-assertion` (info): Prefer optional chaining `?.` or explicit null checks.
