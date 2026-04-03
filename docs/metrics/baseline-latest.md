---
owner: 'Platform Team'
last_reviewed: '2026-04-03'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Architecture & Performance Baseline

Generated at: 2026-04-03T09:00:02.552Z

## Snapshot

- Source files: 9232
- Source lines: 1544322
- use client files: 1710
- Files >= 1000 LOC: 3
- Files >= 1500 LOC: 1
- Largest file: `src/features/integrations/services/tradera-listing/default-script.ts` (1795 LOC)
- API routes: 30
- API delegated server routes: 176
- API routes without apiHandler/delegation: 0
- API explicit cache policy coverage: 302/30 (1006.7%)
- Cross-feature dependency pairs: 0
- Shared -> features imports: 0
- setInterval occurrences: 0
- Prop-drilling chains (depth >= 3): 276
- Prop-drilling chains (depth >= 4): 76

## Top API Hotspots (by LOC)

| Route | LOC |
| --- | ---: |
| `src/app/api/v2/integrations/[[...path]]/route.ts` | 235 |
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

## Top File Hotspots (by LOC)

| File | LOC |
| --- | ---: |
| `src/features/integrations/services/tradera-listing/default-script.ts` | 1795 |
| `src/features/kangur/ui/components/KangurAiTutorGuidedCallout.tsx` | 1242 |
| `src/features/products/components/list/ProductColumns.test.tsx` | 1093 |
| `src/app/api/v2/integrations/[id]/connections/[connectionId]/test/handler.ts` | 1076 |
| `src/features/ai/ai-paths/services/playwright-node-runner.ts` | 1042 |
| `src/features/ai/ai-paths/components/__tests__/run-trace-utils.test.ts` | 999 |
| `src/shared/lib/products/services/product-ai-graph-model-payload.test.ts` | 991 |
| `src/app/api/kangur/ai-tutor/chat/handler.ts` | 989 |
| `src/features/products/components/list/columns/buttons/BaseQuickExportButton.test.tsx` | 989 |
| `src/features/filemaker/components/FilemakerMailSidebar.tsx` | 986 |
| `src/app/api/settings/handler.ts` | 982 |
| `src/features/kangur/social/admin/workspace/AdminKangurSocialPage.hooks.test.tsx` | 982 |
| `src/features/kangur/ui/services/geometry-drawing.ts` | 981 |
| `src/features/kangur/admin/AdminKangurLessonsManagerPage.tsx` | 977 |
| `src/features/kangur/admin/KangurQuestionsManagerPanel.test.tsx` | 976 |
| `src/features/kangur/ui/services/delegated-assignments.ts` | 975 |
| `src/features/kangur/social/admin/workspace/hooks/useSocialPipelineRunner.test.tsx` | 970 |
| `src/features/kangur/ui/components/GeometrySymmetryGame.tsx` | 970 |
| `src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.hooks.ts` | 969 |
| `src/features/kangur/ui/components/KangurGameOperationSelectorWidget.test.tsx` | 968 |
