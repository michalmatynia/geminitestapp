---
owner: 'Platform Team'
last_reviewed: '2026-05-06'
status: 'generated'
doc_type: 'generated'
scope: 'cross-feature'
canonical: true
---
# UI Consolidation Scan

Generated at: 2026-05-06T12:19:59.616Z

## Snapshot

- Scanned UI files: 3126
- Duplicate-name clusters: 0
- Prop-signature clusters: 4
- Token-similarity clusters: 3
- Thin re-export wrappers ignored: 36
- Total consolidation opportunities: 6
- High-priority opportunities (score >= 2000): 0

## Domain Coverage

| Domain | Files |
| --- | ---: |
| `feature` | 2518 |
| `app` | 362 |
| `shared-ui` | 188 |
| `shared` | 58 |

## Top Families

| Family | Files |
| --- | ---: |
| `Unknown` | 2193 |
| `Section` | 221 |
| `Page` | 192 |
| `Panel` | 154 |
| `Modal` | 92 |
| `Card` | 49 |
| `Tab` | 45 |
| `Header` | 35 |
| `Settings` | 34 |
| `List` | 28 |
| `Form` | 26 |
| `Toolbar` | 13 |
| `Table` | 13 |
| `Dialog` | 12 |
| `Picker` | 9 |

## Ranked Backlog

| Rank | Score | Family | Method | Files | Scopes | LOC | Template Coverage | Risk | Recommendation |
| ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| 1 | 1532 | `Section` | `prop_signature` | 3 | 1 | 480 | 0% | medium | review-for-extraction |
| 2 | 939 | `Panel` | `prop_signature` | 3 | 1 | 207 | 0% | low | migrate-to-panel-template |
| 3 | 634 | `Panel` | `token_similarity` | 2 | 1 | 361 | 100% | medium | migrate-to-panel-template |
| 4 | 472 | `Picker` | `token_similarity` | 2 | 1 | 216 | 0% | low | migrate-to-generic-picker |
| 5 | 435 | `Picker` | `prop_signature` | 2 | 1 | 216 | 0% | low | migrate-to-generic-picker |
| 6 | 264 | `Settings` | `token_similarity` | 2 | 1 | 145 | 0% | low | review-for-extraction |

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

### 2. Panel (prop_signature)

- Score: 939
- Files: 3
- Scopes: feature:filemaker
- Total LOC: 207
- Recommendation: migrate-to-panel-template
- Risk: low
- Candidate files:
  - `src/features/filemaker/components/email-builder/EmailBlockSettingsPanel.tsx` (114 LOC, feature:filemaker, no-template-import)
  - `src/features/filemaker/components/cv-builder/CvLayerPanel.tsx` (47 LOC, feature:filemaker, no-template-import)
  - `src/features/filemaker/components/email-builder/EmailLayerPanel.tsx` (46 LOC, feature:filemaker, no-template-import)

### 3. Panel (token_similarity)

- Score: 634
- Files: 2
- Scopes: feature:filemaker
- Total LOC: 361
- Recommendation: migrate-to-panel-template
- Risk: medium
- Avg token similarity: 0.739
- Candidate files:
  - `src/features/filemaker/components/page/FilemakerEventsListPanel.tsx` (189 LOC, feature:filemaker, template-import)
  - `src/features/filemaker/components/page/FilemakerInvoicesListPanel.tsx` (172 LOC, feature:filemaker, template-import)

### 4. Picker (token_similarity)

- Score: 472
- Files: 2
- Scopes: feature:filemaker
- Total LOC: 216
- Recommendation: migrate-to-generic-picker
- Risk: low
- Avg token similarity: 0.621
- Candidate files:
  - `src/features/filemaker/components/cv-builder/CvBlockPicker.tsx` (111 LOC, feature:filemaker, no-template-import)
  - `src/features/filemaker/components/email-builder/EmailBlockPicker.tsx` (105 LOC, feature:filemaker, no-template-import)

### 5. Picker (prop_signature)

- Score: 435
- Files: 2
- Scopes: feature:filemaker
- Total LOC: 216
- Recommendation: migrate-to-generic-picker
- Risk: low
- Candidate files:
  - `src/features/filemaker/components/cv-builder/CvBlockPicker.tsx` (111 LOC, feature:filemaker, no-template-import)
  - `src/features/filemaker/components/email-builder/EmailBlockPicker.tsx` (105 LOC, feature:filemaker, no-template-import)

### 6. Settings (token_similarity)

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

## Execution Notes

- Start with high score + low risk clusters.
- Prefer migration to existing templates before creating new abstractions.
- Re-run this scan after each migration wave and compare rank deltas.

## Residual Clusters

### Duplicate Name Clusters

- None

### Prop Signature Clusters

- `Section` `prop_signature` files=3 loc=480 scopes=feature:ai
  - `src/features/ai/ai-paths/components/node-config/dialog/HttpNodeConfigSection.tsx` (187 LOC)
  - `src/features/ai/ai-paths/components/node-config/dialog/AudioOscillatorNodeConfigSection.tsx` (164 LOC)
  - `src/features/ai/ai-paths/components/node-config/dialog/RouterNodeConfigSection.tsx` (129 LOC)
- `Panel` `prop_signature` files=3 loc=207 scopes=feature:filemaker
  - `src/features/filemaker/components/email-builder/EmailBlockSettingsPanel.tsx` (114 LOC)
  - `src/features/filemaker/components/cv-builder/CvLayerPanel.tsx` (47 LOC)
  - `src/features/filemaker/components/email-builder/EmailLayerPanel.tsx` (46 LOC)
- `Picker` `prop_signature` files=2 loc=216 scopes=feature:filemaker
  - `src/features/filemaker/components/cv-builder/CvBlockPicker.tsx` (111 LOC)
  - `src/features/filemaker/components/email-builder/EmailBlockPicker.tsx` (105 LOC)
- `Panel` `prop_signature` files=2 loc=46 scopes=feature:kangur
  - `src/features/kangur/admin/settings/AiTutorSettingsPanel.tsx` (23 LOC)
  - `src/features/kangur/admin/settings/ParentVerificationPanel.tsx` (23 LOC)

### Token Similarity Clusters

- `Panel` `token_similarity` files=2 loc=361 scopes=feature:filemaker
  - `src/features/filemaker/components/page/FilemakerEventsListPanel.tsx` (189 LOC)
  - `src/features/filemaker/components/page/FilemakerInvoicesListPanel.tsx` (172 LOC)
- `Picker` `token_similarity` files=2 loc=216 scopes=feature:filemaker
  - `src/features/filemaker/components/cv-builder/CvBlockPicker.tsx` (111 LOC)
  - `src/features/filemaker/components/email-builder/EmailBlockPicker.tsx` (105 LOC)
- `Settings` `token_similarity` files=2 loc=145 scopes=feature:ai
  - `src/features/ai/ai-paths/components/ai-paths-settings/sections/GlobalKernelSettings.tsx` (78 LOC)
  - `src/features/ai/ai-paths/components/ai-paths-settings/sections/PathKernelSettings.tsx` (67 LOC)

