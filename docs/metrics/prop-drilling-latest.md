# Prop Drilling Scan

Generated at: 2026-03-06T03:15:20.153Z

## Snapshot

- Scanned source files: 3959
- JSX files scanned: 1442
- Components detected: 2212
- Components forwarding parent props (hotspot threshold): 1
- Components forwarding parent props (any): 6
- Resolved forwarded transitions: 5
- Candidate chains (depth >= 2): 5
- Candidate chains (depth >= 3): 0
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 1
- Hotspot forwarding components backlog size: 1

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:kangur` | 5 |
| `shared-ui` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `AdminKangurPageShell` | `src/features/kangur/admin/AdminKangurPageShell.tsx` | 1 | 1 | no | no |
| 2 | `CompleteEquation` | `src/features/kangur/ui/components/AddingBallGame.tsx` | 1 | 1 | no | no |
| 3 | `CalendarLesson` | `src/features/kangur/ui/components/CalendarLesson.tsx` | 1 | 1 | no | no |
| 4 | `ClockLesson` | `src/features/kangur/ui/components/ClockLesson.tsx` | 1 | 1 | no | no |
| 5 | `GeometryShapesLesson` | `src/features/kangur/ui/components/GeometryShapesLesson.tsx` | 1 | 1 | no | no |
| 6 | `VectorCanvas` | `src/shared/ui/vector-canvas/index.tsx` | 0 | 0 | yes | yes |

## Prioritized Transition Backlog (Depth = 2)

| Rank | Score | From | To | Fanout | Features | Prop Mapping | Location |
| ---: | ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | 52 | `CompleteEquation` | `SlotZone` | 1 | 1 | `round -> label` | `src/features/kangur/ui/components/AddingBallGame.tsx:231` |
| 2 | 52 | `CalendarLesson` | `CalendarInteractiveGame` | 1 | 1 | `onBack -> onFinish` | `src/features/kangur/ui/components/CalendarLesson.tsx:302` |
| 3 | 52 | `ClockLesson` | `ClockTrainingGame` | 1 | 1 | `onBack -> onFinish` | `src/features/kangur/ui/components/ClockLesson.tsx:565` |
| 4 | 52 | `GeometryShapesLesson` | `GeometryDrawingGame` | 1 | 1 | `onBack -> onFinish` | `src/features/kangur/ui/components/GeometryShapesLesson.tsx:107` |
| 5 | 44 | `AdminKangurPageShell` | `KangurFeaturePage` | 1 | 1 | `slug -> slug` | `src/features/kangur/admin/AdminKangurPageShell.tsx:17` |

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
- Location: src/features/kangur/ui/components/ClockLesson.tsx:565

### 4. GeometryShapesLesson -> GeometryDrawingGame

- Score: 52
- Root fanout: 1
- Prop mapping: onBack -> onFinish
- Location: src/features/kangur/ui/components/GeometryShapesLesson.tsx:107

### 5. AdminKangurPageShell -> KangurFeaturePage

- Score: 44
- Root fanout: 1
- Prop mapping: slug -> slug
- Location: src/features/kangur/admin/AdminKangurPageShell.tsx:17

## Execution Notes

- Start with the top depth = 2 transition backlog to eliminate pass-through props that block deeper chain detection.
- Continue prioritizing depth >= 4 chains in `feature:*` scopes once they appear.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
