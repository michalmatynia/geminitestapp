---
owner: 'Platform Team'
last_reviewed: '2026-03-22'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Context Health Check

Generated at: 2026-03-22T10:14:25.926Z

## Summary

- Status: WARN
- Context files scanned: 241
- Errors: 0
- Warnings: 2
- Info: 5

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| context-oversized | 0 | 2 | 0 |
| context-missing-split | 0 | 0 | 5 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| WARN | context-oversized | src/features/kangur/ui/context/KangurGameRuntimeContext.tsx | Context file is 505 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-oversized | src/features/kangur/ui/context/KangurRouteTransitionContext.tsx | Context file is 508 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| INFO | context-missing-split | src/features/ai/ai-paths/context/AiPathsContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/cms/components/frontend/CmsStorefrontAppearance.context.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/components/KangurAiTutorPanelBody.context.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/components/KangurAiTutorPortal.context.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/context/KangurSubjectFocusContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |

## Notes

- `context-generic-error` (warn): Use structured AppError classes for better observability.
- `context-monolith` (warn): Contexts with >15 fields should be split.
- `context-oversized` (warn): Context files over 500 LOC need refactoring.
- `context-missing-split` (info): Consider useXxxState/useXxxActions pattern for re-render optimization.
