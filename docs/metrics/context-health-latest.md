---
owner: 'Platform Team'
last_reviewed: '2026-03-10'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Context Health Check

Generated at: 2026-03-10T08:15:32.198Z

## Summary

- Status: WARN
- Context files scanned: 241
- Errors: 0
- Warnings: 4
- Info: 3

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| context-oversized | 0 | 3 | 0 |
| context-generic-error | 0 | 1 | 0 |
| context-missing-split | 0 | 0 | 3 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| WARN | context-oversized | src/features/ai/ai-paths/context/GraphContext.tsx | Context file is 502 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-oversized | src/features/kangur/ui/context/KangurGameRuntimeContext.tsx | Context file is 564 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-oversized | src/features/products/context/ProductStudioContext.tsx | Context file is 531 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-generic-error | src/shared/lib/ai-context-registry/page-context.tsx | Context uses generic `throw new Error()`. Consider using a structured AppError for better error tracking. |
| INFO | context-missing-split | src/features/kangur/ui/context/KangurLessonNavigationContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/context/KangurLoginModalContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/shared/lib/ai-context-registry/page-context.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |

## Notes

- `context-generic-error` (warn): Use structured AppError classes for better observability.
- `context-monolith` (warn): Contexts with >15 fields should be split.
- `context-oversized` (warn): Context files over 500 LOC need refactoring.
- `context-missing-split` (info): Consider useXxxState/useXxxActions pattern for re-render optimization.
