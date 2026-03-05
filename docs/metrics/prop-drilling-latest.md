# Prop Drilling Scan

Generated at: 2026-03-05T01:54:34.269Z

## Snapshot

- Scanned source files: 3893
- JSX files scanned: 1394
- Components detected: 2112
- Components forwarding parent props (hotspot threshold): 0
- Components forwarding parent props (any): 27
- Resolved forwarded transitions: 27
- Candidate chains (depth >= 2): 27
- Candidate chains (depth >= 3): 0
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 0
- Hotspot forwarding components backlog size: 0

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:cms` | 14 |
| `shared-ui` | 5 |
| `feature:ai` | 2 |
| `feature:case-resolver` | 2 |
| `shared-lib` | 2 |
| `feature:admin` | 1 |
| `feature:products` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `AdminLayout` | `src/features/admin/layout/AdminLayout.tsx` | 1 | 1 | no | no |
| 2 | `CanvasSvgNode` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx` | 1 | 1 | no | no |
| 3 | `CanvasBoard` | `src/features/ai/ai-paths/components/canvas-board.tsx` | 1 | 1 | no | no |
| 4 | `CaseResolverRelationsWorkspace` | `src/features/case-resolver/components/CaseResolverRelationsWorkspace.tsx` | 1 | 1 | no | no |
| 5 | `CaseTreeRenderer` | `src/features/case-resolver/components/CaseTreeRenderer.tsx` | 1 | 1 | no | no |
| 6 | `AccordionItem` | `src/features/cms/components/frontend/sections/FrontendAccordionSection.tsx` | 1 | 1 | no | no |
| 7 | `SectionBlockRenderer` | `src/features/cms/components/frontend/sections/grid/SectionBlockRenderer.tsx` | 1 | 1 | no | no |
| 8 | `AppEmbedsPanel` | `src/features/cms/components/page-builder/AppEmbedsPanel.tsx` | 1 | 1 | no | no |
| 9 | `BlockPickerDropdown` | `src/features/cms/components/page-builder/BlockPicker.tsx` | 1 | 1 | no | no |
| 10 | `ColumnBlockPickerDropdown` | `src/features/cms/components/page-builder/ColumnBlockPicker.tsx` | 1 | 1 | no | no |
| 11 | `PageBuilderLayout` | `src/features/cms/components/page-builder/PageBuilderLayout.tsx` | 1 | 1 | no | no |
| 12 | `SectionPicker` | `src/features/cms/components/page-builder/SectionPicker.tsx` | 1 | 1 | no | no |
| 13 | `ThemeSettingsPanel` | `src/features/cms/components/page-builder/ThemeSettingsPanel.tsx` | 1 | 1 | no | no |
| 14 | `PreviewSlideshowBlock` | `src/features/cms/components/page-builder/preview/PreviewCarouselBlocks.tsx` | 1 | 1 | no | no |
| 15 | `PreviewBlockSectionBlock` | `src/features/cms/components/page-builder/preview/PreviewSectionBlocks.tsx` | 1 | 1 | no | no |
| 16 | `ThemeSettingsFieldsSection` | `src/features/cms/components/page-builder/theme/ThemeSettingsFieldsSection.tsx` | 1 | 1 | no | no |
| 17 | `ZoneFooterNode` | `src/features/cms/components/page-builder/tree/ZoneFooterNode.tsx` | 1 | 1 | no | no |
| 18 | `EditSlugForm` | `src/features/cms/pages/slugs/EditSlugPage.tsx` | 1 | 1 | no | no |
| 19 | `ThemeEditor` | `src/features/cms/pages/themes/EditThemePage.tsx` | 1 | 1 | no | no |
| 20 | `ValidatorDocTooltip` | `src/features/products/components/settings/validator-settings/ValidatorDocsTooltips.tsx` | 1 | 1 | no | no |
| 21 | `AnalyticsEventDetails` | `src/shared/lib/analytics/components/AnalyticsEventDetails.tsx` | 1 | 1 | no | no |
| 22 | `AnalyticsStatCard` | `src/shared/lib/analytics/components/AnalyticsStatCard.tsx` | 1 | 1 | no | no |
| 23 | `AppModal` | `src/shared/ui/app-modal.tsx` | 1 | 1 | no | no |
| 24 | `DataTableSortableHeader` | `src/shared/ui/data-table.tsx` | 1 | 1 | no | no |
| 25 | `MetadataItemLabel` | `src/shared/ui/metadata-item.tsx` | 1 | 1 | no | no |
| 26 | `DetailModalSection` | `src/shared/ui/templates/modals/DetailModalSection.tsx` | 1 | 1 | no | no |
| 27 | `PanelAlerts` | `src/shared/ui/templates/panels/PanelAlerts.tsx` | 1 | 1 | no | no |

## Prioritized Transition Backlog (Depth = 2)

