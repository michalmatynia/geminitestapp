---
owner: 'Platform Team'
last_reviewed: '2026-03-26'
status: 'generated'
doc_type: 'generated'
scope: 'cross-feature'
canonical: true
---
# UI Consolidation Scan

Generated at: 2026-03-26T20:30:52.499Z

## Snapshot

- Scanned UI files: 2118
- Duplicate-name clusters: 0
- Prop-signature clusters: 1
- Token-similarity clusters: 0
- Thin re-export wrappers ignored: 10
- Total consolidation opportunities: 0
- High-priority opportunities (score >= 2000): 0

## Domain Coverage

| Domain | Files |
| --- | ---: |
| `feature` | 1705 |
| `app` | 202 |
| `shared-ui` | 167 |
| `shared` | 44 |

## Top Families

| Family | Files |
| --- | ---: |
| `Unknown` | 1485 |
| `Page` | 164 |
| `Section` | 130 |
| `Panel` | 96 |
| `Modal` | 62 |
| `Tab` | 35 |
| `Card` | 35 |
| `Header` | 24 |
| `Settings` | 21 |
| `List` | 18 |
| `Form` | 15 |
| `Dialog` | 7 |
| `Toolbar` | 7 |
| `Picker` | 7 |
| `Sidebar` | 5 |

## Ranked Backlog

| Rank | Score | Family | Method | Files | Scopes | LOC | Template Coverage | Risk | Recommendation |
| ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | --- | --- |

## Top Opportunity Details

## Execution Notes

- Start with high score + low risk clusters.
- Prefer migration to existing templates before creating new abstractions.
- Re-run this scan after each migration wave and compare rank deltas.

## Residual Clusters

### Duplicate Name Clusters

- None

### Prop Signature Clusters

- `Panel` `prop_signature` files=2 loc=452 scopes=feature:ai
  - `src/features/ai/ai-paths/components/PortableEngineTrendSnapshotsPanel.tsx` (429 LOC)
  - `src/features/ai/ai-paths/components/validation/ValidationPanel.tsx` (23 LOC)

### Token Similarity Clusters

- None

