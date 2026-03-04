# UI Consolidation Scan

Generated at: 2026-03-04T20:03:10.212Z

## Snapshot

- Scanned UI files: 1099
- Duplicate-name clusters: 8
- Prop-signature clusters: 5
- Token-similarity clusters: 3
- Total consolidation opportunities: 9
- High-priority opportunities (score >= 2000): 3

## Domain Coverage

| Domain | Files |
| --- | ---: |
| `feature` | 788 |
| `app` | 158 |
| `shared-ui` | 117 |
| `shared` | 36 |

## Top Families

| Family | Files |
| --- | ---: |
| `Unknown` | 541 |
| `Section` | 138 |
| `Page` | 136 |
| `Panel` | 75 |
| `Modal` | 68 |
| `Tab` | 38 |
| `Settings` | 19 |
| `Header` | 17 |
| `List` | 14 |
| `Card` | 13 |
| `Form` | 12 |
| `Toolbar` | 7 |
| `Picker` | 7 |
| `Dialog` | 4 |
| `Sidebar` | 4 |

## Ranked Backlog

| Rank | Score | Family | Method | Files | Scopes | LOC | Template Coverage | Risk | Recommendation |
| ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| 1 | 7475 | `Modal` | `prop_signature` | 5 | 1 | 1030 | 80% | medium | migrate-to-shared-modal-template |
| 2 | 3232 | `Modal` | `prop_signature` | 4 | 3 | 513 | 100% | medium | migrate-to-shared-modal-template |
| 3 | 2825 | `Section` | `prop_signature` | 3 | 1 | 885 | 0% | high | review-for-extraction |
| 4 | 1154 | `Modal` | `prop_signature` | 2 | 2 | 458 | 50% | medium | migrate-to-shared-modal-template |
| 5 | 986 | `Modal` | `token_similarity` | 3 | 1 | 271 | 100% | low | migrate-to-shared-modal-template |
| 6 | 979 | `Section` | `token_similarity` | 3 | 1 | 283 | 0% | low | review-for-extraction |
| 7 | 910 | `Toolbar` | `duplicate_name` | 2 | 2 | 450 | 0% | high | extract-shared-layout-fragment |
| 8 | 696 | `Modal` | `prop_signature` | 2 | 2 | 276 | 50% | medium | migrate-to-shared-modal-template |
| 9 | 137 | `Section` | `token_similarity` | 2 | 1 | 79 | 0% | low | review-for-extraction |

## Top Opportunity Details

### 1. Modal (prop_signature)

- Score: 7475
- Files: 5
- Scopes: feature:ai
- Total LOC: 1030
- Recommendation: migrate-to-shared-modal-template
- Risk: medium
- Candidate files:
  - `src/features/ai/image-studio/components/right-sidebar/ControlPromptModal.tsx` (344 LOC, feature:ai, template-import)
  - `src/features/ai/image-studio/components/modals/ExtractPromptParamsModal.tsx` (247 LOC, feature:ai, no-template-import)
  - `src/features/ai/image-studio/components/right-sidebar/CanvasResizeModal.tsx` (235 LOC, feature:ai, template-import)
  - `src/features/ai/agentcreator/components/AgentRunDetailModal.tsx` (113 LOC, feature:ai, template-import)
  - `src/features/ai/image-studio/components/modals/GenerationPreviewModal.tsx` (91 LOC, feature:ai, template-import)

### 2. Modal (prop_signature)

- Score: 3232
- Files: 4
- Scopes: feature:files, feature:viewer3d, shared-lib
- Total LOC: 513
- Recommendation: migrate-to-shared-modal-template
- Risk: medium
- Candidate files:
  - `src/features/viewer3d/components/Asset3DEditModal.tsx` (214 LOC, feature:viewer3d, template-import)
  - `src/features/viewer3d/components/Asset3DPreviewModal.tsx` (141 LOC, feature:viewer3d, template-import)
  - `src/features/files/components/file-manager/AssetPreviewModal.tsx` (82 LOC, feature:files, template-import)
  - `src/shared/lib/jobs/components/ExportJobDetailModal.tsx` (76 LOC, shared-lib, template-import)

### 3. Section (prop_signature)

