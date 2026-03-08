# Context Health Check

Generated at: 2026-03-08T12:43:40.769Z

## Summary

- Status: WARN
- Context files scanned: 235
- Errors: 0
- Warnings: 28
- Info: 97

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| context-oversized | 0 | 21 | 0 |
| context-monolith | 0 | 7 | 0 |
| context-missing-split | 0 | 0 | 97 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| WARN | context-monolith | src/features/admin/context/AdminMenuSettingsContext.tsx | Context provider value has ~36 fields (threshold: 15). Consider splitting into domain-specific contexts. |
| WARN | context-oversized | src/features/admin/context/AdminMenuSettingsContext.tsx | Context file is 773 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-oversized | src/features/ai/ai-paths/components/JobQueueContext.tsx | Context file is 1069 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-oversized | src/features/ai/ai-paths/context/RuntimeContext.tsx | Context file is 712 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-monolith | src/features/ai/image-studio/components/studio-modals/StudioInlineEditContext.tsx | Context provider value has ~73 fields (threshold: 15). Consider splitting into domain-specific contexts. |
| WARN | context-oversized | src/features/ai/image-studio/components/studio-modals/StudioInlineEditContext.tsx | Context file is 814 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-oversized | src/features/ai/image-studio/context/GenerationContext.tsx | Context file is 857 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-oversized | src/features/ai/image-studio/context/MaskingContext.tsx | Context file is 793 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-oversized | src/features/ai/image-studio/context/VersionGraphContext.tsx | Context file is 865 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-oversized | src/features/case-resolver/context/AdminCaseResolverCasesContext.tsx | Context file is 865 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-oversized | src/features/case-resolver/context/CaseResolverFolderTreeContext.tsx | Context file is 851 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-oversized | src/features/cms/components/page-builder/context/InspectorAiContext.tsx | Context file is 868 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-oversized | src/features/cms/hooks/useTreeActionsContext.tsx | Context file is 619 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-oversized | src/features/data-import-export/context/ImportExportContext.tsx | Context file is 885 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-monolith | src/features/drafter/components/DraftCreatorFormContext.tsx | Context provider value has ~18 fields (threshold: 15). Consider splitting into domain-specific contexts. |
| WARN | context-oversized | src/features/integrations/context/ProductListingsContext.tsx | Context file is 645 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-oversized | src/features/kangur/ui/context/KangurAiTutorContext.tsx | Context file is 1012 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-oversized | src/features/notesapp/context/NoteFormContext.tsx | Context file is 919 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-monolith | src/features/notesapp/hooks/NotesAppContext.tsx | Context provider value has ~26 fields (threshold: 15). Consider splitting into domain-specific contexts. |
| WARN | context-oversized | src/features/notesapp/hooks/NotesAppContext.tsx | Context file is 676 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-monolith | src/features/observability/context/SystemLogsContext.tsx | Context provider value has ~18 fields (threshold: 15). Consider splitting into domain-specific contexts. |
| WARN | context-monolith | src/features/products/context/ProductFormCoreContext.tsx | Context provider value has ~24 fields (threshold: 15). Consider splitting into domain-specific contexts. |
| WARN | context-monolith | src/features/products/context/ProductFormImageContext.tsx | Context provider value has ~23 fields (threshold: 15). Consider splitting into domain-specific contexts. |
| WARN | context-oversized | src/features/prompt-exploder/context/BenchmarkContext.tsx | Context file is 568 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-oversized | src/features/prompt-exploder/context/DocumentContext.tsx | Context file is 746 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-oversized | src/features/prompt-exploder/context/LibraryContext.tsx | Context file is 556 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-oversized | src/features/prompt-exploder/context/SegmentEditorContext.tsx | Context file is 548 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-oversized | src/shared/lib/ai-brain/context/BrainContext.tsx | Context file is 895 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| INFO | context-missing-split | src/features/admin/context/AdminMenuSettingsContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/ai/agentcreator/context/AgentCreatorSettingsContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/ai/agentcreator/context/AgentRunContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/ai/agentcreator/context/AgentRunsContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/ai/ai-paths/components/AiPathConfigContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/ai/ai-paths/components/CanvasBoardUIContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/ai/ai-paths/components/JobQueueContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/ai/ai-paths/components/node-config/database/DatabaseConstructorContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/ai/ai-paths/components/node-config/database/DatabaseQueryInputControlsContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/ai/ai-paths/context/CanvasContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/ai/ai-paths/context/GraphContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/ai/ai-paths/context/PersistenceContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/ai/ai-paths/context/PresetsContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/ai/ai-paths/context/RunHistoryContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/ai/ai-paths/context/RuntimeContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/ai/ai-paths/context/SelectionContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/ai/chatbot/context/ChatbotContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/ai/image-studio/components/analysis/sections/ImageStudioAnalysisRuntimeContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/ai/image-studio/components/center-preview/CenterPreviewContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/ai/image-studio/components/studio-modals/StudioInlineEditContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/ai/image-studio/context/GenerationContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/ai/image-studio/context/ImageStudioSettingsContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/ai/image-studio/context/MaskingContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/ai/image-studio/context/ProjectsContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/ai/image-studio/context/PromptContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/ai/image-studio/context/SettingsContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/ai/image-studio/context/SlotsContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/ai/image-studio/context/UiContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/ai/image-studio/context/VersionGraphContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/ai/insights/context/InsightsContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/auth/context/AuthContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/case-resolver/components/CaseResolverViewContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/case-resolver/context/CaseResolverFolderTreeContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/case-resolver/context/CaseResolverPageContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/case-resolver/relation-search/context/DocumentRelationSearchContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/cms/components/page-builder/context/ComponentSettingsContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/cms/components/page-builder/context/InspectorAiContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/cms/components/page-builder/preview/context/PreviewEditorContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/cms/components/page-builder/theme/ThemeColorsContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/cms/components/page-builder/ThemeSettingsContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/cms/components/page-builder/tree/ComponentTreePanelContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/cms/hooks/useDragStateContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/cms/hooks/usePageBuilderContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/cms/hooks/useTreeActionsContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/data-import-export/context/ImportExportContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/database/context/DatabaseContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/drafter/components/DraftCreatorFormContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/files/contexts/FileManagerContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/files/contexts/FileUploadEventsContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/integrations/context/CategoryMapperContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/integrations/context/CategoryMapperPageContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/integrations/context/IntegrationsContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/integrations/context/ListingSettingsContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/integrations/context/ProductListingsContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/internationalization/context/InternationalizationContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/admin/context/KangurQuestionIllustrationContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/admin/context/KangurTestQuestionEditorContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/admin/context/LessonContentEditorRuntimeContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/admin/context/LessonSvgQuickAddRuntimeContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/context/KangurAiTutorContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/context/KangurAuthContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/context/KangurGameRuntimeContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/context/KangurLearnerProfileRuntimeContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/context/KangurLessonsRuntimeContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/context/KangurParentDashboardRuntimeContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/context/KangurRouteTransitionContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/context/KangurRoutingContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/context/KangurTutorAnchorContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/notesapp/context/NoteFormContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/notesapp/hooks/NotesAppContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/notesapp/hooks/NoteSettingsContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/observability/context/SystemLogsContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/products/components/form/ProductImagesTabContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/products/components/form/ProductMetadataFieldContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/products/components/ProductImageManagerUIContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/products/components/settings/ProductSettingsContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/products/context/ProductFormContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/products/context/ProductFormCoreContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/products/context/ProductFormImageContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/products/context/ProductFormMetadataContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/products/context/ProductFormParameterContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/products/context/ProductFormStudioContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/products/context/ProductSettingsPageContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/products/context/ProductStudioContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/products/context/ProductValidationSettingsContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/prompt-engine/components/context/RuleItemContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/prompt-engine/context/PromptEngineContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/prompt-exploder/context/BenchmarkContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/prompt-exploder/context/BindingsContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/prompt-exploder/context/DocumentContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/prompt-exploder/context/LibraryContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/prompt-exploder/context/SegmentEditorContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/prompt-exploder/context/SettingsContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/viewer3d/context/Viewer3DContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/shared/lib/ai-brain/context/BrainContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/shared/lib/analytics/context/AnalyticsContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/shared/lib/jobs/context/JobsContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |

## Notes

- `context-generic-error` (warn): Use structured AppError classes for better observability.
- `context-monolith` (warn): Contexts with >15 fields should be split.
- `context-oversized` (warn): Context files over 500 LOC need refactoring.
- `context-missing-split` (info): Consider useXxxState/useXxxActions pattern for re-render optimization.
