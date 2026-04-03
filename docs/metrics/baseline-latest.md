---
owner: 'Platform Team'
last_reviewed: '2026-04-03'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Architecture & Performance Baseline

Generated at: 2026-04-03T17:35:06.608Z

## Snapshot

- Source files: 9421
- Source lines: 1563080
- use client files: 1710
- Files >= 1000 LOC: 0
- Files >= 1500 LOC: 0
- Largest file: `src/features/filemaker/components/FilemakerMailSidebar.tsx` (986 LOC)
- API routes: 30
- API delegated server routes: 176
- API routes without apiHandler/delegation: 0
- API explicit cache policy coverage: 302/30 (1006.7%)
- Cross-feature dependency pairs: 0
- Shared -> features imports: 0
- setInterval occurrences: 0
- Prop-drilling chains (depth >= 3): 230
- Prop-drilling chains (depth >= 4): 66

## Top API Hotspots (by LOC)

| Route | LOC |
| --- | ---: |
| `src/app/api/v2/integrations/[[...path]]/route.ts` | 235 |
| `src/app/api/ai-paths/[[...path]]/route.ts` | 205 |
| `src/app/api/databases/[[...path]]/route.ts` | 203 |
| `src/app/api/agentcreator/[[...path]]/route.ts` | 188 |
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

## Top File Hotspots (by LOC)

| File | LOC |
| --- | ---: |
| `src/features/integrations/services/tradera-listing/browser.test.ts` | 1412 |
| `src/features/products/components/list/ProductColumns.test.tsx` | 1038 |
| `src/features/ai/ai-paths/components/__tests__/run-trace-utils.test.ts` | 999 |
| `src/features/products/components/list/columns/buttons/BaseQuickExportButton.test.tsx` | 998 |
| `src/shared/lib/products/services/product-ai-graph-model-payload.test.ts` | 991 |
| `src/app/api/kangur/ai-tutor/chat/handler.ts` | 989 |
| `src/features/filemaker/components/FilemakerMailSidebar.tsx` | 986 |
| `src/features/kangur/social/admin/workspace/AdminKangurSocialPage.hooks.test.tsx` | 982 |
| `src/features/kangur/ui/services/geometry-drawing.ts` | 981 |
| `src/app/api/settings/handler.ts` | 978 |
| `src/features/kangur/admin/AdminKangurLessonsManagerPage.tsx` | 977 |
| `src/features/kangur/admin/KangurQuestionsManagerPanel.test.tsx` | 976 |
| `src/features/kangur/social/admin/workspace/hooks/useSocialPipelineRunner.test.tsx` | 970 |
| `src/features/kangur/ui/components/GeometrySymmetryGame.tsx` | 970 |
| `src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.hooks.ts` | 969 |
| `src/features/kangur/ui/components/KangurGameOperationSelectorWidget.test.tsx` | 968 |
| `src/features/kangur/ui/components/game-setup/__tests__/KangurGameOperationSelectorWidget.test.tsx` | 968 |
| `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx` | 968 |
| `src/shared/lib/ai-paths/portable-engine/__tests__/portable-engine.test.ts` | 967 |
| `src/features/kangur/ui/components/GeometryBasicsWorkshopGame.tsx` | 964 |
