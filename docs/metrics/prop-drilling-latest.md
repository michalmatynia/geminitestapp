# Prop Drilling Scan

Generated at: 2026-03-05T02:00:26.950Z

## Snapshot

- Scanned source files: 3895
- JSX files scanned: 1394
- Components detected: 2110
- Components forwarding parent props (hotspot threshold): 0
- Components forwarding parent props (any): 16
- Resolved forwarded transitions: 16
- Candidate chains (depth >= 2): 16
- Candidate chains (depth >= 3): 0
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 0
- Hotspot forwarding components backlog size: 0

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:cms` | 6 |
| `shared-ui` | 5 |
| `feature:admin` | 1 |
| `feature:ai` | 1 |
| `feature:case-resolver` | 1 |
| `feature:products` | 1 |
| `shared-lib` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `AdminLayout` | `src/features/admin/layout/AdminLayout.tsx` | 1 | 1 | no | no |
| 2 | `CanvasSvgNode` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx` | 1 | 1 | no | no |
| 3 | `CaseTreeRenderer` | `src/features/case-resolver/components/CaseTreeRenderer.tsx` | 1 | 1 | no | no |
| 4 | `AppEmbedsPanel` | `src/features/cms/components/page-builder/AppEmbedsPanel.tsx` | 1 | 1 | no | no |
| 5 | `PageBuilderLayout` | `src/features/cms/components/page-builder/PageBuilderLayout.tsx` | 1 | 1 | no | no |
| 6 | `SectionPicker` | `src/features/cms/components/page-builder/SectionPicker.tsx` | 1 | 1 | no | no |
| 7 | `ThemeSettingsPanel` | `src/features/cms/components/page-builder/ThemeSettingsPanel.tsx` | 1 | 1 | no | no |
| 8 | `ThemeSettingsFieldsSection` | `src/features/cms/components/page-builder/theme/ThemeSettingsFieldsSection.tsx` | 1 | 1 | no | no |
| 9 | `ZoneFooterNode` | `src/features/cms/components/page-builder/tree/ZoneFooterNode.tsx` | 1 | 1 | no | no |
| 10 | `ValidatorDocTooltip` | `src/features/products/components/settings/validator-settings/ValidatorDocsTooltips.tsx` | 1 | 1 | no | no |
| 11 | `AnalyticsStatCard` | `src/shared/lib/analytics/components/AnalyticsStatCard.tsx` | 1 | 1 | no | no |
| 12 | `AppModal` | `src/shared/ui/app-modal.tsx` | 1 | 1 | no | no |
| 13 | `DataTableSortableHeader` | `src/shared/ui/data-table.tsx` | 1 | 1 | no | no |
| 14 | `MetadataItemLabel` | `src/shared/ui/metadata-item.tsx` | 1 | 1 | no | no |
| 15 | `DetailModalSection` | `src/shared/ui/templates/modals/DetailModalSection.tsx` | 1 | 1 | no | no |
| 16 | `PanelAlerts` | `src/shared/ui/templates/panels/PanelAlerts.tsx` | 1 | 1 | no | no |

## Prioritized Transition Backlog (Depth = 2)

