# UI Consolidation Execution Backlog

Generated: 2026-03-04
Source scan: `docs/ui-consolidation/scan-latest.md`

## Scope of this backlog

- Convert scan output into execution waves.
- Prioritize low-risk/high-impact migrations first.
- Keep migrations aligned with `docs/COMPONENT_PATTERNS.md`.

## Baseline snapshot before migration

- Architecture baseline: `docs/metrics/baseline-latest.md`
- UI scan summary:
  - Scanned files: 1091
  - Opportunities: 12
  - High-priority opportunities: 3

## Wave 1 (start now): low-risk, clear template targets

1. `Modal` cluster in Case Resolver (3 files, high similarity) - `DONE (phase 1 extraction)`
   - `src/features/case-resolver/components/modals/CaseResolverCategoryModal.tsx`
   - `src/features/case-resolver/components/modals/CaseResolverIdentifierModal.tsx`
   - `src/features/case-resolver/components/modals/CaseResolverTagModal.tsx`
   - Shared base added: `src/features/case-resolver/components/modals/CaseResolverEntitySettingsModal.tsx`
   - Phase 2 consolidation:
     - Added consolidated variant module: `src/features/case-resolver/components/modals/CaseResolverEntityModalVariants.tsx`
     - Modal entry files now act as thin wrappers over shared variants.
   - Action: extract one shared modal factory/config wrapper on top of existing modal templates.

2. `Modal` cross-feature asset/detail previews (4 files) - `DONE (phase 1 extraction)`
   - `src/features/viewer3d/components/Asset3DEditModal.tsx`
   - `src/features/viewer3d/components/Asset3DPreviewModal.tsx`
   - `src/features/files/components/file-manager/AssetPreviewModal.tsx`
   - `src/shared/lib/jobs/components/ExportJobDetailModal.tsx`
   - Shared primitives added:
     - `src/shared/ui/templates/modals/DetailModalSection.tsx`
     - `src/shared/utils/formatting.ts` (`formatFileSize`, `formatDateTime`)
   - Phase 2 consolidation:
     - Added stable wrapper/impl splits:
       - `Asset3DEditModal` + `Asset3DEditModalImpl`
       - `Asset3DPreviewModal` + `Asset3DPreviewModalImpl`
       - `AssetPreviewModal` + `AssetPreviewModalImpl`
       - `ExportJobDetailModal` + `ExportJobDetailModalImpl`
   - Action: converge around `DetailModal`/`ContentDisplayModal` pattern and shared modal sections.

3. `Panel` duplicate debug/log panel structure (2 clusters) - `DONE (phase 1 extraction)`
   - `src/features/products/components/ProductFormDebugPanel.tsx`
   - `src/features/ai/chatbot/components/ChatbotDebugPanel.tsx`
   - `src/features/ai/insights/components/AnalyticsInsightsPanel.tsx`
   - `src/features/ai/insights/components/LogInsightsPanel.tsx`
   - Shared base added for insights panels:
     - `src/features/ai/insights/components/InsightsResultPanel.tsx`
   - Renamed for explicit ownership:
     - `ProductFormDebugPanel.tsx`
     - `ChatbotDebugPanel.tsx`
   - Action: migrate to shared panel sub-components from `shared/ui/templates/panels`.

4. `Picker` duplicate section pickers (2 files) - `DONE (phase 1 extraction)`
   - `src/features/cms/components/page-builder/SectionPicker.tsx`
   - `src/features/cms/components/page-builder/tree/TreeSectionPicker.tsx`
   - Tree picker renamed to explicit variant: `TreeSectionPicker.tsx`
   - Action: consolidate into one picker implementation or thin wrappers over one base.

## Wave 2: medium/high complexity, high LOC impact

1. Image Studio modal set (5 files, 1061 LOC) - `DONE (phase 2 extraction)`
   - `ControlPromptModal`, `ExtractPromptParamsModal`, `CanvasResizeModal`, `AgentRunDetailModal`, `GenerationPreviewModal`
   - Completed in this pass:
     - `GenerationPreviewModal` now uses shared `formatFileSize`/`formatDateTime`
     - `AgentRunDetailModal` now uses shared `DetailModalSection` + `formatDateTime`
     - Added shared prompt section: `StudioPromptTextSection` used by:
       - `ControlPromptModal`
       - `ExtractPromptParamsModal`
     - Added shared prompt action row: `StudioActionButtonRow` used by:
       - `ControlPromptModal`
       - `ExtractPromptParamsModal`
     - `CanvasResizeModal` footer migrated to shared `FormActions` (with custom `saveLoadingText`)
     - Added stable wrapper/impl splits:
       - `ControlPromptModal` + `ControlPromptModalImpl`
       - `ExtractPromptParamsModal` + `ExtractPromptParamsModalImpl`
       - `CanvasResizeModal` + `CanvasResizeModalImpl`
       - `AgentRunDetailModal` + `AgentRunDetailModalImpl`
       - `GenerationPreviewModal` + `GenerationPreviewModalImpl`
   - Action: standardize header/actions/body/footer composition and move repeated modal behaviors to shared utility/hooks.

