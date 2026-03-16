---
owner: 'Platform Team'
last_reviewed: '2026-03-16'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Architecture & Performance Baseline

Generated at: 2026-03-16T17:59:36.769Z

## Snapshot

- Source files: 6392
- Source lines: 1037472
- use client files: 1621
- Files >= 1000 LOC: 28
- Files >= 1500 LOC: 4
- Largest file: `src/features/kangur/ui/pages/Duels.tsx` (3551 LOC)
- API routes: 280
- API delegated server routes: 0
- API routes without apiHandler/delegation: 155
- API explicit cache policy coverage: 125/280 (44.6%)
- Cross-feature dependency pairs: 25
- Shared -> features imports: 30
- setInterval occurrences: 29
- Prop-drilling chains (depth >= 3): 11
- Prop-drilling chains (depth >= 4): 0

## Top API Hotspots (by LOC)

| Route | LOC |
| --- | ---: |
| `src/app/api/kangur/[[...path]]/route.ts` | 968 |
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
| `src/app/api/kangur/auth/parent-magic-link/exchange/route.ts` | 29 |
| `src/app/api/kangur/auth/parent-magic-link/request/route.ts` | 29 |
| `src/app/api/v2/metadata/[type]/[id]/route.ts` | 25 |

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
| `src/features/kangur/ui/pages/Duels.tsx` | 3551 |
| `src/features/kangur/duels/server.ts` | 1672 |
| `src/features/kangur/observability/summary.ts` | 1550 |
| `src/features/kangur/ui/KangurLoginPage.tsx` | 1539 |
| `src/shared/contracts/kangur-ai-tutor-native-guide-entries.ts` | 1459 |
| `src/features/cms/components/frontend/CmsStorefrontAppearance.logic.ts` | 1414 |
| `src/features/kangur/ui/pages/Lessons.tsx` | 1239 |
| `src/features/kangur/server/ai-tutor-adaptive.ts` | 1224 |
| `src/features/kangur/ui/components/AddingBallGame.tsx` | 1196 |
| `src/shared/contracts/kangur-ai-tutor-content.ts` | 1189 |
| `src/features/kangur/cms-builder/defaults/game-defaults.ts` | 1188 |
| `src/features/kangur/admin/AdminKangurSettingsPage.tsx` | 1179 |
| `src/features/kangur/ui/components/ClockLesson.tsx` | 1170 |
| `src/shared/contracts/image-studio.ts` | 1162 |
| `src/features/cms/components/page-builder/registry/block-definitions-content.ts` | 1112 |
| `src/features/kangur/ui/context/KangurAiTutorRuntime.shared.ts` | 1086 |
| `src/features/kangur/ui/components/GeometrySymmetryGame.tsx` | 1083 |
| `src/features/kangur/ui/components/KangurAssignmentManager.tsx` | 1080 |
| `src/features/kangur/admin/AdminKangurObservabilityPage.test.tsx` | 1077 |
| `src/shared/contracts/kangur.ts` | 1064 |
