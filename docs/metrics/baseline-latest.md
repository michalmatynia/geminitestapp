---
owner: 'Platform Team'
last_reviewed: '2026-03-25'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Architecture & Performance Baseline

Generated at: 2026-03-25T22:32:58.920Z

## Snapshot

- Source files: 7686
- Source lines: 1281433
- use client files: 2
- Files >= 1000 LOC: 0
- Files >= 1500 LOC: 0
- Largest file: `src/app/(frontend)/products/[id]/ProductPublicPage.tsx` (301 LOC)
- API routes: 29
- API delegated server routes: 159
- API routes without apiHandler/delegation: 0
- API explicit cache policy coverage: 285/29 (982.8%)
- Cross-feature dependency pairs: 3
- Shared -> features imports: 0
- setInterval occurrences: 1
- Prop-drilling chains (depth >= 3): 240
- Prop-drilling chains (depth >= 4): 49

## Top API Hotspots (by LOC)

| Route | LOC |
| --- | ---: |
| `src/app/api/v2/integrations/[[...path]]/route.ts` | 231 |
| `src/app/api/agentcreator/[[...path]]/route.ts` | 228 |
| `src/app/api/ai-paths/[[...path]]/route.ts` | 205 |
| `src/app/api/databases/[[...path]]/route.ts` | 203 |
| `src/app/api/chatbot/[[...path]]/route.ts` | 168 |
| `src/app/api/v2/products/[[...path]]/route.ts` | 161 |
| `src/app/api/image-studio/[[...path]]/route.ts` | 126 |
| `src/app/api/agent/leases/route.ts` | 122 |
| `src/app/api/kangur/[[...path]]/route.ts` | 62 |
| `src/app/api/agent/resources/route.ts` | 59 |
| `src/app/api/agent/approval-gates/route.ts` | 50 |
| `src/app/api/marketplace/[resource]/route.ts` | 38 |
| `src/app/api/kangur/auth/parent-magic-link/exchange/route.ts` | 33 |
| `src/app/api/kangur/auth/parent-magic-link/request/route.ts` | 33 |
| `src/app/api/v2/metadata/[type]/[id]/route.ts` | 25 |

## Top Cross-Feature Dependencies

| Edge | References |
| --- | ---: |
| `kangur -> cms` | 9 |
| `admin -> foldertree` | 2 |
| `integrations -> product-sync` | 1 |

## Top File Hotspots (by LOC)

| File | LOC |
| --- | ---: |
| `src/features/kangur/ui/components/music/useKangurMusicSynth.test.tsx` | 3348 |
| `src/features/kangur/ui/components/animations/EnglishAnimations.tsx` | 2718 |
| `src/features/kangur/ui/components/music/KangurMusicPianoRoll.tsx` | 2712 |
| `src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx` | 2454 |
| `src/features/kangur/ui/components/KangurPrimaryNavigation.test.tsx` | 1937 |
| `src/features/kangur/ui/components/SubtractingLesson.tsx` | 1844 |
| `src/features/kangur/ui/components/music/useKangurMusicSynth.ts` | 1793 |
| `src/features/kangur/ui/components/EnglishAdverbsFrequencyRoutineGame.tsx` | 1701 |
| `src/features/kangur/ui/components/AddingLesson.tsx` | 1681 |
| `src/features/kangur/server/ai-tutor-content-locale-scaffold.ts` | 1617 |
| `src/features/kangur/page-content-catalog.ts` | 1531 |
| `src/features/kangur/admin/appearance/appearance.copy.ts` | 1396 |
| `src/features/kangur/ui/KangurLoginPage.tsx` | 1347 |
| `src/features/kangur/ui/pages/GamesLibrary.tsx` | 1295 |
| `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx` | 1287 |
| `src/features/kangur/ui/components/KangurPageTransitionSkeleton.tsx` | 1271 |
| `src/features/kangur/server/ai-tutor-native-guide-locale-scaffold.ts` | 1265 |
| `src/features/kangur/ui/KangurLoginPage.test.tsx` | 1248 |
| `src/features/kangur/ui/components/GeometryLessonAnimations.tsx` | 1248 |
| `src/features/kangur/lessons/lesson-catalog-i18n.ts` | 1246 |
