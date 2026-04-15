---
owner: 'Platform Team'
last_reviewed: '2026-04-15'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Prop Drilling Scan

Generated at: 2026-04-15T09:38:57.491Z

## Snapshot

- Scanned source files: 347
- JSX files scanned: 340
- Components detected: 319
- Components forwarding parent props (hotspot threshold): 2
- Components forwarding parent props (any): 2
- Resolved forwarded transitions: 0
- Candidate chains (depth >= 2): 0
- Candidate chains (depth >= 3): 0
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 2
- Hotspot forwarding components backlog size: 2

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `app` | 2 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `Page` | `src/app/(frontend)/kangur/(app)/[...slug]/page.tsx` | 0 | 0 | yes | yes |
| 2 | `LocalizedKangurAliasPage` | `src/app/[locale]/(frontend)/kangur/(app)/[...slug]/page.tsx` | 0 | 0 | yes | yes |

## Prioritized Transition Backlog (Depth = 2)

| Rank | Score | From | To | Fanout | Features | Prop Mapping | Location |
| ---: | ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | 0 | _none_ | _none_ | 0 | 0 | _none_ | _none_ |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 0 | 0 | _none_ | _none_ | 0 | 0 | _none_ |

## Top Chain Details (Depth >= 3)

- No depth >= 3 chains were detected in this scan. Use the depth = 2 transition backlog for refactor wave planning.

## Top Transition Details (Depth = 2)

## Execution Notes

- Start with the top depth = 2 transition backlog to eliminate pass-through props that block deeper chain detection.
- Continue prioritizing depth >= 4 chains in `feature:*` scopes once they appear.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