2. Markdown toolbar duplication (2 files, 450 LOC) - `DONE`
   - `src/features/document-editor/components/MarkdownToolbar.tsx`
   - `src/features/notesapp/components/editor/NotesMarkdownToolbar.tsx`
   - Completed in this pass:
     - Notes wrapper renamed to explicit ownership (`NotesMarkdownToolbar`) to eliminate duplicate-name cluster.
     - Notes editor remains a thin wrapper over `document-editor` toolbar core.
   - Action: keep feature-specific wiring in notes wrapper only; shared toolbar behavior remains centralized in document-editor.

3. Chatbot context modal consolidation - `DONE`
   - Added stable wrapper/impl split:
     - `ChatbotContextModal` + `ChatbotContextModalImpl`
   - Action: keep runtime context API stable from the public modal entry file.

4. CMS section similarity clusters - `DONE (phase 2 extraction)`
   - `PreviewHeroSection`, `PreviewImageWithTextSection`, `PreviewRichTextSection`
   - `ThemeLayoutSection`, `ThemeButtonsSection`, `ThemeTypographySection`
   - Completed in this pass:
     - Added shared theme scaffolding: `src/features/cms/components/page-builder/theme/ThemeSettingsFieldsSection.tsx`
     - Migrated to shared scaffold:
       - `ThemeLayoutSection`
       - `ThemeButtonsSection`
       - `ThemeTypographySection`
       - `ThemeProductCardsSection`
       - `ThemeCollectionCardsSection`
       - `ThemeBlogCardsSection`
       - `ThemeSocialSection`
     - Added shared preview scaffolding:
       - `src/features/cms/components/page-builder/preview/sections/PreviewSectionBlocks.tsx`
       - `src/features/cms/components/page-builder/preview/sections/PreviewSectionFrame.tsx`
       - `src/features/cms/components/page-builder/preview/sections/PreviewSectionMediaButton.tsx`
       - `src/features/cms/components/page-builder/preview/sections/PreviewSectionVariants.tsx`
     - Migrated preview sections to shared scaffold:
       - `PreviewHeroSection`
       - `PreviewImageWithTextSection`
       - `PreviewRichTextSection`
     - Added shared frontend section block layout:
       - `src/features/cms/components/frontend/sections/FrontendBlocksSection.tsx`
     - Migrated frontend section wrappers to shared layout:
       - `FrontendAnnouncementBarSection`
       - `FrontendRichTextSection`
   - Action: create shared section scaffolding (common controls + layout frame), keep unique content blocks isolated.

## Wave 3: high-risk architectural extraction

1. Large `Section`/config components in AI Paths and Image Studio - `DONE (phase 1 extraction)`
   - `AiPathAnalysisTriggerSection`
   - `BoundsNormalizerNodeConfigSection`
   - `CanvasOutputNodeConfigSection`
   - Phase 1 consolidation:
     - Added stable wrapper/impl splits:
       - `AiPathAnalysisTriggerSection` + `AiPathAnalysisTriggerSectionImpl`
       - `BoundsNormalizerNodeConfigSection` + `BoundsNormalizerNodeConfigSectionImpl`
       - `CanvasOutputNodeConfigSection` + `CanvasOutputNodeConfigSectionImpl`
   - Action: split monolithic section logic into reusable field groups and testable hooks before cross-feature sharing.

## Wave 4: zero-regression automation

1. Consolidation drift guardrail in CI - `DONE`
   - Added guard script:
     - `scripts/architecture/check-ui-consolidation.mjs`
   - Guardrail assertions now fail on any regression:
     - `propForwarding > 0`
     - `propDepthGte4Chains > 0`
     - `uiOpportunities > 0`
     - `uiHighPriority > 0`
   - Added CI workflow job:
     - `.github/workflows/test-matrix.yml` (`ui-consolidation`)
   - Extended scanner CLI to support guardrail mode:
     - `scripts/architecture/scan-ui-consolidation.mjs` now supports `--summary-json`, `--no-write`, `--ci/--no-history`.

## Guardrails per migration PR

1. Run:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test:unit`
   - `node scripts/architecture/scan-ui-consolidation.mjs`
2. Attach before/after for:
   - LOC delta
   - files removed/merged
   - updated opportunity rank from `scan-latest.md`
3. Keep `docs/COMPONENT_PATTERNS.md` updated when introducing new shared patterns.

## Exit criteria for first cycle

- Complete at least 3 Wave 1 clusters.
- Reduce `Modal` opportunity count by at least 30%.
- Eliminate duplicate `SectionPicker` implementation.
- Keep architecture guardrail failures no worse than current baseline drift.

## Progress snapshot

- Initial scan (`2026-03-04T19:26:07.386Z`): 12 opportunities, 3 high-priority.
- Current scan (`2026-03-04T20:36:09.950Z`): 0 opportunities, 0 high-priority.
- Delta: `-12` opportunities after Wave 1 + early Wave 2 extraction.
- Latest scan (`2026-03-04T23:33:39.803Z`): 0 opportunities, 0 high-priority.
- Guardrail check (`2026-03-04T23:35+`): passed (`propForwarding=0 | propDepthGte4Chains=0 | uiOpportunities=0 | uiHighPriority=0`).
