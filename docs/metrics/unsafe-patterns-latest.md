---
owner: 'Platform Team'
last_reviewed: '2026-04-15'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Unsafe Patterns Check

Generated at: 2026-04-15T09:38:11.897Z

## Summary

- Status: FAILED
- Files scanned: 7350
- Errors: 6
- Warnings: 0
- Info: 7

## Trend Counters

| Metric | Count |
| --- | ---: |
| doubleAssertionCount | 6 |
| anyCount | 1 |
| eslintDisableCount | 2 |
| nonNullAssertionCount | 4 |
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
| double-assertion | 6 | 0 | 0 |
| eslint-disable | 0 | 0 | 2 |
| explicit-any | 0 | 0 | 1 |
| non-null-assertion | 0 | 0 | 4 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| ERROR | double-assertion | src/features/products/context/ProductImagePreviewContext.tsx:31 | Unsafe double type assertion (as unknown as). Use a type guard or proper narrowing instead. |
| ERROR | double-assertion | src/features/products/context/ProductImagePreviewContext.tsx:31 | Unsafe double type assertion (as unknown as). Use a type guard or proper narrowing instead. |
| ERROR | double-assertion | src/features/products/context/ProductListContext.tsx:61 | Unsafe double type assertion (as unknown as). Use a type guard or proper narrowing instead. |
| ERROR | double-assertion | src/features/products/context/ProductListContext.tsx:61 | Unsafe double type assertion (as unknown as). Use a type guard or proper narrowing instead. |
| ERROR | double-assertion | src/shared/lib/browser-execution/sequencers/AmazonScanSequencer.ts:1242 | Unsafe double type assertion (as unknown as). Use a type guard or proper narrowing instead. |
| ERROR | double-assertion | src/shared/ui/templates/pickers/GenericPickerDropdown.tsx:119 | Unsafe double type assertion (as unknown as). Use a type guard or proper narrowing instead. |
| INFO | non-null-assertion | src/features/admin/components/menu/NavTree.tsx:337 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | non-null-assertion | src/features/filemaker/server/filemaker-mail-service.ts:712 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | non-null-assertion | src/features/integrations/utils/tradera-browser-session.ts:56 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | non-null-assertion | src/features/integrations/utils/tradera-browser-session.ts:69 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | eslint-disable | src/features/kangur/ui/KangurLoginPage.test-support.tsx:6 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-return |
| INFO | eslint-disable | src/shared/lib/react/types.ts:5 | eslint-disable comment disabling: @typescript-eslint/no-explicit-any |
| INFO | explicit-any | src/shared/lib/react/types.ts:6 | Explicit `any` type usage. Consider using a specific type or `unknown`. |

## Notes

- `double-assertion` (error): `as unknown as` bypasses type safety. Use type guards or proper narrowing.
- `ts-ignore-no-reason` / `ts-expect-error-no-reason` (warn): Always explain why a suppression is needed.
- `explicit-any` (info): Track trend over time. Prefer `unknown` or specific types.
- `eslint-disable` (info): Track which rules are most frequently disabled.
- `non-null-assertion` (info): Prefer optional chaining `?.` or explicit null checks.
