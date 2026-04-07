---
owner: 'Platform Team'
last_reviewed: '2026-04-07'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Unsafe Patterns Check

Generated at: 2026-04-07T13:05:49.805Z

## Summary

- Status: PASSED
- Files scanned: 7093
- Errors: 0
- Warnings: 0
- Info: 20

## Trend Counters

| Metric | Count |
| --- | ---: |
| doubleAssertionCount | 0 |
| anyCount | 3 |
| eslintDisableCount | 16 |
| nonNullAssertionCount | 1 |
| tsIgnoreCount | 0 |
| tsExpectErrorCount | 0 |

## Top Disabled ESLint Rules

| Rule | Count |
| --- | ---: |
| @typescript-eslint/no-unsafe-assignment | 10 |
| @typescript-eslint/no-unsafe-call | 8 |
| @typescript-eslint/no-unsafe-member-access | 6 |
| @typescript-eslint/no-unsafe-return | 2 |
| @typescript-eslint/no-unsafe-argument | 2 |
| @typescript-eslint/no-unnecessary-type-assertion | 2 |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| eslint-disable | 0 | 0 | 16 |
| explicit-any | 0 | 0 | 3 |
| non-null-assertion | 0 | 0 | 1 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| INFO | explicit-any | src/app/api/v2/integrations/[id]/connections/[connectionId]/test/handler.vinted-browser.ts:20 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/app/api/v2/integrations/[id]/connections/[connectionId]/test/handler.vinted-browser.ts:21 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | eslint-disable | src/app/api/v2/integrations/products/[id]/listings/handler.ts:213 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call |
| INFO | eslint-disable | src/app/api/v2/integrations/products/[id]/listings/handler.ts:234 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-assignment |
| INFO | non-null-assertion | src/features/filemaker/server/filemaker-mail-service.ts:712 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | eslint-disable | src/features/kangur/ui/KangurLoginPage.test-support.tsx:6 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-return |
| INFO | eslint-disable | src/features/products/components/list/columns/buttons/BaseQuickExportButton.tsx:392 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call |
| INFO | eslint-disable | src/features/products/components/list/columns/buttons/BaseQuickExportButton.tsx:394 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access |
| INFO | explicit-any | src/features/products/components/settings/shipping-groups/ShippingGroupsContext.handlers.ts:47 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | eslint-disable | src/shared/lib/ai-paths/core/starter-workflows/segments/upgrade.ts:269 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call |
| INFO | eslint-disable | src/shared/lib/ai-paths/core/starter-workflows/segments/upgrade.ts:276 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-member-access |
| INFO | eslint-disable | src/shared/lib/ai-paths/core/starter-workflows/segments/upgrade.ts:278 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-member-access |
| INFO | eslint-disable | src/shared/lib/ai-paths/core/starter-workflows/segments/upgrade.ts:331 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call |
| INFO | eslint-disable | src/shared/lib/ai-paths/core/starter-workflows/segments/upgrade.ts:367 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call |
| INFO | eslint-disable | src/shared/lib/ai-paths/core/starter-workflows/segments/upgrade.ts:369 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call |
| INFO | eslint-disable | src/shared/lib/ai-paths/core/starter-workflows/segments/utils.ts:159 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call |
| INFO | eslint-disable | src/shared/lib/ai-paths/core/starter-workflows/segments/utils.ts:161 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access |
| INFO | eslint-disable | src/shared/lib/ai-paths/core/starter-workflows/segments/utils.ts:173 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-member-access |
| INFO | eslint-disable | src/shared/lib/jobs/context/JobsContext.tsx:149 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unnecessary-type-assertion |
| INFO | eslint-disable | src/shared/lib/jobs/context/JobsContext.tsx:158 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unnecessary-type-assertion |

## Notes

- `double-assertion` (error): `as unknown as` bypasses type safety. Use type guards or proper narrowing.
- `ts-ignore-no-reason` / `ts-expect-error-no-reason` (warn): Always explain why a suppression is needed.
- `explicit-any` (info): Track trend over time. Prefer `unknown` or specific types.
- `eslint-disable` (info): Track which rules are most frequently disabled.
- `non-null-assertion` (info): Prefer optional chaining `?.` or explicit null checks.
