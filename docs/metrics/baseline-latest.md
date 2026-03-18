---
owner: 'Platform Team'
last_reviewed: '2026-03-18'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Architecture & Performance Baseline

Generated at: 2026-03-18T11:31:55.006Z

## Snapshot

- Source files: 6759
- Source lines: 1082437
- use client files: 1
- Files >= 1000 LOC: 0
- Files >= 1500 LOC: 0
- Largest file: `src/app/(frontend)/products/[id]/ProductPublicPage.tsx` (273 LOC)
- API routes: 29
- API delegated server routes: 158
- API routes without apiHandler/delegation: 1
- API explicit cache policy coverage: 283/29 (975.9%)
- Cross-feature dependency pairs: 4
- Shared -> features imports: 1
- setInterval occurrences: 0
- Prop-drilling chains (depth >= 3): 43
- Prop-drilling chains (depth >= 4): 0

## Top API Hotspots (by LOC)

| Route | LOC |
| --- | ---: |
| `src/app/api/v2/products/[[...path]]/route.ts` | 282 |
| `src/app/api/image-studio/[[...path]]/route.ts` | 236 |
| `src/app/api/v2/integrations/[[...path]]/route.ts` | 230 |
| `src/app/api/agentcreator/[[...path]]/route.ts` | 214 |
| `src/app/api/ai-paths/[[...path]]/route.ts` | 206 |
| `src/app/api/databases/[[...path]]/route.ts` | 204 |
| `src/app/api/chatbot/[[...path]]/route.ts` | 169 |
| `src/app/api/agent/leases/route.ts` | 122 |
| `src/app/api/agent/resources/route.ts` | 59 |
| `src/app/api/kangur/[[...path]]/route.ts` | 57 |
| `src/app/api/agent/approval-gates/route.ts` | 50 |
| `src/app/api/marketplace/[resource]/route.ts` | 38 |
| `src/app/api/kangur/auth/parent-magic-link/exchange/route.ts` | 33 |
| `src/app/api/kangur/auth/parent-magic-link/request/route.ts` | 33 |
| `src/app/api/v2/metadata/[type]/[id]/route.ts` | 25 |

## Top Cross-Feature Dependencies

| Edge | References |
| --- | ---: |
| `kangur -> cms` | 11 |
| `products -> internationalization` | 4 |
| `admin -> foldertree` | 2 |
| `ai -> files` | 1 |

## Top File Hotspots (by LOC)

| File | LOC |
| --- | ---: |
| `src/features/kangur/ui/components/NumberBalanceRushGame.tsx` | 1051 |
| `src/features/kangur/ui/components/animations/AddingAnimations.tsx` | 1041 |
| `src/shared/lib/ai-paths/core/validation-engine/docs-registry-adapter.loaders.ts` | 1041 |
| `src/features/prompt-engine/context/PromptEngineContext.tsx` | 1035 |
| `src/shared/lib/ai-paths/portable-engine/__tests__/portable-engine.test.ts` | 1035 |
| `src/app/api/kangur/ai-tutor/chat/handler.ts` | 1000 |
| `src/features/ai/ai-paths/components/__tests__/run-trace-utils.test.ts` | 999 |
| `src/shared/contracts/kangur.ts` | 998 |
| `src/shared/lib/products/services/product-ai-graph-model-payload.test.ts` | 991 |
| `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx` | 986 |
| `src/features/kangur/ui/pages/Game.tsx` | 986 |
| `src/features/kangur/server/knowledge-graph/retrieval.ts` | 984 |
| `src/shared/contracts/cms.ts` | 974 |
| `src/shared/lib/ai-paths/core/starter-workflows/__tests__/registry.test.ts` | 973 |
| `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-mongo-update-plan.test.ts` | 958 |
| `src/features/kangur/ui/KangurLoginPage.tsx` | 956 |
| `src/features/kangur/ui/components/KangurGameOperationSelectorWidget.tsx` | 953 |
| `src/shared/contracts/ai-paths-core/nodes.ts` | 953 |
| `src/features/kangur/admin/KangurLessonDocumentEditor.test.tsx` | 946 |
| `src/features/ai/image-studio/components/VersionNodeMapCanvas.tsx` | 945 |
