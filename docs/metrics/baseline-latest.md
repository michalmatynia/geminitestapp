# Architecture & Performance Baseline

Generated at: 2026-03-03T08:36:14.313Z

## Snapshot

- Source files: 3909
- Source lines: 630978
- use client files: 1272
- Files >= 1000 LOC: 16
- Files >= 1500 LOC: 1
- Largest file: `src/features/case-resolver/__tests__/settings.test.ts` (1854 LOC)
- API routes: 318
- API delegated server routes: 15
- API routes without apiHandler/delegation: 0
- API explicit cache policy coverage: 318/318 (100.0%)
- Cross-feature dependency pairs: 70
- Shared -> features imports: 12
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
| `src/app/api/countries/[id]/route.ts` | 26 |
| `src/app/api/currencies/[id]/route.ts` | 26 |
| `src/app/api/ai/schema/[entity]/route.ts` | 25 |
| `src/app/api/languages/[id]/route.ts` | 25 |
| `src/app/api/auth/users/[id]/route.ts` | 23 |
| `src/app/api/products/sync/profiles/[id]/route.ts` | 23 |
| `src/app/api/v2/metadata/[type]/[id]/route.ts` | 22 |
| `src/app/api/v2/products/entities/[type]/[id]/route.ts` | 22 |

## Top Cross-Feature Dependencies

| Edge | References |
| --- | ---: |
| `cms -> gsap` | 19 |
| `ai -> products` | 14 |
| `case-resolver -> case-resolver-capture` | 14 |
| `drafter -> products` | 13 |
| `case-resolver -> filemaker` | 12 |
| `jobs -> ai` | 12 |
| `products -> integrations` | 12 |
| `case-resolver -> document-editor` | 11 |
| `case-resolver -> ai` | 10 |
| `case-resolver -> foldertree` | 8 |
| `cms -> viewer3d` | 8 |
| `integrations -> playwright` | 8 |
| `products -> internationalization` | 8 |
| `integrations -> products` | 7 |
| `products -> ai` | 7 |

## Top File Hotspots (by LOC)

| File | LOC |
| --- | ---: |
| `src/features/case-resolver/__tests__/settings.test.ts` | 1854 |
| `src/shared/utils/folder-tree-profiles-v2.ts` | 1426 |
| `src/features/prompt-exploder/pattern-pack-rules.ts` | 1283 |
| `src/features/case-resolver/workspace-persistence.ts` | 1243 |
| `src/shared/contracts/image-studio.ts` | 1197 |
| `src/shared/contracts/case-resolver/index.ts` | 1186 |
| `src/shared/lib/query-factories-v2.ts` | 1182 |
| `src/shared/contracts/ai-paths-core/nodes.ts` | 1179 |
| `src/shared/lib/ai-paths/core/utils/__tests__/graph-compile.test.ts` | 1156 |
| `src/shared/lib/ai-paths/hooks/useAiPathTriggerEvent.ts` | 1112 |
| `src/shared/contracts/prompt-exploder.ts` | 1069 |
| `src/features/prompt-exploder/utils/case-resolver-extraction.ts` | 1044 |
| `src/shared/lib/ai-paths/core/starter-workflows/registry.ts` | 1034 |
| `src/app/api/image-studio/slots/[slotId]/upscale/handler.ts` | 1030 |
| `src/features/foldertree/v2/hooks/useFolderTreeInstanceV2.ts` | 1024 |
| `src/features/observability/pages/SystemLogsPage.tsx` | 1016 |
| `src/features/prompt-exploder/parser.ts` | 994 |
| `src/features/ai/ai-paths/workers/aiPathRunQueue.ts` | 991 |
| `src/features/foldertree/pages/AdminFolderTreeSettingsPage.tsx` | 989 |
| `src/shared/lib/ai-paths/core/runtime/engine-core.ts` | 987 |
