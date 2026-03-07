# UI Consolidation Scan

Generated at: 2026-03-07T06:39:45.640Z

## Snapshot

- Scanned UI files: 1225
- Duplicate-name clusters: 0
- Prop-signature clusters: 0
- Token-similarity clusters: 1
- Thin re-export wrappers ignored: 3
- Total consolidation opportunities: 1
- High-priority opportunities (score >= 2000): 0

## Domain Coverage

| Domain | Files |
| --- | ---: |
| `feature` | 899 |
| `app` | 170 |
| `shared-ui` | 117 |
| `shared` | 39 |

## Top Families

| Family | Files |
| --- | ---: |
| `Unknown` | 659 |
| `Page` | 146 |
| `Section` | 134 |
| `Panel` | 84 |
| `Modal` | 54 |
| `Tab` | 38 |
| `Settings` | 18 |
| `Header` | 17 |
| `Card` | 17 |
| `List` | 15 |
| `Form` | 14 |
| `Toolbar` | 7 |
| `Picker` | 7 |
| `Dialog` | 5 |
| `Sidebar` | 4 |

## Ranked Backlog

| Rank | Score | Family | Method | Files | Scopes | LOC | Template Coverage | Risk | Recommendation |
| ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| 1 | 706 | `Panel` | `token_similarity` | 2 | 2 | 230 | 0% | low | migrate-to-panel-template |

## Top Opportunity Details

### 1. Panel (token_similarity)

- Score: 706
- Files: 2
- Scopes: feature:cms, feature:kangur
- Total LOC: 230
- Recommendation: migrate-to-panel-template
- Risk: low
- Avg token similarity: 0.605
- Candidate files:
  - `src/features/cms/components/page-builder/PageBuilderLeftPanel.tsx` (137 LOC, feature:cms, no-template-import)
  - `src/features/kangur/cms-builder/KangurCmsBuilderLeftPanel.tsx` (93 LOC, feature:kangur, no-template-import)

## Execution Notes

- Start with high score + low risk clusters.
- Prefer migration to existing templates before creating new abstractions.
- Re-run this scan after each migration wave and compare rank deltas.

## Residual Clusters

### Duplicate Name Clusters

- None

### Prop Signature Clusters

- None

### Token Similarity Clusters

- `Panel` `token_similarity` files=2 loc=230 scopes=feature:cms, feature:kangur
  - `src/features/cms/components/page-builder/PageBuilderLeftPanel.tsx` (137 LOC)
  - `src/features/kangur/cms-builder/KangurCmsBuilderLeftPanel.tsx` (93 LOC)

