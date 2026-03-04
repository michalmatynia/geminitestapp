# Prop Drilling Scan

Generated at: 2026-03-04T23:10:51.523Z

## Snapshot

- Scanned source files: 3895
- JSX files scanned: 1388
- Components detected: 2081
- Components forwarding parent props: 67
- Resolved forwarded transitions: 286
- Candidate chains (depth >= 3): 0
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 11

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:ai` | 19 |
| `feature:cms` | 12 |
| `feature:case-resolver` | 8 |
| `feature:products` | 6 |
| `shared-ui` | 4 |
| `shared-lib` | 3 |
| `feature:prompt-exploder` | 3 |
| `feature:integrations` | 2 |
| `feature:foldertree` | 2 |
| `feature:notesapp` | 2 |
| `feature:prompt-engine` | 2 |
| `feature:observability` | 1 |
| `feature:files` | 1 |
| `feature:tooltip-engine` | 1 |
| `feature:document-editor` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding |
| ---: | --- | --- | ---: | ---: | --- |
| 1 | `SectionBlockNodeItem` | `src/features/cms/components/page-builder/tree/SectionBlockNodeItem.tsx` | 2 | 10 | no |
| 2 | `SlideshowFrameNodeItem` | `src/features/cms/components/page-builder/tree/SlideshowFrameNodeItem.tsx` | 2 | 9 | no |
| 3 | `AssignmentEditor` | `src/shared/lib/ai-brain/components/AssignmentEditor.tsx` | 2 | 7 | no |
| 4 | `LearnerAgentForm` | `src/features/ai/agentcreator/teaching/components/LearnerAgentForm.tsx` | 2 | 6 | no |
| 5 | `RichTextBlock` | `src/features/cms/components/RichTextBlock.tsx` | 2 | 6 | no |
| 6 | `ConnectionEditModal` | `src/features/integrations/components/connections/manager/ConnectionEditModal.tsx` | 2 | 6 | no |
| 7 | `ContextDocumentCard` | `src/features/observability/components/ContextDocumentCard.tsx` | 2 | 5 | no |
| 8 | `GenerationPreviewModal` | `src/features/ai/image-studio/components/modals/GenerationPreviewModalImpl.tsx` | 2 | 4 | no |
| 9 | `CanvasResizeModal` | `src/features/ai/image-studio/components/right-sidebar/CanvasResizeModalImpl.tsx` | 2 | 4 | no |
| 10 | `IssueHintRow` | `src/features/products/components/form/ValidatorIssueHint.tsx` | 2 | 4 | no |
| 11 | `FocusModeTogglePortal` | `src/features/ai/ai-paths/components/FocusModeTogglePortal.tsx` | 2 | 3 | no |
| 12 | `DatabaseTemplateSnippetsDialog` | `src/features/ai/ai-paths/components/node-config/database/DatabaseTemplateSnippetsDialog.tsx` | 2 | 3 | no |
| 13 | `FocusModeTogglePortal` | `src/features/ai/image-studio/components/center-preview/FocusModeTogglePortal.tsx` | 2 | 3 | no |
| 14 | `LinkField` | `src/features/cms/components/page-builder/settings/fields/LinkField.tsx` | 2 | 3 | no |
| 15 | `AgentRunDetailModal` | `src/features/ai/agentcreator/components/AgentRunDetailModalImpl.tsx` | 2 | 2 | no |
| 16 | `DocsTooltipEnhancer` | `src/features/ai/ai-paths/components/DocsTooltipEnhancer.tsx` | 2 | 2 | no |
| 17 | `TriggerButtonListManager` | `src/features/ai/ai-paths/components/TriggerButtonListManager.tsx` | 2 | 2 | no |
| 18 | `DatabaseAiPromptConnectionStatus` | `src/features/ai/ai-paths/components/node-config/database/DatabaseAiPromptConnectionStatus.tsx` | 2 | 2 | no |
| 19 | `RegexPreviewSection` | `src/features/ai/ai-paths/components/node-config/dialog/regex/RegexPreviewSection.tsx` | 2 | 2 | no |
| 20 | `RunTimeline` | `src/features/ai/ai-paths/components/run-timeline.tsx` | 2 | 2 | no |
| 21 | `OutputImageGrid` | `src/features/ai/image-studio/components/OutputImageGrid.tsx` | 2 | 2 | no |
| 22 | `ExtractPromptParamsModal` | `src/features/ai/image-studio/components/modals/ExtractPromptParamsModalImpl.tsx` | 2 | 2 | no |
| 23 | `ControlPromptModal` | `src/features/ai/image-studio/components/right-sidebar/ControlPromptModalImpl.tsx` | 2 | 2 | no |
| 24 | `AdminImageStudioSettingsPage` | `src/features/ai/image-studio/pages/AdminImageStudioSettingsPage.tsx` | 2 | 2 | no |
| 25 | `CaseResolverTreeNode` | `src/features/case-resolver/components/CaseResolverTreeNode.tsx` | 2 | 2 | no |
| 26 | `NodeFilePanel` | `src/features/case-resolver/components/NodeFilePanel.tsx` | 2 | 2 | no |
| 27 | `CaseAccordionRow` | `src/features/case-resolver/components/list/search/CaseListSearchPanel.tsx` | 2 | 2 | no |
| 28 | `CaseResolverHistoryEntries` | `src/features/case-resolver/components/page/CaseResolverHistoryEntries.tsx` | 2 | 2 | no |
| 29 | `Asset3DPickerModal` | `src/features/cms/components/page-builder/Asset3DPickerModal.tsx` | 2 | 2 | no |
| 30 | `FileUploadEventsPanel` | `src/features/files/components/FileUploadEventsPanel.tsx` | 2 | 2 | no |
| 31 | `DefaultRow` | `src/features/foldertree/v2/components/DefaultRow.tsx` | 2 | 2 | no |
| 32 | `SelectIntegrationModal` | `src/features/integrations/components/listings/SelectIntegrationModalImpl.tsx` | 2 | 2 | no |
| 33 | `CreateNoteModal` | `src/features/notesapp/components/CreateNoteModal.tsx` | 2 | 2 | no |
| 34 | `NoteForm` | `src/features/notesapp/components/NoteForm.tsx` | 2 | 2 | no |
| 35 | `CatalogMultiSelectField` | `src/features/products/components/form/CatalogMultiSelectField.tsx` | 2 | 2 | yes |
| 36 | `ProductFormProvider` | `src/features/products/context/ProductFormContext.tsx` | 2 | 2 | no |
| 37 | `DocsTooltipEnhancer` | `src/features/prompt-exploder/components/DocsTooltipEnhancer.tsx` | 2 | 2 | no |
| 38 | `PromptExploderDocsTooltipSwitch` | `src/features/prompt-exploder/components/PromptExploderDocsTooltipSwitch.tsx` | 2 | 2 | no |
| 39 | `PromptExploderTreeNode` | `src/features/prompt-exploder/components/tree/PromptExploderTreeNode.tsx` | 2 | 2 | no |
| 40 | `DocumentationTooltip` | `src/features/tooltip-engine/DocumentationTooltip.tsx` | 2 | 2 | no |

## Ranked Chain Backlog

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |

## Top Chain Details

## Execution Notes

- Start with depth >= 4 chains in `feature:*` scopes.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
