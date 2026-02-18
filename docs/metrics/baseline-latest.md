# Architecture & Performance Baseline

Generated at: 2026-02-17T23:14:14.088Z

## Snapshot

- Source files: 2786
- Source lines: 443266
- use client files: 903
- Files >= 1000 LOC: 12
- Files >= 1500 LOC: 5
- Largest file: `src/features/database/services/database-sync.ts` (3352 LOC)
- API routes: 298
- API delegated server routes: 21
- API routes without apiHandler/delegation: 0
- API explicit cache policy coverage: 298/298 (100.0%)
- Cross-feature dependency pairs: 118
- Shared -> features imports: 15
- setInterval occurrences: 22

## Top API Hotspots (by LOC)

| Route | LOC |
| --- | ---: |
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
| `src/app/api/auth/users/[id]/security/route.ts` | 21 |

## Top Cross-Feature Dependencies

| Edge | References |
| --- | ---: |
| `integrations -> products` | 56 |
| `ai -> observability` | 45 |
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
| `src/features/case-resolver/pages/AdminCaseResolverCasesPage.tsx` | 2603 |
| `src/shared/ui/vector-canvas.tsx` | 2472 |
| `src/features/ai/ai-paths/lib/core/runtime/engine.ts` | 1968 |
| `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsSettingsState.ts` | 1502 |
| `src/features/ai/ai-paths/server/settings-store.ts` | 1176 |
| `src/features/ai/image-studio/components/SequencingPanel.tsx` | 1148 |
| `src/features/products/components/ProductImageManager.tsx` | 1060 |
| `src/features/foldertree/master/useMasterFolderTree.ts` | 1056 |
| `src/features/case-resolver/__tests__/settings.test.ts` | 1016 |
| `src/features/ai/image-studio/components/RightSidebar.tsx` | 1014 |
| `src/features/ai/image-studio/components/StudioModals.tsx` | 1007 |
| `src/app/api/image-studio/slots/[slotId]/upscale/handler.ts` | 999 |
| `src/features/data-import-export/context/ImportExportContext.tsx` | 997 |
| `src/features/ai/ai-paths/components/canvas-board.tsx` | 996 |
| `src/features/integrations/services/tradera-listing-service.ts` | 996 |
| `src/features/ai/agent-runtime/tools/index.ts` | 995 |
| `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsPersistence.ts` | 992 |
| `src/features/products/services/product-studio-service.ts` | 990 |
| `src/features/prompt-exploder/pattern-pack-rules.ts` | 990 |
