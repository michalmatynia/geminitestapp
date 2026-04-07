---
owner: 'Platform Team'
last_reviewed: '2026-04-07'
status: 'generated'
doc_type: 'generated'
scope: 'cross-feature'
canonical: true
---
# UI Consolidation Scan

Generated at: 2026-04-07T09:14:03.468Z

## Snapshot

- Scanned UI files: 2528
- Duplicate-name clusters: 2
- Prop-signature clusters: 1
- Token-similarity clusters: 2
- Thin re-export wrappers ignored: 38
- Total consolidation opportunities: 5
- High-priority opportunities (score >= 2000): 2

## Domain Coverage

| Domain | Files |
| --- | ---: |
| `feature` | 1955 |
| `app` | 337 |
| `shared-ui` | 182 |
| `shared` | 54 |

## Top Families

| Family | Files |
| --- | ---: |
| `Unknown` | 1844 |
| `Page` | 170 |
| `Section` | 144 |
| `Panel` | 100 |
| `Modal` | 68 |
| `Tab` | 44 |
| `Card` | 40 |
| `Settings` | 25 |
| `Header` | 23 |
| `List` | 19 |
| `Form` | 15 |
| `Toolbar` | 8 |
| `Dialog` | 7 |
| `Picker` | 7 |
| `Sidebar` | 6 |

## Ranked Backlog

| Rank | Score | Family | Method | Files | Scopes | LOC | Template Coverage | Risk | Recommendation |
| ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| 1 | 2529 | `Table` | `token_similarity` | 2 | 2 | 1415 | 100% | high | migrate-to-standard-data-table-panel |
| 2 | 2140 | `Table` | `duplicate_name` | 2 | 2 | 1415 | 100% | high | migrate-to-standard-data-table-panel |
| 3 | 874 | `Settings` | `token_similarity` | 2 | 2 | 384 | 0% | medium | review-for-extraction |
| 4 | 806 | `Settings` | `prop_signature` | 2 | 2 | 384 | 0% | medium | review-for-extraction |
| 5 | 739 | `Settings` | `duplicate_name` | 2 | 2 | 384 | 0% | medium | review-for-extraction |

## Top Opportunity Details

### 1. Table (token_similarity)

- Score: 2529
- Files: 2
- Scopes: feature:observability, shared-lib
- Total LOC: 1415
- Recommendation: migrate-to-standard-data-table-panel
- Risk: high
- Avg token similarity: 1
- Candidate files:
  - `src/features/observability/pages/system-logs/SystemLogs.Table.tsx` (708 LOC, feature:observability, template-import)
  - `src/shared/lib/observability/components/system-logs/SystemLogs.Table.tsx` (707 LOC, shared-lib, template-import)

### 2. Table (duplicate_name)

- Score: 2140
- Files: 2
- Scopes: feature:observability, shared-lib
- Total LOC: 1415
- Recommendation: migrate-to-standard-data-table-panel
- Risk: high
- Candidate files:
  - `src/features/observability/pages/system-logs/SystemLogs.Table.tsx` (708 LOC, feature:observability, template-import)
  - `src/shared/lib/observability/components/system-logs/SystemLogs.Table.tsx` (707 LOC, shared-lib, template-import)

### 3. Settings (token_similarity)

- Score: 874
- Files: 2
- Scopes: feature:observability, shared-lib
- Total LOC: 384
- Recommendation: review-for-extraction
- Risk: medium
- Avg token similarity: 1
- Candidate files:
  - `src/features/observability/pages/system-logs/SystemLogs.Settings.tsx` (192 LOC, feature:observability, no-template-import)
  - `src/shared/lib/observability/components/system-logs/SystemLogs.Settings.tsx` (192 LOC, shared-lib, no-template-import)

### 4. Settings (prop_signature)

- Score: 806
- Files: 2
- Scopes: feature:observability, shared-lib
- Total LOC: 384
- Recommendation: review-for-extraction
- Risk: medium
- Candidate files:
  - `src/features/observability/pages/system-logs/SystemLogs.Settings.tsx` (192 LOC, feature:observability, no-template-import)
  - `src/shared/lib/observability/components/system-logs/SystemLogs.Settings.tsx` (192 LOC, shared-lib, no-template-import)

### 5. Settings (duplicate_name)

- Score: 739
- Files: 2
- Scopes: feature:observability, shared-lib
- Total LOC: 384
- Recommendation: review-for-extraction
- Risk: medium
- Candidate files:
  - `src/features/observability/pages/system-logs/SystemLogs.Settings.tsx` (192 LOC, feature:observability, no-template-import)
  - `src/shared/lib/observability/components/system-logs/SystemLogs.Settings.tsx` (192 LOC, shared-lib, no-template-import)

## Execution Notes

- Start with high score + low risk clusters.
- Prefer migration to existing templates before creating new abstractions.
- Re-run this scan after each migration wave and compare rank deltas.

## Residual Clusters

### Duplicate Name Clusters

- `Table` `duplicate_name` files=2 loc=1415 scopes=feature:observability, shared-lib
  - `src/features/observability/pages/system-logs/SystemLogs.Table.tsx` (708 LOC)
  - `src/shared/lib/observability/components/system-logs/SystemLogs.Table.tsx` (707 LOC)
- `Settings` `duplicate_name` files=2 loc=384 scopes=feature:observability, shared-lib
  - `src/features/observability/pages/system-logs/SystemLogs.Settings.tsx` (192 LOC)
  - `src/shared/lib/observability/components/system-logs/SystemLogs.Settings.tsx` (192 LOC)

### Prop Signature Clusters

- `Settings` `prop_signature` files=2 loc=384 scopes=feature:observability, shared-lib
  - `src/features/observability/pages/system-logs/SystemLogs.Settings.tsx` (192 LOC)
  - `src/shared/lib/observability/components/system-logs/SystemLogs.Settings.tsx` (192 LOC)

### Token Similarity Clusters

- `Table` `token_similarity` files=2 loc=1415 scopes=feature:observability, shared-lib
  - `src/features/observability/pages/system-logs/SystemLogs.Table.tsx` (708 LOC)
  - `src/shared/lib/observability/components/system-logs/SystemLogs.Table.tsx` (707 LOC)
- `Settings` `token_similarity` files=2 loc=384 scopes=feature:observability, shared-lib
  - `src/features/observability/pages/system-logs/SystemLogs.Settings.tsx` (192 LOC)
  - `src/shared/lib/observability/components/system-logs/SystemLogs.Settings.tsx` (192 LOC)

