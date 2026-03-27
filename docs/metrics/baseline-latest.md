---
owner: 'Platform Team'
last_reviewed: '2026-03-27'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Architecture & Performance Baseline

Generated at: 2026-03-27T13:43:19.860Z

## Snapshot

- Source files: 7981
- Source lines: 1348117
- use client files: 2
- Files >= 1000 LOC: 0
- Files >= 1500 LOC: 0
- Largest file: `src/app/(frontend)/products/[id]/ProductPublicPage.tsx` (301 LOC)
- API routes: 30
- API delegated server routes: 161
- API routes without apiHandler/delegation: 0
- API explicit cache policy coverage: 287/30 (956.7%)
- Cross-feature dependency pairs: 2
- Shared -> features imports: 0
- setInterval occurrences: 0
- Prop-drilling chains (depth >= 3): 0
- Prop-drilling chains (depth >= 4): 0

## Top API Hotspots (by LOC)

| Route | LOC |
| --- | ---: |
| `src/app/api/v2/integrations/[[...path]]/route.ts` | 231 |
| `src/app/api/agentcreator/[[...path]]/route.ts` | 228 |
| `src/app/api/ai-paths/[[...path]]/route.ts` | 205 |
| `src/app/api/databases/[[...path]]/route.ts` | 203 |
| `src/app/api/chatbot/[[...path]]/route.ts` | 168 |
| `src/app/api/v2/products/[[...path]]/route.ts` | 167 |
| `src/app/api/image-studio/[[...path]]/route.ts` | 126 |
| `src/app/api/agent/leases/route.ts` | 122 |
| `src/app/api/kangur/[[...path]]/route.ts` | 62 |
| `src/app/api/agent/resources/route.ts` | 59 |
| `src/app/api/agent/approval-gates/route.ts` | 50 |
| `src/app/api/marketplace/[resource]/route.ts` | 38 |
| `src/app/api/kangur/auth/parent-magic-link/exchange/route.ts` | 32 |
| `src/app/api/kangur/auth/parent-magic-link/request/route.ts` | 32 |
| `src/app/api/v2/metadata/[type]/[id]/route.ts` | 25 |

## Top Cross-Feature Dependencies

| Edge | References |
| --- | ---: |
| `kangur -> cms` | 9 |
| `admin -> foldertree` | 2 |

## Top File Hotspots (by LOC)

| File | LOC |
| --- | ---: |
| `src/features/products/pages/AdminProductOrdersImportPage.test.tsx` | 3712 |
| `src/features/kangur/ui/components/music/useKangurMusicSynth.test.tsx` | 3348 |
| `src/features/kangur/ui/pages/GamesLibrary.serialization.test.tsx` | 3130 |
| `src/features/kangur/ui/components/music/KangurMusicPianoRoll.tsx` | 2791 |
| `src/features/kangur/ui/components/animations/EnglishAnimations.tsx` | 2718 |
| `src/features/kangur/ui/pages/GamesLibrary.tsx` | 2572 |
| `src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx` | 2454 |
| `src/features/kangur/ui/components/KangurPrimaryNavigation.test.tsx` | 2352 |
| `src/features/kangur/ui/components/SubtractingLesson.tsx` | 1846 |
| `src/features/products/pages/AdminProductOrdersImportPage.tsx` | 1837 |
| `src/features/kangur/ui/components/music/useKangurMusicSynth.ts` | 1793 |
| `src/features/kangur/ui/components/EnglishAdverbsFrequencyRoutineGame.tsx` | 1701 |
| `src/features/kangur/ui/components/AddingLesson.tsx` | 1685 |
| `src/features/kangur/ui/pages/GamesLibraryGameModal.tsx` | 1635 |
| `src/features/kangur/server/ai-tutor-content-locale-scaffold.ts` | 1621 |
| `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx` | 1543 |
| `src/features/kangur/page-content-catalog.ts` | 1531 |
| `src/features/kangur/ui/KangurLoginPage.test.tsx` | 1464 |
| `src/features/filemaker/pages/AdminFilemakerCampaignEditPage.tsx` | 1418 |
| `src/features/kangur/ui/KangurLoginPage.tsx` | 1409 |
