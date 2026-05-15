---
owner: 'Platform Team'
last_reviewed: '2026-05-15'
status: 'generated'
doc_type: 'generated'
scope: 'cross-feature'
canonical: true
---
# UI Consolidation Scan

Generated at: 2026-05-15T00:11:50.071Z

## Snapshot

- Scanned UI files: 3216
- Duplicate-name clusters: 2
- Prop-signature clusters: 5
- Token-similarity clusters: 1
- Thin re-export wrappers ignored: 36
- Total consolidation opportunities: 7
- High-priority opportunities (score >= 2000): 0

## Domain Coverage

| Domain | Files |
| --- | ---: |
| `feature` | 2593 |
| `app` | 372 |
| `shared-ui` | 191 |
| `shared` | 60 |

## Top Families

| Family | Files |
| --- | ---: |
| `Unknown` | 2252 |
| `Section` | 224 |
| `Page` | 198 |
| `Panel` | 161 |
| `Modal` | 93 |
| `Card` | 56 |
| `Tab` | 45 |
| `Settings` | 36 |
| `Header` | 36 |
| `List` | 31 |
| `Form` | 27 |
| `Toolbar` | 13 |
| `Dialog` | 12 |
| `Table` | 12 |
| `Picker` | 10 |

## Ranked Backlog

| Rank | Score | Family | Method | Files | Scopes | LOC | Template Coverage | Risk | Recommendation |
| ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| 1 | 1532 | `Section` | `prop_signature` | 3 | 1 | 480 | 0% | medium | review-for-extraction |
| 2 | 1529 | `Modal` | `prop_signature` | 2 | 2 | 520 | 0% | medium | migrate-to-shared-modal-template |
| 3 | 1023 | `Modal` | `prop_signature` | 2 | 1 | 435 | 0% | medium | migrate-to-shared-modal-template |
| 4 | 880 | `Panel` | `prop_signature` | 3 | 1 | 194 | 0% | low | migrate-to-panel-template |
| 5 | 264 | `Settings` | `token_similarity` | 2 | 1 | 145 | 0% | low | review-for-extraction |
| 6 | 261 | `Picker` | `duplicate_name` | 2 | 2 | 132 | 50% | low | migrate-to-generic-picker |
| 7 | 123 | `Section` | `duplicate_name` | 2 | 1 | 84 | 0% | low | review-for-extraction |

## Top Opportunity Details

### 1. Section (prop_signature)

- Score: 1532
- Files: 3
- Scopes: feature:ai
- Total LOC: 480
- Recommendation: review-for-extraction
- Risk: medium
- Candidate files:
  - `src/features/ai/ai-paths/components/node-config/dialog/HttpNodeConfigSection.tsx` (187 LOC, feature:ai, no-template-import)
  - `src/features/ai/ai-paths/components/node-config/dialog/AudioOscillatorNodeConfigSection.tsx` (164 LOC, feature:ai, no-template-import)
  - `src/features/ai/ai-paths/components/node-config/dialog/RouterNodeConfigSection.tsx` (129 LOC, feature:ai, no-template-import)

### 2. Modal (prop_signature)

- Score: 1529
- Files: 2
- Scopes: feature:filemaker, feature:products
- Total LOC: 520
- Recommendation: migrate-to-shared-modal-template
- Risk: medium
- Candidate files:
  - `src/features/products/components/list/advanced-filter/AdvancedFilterModal.tsx` (270 LOC, feature:products, no-template-import)
  - `src/features/filemaker/components/page/FilemakerOrganizationAdvancedFilterModal.tsx` (250 LOC, feature:filemaker, no-template-import)

### 3. Modal (prop_signature)

- Score: 1023
- Files: 2
- Scopes: feature:products
- Total LOC: 435
- Recommendation: migrate-to-shared-modal-template
- Risk: medium
- Candidate files:
  - `src/features/products/pages/ecommerce-pages-cms/UniverseCardCreateModal.tsx` (244 LOC, feature:products, no-template-import)
  - `src/features/products/pages/ecommerce-pages-cms/EditorialArticleCreateModal.tsx` (191 LOC, feature:products, no-template-import)

### 4. Panel (prop_signature)

- Score: 880
- Files: 3
- Scopes: feature:filemaker
- Total LOC: 194
- Recommendation: migrate-to-panel-template
- Risk: low
- Candidate files:
  - `src/features/filemaker/components/email-builder/EmailBlockSettingsPanel.tsx` (114 LOC, feature:filemaker, no-template-import)
  - `src/features/filemaker/components/cv-builder/CvLayerPanel.tsx` (40 LOC, feature:filemaker, no-template-import)
  - `src/features/filemaker/components/email-builder/EmailLayerPanel.tsx` (40 LOC, feature:filemaker, no-template-import)

