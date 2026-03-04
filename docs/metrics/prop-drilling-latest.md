# Prop Drilling Scan

Generated at: 2026-03-04T23:14:10.184Z

## Snapshot

- Scanned source files: 3895
- JSX files scanned: 1388
- Components detected: 2081
- Components forwarding parent props: 55
- Resolved forwarded transitions: 219
- Candidate chains (depth >= 3): 0
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 11

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:ai` | 14 |
| `feature:cms` | 9 |
| `feature:case-resolver` | 8 |
| `feature:products` | 5 |
| `shared-ui` | 4 |
| `feature:prompt-exploder` | 3 |
| `feature:foldertree` | 2 |
| `feature:notesapp` | 2 |
| `shared-lib` | 2 |
| `feature:prompt-engine` | 2 |
| `feature:files` | 1 |
| `feature:integrations` | 1 |
| `feature:tooltip-engine` | 1 |
| `feature:document-editor` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding |
| ---: | --- | --- | ---: | ---: | --- |
| 1 | `DatabaseTemplateSnippetsDialog` | `src/features/ai/ai-paths/components/node-config/database/DatabaseTemplateSnippetsDialog.tsx` | 2 | 3 | no |
| 2 | `LinkField` | `src/features/cms/components/page-builder/settings/fields/LinkField.tsx` | 2 | 3 | no |
| 3 | `AgentRunDetailModal` | `src/features/ai/agentcreator/components/AgentRunDetailModalImpl.tsx` | 2 | 2 | no |
| 4 | `DocsTooltipEnhancer` | `src/features/ai/ai-paths/components/DocsTooltipEnhancer.tsx` | 2 | 2 | no |
| 5 | `TriggerButtonListManager` | `src/features/ai/ai-paths/components/TriggerButtonListManager.tsx` | 2 | 2 | no |
| 6 | `DatabaseAiPromptConnectionStatus` | `src/features/ai/ai-paths/components/node-config/database/DatabaseAiPromptConnectionStatus.tsx` | 2 | 2 | no |
| 7 | `RegexPreviewSection` | `src/features/ai/ai-paths/components/node-config/dialog/regex/RegexPreviewSection.tsx` | 2 | 2 | no |
| 8 | `RunTimeline` | `src/features/ai/ai-paths/components/run-timeline.tsx` | 2 | 2 | no |
| 9 | `OutputImageGrid` | `src/features/ai/image-studio/components/OutputImageGrid.tsx` | 2 | 2 | no |
| 10 | `ExtractPromptParamsModal` | `src/features/ai/image-studio/components/modals/ExtractPromptParamsModalImpl.tsx` | 2 | 2 | no |
| 11 | `ControlPromptModal` | `src/features/ai/image-studio/components/right-sidebar/ControlPromptModalImpl.tsx` | 2 | 2 | no |
| 12 | `AdminImageStudioSettingsPage` | `src/features/ai/image-studio/pages/AdminImageStudioSettingsPage.tsx` | 2 | 2 | no |
| 13 | `CaseResolverTreeNode` | `src/features/case-resolver/components/CaseResolverTreeNode.tsx` | 2 | 2 | no |
| 14 | `NodeFilePanel` | `src/features/case-resolver/components/NodeFilePanel.tsx` | 2 | 2 | no |
| 15 | `CaseAccordionRow` | `src/features/case-resolver/components/list/search/CaseListSearchPanel.tsx` | 2 | 2 | no |
| 16 | `CaseResolverHistoryEntries` | `src/features/case-resolver/components/page/CaseResolverHistoryEntries.tsx` | 2 | 2 | no |
| 17 | `Asset3DPickerModal` | `src/features/cms/components/page-builder/Asset3DPickerModal.tsx` | 2 | 2 | no |
| 18 | `FileUploadEventsPanel` | `src/features/files/components/FileUploadEventsPanel.tsx` | 2 | 2 | no |
| 19 | `DefaultRow` | `src/features/foldertree/v2/components/DefaultRow.tsx` | 2 | 2 | no |
| 20 | `SelectIntegrationModal` | `src/features/integrations/components/listings/SelectIntegrationModalImpl.tsx` | 2 | 2 | no |
| 21 | `CreateNoteModal` | `src/features/notesapp/components/CreateNoteModal.tsx` | 2 | 2 | no |
| 22 | `NoteForm` | `src/features/notesapp/components/NoteForm.tsx` | 2 | 2 | no |
| 23 | `CatalogMultiSelectField` | `src/features/products/components/form/CatalogMultiSelectField.tsx` | 2 | 2 | yes |
| 24 | `ProductFormProvider` | `src/features/products/context/ProductFormContext.tsx` | 2 | 2 | no |
| 25 | `DocsTooltipEnhancer` | `src/features/prompt-exploder/components/DocsTooltipEnhancer.tsx` | 2 | 2 | no |
| 26 | `PromptExploderDocsTooltipSwitch` | `src/features/prompt-exploder/components/PromptExploderDocsTooltipSwitch.tsx` | 2 | 2 | no |
| 27 | `PromptExploderTreeNode` | `src/features/prompt-exploder/components/tree/PromptExploderTreeNode.tsx` | 2 | 2 | no |
| 28 | `DocumentationTooltip` | `src/features/tooltip-engine/DocumentationTooltip.tsx` | 2 | 2 | no |
| 29 | `ExportJobDetailModal` | `src/shared/lib/jobs/components/ExportJobDetailModalImpl.tsx` | 2 | 2 | no |
| 30 | `JobTable` | `src/shared/lib/jobs/components/JobTable.tsx` | 2 | 2 | no |
| 31 | `FilePreviewModal` | `src/shared/ui/file-preview-modal.tsx` | 2 | 2 | no |
| 32 | `FormSection` | `src/shared/ui/form-section.tsx` | 2 | 2 | no |
| 33 | `TableSkeleton` | `src/shared/ui/table-skeleton.tsx` | 2 | 2 | no |
| 34 | `PreviewBlockItem` | `src/features/cms/components/page-builder/PreviewBlock.tsx` | 1 | 15 | no |
| 35 | `SettingsFieldRenderer` | `src/features/cms/components/page-builder/SettingsFieldRenderer.tsx` | 1 | 8 | no |
| 36 | `RowNodeItem` | `src/features/cms/components/page-builder/tree/RowNodeItem.tsx` | 1 | 7 | no |
| 37 | `ColumnNodeItem` | `src/features/cms/components/page-builder/tree/ColumnNodeItem.tsx` | 1 | 6 | no |
| 38 | `ProductImageSlot` | `src/features/products/components/ProductImageSlot.tsx` | 1 | 6 | no |
| 39 | `PanelFilterControl` | `src/shared/ui/templates/panels/PanelFilters.tsx` | 1 | 6 | no |
| 40 | `SectionNodeItem` | `src/features/cms/components/page-builder/tree/SectionNodeItem.tsx` | 1 | 5 | no |

## Ranked Chain Backlog

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |

## Top Chain Details

## Execution Notes

- Start with depth >= 4 chains in `feature:*` scopes.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
