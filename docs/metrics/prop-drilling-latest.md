# Prop Drilling Scan

Generated at: 2026-03-04T23:03:31.907Z

## Snapshot

- Scanned source files: 3895
- JSX files scanned: 1388
- Components detected: 2081
- Components forwarding parent props: 96
- Resolved forwarded transitions: 372
- Candidate chains (depth >= 3): 0
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 14

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:ai` | 27 |
| `feature:cms` | 14 |
| `shared-ui` | 13 |
| `feature:products` | 12 |
| `feature:case-resolver` | 8 |
| `shared-lib` | 5 |
| `feature:prompt-exploder` | 3 |
| `feature:integrations` | 2 |
| `feature:foldertree` | 2 |
| `feature:notesapp` | 2 |
| `feature:prompt-engine` | 2 |
| `feature:admin` | 1 |
| `feature:viewer3d` | 1 |
| `feature:observability` | 1 |
| `feature:files` | 1 |
| `feature:tooltip-engine` | 1 |
| `feature:document-editor` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding |
| ---: | --- | --- | ---: | ---: | --- |
| 1 | `ValidatorListNodeItem` | `src/features/admin/pages/validator-lists/ValidatorListNodeItem.tsx` | 3 | 3 | no |
| 2 | `RenamePathModal` | `src/features/ai/ai-paths/components/modals/RenamePathModal.tsx` | 3 | 3 | no |
| 3 | `FieldInput` | `src/features/ai/ai-paths/components/node-config/dialog/BoundsNormalizerNodeConfigSectionImpl.tsx` | 3 | 3 | no |
| 4 | `FieldInput` | `src/features/ai/ai-paths/components/node-config/dialog/CanvasOutputNodeConfigSectionImpl.tsx` | 3 | 3 | no |
| 5 | `RegexAiProposalSection` | `src/features/ai/ai-paths/components/node-config/dialog/regex/RegexAiProposalSection.tsx` | 3 | 3 | no |
| 6 | `ToggleButtonGroup` | `src/features/ai/image-studio/components/ToggleButtonGroup.tsx` | 3 | 3 | no |
| 7 | `VersionNodeDetailsModal` | `src/features/ai/image-studio/components/VersionNodeDetailsModal.tsx` | 3 | 3 | no |
| 8 | `AnalysisResultSection` | `src/features/ai/image-studio/components/analysis/sections/AnalysisResultSection.tsx` | 3 | 3 | no |
| 9 | `SequenceStepEditor` | `src/features/ai/image-studio/components/sequencing/SequenceStepEditor.tsx` | 3 | 3 | no |
| 10 | `ThemeForm` | `src/features/cms/components/ThemeForm.tsx` | 3 | 3 | no |
| 11 | `CmsPageShell` | `src/features/cms/components/frontend/CmsPageShell.tsx` | 3 | 3 | no |
| 12 | `EditProductModal` | `src/features/products/components/ProductModals.tsx` | 3 | 3 | no |
| 13 | `ProducerMultiSelectField` | `src/features/products/components/form/ProducerMultiSelectField.tsx` | 3 | 3 | yes |
| 14 | `TagMultiSelectField` | `src/features/products/components/form/TagMultiSelectField.tsx` | 3 | 3 | yes |
| 15 | `CatalogModal` | `src/features/products/components/settings/modals/catalog-modal/CatalogModal.tsx` | 3 | 3 | no |
| 16 | `PriceGroupModal` | `src/features/products/components/settings/modals/price-group-modal/PriceGroupModal.tsx` | 3 | 3 | no |
| 17 | `Asset3DEditModal` | `src/features/viewer3d/components/Asset3DEditModalImpl.tsx` | 3 | 3 | no |
| 18 | `BrainRoutingEditModal` | `src/shared/lib/ai-brain/components/BrainRoutingEditModal.tsx` | 3 | 3 | no |
| 19 | `CatalogEditorField` | `src/shared/lib/ai-brain/components/CatalogEditorField.tsx` | 3 | 3 | no |
| 20 | `Drawer` | `src/shared/ui/Drawer.tsx` | 3 | 3 | no |
| 21 | `FolderTreePanel` | `src/shared/ui/FolderTreePanel.tsx` | 3 | 3 | no |
| 22 | `Hint` | `src/shared/ui/Hint.tsx` | 3 | 3 | no |
| 23 | `FileUploadButton` | `src/shared/ui/file-upload.tsx` | 3 | 3 | yes |
| 24 | `FileUploadTrigger` | `src/shared/ui/file-upload.tsx` | 3 | 3 | no |
| 25 | `ImageRetryDropdown` | `src/shared/ui/image-retry-dropdown.tsx` | 3 | 3 | no |
| 26 | `SimpleSettingsList` | `src/shared/ui/templates/SimpleSettingsList.tsx` | 3 | 3 | no |
| 27 | `ToggleRow` | `src/shared/ui/toggle-row.tsx` | 3 | 3 | no |
| 28 | `CanvasHud` | `src/shared/ui/vector-canvas/components/CanvasHud.tsx` | 3 | 3 | no |
| 29 | `SectionBlockNodeItem` | `src/features/cms/components/page-builder/tree/SectionBlockNodeItem.tsx` | 2 | 10 | no |
| 30 | `SlideshowFrameNodeItem` | `src/features/cms/components/page-builder/tree/SlideshowFrameNodeItem.tsx` | 2 | 9 | no |
| 31 | `AssignmentEditor` | `src/shared/lib/ai-brain/components/AssignmentEditor.tsx` | 2 | 7 | no |
| 32 | `LearnerAgentForm` | `src/features/ai/agentcreator/teaching/components/LearnerAgentForm.tsx` | 2 | 6 | no |
| 33 | `RichTextBlock` | `src/features/cms/components/RichTextBlock.tsx` | 2 | 6 | no |
| 34 | `ConnectionEditModal` | `src/features/integrations/components/connections/manager/ConnectionEditModal.tsx` | 2 | 6 | no |
| 35 | `ContextDocumentCard` | `src/features/observability/components/ContextDocumentCard.tsx` | 2 | 5 | no |
| 36 | `GenerationPreviewModal` | `src/features/ai/image-studio/components/modals/GenerationPreviewModalImpl.tsx` | 2 | 4 | no |
| 37 | `CanvasResizeModal` | `src/features/ai/image-studio/components/right-sidebar/CanvasResizeModalImpl.tsx` | 2 | 4 | no |
| 38 | `IssueHintRow` | `src/features/products/components/form/ValidatorIssueHint.tsx` | 2 | 4 | no |
| 39 | `FocusModeTogglePortal` | `src/features/ai/ai-paths/components/FocusModeTogglePortal.tsx` | 2 | 3 | no |
| 40 | `DatabaseTemplateSnippetsDialog` | `src/features/ai/ai-paths/components/node-config/database/DatabaseTemplateSnippetsDialog.tsx` | 2 | 3 | no |

## Ranked Chain Backlog

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |

## Top Chain Details

## Execution Notes

- Start with depth >= 4 chains in `feature:*` scopes.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