### 5. Settings (token_similarity)

- Score: 264
- Files: 2
- Scopes: feature:ai
- Total LOC: 145
- Recommendation: review-for-extraction
- Risk: low
- Avg token similarity: 0.743
- Candidate files:
  - `src/features/ai/ai-paths/components/ai-paths-settings/sections/GlobalKernelSettings.tsx` (78 LOC, feature:ai, no-template-import)
  - `src/features/ai/ai-paths/components/ai-paths-settings/sections/PathKernelSettings.tsx` (67 LOC, feature:ai, no-template-import)

### 6. Picker (duplicate_name)

- Score: 261
- Files: 2
- Scopes: feature:cms, feature:filemaker
- Total LOC: 132
- Recommendation: migrate-to-generic-picker
- Risk: low
- Candidate files:
  - `src/features/filemaker/components/shared/BlockPicker.tsx` (70 LOC, feature:filemaker, no-template-import)
  - `src/features/cms/components/page-builder/BlockPicker.tsx` (62 LOC, feature:cms, template-import)

### 7. Section (duplicate_name)

- Score: 123
- Files: 2
- Scopes: feature:integrations
- Total LOC: 84
- Recommendation: review-for-extraction
- Risk: low
- Candidate files:
  - `src/features/integrations/components/selector-registry-probe-sessions/ProbeClusterSection.tsx` (51 LOC, feature:integrations, no-template-import)
  - `src/features/integrations/components/selector-registry/ProbeClusterSection.tsx` (33 LOC, feature:integrations, no-template-import)

## Execution Notes

- Start with high score + low risk clusters.
- Prefer migration to existing templates before creating new abstractions.
- Re-run this scan after each migration wave and compare rank deltas.

## Residual Clusters

### Duplicate Name Clusters

- `Picker` `duplicate_name` files=2 loc=132 scopes=feature:cms, feature:filemaker
  - `src/features/filemaker/components/shared/BlockPicker.tsx` (70 LOC)
  - `src/features/cms/components/page-builder/BlockPicker.tsx` (62 LOC)
- `Section` `duplicate_name` files=2 loc=84 scopes=feature:integrations
  - `src/features/integrations/components/selector-registry-probe-sessions/ProbeClusterSection.tsx` (51 LOC)
  - `src/features/integrations/components/selector-registry/ProbeClusterSection.tsx` (33 LOC)

### Prop Signature Clusters

- `Section` `prop_signature` files=3 loc=480 scopes=feature:ai
  - `src/features/ai/ai-paths/components/node-config/dialog/HttpNodeConfigSection.tsx` (187 LOC)
  - `src/features/ai/ai-paths/components/node-config/dialog/AudioOscillatorNodeConfigSection.tsx` (164 LOC)
  - `src/features/ai/ai-paths/components/node-config/dialog/RouterNodeConfigSection.tsx` (129 LOC)
- `Panel` `prop_signature` files=3 loc=194 scopes=feature:filemaker
  - `src/features/filemaker/components/email-builder/EmailBlockSettingsPanel.tsx` (114 LOC)
  - `src/features/filemaker/components/cv-builder/CvLayerPanel.tsx` (40 LOC)
  - `src/features/filemaker/components/email-builder/EmailLayerPanel.tsx` (40 LOC)
- `Modal` `prop_signature` files=2 loc=520 scopes=feature:filemaker, feature:products
  - `src/features/products/components/list/advanced-filter/AdvancedFilterModal.tsx` (270 LOC)
  - `src/features/filemaker/components/page/FilemakerOrganizationAdvancedFilterModal.tsx` (250 LOC)
- `Modal` `prop_signature` files=2 loc=435 scopes=feature:products
  - `src/features/products/pages/ecommerce-pages-cms/UniverseCardCreateModal.tsx` (244 LOC)
  - `src/features/products/pages/ecommerce-pages-cms/EditorialArticleCreateModal.tsx` (191 LOC)
- `Panel` `prop_signature` files=2 loc=46 scopes=feature:kangur
  - `src/features/kangur/admin/settings/AiTutorSettingsPanel.tsx` (23 LOC)
  - `src/features/kangur/admin/settings/ParentVerificationPanel.tsx` (23 LOC)

### Token Similarity Clusters

- `Settings` `token_similarity` files=2 loc=145 scopes=feature:ai
  - `src/features/ai/ai-paths/components/ai-paths-settings/sections/GlobalKernelSettings.tsx` (78 LOC)
  - `src/features/ai/ai-paths/components/ai-paths-settings/sections/PathKernelSettings.tsx` (67 LOC)

