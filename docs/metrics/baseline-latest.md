# Architecture & Performance Baseline

Generated at: 2026-03-05T05:38:57.351Z

## Snapshot

- Source files: 4192
- Source lines: 672871
- use client files: 1310
- Files >= 1000 LOC: 10
- Files >= 1500 LOC: 2
- Largest file: `src/shared/lib/ai-paths/portable-engine/index.ts` (2931 LOC)
- API routes: 309
- API delegated server routes: 13
- API routes without apiHandler/delegation: 0
- API explicit cache policy coverage: 309/309 (100.0%)
- Cross-feature dependency pairs: 71
- Shared -> features imports: 11
- setInterval occurrences: 22
- Prop-drilling chains (depth >= 3): 0
- Prop-drilling chains (depth >= 4): 0

## Top API Hotspots (by LOC)

| Route | LOC |
| --- | ---: |
| `src/app/api/chatbot/agent/[runId]/[action]/route.ts` | 83 |
| `src/app/api/v2/products/[id]/studio/[action]/route.ts` | 40 |
| `src/app/api/marketplace/[resource]/route.ts` | 37 |
| `src/app/api/v2/products/[id]/route.ts` | 31 |
| `src/app/api/v2/integrations/imports/base/runs/route.ts` | 25 |
| `src/app/api/auth/users/[id]/route.ts` | 23 |
| `src/app/api/v2/products/sync/profiles/[id]/route.ts` | 23 |
| `src/app/api/ai/schema/[entity]/route.ts` | 22 |
| `src/app/api/v2/integrations/exports/base/[setting]/route.ts` | 22 |
| `src/app/api/v2/integrations/imports/base/[setting]/route.ts` | 22 |
| `src/app/api/v2/metadata/[type]/[id]/route.ts` | 22 |
| `src/app/api/v2/products/entities/[type]/[id]/route.ts` | 22 |
| `src/app/api/v2/products/metadata/[type]/[id]/route.ts` | 22 |
| `src/app/api/auth/users/[id]/security/route.ts` | 21 |
| `src/app/api/drafts/[id]/route.ts` | 21 |

## Top Cross-Feature Dependencies

| Edge | References |
| --- | ---: |
| `cms -> gsap` | 19 |
| `case-resolver -> case-resolver-capture` | 16 |
| `case-resolver -> foldertree` | 15 |
| `case-resolver -> filemaker` | 13 |
| `drafter -> products` | 13 |
| `case-resolver -> document-editor` | 12 |
| `jobs -> ai` | 12 |
| `products -> integrations` | 12 |
| `case-resolver -> ai` | 10 |
| `cms -> viewer3d` | 8 |
| `integrations -> products` | 8 |
| `products -> internationalization` | 8 |
| `ai -> products` | 7 |
| `integrations -> playwright` | 7 |
| `products -> foldertree` | 7 |

## Top File Hotspots (by LOC)

| File | LOC |
| --- | ---: |
| `src/shared/lib/ai-paths/portable-engine/index.ts` | 2931 |
| `src/shared/lib/ai-paths/portable-engine/sinks.server.ts` | 2844 |
| `src/shared/lib/ai-paths/core/utils/__tests__/graph-compile.test.ts` | 1406 |
| `src/features/case-resolver/__tests__/workspace-persistence.test.ts` | 1249 |
| `src/shared/contracts/image-studio.ts` | 1240 |
| `src/features/case-resolver/__tests__/workspace.test.ts` | 1223 |
| `src/shared/contracts/ai-paths-core/nodes.ts` | 1161 |
| `src/shared/lib/observability/system-logger.ts` | 1090 |
| `src/shared/lib/ai-paths/core/runtime/engine-core.ts` | 1060 |
| `src/shared/lib/ai-paths/portable-engine/__tests__/portable-engine.test.ts` | 1052 |
| `src/shared/lib/ai-paths/core/validation-engine/docs-registry-adapter.loaders.ts` | 986 |
| `src/features/ai/ai-paths/components/JobQueueContext.tsx` | 933 |
| `src/app/api/image-studio/slots/[slotId]/autoscale/handler.test.ts` | 931 |
| `src/app/api/image-studio/slots/[slotId]/crop/handler.ts` | 929 |
| `src/features/ai/ai-paths/services/runtime-analytics-service.ts` | 917 |
| `src/shared/lib/documentation/catalogs/validator-docs.ts` | 909 |
| `src/shared/lib/ai-paths/hooks/useAiPathTriggerEvent.ts` | 905 |
| `src/features/case-resolver-capture/__tests__/proposals.test.ts` | 901 |
| `src/features/ai/ai-paths/components/ai-paths-settings/runtime/useAiPathsServerExecution.ts` | 894 |
| `src/shared/contracts/cms.ts` | 894 |
