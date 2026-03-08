# Import Boundaries Check

Generated at: 2026-03-08T10:11:20.814Z

## Summary

- Status: FAILED
- Files scanned: 4303
- Features tracked: 15
- Circular dependencies: 12
- Errors: 12
- Warnings: 139
- Info: 0

## Circular Dependencies

- products -> files -> products
- products -> integrations -> products
- integrations -> data-import-export -> integrations
- products -> integrations -> data-import-export -> products
- integrations -> product-sync -> integrations
- products -> ai -> jobs -> products
- ai -> jobs -> ai
- ai -> jobs -> case-resolver -> ai
- case-resolver -> case-resolver-capture -> case-resolver
- admin -> products -> ai -> jobs -> case-resolver -> admin
- products -> ai -> products
- products -> drafter -> products

## Feature Dependency Graph

| Feature | Dependencies | Count |
| --- | --- | ---: |
| ai | auth, files, foldertree, jobs, notesapp, playwright, products, prompt-engine, prompt-exploder, tooltip-engine, viewer3d | 11 |
| case-resolver | admin, ai, auth, case-resolver-capture, document-editor, filemaker, foldertree, prompt-exploder | 8 |
| products | ai, drafter, files, foldertree, integrations, internationalization, product-sync, tooltip-engine | 8 |
| cms | admin, app-embeds, files, foldertree, gsap, products, viewer3d | 7 |
| admin | auth, foldertree, notesapp, products, prompt-engine | 5 |
| jobs | ai, case-resolver, integrations, product-sync, products | 5 |
| kangur | auth, cms, document-editor, foldertree, tooltip-engine | 5 |
| integrations | data-import-export, playwright, product-sync, products | 4 |
| case-resolver-capture | case-resolver, filemaker | 2 |
| data-import-export | integrations, products | 2 |
| files | products, viewer3d | 2 |
| notesapp | document-editor, foldertree | 2 |
| prompt-exploder | foldertree, tooltip-engine | 2 |
| drafter | products | 1 |
| product-sync | integrations | 1 |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| circular-feature-dep | 12 | 0 | 0 |
| deep-relative-import | 0 | 139 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| ERROR | circular-feature-dep | - | Circular dependency between features: products -> files -> products |
| ERROR | circular-feature-dep | - | Circular dependency between features: products -> integrations -> products |
| ERROR | circular-feature-dep | - | Circular dependency between features: integrations -> data-import-export -> integrations |
| ERROR | circular-feature-dep | - | Circular dependency between features: products -> integrations -> data-import-export -> products |
| ERROR | circular-feature-dep | - | Circular dependency between features: integrations -> product-sync -> integrations |
| ERROR | circular-feature-dep | - | Circular dependency between features: products -> ai -> jobs -> products |
| ERROR | circular-feature-dep | - | Circular dependency between features: ai -> jobs -> ai |
| ERROR | circular-feature-dep | - | Circular dependency between features: ai -> jobs -> case-resolver -> ai |
| ERROR | circular-feature-dep | - | Circular dependency between features: case-resolver -> case-resolver-capture -> case-resolver |
| ERROR | circular-feature-dep | - | Circular dependency between features: admin -> products -> ai -> jobs -> case-resolver -> admin |
| ERROR | circular-feature-dep | - | Circular dependency between features: products -> ai -> products |
| ERROR | circular-feature-dep | - | Circular dependency between features: products -> drafter -> products |
| WARN | deep-relative-import | src/app/api/ai-paths/playwright/[runId]/artifacts/[file]/handler.ts:14 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/ai/ai-paths/components/ai-paths-settings/hooks/persistence/usePathPersistence.ts:15 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/ai/ai-paths/components/ai-paths-settings/panels/AiPathsRuntimeLog.tsx:4 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/ai/ai-paths/components/ai-paths-settings/runtime/server-execution/useServerRunStream.ts:15 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/ai/ai-paths/components/ai-paths-settings/sections/AiPathsCanvasView.tsx:23 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/ai/ai-paths/components/node-config/dialog/NodeHistoryTab.tsx:11 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/ai/image-studio/components/analysis/sections/AiPathAnalysisTriggerSectionImpl.tsx:9 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/ai/image-studio/components/center-preview/sections/CenterPreviewCanvas.tsx:11 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/ai/image-studio/components/center-preview/sections/CenterPreviewCanvas.tsx:12 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/ai/image-studio/components/center-preview/sections/CenterPreviewCanvas.tsx:13 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/ai/image-studio/components/center-preview/sections/CenterPreviewCanvas.tsx:14 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/ai/image-studio/components/center-preview/sections/CenterPreviewCanvasContext.tsx:7 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/ai/image-studio/components/center-preview/sections/CenterPreviewHeader.tsx:7 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/ai/image-studio/components/generation-toolbar/handlers/useAnalysisHandlers.ts:5 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/ai/image-studio/components/generation-toolbar/handlers/useCenterAndScaleHandlers.ts:13 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/case-resolver/context/admin-cases/actions/case-availability.ts:3 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/case-resolver/context/admin-cases/actions/case-crud.ts:4 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/case-resolver/context/admin-cases/actions/case-crud.ts:10 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/case-resolver/context/admin-cases/actions/case-ordering.ts:4 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/frontend/blocks/TextAtomBlock.tsx:9 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/frontend/sections/FrontendAccordionSection.tsx:12 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/frontend/sections/FrontendBlockRenderer.tsx:42 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/frontend/sections/FrontendBlockSection.tsx:11 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/frontend/sections/FrontendBlocksSection.tsx:3 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/frontend/sections/FrontendButtonElementSection.tsx:8 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/frontend/sections/FrontendCarousel.tsx:10 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/frontend/sections/FrontendGridSection.tsx:17 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/frontend/sections/FrontendHeroBlock.tsx:7 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/frontend/sections/FrontendHeroSection.tsx:12 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/frontend/sections/FrontendImageElementSection.tsx:8 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/frontend/sections/FrontendImageWithTextBlock.tsx:10 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/frontend/sections/FrontendImageWithTextSection.tsx:12 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/frontend/sections/FrontendModel3DElementSection.tsx:8 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/frontend/sections/FrontendNewsletterSection.tsx:8 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/frontend/sections/FrontendSlideshowSection.tsx:11 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/frontend/sections/FrontendTestimonialsSection.tsx:10 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/frontend/sections/FrontendTextAtomSection.tsx:4 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/frontend/sections/SectionBlockContext.tsx:5 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/animation/advanced/AdvancedMotionPathSection.tsx:10 | Deep relative import (4 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/animation/advanced/AdvancedSvgEffectsSection.tsx:10 | Deep relative import (4 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/animation/AnimationConfigContext.tsx:8 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/context/ComponentSettingsContext.tsx:14 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/context/InspectorAiContext.tsx:21 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/hooks/useGroupedTemplates.ts:8 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/preview/context/BlockContext.tsx:5 | Deep relative import (4 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/preview/context/PreviewEditorContext.tsx:5 | Deep relative import (4 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/preview/PreviewSectionBlocks.tsx:21 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/registry/block-definitions-content.ts:14 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/registry/block-definitions-layout.ts:12 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/registry/block-definitions-media.ts:12 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/registry/block-definitions.ts:5 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/registry/section-definitions.ts:14 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/registry/shared-field-helpers.ts:1 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/settings/BlockSettingsTab.tsx:25 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/settings/ColumnSettingsTab.tsx:11 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/settings/field-group-helpers.tsx:9 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/settings/fields/composite/BackgroundField.tsx:9 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/settings/fields/LinkField.tsx:7 | Deep relative import (4 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/settings/InspectorHeader.tsx:8 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/settings/InspectorHeader.tsx:9 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/settings/InspectorOptions.tsx:5 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/settings/page-settings/PageSeoTabContent.tsx:6 | Deep relative import (4 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/settings/page-settings/PageSettingsTabContent.tsx:5 | Deep relative import (4 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/settings/page-settings/PageSettingsTabContent.tsx:6 | Deep relative import (4 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/settings/page-settings/PageSettingsTabContent.tsx:7 | Deep relative import (4 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/settings/page-settings/PageSettingsTabContent.tsx:9 | Deep relative import (4 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/settings/page-settings/PageSettingsTabContent.tsx:10 | Deep relative import (4 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/settings/page-settings/usePageAiAssistant.ts:13 | Deep relative import (4 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/settings/PageSettingsTab.tsx:8 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/settings/PageSettingsTab.tsx:9 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/settings/PageSettingsTab.tsx:12 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/settings/SectionSettingsTab.tsx:25 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/tree/BlockNodeItem.tsx:20 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/tree/BlockNodeItem.tsx:21 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/tree/BlockNodeItem.tsx:22 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/tree/ColumnNodeItem.tsx:16 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/tree/ColumnNodeItem.tsx:17 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/tree/ColumnNodeItem.tsx:18 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/tree/ColumnNodeItem.tsx:29 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/tree/ComponentTreePanelContext.tsx:8 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/tree/RowNodeItem.tsx:22 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/tree/RowNodeItem.tsx:23 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/tree/RowNodeItem.tsx:24 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/tree/RowNodeItem.tsx:28 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/tree/SectionBlockNodeItem.tsx:17 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/tree/SectionBlockNodeItem.tsx:18 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/tree/SectionBlockNodeItem.tsx:19 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/tree/SectionBlockNodeItem.tsx:28 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/tree/SectionDropTarget.tsx:9 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/tree/SectionDropTarget.tsx:10 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/tree/SectionDropTarget.tsx:11 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/tree/SectionNodeItem.tsx:23 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/tree/SectionNodeItem.tsx:24 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/tree/SectionNodeItem.tsx:25 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/tree/SlideshowFrameNodeItem.tsx:16 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/tree/SlideshowFrameNodeItem.tsx:17 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/tree/SlideshowFrameNodeItem.tsx:18 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/tree/SlideshowFrameNodeItem.tsx:32 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/tree/tree-constants.ts:31 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/tree/tree-types.ts:1 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/tree/TreeSectionPicker.tsx:8 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/tree/TreeSectionPicker.tsx:10 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/tree/ZoneFooterNode.tsx:9 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/utils/cms-master-tree-adapter.ts:6 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/utils/cms-master-tree.ts:4 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/components/page-builder/utils/cms-tree-external-drop.ts:1 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/hooks/page-builder/page-builder-reducer/block-actions.ts:7 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/hooks/page-builder/page-builder-reducer/complex-actions.ts:14 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/hooks/page-builder/page-builder-reducer/grid-actions.ts:2 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/hooks/page-builder/page-builder-reducer/page-actions.ts:2 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/hooks/page-builder/page-builder-reducer/section-actions.ts:10 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/hooks/page-builder/page-builder-reducer/section-actions.ts:14 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/products/components/form/studio/StudioActionsBar.tsx:6 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/products/components/form/studio/StudioAuditHistory.tsx:5 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/products/components/form/studio/StudioPreviewCanvas.tsx:11 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/products/components/form/studio/StudioProjectField.tsx:5 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/products/components/form/studio/StudioSourceImageSelector.tsx:7 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/products/components/form/studio/StudioVariantsGrid.tsx:8 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/ai-paths/core/runtime/handlers/integration-database-handler.ts:22 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/ai-paths/core/runtime/handlers/integration-database-template-context.ts:14 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/ai-paths/core/runtime/handlers/integration-schema-handler.ts:12 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/ai-paths/core/runtime/handlers/transform/bounds-normalizer-handler.ts:10 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/ai-paths/core/runtime/handlers/transform/canvas-output-handler.ts:7 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/ai-paths/core/runtime/handlers/transform/context.ts:6 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/ai-paths/core/runtime/handlers/transform/iterator.ts:6 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/ai-paths/core/runtime/handlers/transform/mapper.ts:6 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/ai-paths/core/runtime/handlers/transform/mutator.ts:7 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/ai-paths/core/runtime/handlers/transform/parser.ts:6 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/ai-paths/core/runtime/handlers/transform/regex.ts:7 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/ai-paths/core/runtime/handlers/transform/validator.ts:17 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/ai-paths/core/runtime/node-code-object-v3-legacy-bridge.ts:1 | Deep relative import (6 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/ai-paths/portable-engine/node-code-objects-v2-contracts.ts:1 | Deep relative import (5 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/documentation/catalogs/ai-paths.ts:6 | Deep relative import (5 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/documentation/catalogs/kangur.ts:6 | Deep relative import (5 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/documentation/catalogs/prompt-exploder.ts:6 | Deep relative import (5 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/documentation/catalogs/validator-semantic-grammar.ts:1 | Deep relative import (5 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/documentation/catalogs/validator-semantic-grammar.ts:2 | Deep relative import (5 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/documentation/catalogs/validator-semantic-grammar.ts:3 | Deep relative import (5 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/documentation/catalogs/validator-semantic-grammar.ts:4 | Deep relative import (5 levels up). Consider using path aliases. |

## Notes

- `cross-feature-internal-import` (error): Features should only import from other features via barrel exports (index/public/server/types).
- `deep-relative-import` (warn): 3+ levels of `../` suggest a path alias should be used instead.
- `circular-feature-dep` (error): Circular dependencies between feature domains hinder independent development and testing.
- `prisma-outside-server` (error): Direct Prisma client usage should be restricted to server directories and API routes.
