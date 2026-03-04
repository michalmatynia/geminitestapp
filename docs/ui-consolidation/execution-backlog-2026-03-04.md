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
   - Action: extract one shared modal factory/config wrapper on top of existing modal templates.

2. `Modal` cross-feature asset/detail previews (4 files) - `DONE (phase 1 extraction)`
   - `src/features/viewer3d/components/Asset3DEditModal.tsx`
   - `src/features/viewer3d/components/Asset3DPreviewModal.tsx`
   - `src/features/files/components/file-manager/AssetPreviewModal.tsx`
   - `src/shared/lib/jobs/components/ExportJobDetailModal.tsx`
   - Shared primitives added:
     - `src/shared/ui/templates/modals/DetailModalSection.tsx`
     - `src/shared/utils/formatting.ts` (`formatFileSize`, `formatDateTime`)
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

1. Image Studio modal set (5 files, 1061 LOC) - `IN PROGRESS`
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
   - Action: standardize header/actions/body/footer composition and move repeated modal behaviors to shared utility/hooks.

2. Markdown toolbar duplication (2 files, 450 LOC)
   - `src/features/document-editor/components/MarkdownToolbar.tsx`
   - `src/features/notesapp/components/editor/MarkdownToolbar.tsx`
   - Action: extract shared markdown toolbar core and feature-specific extension points.

3. CMS section similarity clusters - `IN PROGRESS (phase 1 extraction)`
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
       - `src/features/cms/components/page-builder/preview/sections/PreviewSectionMediaButton.tsx`
     - Migrated preview sections to shared scaffold:
       - `PreviewHeroSection`
       - `PreviewImageWithTextSection`
       - `PreviewRichTextSection`
   - Action: create shared section scaffolding (common controls + layout frame), keep unique content blocks isolated.

## Wave 3: high-risk architectural extraction

1. Large `Section`/config components in AI Paths and Image Studio
   - `AiPathAnalysisTriggerSection`
   - `BoundsNormalizerNodeConfigSection`
   - `CanvasOutputNodeConfigSection`
   - Action: split monolithic section logic into reusable field groups and testable hooks before cross-feature sharing.

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
- Current scan (`2026-03-04T20:03:10.212Z`): 9 opportunities, 3 high-priority.
- Delta: `-3` opportunities after Wave 1 + early Wave 2 extraction.