| Rank | Score | From | To | Fanout | Features | Prop Mapping | Location |
| ---: | ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | 52 | `CanvasBoard` | `CanvasConnectorTooltip` | 1 | 1 | `resolveConnectorTooltip -> override` | `src/features/ai/ai-paths/components/canvas-board.tsx:434` |
| 2 | 52 | `CaseResolverRelationsWorkspace` | `CaseResolverRelationsWorkspaceProvider` | 1 | 1 | `focusCaseId -> value` | `src/features/case-resolver/components/CaseResolverRelationsWorkspace.tsx:480` |
| 3 | 52 | `AccordionItem` | `FrontendBlockRenderer` | 1 | 1 | `item -> block` | `src/features/cms/components/frontend/sections/FrontendAccordionSection.tsx:91` |
| 4 | 52 | `SectionBlockRenderer` | `SectionBlockProvider` | 1 | 1 | `block -> settings` | `src/features/cms/components/frontend/sections/grid/SectionBlockRenderer.tsx:228` |
| 5 | 52 | `PreviewSlideshowBlock` | `BlockContextProvider` | 1 | 1 | `stretch -> value` | `src/features/cms/components/page-builder/preview/PreviewCarouselBlocks.tsx:405` |
| 6 | 52 | `PreviewBlockSectionBlock` | `BlockContextProvider` | 1 | 1 | `stretch -> value` | `src/features/cms/components/page-builder/preview/PreviewSectionBlocks.tsx:232` |
| 7 | 52 | `EditSlugForm` | `SlugForm` | 1 | 1 | `initialSlug -> initialData` | `src/features/cms/pages/slugs/EditSlugPage.tsx:121` |
| 8 | 52 | `ThemeEditor` | `ThemeForm` | 1 | 1 | `theme -> initialData` | `src/features/cms/pages/themes/EditThemePage.tsx:64` |
| 9 | 52 | `AnalyticsEventDetails` | `DetailItem` | 1 | 1 | `event -> value` | `src/shared/lib/analytics/components/AnalyticsEventDetails.tsx:28` |
| 10 | 50 | `BlockPickerDropdown` | `GenericPickerDropdown` | 1 | 2 | `groups -> groups` | `src/features/cms/components/page-builder/BlockPicker.tsx:41` |
| 11 | 50 | `ColumnBlockPickerDropdown` | `GenericPickerDropdown` | 1 | 2 | `groups -> groups` | `src/features/cms/components/page-builder/ColumnBlockPicker.tsx:51` |
| 12 | 50 | `SectionPicker` | `Button` | 1 | 2 | `disabled -> disabled` | `src/features/cms/components/page-builder/SectionPicker.tsx:40` |
| 13 | 50 | `ThemeSettingsFieldsSection` | `SettingsFieldsRenderer` | 1 | 2 | `fields -> fields` | `src/features/cms/components/page-builder/theme/ThemeSettingsFieldsSection.tsx:33` |
| 14 | 50 | `ValidatorDocTooltip` | `DocumentationTooltip` | 1 | 2 | `docId -> docId` | `src/features/products/components/settings/validator-settings/ValidatorDocsTooltips.tsx:67` |
| 15 | 50 | `AnalyticsStatCard` | `FormSection` | 1 | 2 | `title -> title` | `src/shared/lib/analytics/components/AnalyticsStatCard.tsx:18` |
| 16 | 44 | `AdminLayout` | `AdminLayoutProvider` | 1 | 1 | `initialMenuCollapsed -> initialMenuCollapsed` | `src/features/admin/layout/AdminLayout.tsx:197` |
| 17 | 44 | `CanvasSvgNode` | `CanvasSvgNodePorts` | 1 | 1 | `node -> node` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx:561` |
| 18 | 44 | `CaseTreeRenderer` | `CaseTreeRenderer` | 1 | 1 | `depth -> depth` | `src/features/case-resolver/components/CaseTreeRenderer.tsx:326` |
| 19 | 44 | `AppEmbedsPanel` | `AppEmbedsPanelContent` | 1 | 1 | `showHeader -> showHeader` | `src/features/cms/components/page-builder/AppEmbedsPanel.tsx:15` |
| 20 | 44 | `PageBuilderLayout` | `PageBuilderProvider` | 1 | 1 | `initialState -> initialState` | `src/features/cms/components/page-builder/PageBuilderLayout.tsx:112` |
| 21 | 44 | `ThemeSettingsPanel` | `ThemeSettingsPanelContent` | 1 | 1 | `showHeader -> showHeader` | `src/features/cms/components/page-builder/ThemeSettingsPanel.tsx:235` |
| 22 | 44 | `ZoneFooterNode` | `TreeSectionPicker` | 1 | 1 | `zone -> zone` | `src/features/cms/components/page-builder/tree/ZoneFooterNode.tsx:73` |
| 23 | 44 | `AppModal` | `AppModalDialogContentShell` | 1 | 1 | `title -> title` | `src/shared/ui/app-modal.tsx:243` |
| 24 | 44 | `DataTableSortableHeader` | `Button` | 1 | 1 | `className -> className` | `src/shared/ui/data-table.tsx:67` |
| 25 | 44 | `MetadataItemLabel` | `Label` | 1 | 1 | `className -> className` | `src/shared/ui/metadata-item.tsx:48` |
| 26 | 44 | `DetailModalSection` | `Card` | 1 | 1 | `className -> className` | `src/shared/ui/templates/modals/DetailModalSection.tsx:27` |
| 27 | 44 | `PanelAlerts` | `Alert` | 1 | 1 | `onDismiss -> onDismiss` | `src/shared/ui/templates/panels/PanelAlerts.tsx:60` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 0 | 0 | _none_ | _none_ | 0 | 0 | _none_ |

## Top Chain Details (Depth >= 3)

- No depth >= 3 chains were detected in this scan. Use the depth = 2 transition backlog for refactor wave planning.

## Top Transition Details (Depth = 2)

### 1. CanvasBoard -> CanvasConnectorTooltip

- Score: 52
- Root fanout: 1
- Prop mapping: resolveConnectorTooltip -> override
- Location: src/features/ai/ai-paths/components/canvas-board.tsx:434

### 2. CaseResolverRelationsWorkspace -> CaseResolverRelationsWorkspaceProvider

- Score: 52
- Root fanout: 1
- Prop mapping: focusCaseId -> value
- Location: src/features/case-resolver/components/CaseResolverRelationsWorkspace.tsx:480

### 3. AccordionItem -> FrontendBlockRenderer

- Score: 52
- Root fanout: 1
- Prop mapping: item -> block
- Location: src/features/cms/components/frontend/sections/FrontendAccordionSection.tsx:91

### 4. SectionBlockRenderer -> SectionBlockProvider

- Score: 52
- Root fanout: 1
- Prop mapping: block -> settings
- Location: src/features/cms/components/frontend/sections/grid/SectionBlockRenderer.tsx:228

### 5. PreviewSlideshowBlock -> BlockContextProvider

- Score: 52
- Root fanout: 1
- Prop mapping: stretch -> value
- Location: src/features/cms/components/page-builder/preview/PreviewCarouselBlocks.tsx:405

### 6. PreviewBlockSectionBlock -> BlockContextProvider

- Score: 52
- Root fanout: 1
- Prop mapping: stretch -> value
- Location: src/features/cms/components/page-builder/preview/PreviewSectionBlocks.tsx:232

### 7. EditSlugForm -> SlugForm

- Score: 52
- Root fanout: 1
- Prop mapping: initialSlug -> initialData
- Location: src/features/cms/pages/slugs/EditSlugPage.tsx:121

### 8. ThemeEditor -> ThemeForm

- Score: 52
- Root fanout: 1
- Prop mapping: theme -> initialData
- Location: src/features/cms/pages/themes/EditThemePage.tsx:64

### 9. AnalyticsEventDetails -> DetailItem

- Score: 52
- Root fanout: 1
- Prop mapping: event -> value
- Location: src/shared/lib/analytics/components/AnalyticsEventDetails.tsx:28

### 10. BlockPickerDropdown -> GenericPickerDropdown

- Score: 50
- Root fanout: 1
- Prop mapping: groups -> groups
- Location: src/features/cms/components/page-builder/BlockPicker.tsx:41

### 11. ColumnBlockPickerDropdown -> GenericPickerDropdown

- Score: 50
- Root fanout: 1
- Prop mapping: groups -> groups
- Location: src/features/cms/components/page-builder/ColumnBlockPicker.tsx:51

### 12. SectionPicker -> Button

- Score: 50
- Root fanout: 1
- Prop mapping: disabled -> disabled
- Location: src/features/cms/components/page-builder/SectionPicker.tsx:40

### 13. ThemeSettingsFieldsSection -> SettingsFieldsRenderer

- Score: 50
- Root fanout: 1
- Prop mapping: fields -> fields
- Location: src/features/cms/components/page-builder/theme/ThemeSettingsFieldsSection.tsx:33

### 14. ValidatorDocTooltip -> DocumentationTooltip

- Score: 50
- Root fanout: 1
- Prop mapping: docId -> docId
- Location: src/features/products/components/settings/validator-settings/ValidatorDocsTooltips.tsx:67

### 15. AnalyticsStatCard -> FormSection

- Score: 50
- Root fanout: 1
- Prop mapping: title -> title
- Location: src/shared/lib/analytics/components/AnalyticsStatCard.tsx:18

## Execution Notes

- Start with the top depth = 2 transition backlog to eliminate pass-through props that block deeper chain detection.
- Continue prioritizing depth >= 4 chains in `feature:*` scopes once they appear.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
