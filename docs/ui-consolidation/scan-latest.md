# UI Consolidation Scan

Generated at: 2026-03-04T20:36:09.950Z

## Snapshot

- Scanned UI files: 1117
- Duplicate-name clusters: 7
- Prop-signature clusters: 0
- Token-similarity clusters: 0
- Total consolidation opportunities: 0
- High-priority opportunities (score >= 2000): 0

## Domain Coverage

| Domain | Files |
| --- | ---: |
| `feature` | 805 |
| `app` | 158 |
| `shared-ui` | 117 |
| `shared` | 37 |

## Top Families

| Family | Files |
| --- | ---: |
| `Unknown` | 558 |
| `Section` | 139 |
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

## Top Opportunity Details

## Execution Notes

- Start with high score + low risk clusters.
- Prefer migration to existing templates before creating new abstractions.
- Re-run this scan after each migration wave and compare rank deltas.
