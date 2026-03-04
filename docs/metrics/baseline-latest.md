# Architecture & Performance Baseline

Generated at: 2026-03-04T02:36:06.951Z

## Snapshot

- Source files: 4188
- Source lines: 649815
- use client files: 1279
- Files >= 1000 LOC: 5
- Files >= 1500 LOC: 1
- Largest file: `src/features/case-resolver/__tests__/workspace.test.ts` (1806 LOC)
- API routes: 318
- API delegated server routes: 15
- API routes without apiHandler/delegation: 0
- API explicit cache policy coverage: 318/318 (100.0%)
- Cross-feature dependency pairs: 71
- Shared -> features imports: 13
- setInterval occurrences: 22

## Top API Hotspots (by LOC)

| Route | LOC |
| --- | ---: |
| `src/app/api/integrations/exports/base/[setting]/route.ts` | 85 |
| `src/app/api/chatbot/agent/[runId]/[action]/route.ts` | 83 |
| `src/app/api/integrations/imports/base/[setting]/route.ts` | 69 |
| `src/app/api/products/[id]/studio/[action]/route.ts` | 40 |
| `src/app/api/marketplace/[resource]/route.ts` | 37 |
| `src/app/api/products/[id]/route.ts` | 31 |
| `src/app/api/price-groups/[id]/route.ts` | 28 |
| `src/app/api/countries/[id]/route.ts` | 25 |
| `src/app/api/currencies/[id]/route.ts` | 25 |
| `src/app/api/languages/[id]/route.ts` | 25 |
| `src/app/api/auth/users/[id]/route.ts` | 23 |
| `src/app/api/products/sync/profiles/[id]/route.ts` | 23 |
| `src/app/api/ai/schema/[entity]/route.ts` | 22 |
| `src/app/api/v2/metadata/[type]/[id]/route.ts` | 22 |
| `src/app/api/v2/products/entities/[type]/[id]/route.ts` | 22 |

## Top Cross-Feature Dependencies

| Edge | References |
| --- | ---: |
| `case-resolver -> foldertree` | 19 |
| `cms -> gsap` | 19 |
| `case-resolver -> case-resolver-capture` | 16 |
| `ai -> products` | 14 |
| `case-resolver -> filemaker` | 13 |
| `drafter -> products` | 13 |
| `case-resolver -> document-editor` | 12 |
| `jobs -> ai` | 12 |
| `products -> integrations` | 12 |
| `case-resolver -> ai` | 10 |
| `cms -> viewer3d` | 8 |
| `integrations -> products` | 8 |
| `products -> internationalization` | 8 |
| `integrations -> playwright` | 7 |
| `products -> ai` | 7 |

## Top File Hotspots (by LOC)

| File | LOC |
| --- | ---: |
| `src/features/case-resolver/__tests__/workspace.test.ts` | 1806 |
| `src/shared/contracts/prompt-exploder.ts` | 1163 |
| `src/shared/contracts/ai-paths-core/nodes.ts` | 1161 |
| `src/shared/lib/ai-paths/core/utils/__tests__/graph-compile.test.ts` | 1159 |
| `src/shared/contracts/cms.ts` | 1012 |
| `src/shared/lib/ai-paths/core/validation-engine/docs-registry-adapter.loaders.ts` | 986 |
| `src/features/case-resolver/context/AdminCaseResolverCasesContext.tsx` | 960 |
| `src/app/api/image-studio/slots/[slotId]/autoscale/handler.test.ts` | 931 |
| `src/app/api/image-studio/slots/[slotId]/crop/handler.ts` | 929 |
| `src/features/ai/ai-paths/services/runtime-analytics-service.ts` | 919 |
| `src/shared/lib/documentation/catalogs/validator-docs.ts` | 907 |
| `src/features/case-resolver-capture/__tests__/proposals.test.ts` | 901 |
| `src/shared/lib/ai-paths/hooks/useAiPathTriggerEvent.ts` | 899 |
| `src/shared/lib/ai-brain/context/BrainContext.tsx` | 892 |
| `src/features/notesapp/context/NoteFormContext.tsx` | 890 |
| `src/features/ai/ai-paths/context/hooks/useStateBridge.ts` | 889 |
| `src/features/ai/ai-paths/services/path-run-service.ts` | 888 |
| `src/features/products/hooks/useProductFormValidator.ts` | 886 |
| `src/shared/lib/observability/system-log-repository.ts` | 883 |
| `src/features/integrations/services/imports/base-import-item-processor.ts` | 877 |
