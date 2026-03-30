---
owner: 'Platform Team'
last_reviewed: '2026-03-30'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Architecture & Performance Baseline

Generated at: 2026-03-30T23:50:53.156Z

## Snapshot

- Source files: 9066
- Source lines: 1516942
- use client files: 1728
- Files >= 1000 LOC: 1
- Files >= 1500 LOC: 0
- Largest file: `src/features/filemaker/pages/AdminFilemakerMailPage.tsx` (1191 LOC)
- API routes: 30
- API delegated server routes: 172
- API routes without apiHandler/delegation: 0
- API explicit cache policy coverage: 298/30 (993.3%)
- Cross-feature dependency pairs: 3
- Shared -> features imports: 0
- setInterval occurrences: 1
- Prop-drilling chains (depth >= 3): 582
- Prop-drilling chains (depth >= 4): 169

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
| `kangur -> cms` | 12 |
| `filemaker -> document-editor` | 3 |
| `admin -> foldertree` | 2 |

## Top File Hotspots (by LOC)

| File | LOC |
| --- | ---: |
| `src/features/filemaker/__tests__/AdminFilemakerMailPages.recent-and-thread.test.tsx` | 3394 |
| `src/features/filemaker/__tests__/AdminFilemakerMailPages.test.tsx` | 1441 |
| `src/features/filemaker/pages/AdminFilemakerMailPage.tsx` | 1191 |
| `src/features/kangur/social/admin/workspace/SocialPost.PlaywrightCaptureModal.test.tsx` | 1099 |
| `src/features/filemaker/server/filemaker-mail-service.test.ts` | 1005 |
| `src/features/ai/ai-paths/components/__tests__/run-trace-utils.test.ts` | 999 |
| `src/shared/lib/products/services/product-ai-graph-model-payload.test.ts` | 991 |
| `src/app/api/kangur/ai-tutor/chat/handler.ts` | 989 |
| `src/features/filemaker/components/FilemakerMailSidebar.tsx` | 986 |
| `src/features/kangur/social/admin/workspace/AdminKangurSocialPage.hooks.test.tsx` | 982 |
| `src/features/products/components/list/columns/buttons/BaseQuickExportButton.test.tsx` | 982 |
| `src/features/kangur/ui/services/geometry-drawing.ts` | 981 |
| `src/features/kangur/admin/AdminKangurLessonsManagerPage.tsx` | 977 |
| `src/features/kangur/admin/KangurQuestionsManagerPanel.test.tsx` | 976 |
| `src/features/kangur/ui/services/delegated-assignments.ts` | 975 |
| `src/shared/lib/ai-paths/core/starter-workflows/__tests__/registry.test.ts` | 973 |
| `src/features/kangur/social/admin/workspace/hooks/useSocialPipelineRunner.test.tsx` | 970 |
| `src/features/kangur/ui/components/GeometrySymmetryGame.tsx` | 970 |
| `src/features/kangur/ui/components/KangurAssignmentManager.hooks.ts` | 969 |
| `src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.hooks.ts` | 969 |
