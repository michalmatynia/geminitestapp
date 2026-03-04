# Prop Drilling Scan

Generated at: 2026-03-04T23:20:32.182Z

## Snapshot

- Scanned source files: 3895
- JSX files scanned: 1388
- Components detected: 2081
- Components forwarding parent props: 35
- Resolved forwarded transitions: 177
- Candidate chains (depth >= 3): 0
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 11

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:cms` | 7 |
| `feature:products` | 5 |
| `shared-ui` | 4 |
| `feature:case-resolver` | 4 |
| `feature:prompt-exploder` | 3 |
| `feature:ai` | 3 |
| `feature:notesapp` | 2 |
| `shared-lib` | 2 |
| `feature:prompt-engine` | 2 |
| `feature:tooltip-engine` | 1 |
| `feature:foldertree` | 1 |
| `feature:document-editor` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding |
| ---: | --- | --- | ---: | ---: | --- |
| 1 | `CreateNoteModal` | `src/features/notesapp/components/CreateNoteModal.tsx` | 2 | 2 | no |
| 2 | `NoteForm` | `src/features/notesapp/components/NoteForm.tsx` | 2 | 2 | no |
| 3 | `CatalogMultiSelectField` | `src/features/products/components/form/CatalogMultiSelectField.tsx` | 2 | 2 | yes |
| 4 | `ProductFormProvider` | `src/features/products/context/ProductFormContext.tsx` | 2 | 2 | no |
| 5 | `DocsTooltipEnhancer` | `src/features/prompt-exploder/components/DocsTooltipEnhancer.tsx` | 2 | 2 | no |
| 6 | `PromptExploderDocsTooltipSwitch` | `src/features/prompt-exploder/components/PromptExploderDocsTooltipSwitch.tsx` | 2 | 2 | no |
| 7 | `PromptExploderTreeNode` | `src/features/prompt-exploder/components/tree/PromptExploderTreeNode.tsx` | 2 | 2 | no |
| 8 | `DocumentationTooltip` | `src/features/tooltip-engine/DocumentationTooltip.tsx` | 2 | 2 | no |
| 9 | `ExportJobDetailModal` | `src/shared/lib/jobs/components/ExportJobDetailModalImpl.tsx` | 2 | 2 | no |
| 10 | `JobTable` | `src/shared/lib/jobs/components/JobTable.tsx` | 2 | 2 | no |
| 11 | `FilePreviewModal` | `src/shared/ui/file-preview-modal.tsx` | 2 | 2 | no |
| 12 | `FormSection` | `src/shared/ui/form-section.tsx` | 2 | 2 | no |
| 13 | `TableSkeleton` | `src/shared/ui/table-skeleton.tsx` | 2 | 2 | no |
| 14 | `PreviewBlockItem` | `src/features/cms/components/page-builder/PreviewBlock.tsx` | 1 | 15 | no |
| 15 | `SettingsFieldRenderer` | `src/features/cms/components/page-builder/SettingsFieldRenderer.tsx` | 1 | 8 | no |
| 16 | `RowNodeItem` | `src/features/cms/components/page-builder/tree/RowNodeItem.tsx` | 1 | 7 | no |
| 17 | `ColumnNodeItem` | `src/features/cms/components/page-builder/tree/ColumnNodeItem.tsx` | 1 | 6 | no |
| 18 | `ProductImageSlot` | `src/features/products/components/ProductImageSlot.tsx` | 1 | 6 | no |
| 19 | `PanelFilterControl` | `src/shared/ui/templates/panels/PanelFilters.tsx` | 1 | 6 | no |
| 20 | `SectionNodeItem` | `src/features/cms/components/page-builder/tree/SectionNodeItem.tsx` | 1 | 5 | no |
| 21 | `LearnedRuleItem` | `src/features/prompt-engine/components/LearnedRuleItem.tsx` | 1 | 5 | no |
| 22 | `PreviewSection` | `src/features/cms/components/page-builder/PreviewBlock.tsx` | 1 | 4 | no |
| 23 | `FolderTreeViewportV2` | `src/features/foldertree/v2/components/FolderTreeViewportV2.tsx` | 1 | 4 | no |
| 24 | `InsightCard` | `src/features/ai/insights/components/InsightCard.tsx` | 1 | 3 | no |
| 25 | `PreviewSectionBlocks` | `src/features/cms/components/page-builder/preview/sections/PreviewSectionBlocks.tsx` | 1 | 3 | no |
| 26 | `CategorySingleSelectField` | `src/features/products/components/form/CategorySingleSelectField.tsx` | 1 | 1 | yes |
| 27 | `RuleItem` | `src/features/prompt-engine/components/RuleItem.tsx` | 1 | 1 | yes |
| 28 | `AiPathsSettings` | `src/features/ai/ai-paths/components/AiPathsSettings.tsx` | 0 | 0 | yes |
| 29 | `JobQueuePanel` | `src/features/ai/ai-paths/components/job-queue-panel.tsx` | 0 | 0 | yes |
| 30 | `CaseListNodeItemWrapper` | `src/features/case-resolver/components/CaseListPanel.tsx` | 0 | 0 | yes |
| 31 | `CaseResolverCategoryModal` | `src/features/case-resolver/components/modals/CaseResolverEntityModalVariants.tsx` | 0 | 0 | yes |
| 32 | `CaseResolverIdentifierModal` | `src/features/case-resolver/components/modals/CaseResolverEntityModalVariants.tsx` | 0 | 0 | yes |
| 33 | `CaseResolverTagModal` | `src/features/case-resolver/components/modals/CaseResolverEntityModalVariants.tsx` | 0 | 0 | yes |
| 34 | `RichTextEditor` | `src/features/document-editor/components/RichTextEditor.tsx` | 0 | 0 | yes |
| 35 | `ProductFormModal` | `src/features/products/components/modals/ProductFormModal.tsx` | 0 | 0 | yes |

## Ranked Chain Backlog

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |

## Top Chain Details

## Execution Notes

- Start with depth >= 4 chains in `feature:*` scopes.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
