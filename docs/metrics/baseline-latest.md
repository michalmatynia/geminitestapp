# Architecture & Performance Baseline

Generated at: 2026-02-28T00:41:31.938Z

## Snapshot

- Source files: 3703
- Source lines: 623294
- use client files: 1294
- Files >= 1000 LOC: 31
- Files >= 1500 LOC: 2
- Largest file: `src/shared/contracts/products.ts` (1978 LOC)
- API routes: 317
- API delegated server routes: 15
- API routes without apiHandler/delegation: 0
- API explicit cache policy coverage: 317/317 (100.0%)
- Cross-feature dependency pairs: 43
- Shared -> features imports: 82
- setInterval occurrences: 22

## Top API Hotspots (by LOC)

| Route | LOC |
| --- | ---: |
| `src/app/api/integrations/exports/base/[setting]/route.ts` | 85 |
| `src/app/api/chatbot/agent/[runId]/[action]/route.ts` | 83 |
| `src/app/api/integrations/imports/base/[setting]/route.ts` | 69 |
| `src/app/api/marketplace/[resource]/route.ts` | 37 |
| `src/app/api/products/[id]/route.ts` | 31 |
| `src/app/api/integrations/export-templates/[id]/route.ts` | 24 |
| `src/app/api/integrations/import-templates/[id]/route.ts` | 24 |
| `src/app/api/auth/users/[id]/route.ts` | 23 |
| `src/app/api/products/sync/profiles/[id]/route.ts` | 23 |
| `src/app/api/auth/users/[id]/security/route.ts` | 21 |
| `src/app/api/products/validator-patterns/route.ts` | 21 |
| `src/app/api/integrations/imports/base/runs/route.ts` | 20 |
| `src/app/api/products/categories/[id]/route.ts` | 20 |
| `src/app/api/products/categories/route.ts` | 20 |
| `src/app/api/products/parameters/route.ts` | 20 |

## Top Cross-Feature Dependencies

| Edge | References |
| --- | ---: |
| `integrations -> products` | 24 |
| `ai -> products` | 21 |
| `jobs -> ai` | 15 |
| `products -> integrations` | 11 |
| `case-resolver -> ai` | 9 |
| `products -> ai` | 9 |
| `jobs -> observability` | 8 |
| `case-resolver -> prompt-exploder` | 6 |
| `cms -> app-embeds` | 6 |
| `jobs -> integrations` | 6 |
| `ai -> jobs` | 5 |
| `jobs -> products` | 5 |
| `ai -> auth` | 4 |
| `data-import-export -> products` | 4 |
| `integrations -> observability` | 4 |

## Top File Hotspots (by LOC)

| File | LOC |
| --- | ---: |
| `src/shared/contracts/products.ts` | 1978 |
| `src/features/case-resolver/__tests__/settings.test.ts` | 1774 |
| `src/features/ai/ai-paths/components/ai-paths-settings/runtime/useAiPathsLocalExecution.logic.ts` | 1443 |
| `src/shared/contracts/integrations.ts` | 1407 |
| `src/app/api/image-studio/slots/[slotId]/autoscale/handler.ts` | 1306 |
| `src/app/api/image-studio/slots/[slotId]/center/handler.ts` | 1290 |
| `src/shared/lib/ai-paths/core/constants/index.ts` | 1287 |
| `src/features/cms/components/page-builder/ThemeSettingsPanel.tsx` | 1286 |
| `src/features/ai/ai-paths/services/path-run-executor.ts` | 1277 |
| `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsSettingsState.ts` | 1213 |
| `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsPersistence.ts` | 1200 |
| `src/features/ai/image-studio/analysis/shared.ts` | 1191 |
| `src/shared/ui/vector-canvas.tsx` | 1178 |
| `src/app/api/integrations/products/[id]/export-to-base/helpers.ts` | 1163 |
| `src/features/ai/ai-paths/context/hooks/useCanvasInteractions.ts` | 1147 |
| `src/shared/lib/case-resolver-capture/proposals.ts` | 1145 |
| `src/shared/contracts/ai-paths-core.ts` | 1143 |
| `src/features/ai/ai-paths/server/settings-store-parameter-inference.ts` | 1130 |
| `src/shared/lib/ai-paths/core/utils/__tests__/graph-compile.test.ts` | 1127 |
| `src/features/notesapp/services/notes/note-repository/mongo-note-repository.ts` | 1116 |
