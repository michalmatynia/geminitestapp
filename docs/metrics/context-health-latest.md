---
owner: 'Platform Team'
last_reviewed: '2026-04-15'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Context Health Check

Generated at: 2026-04-15T09:38:13.696Z

## Summary

- Status: WARN
- Context files scanned: 273
- Errors: 0
- Warnings: 10
- Info: 10

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| context-generic-error | 0 | 9 | 0 |
| context-oversized | 0 | 1 | 0 |
| context-missing-split | 0 | 0 | 10 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| WARN | context-generic-error | src/features/filemaker/components/FilemakerMailSidebarContext.tsx | Context uses generic `throw new Error()`. Consider using a structured AppError for better error tracking. |
| WARN | context-generic-error | src/features/integrations/components/listings/TraderaStatusCheckModalContext.tsx | Context uses generic `throw new Error()`. Consider using a structured AppError for better error tracking. |
| WARN | context-oversized | src/features/integrations/context/ProductListingsContext.tsx | Context file is 769 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-generic-error | src/features/kangur/social/admin/workspace/SocialCaptureBrowserContext.tsx | Context uses generic `throw new Error()`. Consider using a structured AppError for better error tracking. |
| WARN | context-generic-error | src/features/kangur/ui/components/assignment-manager/KangurAssignmentItemContext.tsx | Context uses generic `throw new Error()`. Consider using a structured AppError for better error tracking. |
| WARN | context-generic-error | src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorContext.tsx | Context uses generic `throw new Error()`. Consider using a structured AppError for better error tracking. |
| WARN | context-generic-error | src/features/kangur/ui/components/NumberBalanceRushGameContext.tsx | Context uses generic `throw new Error()`. Consider using a structured AppError for better error tracking. |
| WARN | context-generic-error | src/features/kangur/ui/pages/GamesLibrary.context.tsx | Context uses generic `throw new Error()`. Consider using a structured AppError for better error tracking. |
| WARN | context-generic-error | src/features/kangur/ui/pages/GamesLibraryGameModal.context.tsx | Context uses generic `throw new Error()`. Consider using a structured AppError for better error tracking. |
| WARN | context-generic-error | src/features/products/pages/AdminProductOrdersImportPage.context.tsx | Context uses generic `throw new Error()`. Consider using a structured AppError for better error tracking. |
| INFO | context-missing-split | src/features/cms/components/page-builder/PageBuilderPolicyContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/components/ai-tutor-guided/KangurAiTutorGuided.context.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/components/CalendarInteractive.context.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/components/clock-training/ClockTraining.context.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/components/KangurAiTutorGuidedCallout.context.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/components/MultiplicationGame.context.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/components/music/KangurMusicPianoRoll.context.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.context.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/pages/GamesLibraryGameModal.context.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/products/context/ProductImagePreviewContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |

## Notes

- `context-generic-error` (warn): Use structured AppError classes for better observability.
- `context-monolith` (warn): Contexts with >15 fields should be split.
- `context-oversized` (warn): Context files over 500 LOC need refactoring.
- `context-missing-split` (info): Consider useXxxState/useXxxActions pattern for re-render optimization.
