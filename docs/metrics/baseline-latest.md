---
owner: 'Platform Team'
last_reviewed: '2026-03-16'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Architecture & Performance Baseline

Generated at: 2026-03-16T05:09:45.113Z

## Snapshot

- Source files: 6112
- Source lines: 1010178
- use client files: 1452
- Files >= 1000 LOC: 25
- Files >= 1500 LOC: 2
- Largest file: `src/features/kangur/services/local-kangur-platform.ts` (1841 LOC)
- API routes: 333
- API delegated server routes: 12
- API routes without apiHandler/delegation: 0
- API explicit cache policy coverage: 333/333 (100.0%)
- Cross-feature dependency pairs: 24
- Shared -> features imports: 30
- setInterval occurrences: 24
- Prop-drilling chains (depth >= 3): 0
- Prop-drilling chains (depth >= 4): 0

## Top API Hotspots (by LOC)

| Route | LOC |
| --- | ---: |
| `src/app/api/kangur/auth/[[...path]]/route.ts` | 163 |
| `src/app/api/kangur/learners/[[...id]]/route.ts` | 159 |
| `src/app/api/kangur/ai-tutor/[[...action]]/route.ts` | 154 |
| `src/app/api/kangur/assignments/[[...id]]/route.ts` | 125 |
| `src/app/api/agent/leases/route.ts` | 122 |
| `src/app/api/kangur/duels/[action]/route.ts` | 97 |
| `src/app/api/kangur/learner-activity/[[...action]]/route.ts` | 95 |
| `src/app/api/kangur/tts/[[...action]]/route.ts` | 94 |
| `src/app/api/chatbot/agent/[runId]/[action]/route.ts` | 83 |
| `src/app/api/kangur/knowledge-graph/[action]/route.ts` | 70 |
| `src/app/api/kangur/number-balance/[action]/route.ts` | 64 |
| `src/app/api/agent/resources/route.ts` | 59 |
| `src/app/api/agent/approval-gates/route.ts` | 50 |
| `src/app/api/v2/products/[id]/route.ts` | 42 |
| `src/app/api/v2/products/[id]/studio/[action]/route.ts` | 40 |

## Top Cross-Feature Dependencies

| Edge | References |
| --- | ---: |
| `kangur -> cms` | 28 |
| `cms -> gsap` | 20 |
| `case-resolver -> case-resolver-capture` | 18 |
| `case-resolver -> foldertree` | 15 |
| `case-resolver -> filemaker` | 13 |
| `case-resolver -> document-editor` | 12 |
| `drafter -> products` | 11 |
| `kangur -> foldertree` | 11 |
| `case-resolver -> ai` | 9 |
| `cms -> viewer3d` | 8 |
| `products -> internationalization` | 8 |
| `products -> foldertree` | 7 |
| `prompt-exploder -> foldertree` | 7 |
| `admin -> foldertree` | 5 |
| `cms -> foldertree` | 5 |

## Top File Hotspots (by LOC)

| File | LOC |
| --- | ---: |
| `src/features/kangur/services/local-kangur-platform.ts` | 1841 |
| `src/features/kangur/ui/pages/Duels.tsx` | 1564 |
| `src/shared/contracts/kangur-ai-tutor-native-guide-entries.ts` | 1459 |
| `src/features/cms/components/frontend/CmsStorefrontAppearance.logic.ts` | 1414 |
| `src/features/kangur/observability/summary.ts` | 1404 |
| `src/features/kangur/ui/KangurLoginPage.tsx` | 1365 |
| `src/features/kangur/server/ai-tutor-adaptive.ts` | 1224 |
| `src/shared/contracts/kangur-ai-tutor-content.ts` | 1189 |
| `src/features/kangur/cms-builder/defaults/game-defaults.ts` | 1188 |
| `src/features/kangur/ui/components/AddingBallGame.tsx` | 1188 |
| `src/features/kangur/ui/components/ClockLesson.tsx` | 1167 |
| `src/shared/contracts/image-studio.ts` | 1162 |
| `src/features/cms/components/page-builder/registry/block-definitions-content.ts` | 1141 |
| `src/features/kangur/admin/AdminKangurSettingsPage.tsx` | 1115 |
| `src/features/kangur/ui/context/KangurAiTutorRuntime.shared.ts` | 1083 |
| `src/features/kangur/ui/pages/Lessons.tsx` | 1060 |
| `src/features/kangur/ui/components/GeometrySymmetryGame.tsx` | 1058 |
| `src/features/ai/ai-paths/components/__tests__/canvas-connection-preview.test.tsx` | 1055 |
| `src/features/kangur/themes/others.ts` | 1054 |
| `src/features/kangur/ui/components/animations/AddingAnimations.tsx` | 1041 |
