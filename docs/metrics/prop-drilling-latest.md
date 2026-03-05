# Prop Drilling Scan

Generated at: 2026-03-05T12:57:08.344Z

## Snapshot

- Scanned source files: 3902
- JSX files scanned: 1415
- Components detected: 2189
- Components forwarding parent props (hotspot threshold): 2
- Components forwarding parent props (any): 7
- Resolved forwarded transitions: 11
- Candidate chains (depth >= 2): 11
- Candidate chains (depth >= 3): 2
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 0
- Hotspot forwarding components backlog size: 2

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:kangur` | 7 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `KangurGame` | `src/features/kangur/legacy/components/kangur/KangurGame.jsx` | 2 | 4 | no | yes |
| 2 | `App` | `src/features/kangur/legacy/App.jsx` | 2 | 2 | no | yes |
| 3 | `AuthenticatedApp` | `src/features/kangur/legacy/App.jsx` | 1 | 1 | no | no |
| 4 | `KangurExam` | `src/features/kangur/legacy/components/kangur/KangurExam.jsx` | 1 | 1 | no | no |
| 5 | `CompleteEquation` | `src/features/kangur/legacy/components/lessons/AddingBallGame.jsx` | 1 | 1 | no | no |
| 6 | `CalendarLesson` | `src/features/kangur/legacy/components/lessons/CalendarLessson.jsx` | 1 | 1 | no | no |
| 7 | `ClockLesson` | `src/features/kangur/legacy/components/lessons/ClockLesson.jsx` | 1 | 1 | no | no |

## Prioritized Transition Backlog (Depth = 2)

| Rank | Score | From | To | Fanout | Features | Prop Mapping | Location |
| ---: | ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | 54 | `KangurGame` | `KangurExam` | 2 | 1 | `mode -> mode` | `src/features/kangur/legacy/components/kangur/KangurGame.jsx:213` |
| 2 | 54 | `KangurGame` | `KangurExam` | 2 | 1 | `onBack -> onBack` | `src/features/kangur/legacy/components/kangur/KangurGame.jsx:213` |
| 3 | 54 | `KangurGame` | `ResultView` | 2 | 1 | `mode -> mode` | `src/features/kangur/legacy/components/kangur/KangurGame.jsx:253` |
| 4 | 54 | `KangurGame` | `ResultView` | 2 | 1 | `onBack -> onBack` | `src/features/kangur/legacy/components/kangur/KangurGame.jsx:253` |
| 5 | 52 | `CompleteEquation` | `SlotZone` | 1 | 1 | `round -> label` | `src/features/kangur/legacy/components/lessons/AddingBallGame.jsx:119` |
| 6 | 52 | `CalendarLesson` | `CalendarInteractiveGame` | 1 | 1 | `onBack -> onFinish` | `src/features/kangur/legacy/components/lessons/CalendarLessson.jsx:277` |
| 7 | 52 | `ClockLesson` | `ClockTrainingGame` | 1 | 1 | `onBack -> onFinish` | `src/features/kangur/legacy/components/lessons/ClockLesson.jsx:271` |
| 8 | 44 | `AuthenticatedApp` | `PageNotFound` | 1 | 1 | `requestedPath -> requestedPath` | `src/features/kangur/legacy/App.jsx:36` |
| 9 | 44 | `App` | `AuthenticatedApp` | 1 | 1 | `pageKey -> pageKey` | `src/features/kangur/legacy/App.jsx:50` |
| 10 | 44 | `App` | `AuthenticatedApp` | 1 | 1 | `requestedPath -> requestedPath` | `src/features/kangur/legacy/App.jsx:50` |
| 11 | 44 | `KangurExam` | `ExamSummary` | 1 | 1 | `onBack -> onBack` | `src/features/kangur/legacy/components/kangur/KangurExam.jsx:330` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 93 | 3 | `KangurGame` | `ExamSummary` | 2 | 1 | `onBack -> onBack -> onBack` |
| 2 | 83 | 3 | `App` | `PageNotFound` | 1 | 1 | `requestedPath -> requestedPath -> requestedPath` |

## Top Chain Details (Depth >= 3)

### 1. KangurGame -> ExamSummary

- Score: 93
- Depth: 3
- Root fanout: 2
- Prop path: onBack -> onBack -> onBack
- Component path:
  - `KangurGame` (src/features/kangur/legacy/components/kangur/KangurGame.jsx)
  - `KangurExam` (src/features/kangur/legacy/components/kangur/KangurExam.jsx)
  - `ExamSummary` (src/features/kangur/legacy/components/kangur/KangurExam.jsx)
- Transition lines:
  - `KangurGame` -> `KangurExam`: `onBack` -> `onBack` at src/features/kangur/legacy/components/kangur/KangurGame.jsx:213
  - `KangurExam` -> `ExamSummary`: `onBack` -> `onBack` at src/features/kangur/legacy/components/kangur/KangurExam.jsx:330

### 2. App -> PageNotFound

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: requestedPath -> requestedPath -> requestedPath
- Component path:
  - `App` (src/features/kangur/legacy/App.jsx)
  - `AuthenticatedApp` (src/features/kangur/legacy/App.jsx)
  - `PageNotFound` (src/features/kangur/legacy/lib/PageNotFound.jsx)
- Transition lines:
  - `App` -> `AuthenticatedApp`: `requestedPath` -> `requestedPath` at src/features/kangur/legacy/App.jsx:50
  - `AuthenticatedApp` -> `PageNotFound`: `requestedPath` -> `requestedPath` at src/features/kangur/legacy/App.jsx:36

## Top Transition Details (Depth = 2)

### 1. KangurGame -> KangurExam

- Score: 54
- Root fanout: 2
- Prop mapping: mode -> mode
- Location: src/features/kangur/legacy/components/kangur/KangurGame.jsx:213

### 2. KangurGame -> KangurExam

- Score: 54
- Root fanout: 2
- Prop mapping: onBack -> onBack
- Location: src/features/kangur/legacy/components/kangur/KangurGame.jsx:213

### 3. KangurGame -> ResultView

- Score: 54
- Root fanout: 2
- Prop mapping: mode -> mode
- Location: src/features/kangur/legacy/components/kangur/KangurGame.jsx:253

### 4. KangurGame -> ResultView

- Score: 54
- Root fanout: 2
- Prop mapping: onBack -> onBack
- Location: src/features/kangur/legacy/components/kangur/KangurGame.jsx:253

### 5. CompleteEquation -> SlotZone

- Score: 52
- Root fanout: 1
- Prop mapping: round -> label
- Location: src/features/kangur/legacy/components/lessons/AddingBallGame.jsx:119

### 6. CalendarLesson -> CalendarInteractiveGame

- Score: 52
- Root fanout: 1
- Prop mapping: onBack -> onFinish
- Location: src/features/kangur/legacy/components/lessons/CalendarLessson.jsx:277

### 7. ClockLesson -> ClockTrainingGame

- Score: 52
- Root fanout: 1
- Prop mapping: onBack -> onFinish
- Location: src/features/kangur/legacy/components/lessons/ClockLesson.jsx:271

### 8. AuthenticatedApp -> PageNotFound

- Score: 44
- Root fanout: 1
- Prop mapping: requestedPath -> requestedPath
- Location: src/features/kangur/legacy/App.jsx:36

### 9. App -> AuthenticatedApp

- Score: 44
- Root fanout: 1
- Prop mapping: pageKey -> pageKey
- Location: src/features/kangur/legacy/App.jsx:50

### 10. App -> AuthenticatedApp

- Score: 44
- Root fanout: 1
- Prop mapping: requestedPath -> requestedPath
- Location: src/features/kangur/legacy/App.jsx:50

### 11. KangurExam -> ExamSummary

- Score: 44
- Root fanout: 1
- Prop mapping: onBack -> onBack
- Location: src/features/kangur/legacy/components/kangur/KangurExam.jsx:330

## Execution Notes

- Start with the top depth = 2 transition backlog to eliminate pass-through props that block deeper chain detection.
- Continue prioritizing depth >= 4 chains in `feature:*` scopes once they appear.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
