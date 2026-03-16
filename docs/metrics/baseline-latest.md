---
owner: 'Platform Team'
last_reviewed: '2026-03-16'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Architecture & Performance Baseline

Generated at: 2026-03-16T09:59:04.635Z

## Snapshot

- Source files: 6301
- Source lines: 1016190
- use client files: 1594
- Files >= 1000 LOC: 25
- Files >= 1500 LOC: 3
- Largest file: `src/features/kangur/ui/pages/Duels.tsx` (1626 LOC)
- API routes: 277
- API delegated server routes: 0
- API routes without apiHandler/delegation: 155
- API explicit cache policy coverage: 122/277 (44.0%)
- Cross-feature dependency pairs: 25
- Shared -> features imports: 30
- setInterval occurrences: 25
- Prop-drilling chains (depth >= 3): 0
- Prop-drilling chains (depth >= 4): 0

## Top API Hotspots (by LOC)

| Route | LOC |
| --- | ---: |
| `src/app/api/kangur/[[...path]]/route.ts` | 864 |
| `src/app/api/v2/products/[[...path]]/route.ts` | 357 |
| `src/app/api/v2/integrations/[[...path]]/route.ts` | 275 |
| `src/app/api/image-studio/[[...path]]/route.ts` | 254 |
| `src/app/api/ai-paths/[[...path]]/route.ts` | 232 |
| `src/app/api/databases/[[...path]]/route.ts` | 189 |
| `src/app/api/agentcreator/[[...path]]/route.ts` | 187 |
| `src/app/api/chatbot/[[...path]]/route.ts` | 148 |
| `src/app/api/agent/leases/route.ts` | 122 |
| `src/app/api/agent/resources/route.ts` | 59 |
| `src/app/api/agent/approval-gates/route.ts` | 50 |
| `src/app/api/marketplace/[resource]/route.ts` | 38 |
| `src/app/api/v2/metadata/[type]/[id]/route.ts` | 25 |
| `src/app/api/auth/users/[id]/route.ts` | 23 |
| `src/app/api/drafts/[id]/route.ts` | 23 |

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
| `src/features/kangur/ui/pages/Duels.tsx` | 1626 |
| `src/features/kangur/ui/KangurLoginPage.tsx` | 1558 |
| `src/features/kangur/observability/summary.ts` | 1539 |
| `src/shared/contracts/kangur-ai-tutor-native-guide-entries.ts` | 1459 |
| `src/features/cms/components/frontend/CmsStorefrontAppearance.logic.ts` | 1414 |
| `src/features/kangur/server/ai-tutor-adaptive.ts` | 1224 |
| `src/features/kangur/ui/components/AddingBallGame.tsx` | 1191 |
| `src/shared/contracts/kangur-ai-tutor-content.ts` | 1189 |
| `src/features/kangur/cms-builder/defaults/game-defaults.ts` | 1188 |
| `src/features/kangur/admin/AdminKangurSettingsPage.tsx` | 1179 |
| `src/features/kangur/ui/components/ClockLesson.tsx` | 1169 |
| `src/shared/contracts/image-studio.ts` | 1162 |
| `src/features/cms/components/page-builder/registry/block-definitions-content.ts` | 1141 |
| `src/features/kangur/ui/context/KangurAiTutorRuntime.shared.ts` | 1086 |
| `src/features/kangur/admin/AdminKangurObservabilityPage.test.tsx` | 1077 |
| `src/features/kangur/ui/pages/Lessons.tsx` | 1077 |
| `src/features/kangur/ui/components/GeometrySymmetryGame.tsx` | 1063 |
| `src/features/ai/ai-paths/components/__tests__/canvas-connection-preview.test.tsx` | 1055 |
| `src/features/kangur/themes/others.ts` | 1054 |
| `src/features/kangur/ui/components/animations/AddingAnimations.tsx` | 1041 |
