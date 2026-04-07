---
owner: 'Platform Team'
last_reviewed: '2026-04-07'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Unsafe Patterns Check

Generated at: 2026-04-07T10:12:54.097Z

## Summary

- Status: PASSED
- Files scanned: 7024
- Errors: 0
- Warnings: 0
- Info: 2

## Trend Counters

| Metric | Count |
| --- | ---: |
| doubleAssertionCount | 0 |
| anyCount | 0 |
| eslintDisableCount | 1 |
| nonNullAssertionCount | 1 |
| tsIgnoreCount | 0 |
| tsExpectErrorCount | 0 |

## Top Disabled ESLint Rules

| Rule | Count |
| --- | ---: |
| @typescript-eslint/no-unsafe-return | 1 |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| eslint-disable | 0 | 0 | 1 |
| non-null-assertion | 0 | 0 | 1 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| INFO | non-null-assertion | src/features/filemaker/server/filemaker-mail-service.ts:712 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | eslint-disable | src/features/kangur/ui/KangurLoginPage.test-support.tsx:6 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-return |

## Notes

- `double-assertion` (error): `as unknown as` bypasses type safety. Use type guards or proper narrowing.
- `ts-ignore-no-reason` / `ts-expect-error-no-reason` (warn): Always explain why a suppression is needed.
- `explicit-any` (info): Track trend over time. Prefer `unknown` or specific types.
- `eslint-disable` (info): Track which rules are most frequently disabled.
- `non-null-assertion` (info): Prefer optional chaining `?.` or explicit null checks.
