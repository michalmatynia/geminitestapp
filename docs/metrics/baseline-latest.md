---
owner: 'Platform Team'
last_reviewed: '2026-03-28'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Architecture & Performance Baseline

Generated at: 2026-03-28T16:39:10.400Z

## Snapshot

- Source files: 8277
- Source lines: 1379731
- use client files: 1719
- Files >= 1000 LOC: 20
- Files >= 1500 LOC: 0
- Largest file: `src/features/filemaker/settings/campaign-summarizers.ts` (1411 LOC)
- API routes: 30
- API delegated server routes: 170
- API routes without apiHandler/delegation: 0
- API explicit cache policy coverage: 296/30 (986.7%)
- Cross-feature dependency pairs: 3
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
| `src/app/api/kangur/[[...path]]/route.ts` | 62 |
| `src/app/api/marketplace/[resource]/route.ts` | 38 |
| `src/app/api/kangur/auth/parent-magic-link/exchange/route.ts` | 32 |
| `src/app/api/kangur/auth/parent-magic-link/request/route.ts` | 32 |
| `src/app/api/v2/metadata/[type]/[id]/route.ts` | 25 |
| `src/app/api/cms/slugs/[id]/route.ts` | 24 |
| `src/app/api/auth/roles/route.ts` | 23 |
| `src/app/api/auth/users/[id]/route.ts` | 23 |

## Top Cross-Feature Dependencies

| Edge | References |
| --- | ---: |
| `kangur -> cms` | 11 |
| `filemaker -> document-editor` | 3 |
| `admin -> foldertree` | 2 |

## Top File Hotspots (by LOC)

| File | LOC |
| --- | ---: |
| `src/features/products/pages/AdminProductOrdersImportPage.test.tsx` | 3816 |
| `src/features/kangur/ui/components/music/useKangurMusicSynth.test.tsx` | 3348 |
| `src/features/kangur/ui/components/KangurPrimaryNavigation.test.tsx` | 2426 |
| `src/features/filemaker/__tests__/campaigns.test.ts` | 1664 |
| `src/features/filemaker/settings/campaign-summarizers.ts` | 1411 |
| `src/features/filemaker/pages/AdminFilemakerCampaignEditPage.sections.tsx` | 1256 |
| `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx` | 1140 |
| `src/features/kangur/admin/components/KangurAiTutorContentSettingsPanel.tsx` | 1139 |
| `src/features/kangur/admin/AdminKangurLessonsManagerPage.tsx` | 1137 |
| `src/features/kangur/ui/components/animations/AgenticCodingAnimations.Secondary.tsx` | 1137 |
| `src/features/kangur/ui/components/KangurParentDashboardLearnerManagementWidget.tsx` | 1131 |
| `src/features/products/pages/AdminProductOrdersImportPage.tsx` | 1130 |
| `src/features/cms/components/frontend/CmsStorefrontAppearance.logic.ts` | 1128 |
| `src/features/kangur/ui/pages/Lessons.test.tsx` | 1124 |
| `src/features/kangur/ui/components/NumberBalanceRushGame.tsx` | 1119 |
| `src/features/kangur/ui/components/SubtractingLesson.tsx` | 1116 |
| `src/features/filemaker/pages/AdminFilemakerCampaignRunPage.tsx` | 1095 |
| `src/features/kangur/ui/services/delegated-assignments.ts` | 1083 |
| `src/features/filemaker/server/campaign-runtime.ts` | 1082 |
| `src/features/filemaker/server/filemaker-mail-service.ts` | 1082 |
