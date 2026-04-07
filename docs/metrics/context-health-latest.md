---
owner: 'Platform Team'
last_reviewed: '2026-04-07'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Context Health Check

Generated at: 2026-04-07T10:12:55.786Z

## Summary

- Status: WARN
- Context files scanned: 263
- Errors: 0
- Warnings: 15
- Info: 9

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| context-generic-error | 0 | 9 | 0 |
| context-oversized | 0 | 5 | 0 |
| context-monolith | 0 | 1 | 0 |
| context-missing-split | 0 | 0 | 9 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| WARN | context-oversized | src/features/integrations/context/CategoryMapperContext.tsx | Context file is 540 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-monolith | src/features/kangur/social/admin/workspace/SocialPostContext.tsx | Context provider value has ~17 fields (threshold: 15). Consider splitting into domain-specific contexts. |
| WARN | context-generic-error | src/features/kangur/ui/components/ai-tutor-guided/KangurAiTutorGuided.context.tsx | Context uses generic `throw new Error()`. Consider using a structured AppError for better error tracking. |
| WARN | context-generic-error | src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.context.tsx | Context uses generic `throw new Error()`. Consider using a structured AppError for better error tracking. |
| WARN | context-generic-error | src/features/kangur/ui/components/CalendarInteractive.context.tsx | Context uses generic `throw new Error()`. Consider using a structured AppError for better error tracking. |
| WARN | context-generic-error | src/features/kangur/ui/components/KangurAiTutorGuidedCallout.context.tsx | Context uses generic `throw new Error()`. Consider using a structured AppError for better error tracking. |
| WARN | context-generic-error | src/features/kangur/ui/components/music/KangurMusicPianoRoll.context.tsx | Context uses generic `throw new Error()`. Consider using a structured AppError for better error tracking. |
| WARN | context-generic-error | src/features/kangur/ui/components/parent-dashboard/MonitoringWidget.context.tsx | Context uses generic `throw new Error()`. Consider using a structured AppError for better error tracking. |
| WARN | context-generic-error | src/features/kangur/ui/components/parent-dashboard/ProgressWidget.context.tsx | Context uses generic `throw new Error()`. Consider using a structured AppError for better error tracking. |
| WARN | context-generic-error | src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.context.tsx | Context uses generic `throw new Error()`. Consider using a structured AppError for better error tracking. |
| WARN | context-oversized | src/features/kangur/ui/context/KangurAuthContext.tsx | Context file is 617 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-oversized | src/features/kangur/ui/context/KangurLearnerProfileRuntimeContext.tsx | Context file is 585 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-oversized | src/features/kangur/ui/context/KangurLessonsRuntimeContext.tsx | Context file is 810 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-generic-error | src/features/products/components/settings/shipping-groups/ShippingGroupsContext.tsx | Context uses generic `throw new Error()`. Consider using a structured AppError for better error tracking. |
| WARN | context-oversized | src/features/products/components/settings/shipping-groups/ShippingGroupsContext.tsx | Context file is 916 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| INFO | context-missing-split | src/features/cms/components/page-builder/PageBuilderPolicyContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/social/admin/workspace/SocialPostContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/components/ai-tutor-guided/KangurAiTutorGuided.context.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/components/CalendarInteractive.context.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/components/clock-training/ClockTraining.context.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/components/KangurAiTutorGuidedCallout.context.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/components/MultiplicationGame.context.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/components/music/KangurMusicPianoRoll.context.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.context.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |

## Notes

- `context-generic-error` (warn): Use structured AppError classes for better observability.
- `context-monolith` (warn): Contexts with >15 fields should be split.
- `context-oversized` (warn): Context files over 500 LOC need refactoring.
- `context-missing-split` (info): Consider useXxxState/useXxxActions pattern for re-render optimization.
