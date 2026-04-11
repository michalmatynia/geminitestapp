---
owner: 'Platform Team'
last_reviewed: '2026-04-11'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Context Health Check

Generated at: 2026-04-11T16:18:14.475Z

## Summary

- Status: PASSED
- Context files scanned: 263
- Errors: 0
- Warnings: 0
- Info: 9

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| context-missing-split | 0 | 0 | 9 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| INFO | context-missing-split | src/features/cms/components/page-builder/PageBuilderPolicyContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/components/ai-tutor-guided/KangurAiTutorGuided.context.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/components/CalendarInteractive.context.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/components/clock-training/ClockTraining.context.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/components/KangurAiTutorGuidedCallout.context.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/components/MultiplicationGame.context.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/components/music/KangurMusicPianoRoll.context.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.context.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/products/context/ProductImagePreviewContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |

## Notes

- `context-generic-error` (warn): Use structured AppError classes for better observability.
- `context-monolith` (warn): Contexts with >15 fields should be split.
- `context-oversized` (warn): Context files over 500 LOC need refactoring.
- `context-missing-split` (info): Consider useXxxState/useXxxActions pattern for re-render optimization.
