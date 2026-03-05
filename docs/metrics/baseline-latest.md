# Architecture & Performance Baseline

Generated at: 2026-03-05T07:24:41.989Z

## Snapshot

- Source files: 4210
- Source lines: 677543
- use client files: 1309
- Files >= 1000 LOC: 2
- Files >= 1500 LOC: 2
- Largest file: `src/shared/lib/ai-paths/portable-engine/sinks.server.ts` (2984 LOC)
- API routes: 312
- API delegated server routes: 13
- API routes without apiHandler/delegation: 0
- API explicit cache policy coverage: 312/312 (100.0%)
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
| `src/shared/lib/ai-paths/portable-engine/sinks.server.ts` | 2984 |
| `src/shared/lib/ai-paths/portable-engine/index.ts` | 2241 |
| `src/app/api/ai-paths/portable-engine/trend-snapshots/handler.test.ts` | 993 |
| `src/features/case-resolver/__tests__/workspace-persistence.test.ts` | 987 |
| `src/shared/lib/ai-paths/core/validation-engine/docs-registry-adapter.loaders.ts` | 986 |
| `src/features/ai/ai-paths/components/__tests__/canvas-connection-preview.test.tsx` | 936 |
| `src/shared/contracts/image-studio.ts` | 936 |
| `src/shared/lib/ai-paths/core/runtime/engine-core.ts` | 934 |
| `src/app/api/image-studio/slots/[slotId]/autoscale/handler.test.ts` | 931 |
| `src/features/ai/ai-paths/components/ai-paths-settings/runtime/useAiPathsServerExecution.ts` | 931 |
| `src/app/api/image-studio/slots/[slotId]/crop/handler.ts` | 929 |
| `src/features/ai/ai-paths/components/JobQueueContext.tsx` | 927 |
| `src/shared/contracts/ai-paths-core/nodes.ts` | 924 |
| `src/features/ai/ai-paths/services/runtime-analytics-service.ts` | 917 |
| `src/shared/lib/documentation/catalogs/validator-docs.ts` | 909 |
| `src/shared/lib/ai-paths/hooks/useAiPathTriggerEvent.ts` | 905 |
| `src/features/case-resolver-capture/__tests__/proposals.test.ts` | 901 |
| `src/shared/contracts/cms.ts` | 894 |
| `src/shared/lib/ai-brain/context/BrainContext.tsx` | 891 |
| `src/features/notesapp/context/NoteFormContext.tsx` | 890 |
