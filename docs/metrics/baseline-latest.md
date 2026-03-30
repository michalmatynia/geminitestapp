---
owner: 'Platform Team'
last_reviewed: '2026-03-30'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Architecture & Performance Baseline

Generated at: 2026-03-30T19:48:53.348Z

## Snapshot

- Source files: 9128
- Source lines: 1550768
- use client files: 1945
- Files >= 1000 LOC: 11
- Files >= 1500 LOC: 0
- Largest file: `src/features/kangur/ui/components/KangurParentDashboardAiTutorWidget.tsx` (1278 LOC)
- API routes: 30
- API delegated server routes: 172
- API routes without apiHandler/delegation: 0
- API explicit cache policy coverage: 298/30 (993.3%)
- Cross-feature dependency pairs: 3
- Shared -> features imports: 0
- setInterval occurrences: 1
- Prop-drilling chains (depth >= 3): 783
- Prop-drilling chains (depth >= 4): 207

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
| `kangur -> cms` | 16 |
| `filemaker -> document-editor` | 3 |
| `admin -> foldertree` | 2 |

## Top File Hotspots (by LOC)

| File | LOC |
| --- | ---: |
| `src/features/filemaker/__tests__/AdminFilemakerMailPages.recent-and-thread.test.tsx` | 3394 |
| `src/features/filemaker/__tests__/AdminFilemakerMailPages.test.tsx` | 1441 |
| `src/features/kangur/ui/components/KangurParentDashboardAiTutorWidget.tsx` | 1278 |
| `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.tsx` | 1278 |
| `src/features/kangur/ui/components/AddingSynthesisGame.tsx` | 1235 |
| `src/features/kangur/ui/components/KangurParentDashboardProgressWidget.tsx` | 1228 |
| `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardProgressWidget.tsx` | 1228 |
| `src/features/kangur/ui/pages/Game.test.tsx` | 1203 |
| `src/features/filemaker/pages/AdminFilemakerMailPage.tsx` | 1191 |
| `src/features/kangur/ui/pages/lessons/Lessons.ActiveLesson.test.tsx` | 1165 |
| `src/features/kangur/ui/pages/GamesLibrary.tabs.tsx` | 1141 |
| `src/features/kangur/social/admin/workspace/AdminKangurSocialPage.hooks.ts` | 1116 |
| `src/features/kangur/ui/components/NumberBalanceRushGame.hooks.ts` | 1100 |
| `src/features/kangur/social/admin/workspace/SocialPost.PlaywrightCaptureModal.test.tsx` | 1099 |
| `src/features/kangur/ui/components/KangurGameOperationSelectorWidget.tsx` | 1035 |
| `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorWidget.tsx` | 1035 |
| `src/features/filemaker/server/filemaker-mail-service.test.ts` | 1005 |
| `src/features/kangur/ui/pages/Lessons.test.tsx` | 1004 |
| `src/features/ai/ai-paths/components/__tests__/run-trace-utils.test.ts` | 999 |
| `src/shared/lib/products/services/product-ai-graph-model-payload.test.ts` | 991 |
