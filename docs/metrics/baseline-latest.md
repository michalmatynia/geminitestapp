# Architecture & Performance Baseline

Generated at: 2026-02-24T21:31:45.591Z

## Snapshot

- Source files: 3099
- Source lines: 556538
- use client files: 1038
- Files >= 1000 LOC: 52
- Files >= 1500 LOC: 18
- Largest file: `src/features/filemaker/settings.ts` (3063 LOC)
- API routes: 314
- API delegated server routes: 15
- API routes without apiHandler/delegation: 0
- API explicit cache policy coverage: 314/314 (100.0%)
- Cross-feature dependency pairs: 133
- Shared -> features imports: 16
- setInterval occurrences: 24

## Top API Hotspots (by LOC)

| Route | LOC |
| --- | ---: |
| `src/app/api/chatbot/agent/[runId]/[action]/route.ts` | 90 |
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
| `src/app/api/products/categories/route.ts` | 24 |

## Top Cross-Feature Dependencies

| Edge | References |
| --- | ---: |
| `ai -> observability` | 45 |
| `products -> observability` | 32 |
| `jobs -> observability` | 30 |
| `jobs -> ai` | 29 |
| `prompt-exploder -> prompt-engine` | 28 |
| `products -> ai` | 27 |
| `integrations -> products` | 24 |
| `ai -> products` | 23 |
| `case-resolver -> ai` | 19 |
| `integrations -> observability` | 19 |
| `ai -> prompt-engine` | 16 |
| `cms -> gsap` | 16 |
| `drafter -> products` | 16 |
| `case-resolver -> case-resolver-capture` | 14 |
| `cms -> observability` | 14 |

## Top File Hotspots (by LOC)

| File | LOC |
| --- | ---: |
| `src/features/filemaker/settings.ts` | 3063 |
| `src/features/ai/ai-paths/context/hooks/useCanvasInteractions.ts` | 2546 |
| `src/features/case-resolver/hooks/useAdminCaseResolverPageState.ts` | 2519 |
| `src/shared/ui/vector-canvas.tsx` | 2498 |
| `src/features/case-resolver/hooks/useCaseResolverState.ts` | 2285 |
| `src/features/ai/image-studio/components/GenerationToolbar.tsx` | 2111 |
| `src/features/products/services/product-studio-service.ts` | 2070 |
| `src/features/ai/ai-paths/components/canvas-board.tsx` | 1918 |
| `src/features/ai/ai-paths/services/path-run-executor.ts` | 1898 |
| `src/shared/contracts/ai-paths.ts` | 1832 |
| `src/features/ai/ai-paths/server/settings-store.ts` | 1825 |
| `src/features/ai/ai-paths/lib/core/validation-engine/docs-registry-adapter.ts` | 1816 |
| `src/features/case-resolver/components/CaseResolverFolderTree.tsx` | 1675 |
| `src/features/ai/ai-paths/lib/core/normalization/index.ts` | 1663 |
| `src/features/ai/image-studio/components/RightSidebar.tsx` | 1587 |
| `src/features/case-resolver/__tests__/settings.test.ts` | 1549 |
| `src/features/products/components/form/ProductFormStudio.tsx` | 1529 |
| `src/features/products/services/product-repository/prisma-product-repository.ts` | 1517 |
| `src/shared/contracts/products.ts` | 1490 |
| `src/features/ai/ai-paths/components/ai-paths-settings/runtime/useAiPathsLocalExecution.ts` | 1455 |
