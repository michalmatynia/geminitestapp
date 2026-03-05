# Prop Drilling Scan

Generated at: 2026-03-05T15:25:23.969Z

## Snapshot

- Scanned source files: 3915
- JSX files scanned: 1413
- Components detected: 2193
- Components forwarding parent props (hotspot threshold): 1
- Components forwarding parent props (any): 4
- Resolved forwarded transitions: 5
- Candidate chains (depth >= 2): 5
- Candidate chains (depth >= 3): 0
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 0
- Hotspot forwarding components backlog size: 1

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:kangur` | 4 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `KangurGame` | `src/features/kangur/ui/components/KangurGame.tsx` | 2 | 2 | no | yes |
| 2 | `CompleteEquation` | `src/features/kangur/ui/components/AddingBallGame.tsx` | 1 | 1 | no | no |
| 3 | `CalendarLesson` | `src/features/kangur/ui/components/CalendarLesson.tsx` | 1 | 1 | no | no |
| 4 | `ClockLesson` | `src/features/kangur/ui/components/ClockLesson.tsx` | 1 | 1 | no | no |

## Prioritized Transition Backlog (Depth = 2)

| Rank | Score | From | To | Fanout | Features | Prop Mapping | Location |
| ---: | ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | 52 | `CompleteEquation` | `SlotZone` | 1 | 1 | `round -> label` | `src/features/kangur/ui/components/AddingBallGame.tsx:231` |
| 2 | 52 | `CalendarLesson` | `CalendarInteractiveGame` | 1 | 1 | `onBack -> onFinish` | `src/features/kangur/ui/components/CalendarLesson.tsx:302` |
| 3 | 52 | `ClockLesson` | `ClockTrainingGame` | 1 | 1 | `onBack -> onFinish` | `src/features/kangur/ui/components/ClockLesson.tsx:296` |
| 4 | 44 | `KangurGame` | `KangurGameProvider` | 1 | 1 | `mode -> mode` | `src/features/kangur/ui/components/KangurGame.tsx:315` |
| 5 | 44 | `KangurGame` | `KangurGameProvider` | 1 | 1 | `onBack -> onBack` | `src/features/kangur/ui/components/KangurGame.tsx:315` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 0 | 0 | _none_ | _none_ | 0 | 0 | _none_ |

## Top Chain Details (Depth >= 3)

- No depth >= 3 chains were detected in this scan. Use the depth = 2 transition backlog for refactor wave planning.

## Top Transition Details (Depth = 2)

### 1. CompleteEquation -> SlotZone

- Score: 52
- Root fanout: 1
- Prop mapping: round -> label
- Location: src/features/kangur/ui/components/AddingBallGame.tsx:231

### 2. CalendarLesson -> CalendarInteractiveGame

- Score: 52
- Root fanout: 1
- Prop mapping: onBack -> onFinish
- Location: src/features/kangur/ui/components/CalendarLesson.tsx:302

### 3. ClockLesson -> ClockTrainingGame

- Score: 52
- Root fanout: 1
- Prop mapping: onBack -> onFinish
- Location: src/features/kangur/ui/components/ClockLesson.tsx:296

### 4. KangurGame -> KangurGameProvider

- Score: 44
- Root fanout: 1
- Prop mapping: mode -> mode
- Location: src/features/kangur/ui/components/KangurGame.tsx:315

### 5. KangurGame -> KangurGameProvider

- Score: 44
- Root fanout: 1
- Prop mapping: onBack -> onBack
- Location: src/features/kangur/ui/components/KangurGame.tsx:315

## Execution Notes

- Start with the top depth = 2 transition backlog to eliminate pass-through props that block deeper chain detection.
- Continue prioritizing depth >= 4 chains in `feature:*` scopes once they appear.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
