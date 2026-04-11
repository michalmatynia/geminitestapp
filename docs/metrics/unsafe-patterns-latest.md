---
owner: 'Platform Team'
last_reviewed: '2026-04-11'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Unsafe Patterns Check

Generated at: 2026-04-11T16:18:11.492Z

## Summary

- Status: PASSED
- Files scanned: 7268
- Errors: 0
- Warnings: 0
- Info: 13

## Trend Counters

| Metric | Count |
| --- | ---: |
| doubleAssertionCount | 0 |
| anyCount | 8 |
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
| explicit-any | 0 | 0 | 8 |
| non-null-assertion | 0 | 0 | 3 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| INFO | non-null-assertion | src/features/filemaker/server/filemaker-mail-service.ts:712 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | non-null-assertion | src/features/integrations/utils/tradera-browser-session.ts:53 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | non-null-assertion | src/features/integrations/utils/tradera-browser-session.ts:66 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | eslint-disable | src/features/kangur/ui/KangurLoginPage.test-support.tsx:6 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-return |
| INFO | explicit-any | src/features/products/components/form/ProductFormScans.tsx:43 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/features/products/components/list/ProductAmazonScanModal.tsx:70 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/features/products/lib/product-scan-run-feedback.ts:55 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
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
