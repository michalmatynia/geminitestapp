# Architecture & Performance Baseline

Generated at: 2026-02-28T10:36:15.456Z

## Snapshot

- Source files: 3718
- Source lines: 599632
- use client files: 1233
- Files >= 1000 LOC: 5
- Files >= 1500 LOC: 1
- Largest file: `src/features/case-resolver/__tests__/settings.test.ts` (1774 LOC)
- API routes: 292
- API delegated server routes: 15
- API routes without apiHandler/delegation: 0
- API explicit cache policy coverage: 292/292 (100.0%)
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
| `src/app/api/auth/users/[id]/route.ts` | 23 |
| `src/app/api/products/sync/profiles/[id]/route.ts` | 23 |
| `src/app/api/v2/products/entities/[type]/[id]/route.ts` | 22 |
| `src/app/api/v2/products/metadata/[type]/[id]/route.ts` | 22 |
| `src/app/api/auth/users/[id]/security/route.ts` | 21 |
| `src/app/api/products/validator-patterns/route.ts` | 21 |
| `src/app/api/integrations/imports/base/runs/route.ts` | 20 |
| `src/app/api/products/categories/[id]/route.ts` | 20 |
| `src/app/api/products/categories/route.ts` | 20 |
| `src/app/api/products/validator-patterns/[id]/route.ts` | 20 |

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
| `src/shared/lib/ai-paths/core/utils/__tests__/graph-compile.test.ts` | 1127 |
| `src/app/api/image-studio/slots/[slotId]/upscale/handler.ts` | 1030 |
| `src/features/ai/image-studio/server/run-executor.ts` | 1022 |
| `src/features/prompt-exploder/pattern-pack-rules.ts` | 1000 |
| `src/features/filemaker/filemaker-settings.database.ts` | 999 |
| `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsCanvasInteractions.ts` | 985 |
| `src/features/ai/agent-runtime/execution/step-runner.ts` | 978 |
| `src/features/ai/insights/generator.ts` | 976 |
| `src/shared/utils/prompt-params.ts` | 969 |
| `src/features/notesapp/services/notes/note-repository/mongo-note-repository.ts` | 964 |
| `src/features/integrations/services/category-mapping-repository.ts` | 963 |
| `src/features/foldertree/v2/hooks/useFolderTreeInstanceV2.ts` | 962 |
| `src/features/case-resolver/utils/caseResolverUtils.ts` | 961 |
| `src/features/integrations/services/exports/base-exporter-template-mappings.ts` | 958 |
| `src/features/integrations/context/IntegrationsContext.tsx` | 956 |
| `src/shared/contracts/cms.ts` | 956 |
| `src/features/products/components/settings/validator-settings/controller-sequence-actions.ts` | 950 |
| `src/features/products/hooks/useProductListState.tsx` | 950 |
| `src/app/api/settings/handler.ts` | 942 |
