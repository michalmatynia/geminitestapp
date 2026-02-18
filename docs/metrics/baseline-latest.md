# Architecture & Performance Baseline

Generated at: 2026-02-18T00:47:22.353Z

## Snapshot

- Source files: 2788
- Source lines: 444968
- use client files: 901
- Files >= 1000 LOC: 14
- Files >= 1500 LOC: 5
- Largest file: `src/features/database/services/database-sync.ts` (3352 LOC)
- API routes: 294
- API delegated server routes: 15
- API routes without apiHandler/delegation: 0
- API explicit cache policy coverage: 294/294 (100.0%)
- Cross-feature dependency pairs: 118
- Shared -> features imports: 15
- setInterval occurrences: 22

## Top API Hotspots (by LOC)

| Route | LOC |
| --- | ---: |
| `src/app/api/chatbot/agent/[runId]/[action]/route.ts` | 89 |
| `src/app/api/integrations/exports/base/[setting]/route.ts` | 86 |
| `src/app/api/integrations/imports/base/[setting]/route.ts` | 70 |
| `src/app/api/marketplace/[resource]/route.ts` | 38 |
| `src/app/api/products/[id]/route.ts` | 36 |
| `src/app/api/products/sync/profiles/[id]/route.ts` | 28 |
| `src/app/api/auth/users/[id]/route.ts` | 27 |
| `src/app/api/products/validator-patterns/route.ts` | 27 |
| `src/app/api/user/preferences/route.ts` | 26 |
| `src/app/api/integrations/imports/base/runs/route.ts` | 25 |
| `src/app/api/products/categories/[id]/route.ts` | 25 |
| `src/app/api/chatbot/sessions/route.ts` | 24 |
| `src/app/api/integrations/export-templates/[id]/route.ts` | 24 |
| `src/app/api/integrations/import-templates/[id]/route.ts` | 24 |
| `src/app/api/settings/route.ts` | 23 |

## Top Cross-Feature Dependencies

| Edge | References |
| --- | ---: |
| `integrations -> products` | 56 |
| `ai -> observability` | 46 |
| `prompt-exploder -> prompt-engine` | 32 |
| `jobs -> observability` | 30 |
| `products -> observability` | 30 |
| `drafter -> products` | 26 |
| `jobs -> ai` | 26 |
| `products -> ai` | 25 |
| `cms -> gsap` | 22 |
| `ai -> products` | 21 |
| `integrations -> observability` | 19 |
| `ai -> prompt-engine` | 17 |
| `case-resolver -> ai` | 16 |
| `integrations -> data-import-export` | 16 |
| `cms -> observability` | 14 |

## Top File Hotspots (by LOC)

| File | LOC |
| --- | ---: |
| `src/features/database/services/database-sync.ts` | 3352 |
| `src/features/case-resolver/pages/AdminCaseResolverCasesPage.tsx` | 2692 |
| `src/shared/ui/vector-canvas.tsx` | 2472 |
| `src/features/ai/ai-paths/lib/core/runtime/engine.ts` | 1968 |
| `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsSettingsState.ts` | 1502 |
| `src/features/ai/ai-paths/server/settings-store.ts` | 1205 |
| `src/features/ai/image-studio/components/SequencingPanel.tsx` | 1178 |
| `src/features/case-resolver/hooks/useCaseResolverState.ts` | 1161 |
| `src/features/products/components/ProductImageManager.tsx` | 1060 |
| `src/features/foldertree/master/useMasterFolderTree.ts` | 1056 |
| `src/features/ai/image-studio/components/RightSidebar.tsx` | 1023 |
| `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsPersistence.ts` | 1018 |
| `src/features/case-resolver/__tests__/settings.test.ts` | 1016 |
| `src/features/ai/image-studio/components/StudioModals.tsx` | 1007 |
| `src/app/api/image-studio/slots/[slotId]/upscale/handler.ts` | 999 |
| `src/features/data-import-export/context/ImportExportContext.tsx` | 997 |
| `src/features/ai/ai-paths/components/canvas-board.tsx` | 996 |
| `src/features/integrations/services/tradera-listing-service.ts` | 996 |
| `src/features/ai/agent-runtime/tools/index.ts` | 995 |
| `src/features/products/services/product-studio-service.ts` | 990 |
