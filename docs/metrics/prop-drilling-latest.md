# Prop Drilling Scan

Generated at: 2026-03-04T23:06:40.626Z

## Snapshot

- Scanned source files: 3895
- JSX files scanned: 1388
- Components detected: 2081
- Components forwarding parent props: 83
- Resolved forwarded transitions: 334
- Candidate chains (depth >= 3): 0
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 14

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:ai` | 19 |
| `shared-ui` | 13 |
| `feature:cms` | 12 |
| `feature:products` | 10 |
| `feature:case-resolver` | 8 |
| `shared-lib` | 5 |
| `feature:prompt-exploder` | 3 |
| `feature:integrations` | 2 |
| `feature:foldertree` | 2 |
| `feature:notesapp` | 2 |
| `feature:prompt-engine` | 2 |
| `feature:viewer3d` | 1 |
| `feature:observability` | 1 |
| `feature:files` | 1 |
| `feature:tooltip-engine` | 1 |
| `feature:document-editor` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding |
| ---: | --- | --- | ---: | ---: | --- |
| 1 | `ProducerMultiSelectField` | `src/features/products/components/form/ProducerMultiSelectField.tsx` | 3 | 3 | yes |
| 2 | `TagMultiSelectField` | `src/features/products/components/form/TagMultiSelectField.tsx` | 3 | 3 | yes |
| 3 | `CatalogModal` | `src/features/products/components/settings/modals/catalog-modal/CatalogModal.tsx` | 3 | 3 | no |
| 4 | `PriceGroupModal` | `src/features/products/components/settings/modals/price-group-modal/PriceGroupModal.tsx` | 3 | 3 | no |
| 5 | `Asset3DEditModal` | `src/features/viewer3d/components/Asset3DEditModalImpl.tsx` | 3 | 3 | no |
| 6 | `BrainRoutingEditModal` | `src/shared/lib/ai-brain/components/BrainRoutingEditModal.tsx` | 3 | 3 | no |
| 7 | `CatalogEditorField` | `src/shared/lib/ai-brain/components/CatalogEditorField.tsx` | 3 | 3 | no |
| 8 | `Drawer` | `src/shared/ui/Drawer.tsx` | 3 | 3 | no |
| 9 | `FolderTreePanel` | `src/shared/ui/FolderTreePanel.tsx` | 3 | 3 | no |
| 10 | `Hint` | `src/shared/ui/Hint.tsx` | 3 | 3 | no |
| 11 | `FileUploadButton` | `src/shared/ui/file-upload.tsx` | 3 | 3 | yes |
| 12 | `FileUploadTrigger` | `src/shared/ui/file-upload.tsx` | 3 | 3 | no |
| 13 | `ImageRetryDropdown` | `src/shared/ui/image-retry-dropdown.tsx` | 3 | 3 | no |
| 14 | `SimpleSettingsList` | `src/shared/ui/templates/SimpleSettingsList.tsx` | 3 | 3 | no |
| 15 | `ToggleRow` | `src/shared/ui/toggle-row.tsx` | 3 | 3 | no |
| 16 | `CanvasHud` | `src/shared/ui/vector-canvas/components/CanvasHud.tsx` | 3 | 3 | no |
| 17 | `SectionBlockNodeItem` | `src/features/cms/components/page-builder/tree/SectionBlockNodeItem.tsx` | 2 | 10 | no |
| 18 | `SlideshowFrameNodeItem` | `src/features/cms/components/page-builder/tree/SlideshowFrameNodeItem.tsx` | 2 | 9 | no |
| 19 | `AssignmentEditor` | `src/shared/lib/ai-brain/components/AssignmentEditor.tsx` | 2 | 7 | no |
| 20 | `LearnerAgentForm` | `src/features/ai/agentcreator/teaching/components/LearnerAgentForm.tsx` | 2 | 6 | no |
| 21 | `RichTextBlock` | `src/features/cms/components/RichTextBlock.tsx` | 2 | 6 | no |
| 22 | `ConnectionEditModal` | `src/features/integrations/components/connections/manager/ConnectionEditModal.tsx` | 2 | 6 | no |
| 23 | `ContextDocumentCard` | `src/features/observability/components/ContextDocumentCard.tsx` | 2 | 5 | no |
| 24 | `GenerationPreviewModal` | `src/features/ai/image-studio/components/modals/GenerationPreviewModalImpl.tsx` | 2 | 4 | no |
| 25 | `CanvasResizeModal` | `src/features/ai/image-studio/components/right-sidebar/CanvasResizeModalImpl.tsx` | 2 | 4 | no |
| 26 | `IssueHintRow` | `src/features/products/components/form/ValidatorIssueHint.tsx` | 2 | 4 | no |
| 27 | `FocusModeTogglePortal` | `src/features/ai/ai-paths/components/FocusModeTogglePortal.tsx` | 2 | 3 | no |
| 28 | `DatabaseTemplateSnippetsDialog` | `src/features/ai/ai-paths/components/node-config/database/DatabaseTemplateSnippetsDialog.tsx` | 2 | 3 | no |
| 29 | `FocusModeTogglePortal` | `src/features/ai/image-studio/components/center-preview/FocusModeTogglePortal.tsx` | 2 | 3 | no |
| 30 | `LinkField` | `src/features/cms/components/page-builder/settings/fields/LinkField.tsx` | 2 | 3 | no |
| 31 | `AgentRunDetailModal` | `src/features/ai/agentcreator/components/AgentRunDetailModalImpl.tsx` | 2 | 2 | no |
| 32 | `DocsTooltipEnhancer` | `src/features/ai/ai-paths/components/DocsTooltipEnhancer.tsx` | 2 | 2 | no |
| 33 | `TriggerButtonListManager` | `src/features/ai/ai-paths/components/TriggerButtonListManager.tsx` | 2 | 2 | no |
| 34 | `DatabaseAiPromptConnectionStatus` | `src/features/ai/ai-paths/components/node-config/database/DatabaseAiPromptConnectionStatus.tsx` | 2 | 2 | no |
| 35 | `RegexPreviewSection` | `src/features/ai/ai-paths/components/node-config/dialog/regex/RegexPreviewSection.tsx` | 2 | 2 | no |
| 36 | `RunTimeline` | `src/features/ai/ai-paths/components/run-timeline.tsx` | 2 | 2 | no |
| 37 | `OutputImageGrid` | `src/features/ai/image-studio/components/OutputImageGrid.tsx` | 2 | 2 | no |
| 38 | `ExtractPromptParamsModal` | `src/features/ai/image-studio/components/modals/ExtractPromptParamsModalImpl.tsx` | 2 | 2 | no |
| 39 | `ControlPromptModal` | `src/features/ai/image-studio/components/right-sidebar/ControlPromptModalImpl.tsx` | 2 | 2 | no |
| 40 | `AdminImageStudioSettingsPage` | `src/features/ai/image-studio/pages/AdminImageStudioSettingsPage.tsx` | 2 | 2 | no |

## Ranked Chain Backlog

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |

## Top Chain Details

## Execution Notes

- Start with depth >= 4 chains in `feature:*` scopes.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
