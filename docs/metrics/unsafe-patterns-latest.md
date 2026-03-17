---
owner: 'Platform Team'
last_reviewed: '2026-03-17'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Unsafe Patterns Check

Generated at: 2026-03-17T09:54:56.435Z

## Summary

- Status: PASSED
- Files scanned: 5182
- Errors: 0
- Warnings: 0
- Info: 7

## Trend Counters

| Metric | Count |
| --- | ---: |
| doubleAssertionCount | 0 |
| anyCount | 2 |
| eslintDisableCount | 1 |
| nonNullAssertionCount | 4 |
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
| explicit-any | 0 | 0 | 2 |
| non-null-assertion | 0 | 0 | 4 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| INFO | non-null-assertion | src/app/api/ai-paths/runs/enqueue/handler.ts:172 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | explicit-any | src/app/api/kangur/duels/lobby/handler.ts:49 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | non-null-assertion | src/features/cms/context-registry/page-builder.ts:231 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | non-null-assertion | src/features/kangur/duels/server.db.ts:541 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | non-null-assertion | src/shared/lib/ai-paths/core/normalization/stored-trigger-path-config.ts:360 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | eslint-disable | src/shared/lib/db/legacy-sql-client.ts:1 | eslint-disable comment disabling: @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment |
| INFO | explicit-any | src/shared/lib/db/legacy-sql-client.ts:17 | Explicit `any` type usage. Consider using a specific type or `unknown`. |

## Notes

- `double-assertion` (error): `as unknown as` bypasses type safety. Use type guards or proper narrowing.
- `ts-ignore-no-reason` / `ts-expect-error-no-reason` (warn): Always explain why a suppression is needed.
- `explicit-any` (info): Track trend over time. Prefer `unknown` or specific types.
- `eslint-disable` (info): Track which rules are most frequently disabled.
- `non-null-assertion` (info): Prefer optional chaining `?.` or explicit null checks.
