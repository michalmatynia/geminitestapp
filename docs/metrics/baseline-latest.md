# Architecture & Performance Baseline

Generated at: 2026-03-06T02:57:28.494Z

## Snapshot

- Source files: 4348
- Source lines: 714038
- use client files: 1319
- Files >= 1000 LOC: 14
- Files >= 1500 LOC: 3
- Largest file: `src/shared/lib/ai-paths/portable-engine/sinks.server.ts` (3026 LOC)
- API routes: 314
- API delegated server routes: 13
- API routes without apiHandler/delegation: 0
- API explicit cache policy coverage: 314/314 (100.0%)
- Cross-feature dependency pairs: 74
- Shared -> features imports: 11
- setInterval occurrences: 21
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
| `src/shared/lib/ai-paths/portable-engine/sinks.server.ts` | 3026 |
| `src/shared/lib/ai-paths/portable-engine/index.ts` | 2389 |
| `src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.v3-pilot-parity.test.ts` | 1832 |
| `src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts` | 1366 |
| `src/shared/lib/ai-paths/core/runtime/engine-core.ts` | 1247 |
| `src/app/api/ai-paths/portable-engine/trend-snapshots/handler.test.ts` | 1246 |
| `src/features/ai/ai-paths/components/ai-paths-settings/sections/AiPathsCanvasView.tsx` | 1201 |
| `src/features/ai/ai-paths/components/__tests__/canvas-connection-preview.test.tsx` | 1130 |
| `src/features/ai/ai-paths/services/path-run-executor/index.ts` | 1119 |
| `src/features/ai/ai-paths/services/runtime-analytics-service.ts` | 1107 |
| `src/shared/lib/ai-paths/portable-engine/portable-engine-observability.ts` | 1084 |
| `src/features/kangur/ui/components/KangurIllustrations.jsx` | 1024 |
| `src/features/ai/ai-paths/components/ai-paths-settings/runtime/useAiPathsServerExecution.ts` | 1001 |
| `src/features/ai/ai-paths/services/path-run-service.ts` | 1001 |
| `src/shared/lib/ai-paths/core/validation-engine/docs-registry-adapter.loaders.ts` | 989 |
| `src/shared/contracts/ai-paths.ts` | 987 |
| `src/shared/lib/ai-paths/portable-engine/__tests__/portable-engine.test.ts` | 961 |
| `src/features/ai/ai-paths/components/JobQueueContext.tsx` | 957 |
| `src/shared/lib/ai-paths/hooks/useAiPathTriggerEvent.ts` | 941 |
| `src/shared/utils/folder-tree-profiles-v2/defaults.ts` | 940 |
