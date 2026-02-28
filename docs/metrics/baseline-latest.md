# Architecture & Performance Baseline

Generated at: 2026-02-28T06:09:00.447Z

## Snapshot

- Source files: 3701
- Source lines: 607505
- use client files: 1287
- Files >= 1000 LOC: 21
- Files >= 1500 LOC: 1
- Largest file: `src/features/case-resolver/__tests__/settings.test.ts` (1774 LOC)
- API routes: 316
- API delegated server routes: 15
- API routes without apiHandler/delegation: 0
- API explicit cache policy coverage: 316/316 (100.0%)
- Cross-feature dependency pairs: 72
- Shared -> features imports: 7
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
| `cms -> gsap` | 19 |
| `drafter -> products` | 15 |
| `ai -> products` | 14 |
| `case-resolver -> case-resolver-capture` | 14 |
| `case-resolver -> filemaker` | 12 |
| `jobs -> ai` | 12 |
| `products -> integrations` | 12 |
| `case-resolver -> document-editor` | 11 |
| `case-resolver -> foldertree` | 10 |
| `case-resolver -> ai` | 10 |
| `cms -> viewer3d` | 8 |
| `integrations -> playwright` | 8 |
| `products -> internationalization` | 8 |
| `integrations -> products` | 7 |
| `products -> ai` | 7 |

## Top File Hotspots (by LOC)

| File | LOC |
| --- | ---: |
| `src/features/case-resolver/__tests__/settings.test.ts` | 1774 |
| `src/app/api/image-studio/slots/[slotId]/autoscale/handler.ts` | 1306 |
| `src/app/api/image-studio/slots/[slotId]/center/handler.ts` | 1293 |
| `src/features/cms/components/page-builder/ThemeSettingsPanel.tsx` | 1286 |
| `src/features/ai/image-studio/analysis/shared.ts` | 1235 |
| `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsPersistence.ts` | 1200 |
| `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsSettingsState.ts` | 1197 |
| `src/shared/ui/vector-canvas.tsx` | 1178 |
| `src/app/api/integrations/products/[id]/export-to-base/helpers.ts` | 1163 |
| `src/features/ai/ai-paths/context/hooks/useCanvasInteractions.ts` | 1147 |
| `src/features/ai/ai-paths/server/settings-store-parameter-inference.ts` | 1128 |
| `src/shared/lib/ai-paths/core/utils/__tests__/graph-compile.test.ts` | 1127 |
| `src/features/notesapp/services/notes/note-repository/mongo-note-repository.ts` | 1116 |
| `src/features/integrations/services/integration-repository.ts` | 1111 |
| `src/features/ai/image-studio/components/generation-toolbar/GenerationToolbar.handlers.ts` | 1110 |
| `src/features/ai/ai-paths/hooks/useDatabaseNodeConfigState.ts` | 1072 |
| `src/features/ai/agent-runtime/tools/index.ts` | 1056 |
| `src/app/api/image-studio/slots/[slotId]/upscale/handler.ts` | 1030 |
| `src/features/ai/image-studio/server/sequence-executor.ts` | 1030 |
| `src/features/ai/image-studio/server/run-executor.ts` | 1022 |
