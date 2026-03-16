---
owner: 'Platform Team'
last_reviewed: '2026-03-16'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Unsafe Patterns Check

Generated at: 2026-03-16T18:13:34.195Z

## Summary

- Status: PASSED
- Files scanned: 5153
- Errors: 0
- Warnings: 0
- Info: 7

## Trend Counters

| Metric | Count |
| --- | ---: |
| doubleAssertionCount | 0 |
| anyCount | 1 |
| eslintDisableCount | 1 |
| nonNullAssertionCount | 5 |
| tsIgnoreCount | 0 |
| tsExpectErrorCount | 0 |

## Top Disabled ESLint Rules

| Rule | Count |
| --- | ---: |
| @typescript-eslint/no-explicit-any | 1 |
| @typescript-eslint/no-unsafe-assignment | 1 |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| eslint-disable | 0 | 0 | 1 |
| explicit-any | 0 | 0 | 1 |
| non-null-assertion | 0 | 0 | 5 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| INFO | non-null-assertion | src/app/api/ai-paths/runs/enqueue/handler.ts:172 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | non-null-assertion | src/features/cms/context-registry/page-builder.ts:231 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | non-null-assertion | src/features/kangur/admin/test-suites-manager/test-suites-manager.logic.ts:229 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | non-null-assertion | src/features/kangur/duels/server.ts:1143 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | non-null-assertion | src/shared/lib/ai-paths/core/normalization/stored-trigger-path-config.ts:360 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | eslint-disable | src/shared/lib/db/legacy-sql-client.ts:1 | eslint-disable comment disabling: @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment |
| INFO | explicit-any | src/shared/lib/db/legacy-sql-client.ts:17 | Explicit `any` type usage. Consider using a specific type or `unknown`. |

## Notes

- `double-assertion` (error): `as unknown as` bypasses type safety. Use type guards or proper narrowing.
- `ts-ignore-no-reason` / `ts-expect-error-no-reason` (warn): Always explain why a suppression is needed.
- `explicit-any` (info): Track trend over time. Prefer `unknown` or specific types.
- `eslint-disable` (info): Track which rules are most frequently disabled.
- `non-null-assertion` (info): Prefer optional chaining `?.` or explicit null checks.