| Rank | Score | From | To | Fanout | Features | Prop Mapping | Location |
| ---: | ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | 50 | `SectionPicker` | `Button` | 1 | 2 | `disabled -> disabled` | `src/features/cms/components/page-builder/SectionPicker.tsx:40` |
| 2 | 50 | `ThemeSettingsFieldsSection` | `SettingsFieldsRenderer` | 1 | 2 | `fields -> fields` | `src/features/cms/components/page-builder/theme/ThemeSettingsFieldsSection.tsx:33` |
| 3 | 50 | `ValidatorDocTooltip` | `DocumentationTooltip` | 1 | 2 | `docId -> docId` | `src/features/products/components/settings/validator-settings/ValidatorDocsTooltips.tsx:67` |
| 4 | 50 | `AnalyticsStatCard` | `FormSection` | 1 | 2 | `title -> title` | `src/shared/lib/analytics/components/AnalyticsStatCard.tsx:18` |
| 5 | 44 | `AdminLayout` | `AdminLayoutProvider` | 1 | 1 | `initialMenuCollapsed -> initialMenuCollapsed` | `src/features/admin/layout/AdminLayout.tsx:197` |
| 6 | 44 | `CanvasSvgNode` | `CanvasSvgNodePorts` | 1 | 1 | `node -> node` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx:561` |
| 7 | 44 | `CaseTreeRenderer` | `CaseTreeRenderer` | 1 | 1 | `depth -> depth` | `src/features/case-resolver/components/CaseTreeRenderer.tsx:326` |
| 8 | 44 | `AppEmbedsPanel` | `AppEmbedsPanelContent` | 1 | 1 | `showHeader -> showHeader` | `src/features/cms/components/page-builder/AppEmbedsPanel.tsx:15` |
| 9 | 44 | `PageBuilderLayout` | `PageBuilderProvider` | 1 | 1 | `initialState -> initialState` | `src/features/cms/components/page-builder/PageBuilderLayout.tsx:112` |
| 10 | 44 | `ThemeSettingsPanel` | `ThemeSettingsPanelContent` | 1 | 1 | `showHeader -> showHeader` | `src/features/cms/components/page-builder/ThemeSettingsPanel.tsx:235` |
| 11 | 44 | `ZoneFooterNode` | `TreeSectionPicker` | 1 | 1 | `zone -> zone` | `src/features/cms/components/page-builder/tree/ZoneFooterNode.tsx:73` |
| 12 | 44 | `AppModal` | `AppModalDialogContentShell` | 1 | 1 | `title -> title` | `src/shared/ui/app-modal.tsx:243` |
| 13 | 44 | `DataTableSortableHeader` | `Button` | 1 | 1 | `className -> className` | `src/shared/ui/data-table.tsx:67` |
| 14 | 44 | `MetadataItemLabel` | `Label` | 1 | 1 | `className -> className` | `src/shared/ui/metadata-item.tsx:48` |
| 15 | 44 | `DetailModalSection` | `Card` | 1 | 1 | `className -> className` | `src/shared/ui/templates/modals/DetailModalSection.tsx:27` |
| 16 | 44 | `PanelAlerts` | `Alert` | 1 | 1 | `onDismiss -> onDismiss` | `src/shared/ui/templates/panels/PanelAlerts.tsx:60` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 0 | 0 | _none_ | _none_ | 0 | 0 | _none_ |

## Top Chain Details (Depth >= 3)

- No depth >= 3 chains were detected in this scan. Use the depth = 2 transition backlog for refactor wave planning.

## Top Transition Details (Depth = 2)

### 1. SectionPicker -> Button

- Score: 50
- Root fanout: 1
- Prop mapping: disabled -> disabled
- Location: src/features/cms/components/page-builder/SectionPicker.tsx:40

### 2. ThemeSettingsFieldsSection -> SettingsFieldsRenderer

- Score: 50
- Root fanout: 1
- Prop mapping: fields -> fields
- Location: src/features/cms/components/page-builder/theme/ThemeSettingsFieldsSection.tsx:33

### 3. ValidatorDocTooltip -> DocumentationTooltip

- Score: 50
- Root fanout: 1
- Prop mapping: docId -> docId
- Location: src/features/products/components/settings/validator-settings/ValidatorDocsTooltips.tsx:67

### 4. AnalyticsStatCard -> FormSection

- Score: 50
- Root fanout: 1
- Prop mapping: title -> title
- Location: src/shared/lib/analytics/components/AnalyticsStatCard.tsx:18

### 5. AdminLayout -> AdminLayoutProvider

- Score: 44
- Root fanout: 1
- Prop mapping: initialMenuCollapsed -> initialMenuCollapsed
- Location: src/features/admin/layout/AdminLayout.tsx:197

### 6. CanvasSvgNode -> CanvasSvgNodePorts

- Score: 44
- Root fanout: 1
- Prop mapping: node -> node
- Location: src/features/ai/ai-paths/components/CanvasSvgNode.tsx:561

### 7. CaseTreeRenderer -> CaseTreeRenderer

- Score: 44
- Root fanout: 1
- Prop mapping: depth -> depth
- Location: src/features/case-resolver/components/CaseTreeRenderer.tsx:326

### 8. AppEmbedsPanel -> AppEmbedsPanelContent

- Score: 44
- Root fanout: 1
- Prop mapping: showHeader -> showHeader
- Location: src/features/cms/components/page-builder/AppEmbedsPanel.tsx:15

### 9. PageBuilderLayout -> PageBuilderProvider

- Score: 44
- Root fanout: 1
- Prop mapping: initialState -> initialState
- Location: src/features/cms/components/page-builder/PageBuilderLayout.tsx:112

### 10. ThemeSettingsPanel -> ThemeSettingsPanelContent

- Score: 44
- Root fanout: 1
- Prop mapping: showHeader -> showHeader
- Location: src/features/cms/components/page-builder/ThemeSettingsPanel.tsx:235

### 11. ZoneFooterNode -> TreeSectionPicker

- Score: 44
- Root fanout: 1
- Prop mapping: zone -> zone
- Location: src/features/cms/components/page-builder/tree/ZoneFooterNode.tsx:73

### 12. AppModal -> AppModalDialogContentShell

- Score: 44
- Root fanout: 1
- Prop mapping: title -> title
- Location: src/shared/ui/app-modal.tsx:243

### 13. DataTableSortableHeader -> Button

- Score: 44
- Root fanout: 1
- Prop mapping: className -> className
- Location: src/shared/ui/data-table.tsx:67

### 14. MetadataItemLabel -> Label

- Score: 44
- Root fanout: 1
- Prop mapping: className -> className
- Location: src/shared/ui/metadata-item.tsx:48

### 15. DetailModalSection -> Card

- Score: 44
- Root fanout: 1
- Prop mapping: className -> className
- Location: src/shared/ui/templates/modals/DetailModalSection.tsx:27

## Execution Notes

- Start with the top depth = 2 transition backlog to eliminate pass-through props that block deeper chain detection.
- Continue prioritizing depth >= 4 chains in `feature:*` scopes once they appear.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
