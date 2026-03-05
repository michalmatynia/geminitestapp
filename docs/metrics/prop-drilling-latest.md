# Prop Drilling Scan

Generated at: 2026-03-05T05:28:02.575Z

## Snapshot

- Scanned source files: 3836
- JSX files scanned: 1375
- Components detected: 2119
- Components forwarding parent props (hotspot threshold): 0
- Components forwarding parent props (any): 1
- Resolved forwarded transitions: 1
- Candidate chains (depth >= 2): 1
- Candidate chains (depth >= 3): 0
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 0
- Hotspot forwarding components backlog size: 0

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:ai` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `PortableEngineTrendSnapshotsPanel` | `src/features/ai/ai-paths/components/PortableEngineTrendSnapshotsPanel.tsx` | 1 | 1 | no | no |

## Prioritized Transition Backlog (Depth = 2)

| Rank | Score | From | To | Fanout | Features | Prop Mapping | Location |
| ---: | ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | 50 | `PortableEngineTrendSnapshotsPanel` | `Card` | 1 | 2 | `className -> className` | `src/features/ai/ai-paths/components/PortableEngineTrendSnapshotsPanel.tsx:89` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 0 | 0 | _none_ | _none_ | 0 | 0 | _none_ |

## Top Chain Details (Depth >= 3)

- No depth >= 3 chains were detected in this scan. Use the depth = 2 transition backlog for refactor wave planning.

## Top Transition Details (Depth = 2)

### 1. PortableEngineTrendSnapshotsPanel -> Card

- Score: 50
- Root fanout: 1
- Prop mapping: className -> className
- Location: src/features/ai/ai-paths/components/PortableEngineTrendSnapshotsPanel.tsx:89

## Execution Notes

- Start with the top depth = 2 transition backlog to eliminate pass-through props that block deeper chain detection.
- Continue prioritizing depth >= 4 chains in `feature:*` scopes once they appear.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
