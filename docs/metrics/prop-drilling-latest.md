---
owner: 'Platform Team'
last_reviewed: '2026-05-06'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Prop Drilling Scan

Generated at: 2026-05-06T12:19:55.144Z

## Snapshot

- Scanned source files: 374
- JSX files scanned: 362
- Components detected: 355
- Components forwarding parent props (hotspot threshold): 1
- Components forwarding parent props (any): 1
- Resolved forwarded transitions: 4
- Candidate chains (depth >= 2): 4
- Candidate chains (depth >= 3): 0
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 0
- Hotspot forwarding components backlog size: 1

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `app` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `ResolvedFrontendLayoutContent` | `src/app/(frontend)/layout.tsx` | 2 | 4 | no | yes |

## Prioritized Transition Backlog (Depth = 2)

| Rank | Score | From | To | Fanout | Features | Prop Mapping | Location |
| ---: | ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | 72 | `ResolvedFrontendLayoutContent` | `FrontendLayoutMain` | 3 | 1 | `layoutState -> routeFamily` | `src/app/(frontend)/layout.tsx:84` |
| 2 | 72 | `ResolvedFrontendLayoutContent` | `InlineSafeStyle` | 3 | 1 | `layoutState -> css` | `src/app/(frontend)/layout.tsx:92` |
| 3 | 72 | `ResolvedFrontendLayoutContent` | `InlineSafeScript` | 3 | 1 | `layoutState -> code` | `src/app/(frontend)/layout.tsx:101` |
| 4 | 52 | `ResolvedFrontendLayoutContent` | `InlineSafeScript` | 1 | 1 | `inlinePayload -> code` | `src/app/(frontend)/layout.tsx:86` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 0 | 0 | _none_ | _none_ | 0 | 0 | _none_ |

## Top Chain Details (Depth >= 3)

- No depth >= 3 chains were detected in this scan. Use the depth = 2 transition backlog for refactor wave planning.

## Top Transition Details (Depth = 2)

### 1. ResolvedFrontendLayoutContent -> FrontendLayoutMain

- Score: 72
- Root fanout: 3
- Prop mapping: layoutState -> routeFamily
- Location: src/app/(frontend)/layout.tsx:84

### 2. ResolvedFrontendLayoutContent -> InlineSafeStyle

- Score: 72
- Root fanout: 3
- Prop mapping: layoutState -> css
- Location: src/app/(frontend)/layout.tsx:92

### 3. ResolvedFrontendLayoutContent -> InlineSafeScript

- Score: 72
- Root fanout: 3
- Prop mapping: layoutState -> code
- Location: src/app/(frontend)/layout.tsx:101

### 4. ResolvedFrontendLayoutContent -> InlineSafeScript

- Score: 52
- Root fanout: 1
- Prop mapping: inlinePayload -> code
- Location: src/app/(frontend)/layout.tsx:86

## Execution Notes

- Start with the top depth = 2 transition backlog to eliminate pass-through props that block deeper chain detection.
- Continue prioritizing depth >= 4 chains in `feature:*` scopes once they appear.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