- Score: 2825
- Files: 3
- Scopes: feature:ai
- Total LOC: 885
- Recommendation: review-for-extraction
- Risk: high
- Candidate files:
  - `src/features/ai/image-studio/components/analysis/sections/AiPathAnalysisTriggerSection.tsx` (500 LOC, feature:ai, no-template-import)
  - `src/features/ai/ai-paths/components/node-config/dialog/BoundsNormalizerNodeConfigSection.tsx` (200 LOC, feature:ai, no-template-import)
  - `src/features/ai/ai-paths/components/node-config/dialog/CanvasOutputNodeConfigSection.tsx` (185 LOC, feature:ai, no-template-import)

### 4. Modal (prop_signature)

- Score: 1154
- Files: 2
- Scopes: feature:ai, shared-ui
- Total LOC: 458
- Recommendation: migrate-to-shared-modal-template
- Risk: medium
- Candidate files:
  - `src/shared/ui/FormModal.tsx` (231 LOC, shared-ui, no-template-import)
  - `src/features/ai/chatbot/components/ChatbotContextModal.tsx` (227 LOC, feature:ai, template-import)

### 5. Modal (token_similarity)

- Score: 986
- Files: 3
- Scopes: feature:case-resolver
- Total LOC: 271
- Recommendation: migrate-to-shared-modal-template
- Risk: low
- Avg token similarity: 0.717
- Candidate files:
  - `src/features/case-resolver/components/modals/CaseResolverCategoryModal.tsx` (94 LOC, feature:case-resolver, template-import)
  - `src/features/case-resolver/components/modals/CaseResolverIdentifierModal.tsx` (90 LOC, feature:case-resolver, template-import)
  - `src/features/case-resolver/components/modals/CaseResolverTagModal.tsx` (87 LOC, feature:case-resolver, template-import)

### 6. Section (token_similarity)

- Score: 979
- Files: 3
- Scopes: feature:cms
- Total LOC: 283
- Recommendation: review-for-extraction
- Risk: low
- Avg token similarity: 0.681
- Candidate files:
  - `src/features/cms/components/page-builder/preview/sections/PreviewImageWithTextSection.tsx` (113 LOC, feature:cms, no-template-import)
  - `src/features/cms/components/page-builder/preview/sections/PreviewHeroSection.tsx` (98 LOC, feature:cms, no-template-import)
  - `src/features/cms/components/page-builder/preview/sections/PreviewRichTextSection.tsx` (72 LOC, feature:cms, no-template-import)

### 7. Toolbar (duplicate_name)

- Score: 910
- Files: 2
- Scopes: feature:document-editor, feature:notesapp
- Total LOC: 450
- Recommendation: extract-shared-layout-fragment
- Risk: high
- Candidate files:
  - `src/features/document-editor/components/MarkdownToolbar.tsx` (355 LOC, feature:document-editor, no-template-import)
  - `src/features/notesapp/components/editor/MarkdownToolbar.tsx` (95 LOC, feature:notesapp, no-template-import)

### 8. Modal (prop_signature)

- Score: 696
- Files: 2
- Scopes: feature:cms, feature:integrations
- Total LOC: 276
- Recommendation: migrate-to-shared-modal-template
- Risk: medium
- Candidate files:
  - `src/features/cms/components/page-builder/Asset3DPickerModal.tsx` (206 LOC, feature:cms, template-import)
  - `src/features/integrations/components/listings/SelectIntegrationModal.tsx` (70 LOC, feature:integrations, no-template-import)

### 9. Section (token_similarity)

- Score: 137
- Files: 2
- Scopes: feature:cms
- Total LOC: 79
- Recommendation: review-for-extraction
- Risk: low
- Avg token similarity: 0.704
- Candidate files:
  - `src/features/cms/components/frontend/sections/FrontendAnnouncementBarSection.tsx` (46 LOC, feature:cms, no-template-import)
  - `src/features/cms/components/frontend/sections/FrontendRichTextSection.tsx` (33 LOC, feature:cms, no-template-import)

## Execution Notes

- Start with high score + low risk clusters.
- Prefer migration to existing templates before creating new abstractions.
- Re-run this scan after each migration wave and compare rank deltas.
