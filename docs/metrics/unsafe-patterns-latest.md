---
owner: 'Platform Team'
last_reviewed: '2026-04-11'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Unsafe Patterns Check

Generated at: 2026-04-11T13:44:51.214Z

## Summary

- Status: PASSED
- Files scanned: 7252
- Errors: 0
- Warnings: 0
- Info: 10

## Trend Counters

| Metric | Count |
| --- | ---: |
| doubleAssertionCount | 0 |
| anyCount | 5 |
| eslintDisableCount | 2 |
| nonNullAssertionCount | 3 |
| tsIgnoreCount | 0 |
| tsExpectErrorCount | 0 |

## Top Disabled ESLint Rules

| Rule | Count |
| --- | ---: |
| @typescript-eslint/no-unsafe-return | 1 |
| @typescript-eslint/no-explicit-any | 1 |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| eslint-disable | 0 | 0 | 2 |
| explicit-any | 0 | 0 | 5 |
| non-null-assertion | 0 | 0 | 3 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| INFO | non-null-assertion | src/features/filemaker/server/filemaker-mail-service.ts:712 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | non-null-assertion | src/features/integrations/utils/tradera-browser-session.ts:53 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | non-null-assertion | src/features/integrations/utils/tradera-browser-session.ts:66 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | eslint-disable | src/features/kangur/ui/KangurLoginPage.test-support.tsx:6 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-return |
| INFO | explicit-any | src/shared/contracts/document-editor.ts:31 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/shared/contracts/document-editor.ts:32 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/shared/contracts/document-editor.ts:33 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/shared/contracts/document-editor.ts:40 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | eslint-disable | src/shared/lib/react/types.ts:5 | eslint-disable comment disabling: @typescript-eslint/no-explicit-any |
| INFO | explicit-any | src/shared/lib/react/types.ts:6 | Explicit `any` type usage. Consider using a specific type or `unknown`. |

## Notes

- `double-assertion` (error): `as unknown as` bypasses type safety. Use type guards or proper narrowing.
- `ts-ignore-no-reason` / `ts-expect-error-no-reason` (warn): Always explain why a suppression is needed.
- `explicit-any` (info): Track trend over time. Prefer `unknown` or specific types.
- `eslint-disable` (info): Track which rules are most frequently disabled.
- `non-null-assertion` (info): Prefer optional chaining `?.` or explicit null checks.
