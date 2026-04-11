---
owner: 'Platform Team'
last_reviewed: '2026-04-11'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Architecture & Performance Baseline

Generated at: 2026-04-11T09:25:02.858Z

## Snapshot

- Source files: 10264
- Source lines: 1688699
- use client files: 1780
- Files >= 1000 LOC: 0
- Files >= 1500 LOC: 0
- Largest file: `src/features/ai/ai-paths/services/playwright-node-runner.ts` (993 LOC)
- API routes: 30
- API delegated server routes: 185
- API routes without apiHandler/delegation: 0
- API explicit cache policy coverage: 311/30 (1036.7%)
- Cross-feature dependency pairs: 0
- Shared -> features imports: 0
- setInterval occurrences: 1
- Prop-drilling chains (depth >= 3): 230
- Prop-drilling chains (depth >= 4): 66

## Top API Hotspots (by LOC)

| Route | LOC |
| --- | ---: |
| `src/app/api/v2/integrations/[[...path]]/route.ts` | 144 |
| `src/app/api/image-studio/[[...path]]/route.ts` | 124 |
| `src/app/api/agentcreator/[[...path]]/route.ts` | 115 |
| `src/app/api/v2/products/[[...path]]/route.ts` | 115 |
| `src/app/api/ai-paths/[[...path]]/route.ts` | 114 |
| `src/app/api/databases/[[...path]]/route.ts` | 100 |
| `src/app/api/chatbot/[[...path]]/route.ts` | 80 |
| `src/app/api/kangur/[[...path]]/route.ts` | 60 |
| `src/app/api/marketplace/[resource]/route.ts` | 37 |
| `src/app/api/kangur/auth/parent-magic-link/exchange/route.ts` | 30 |
| `src/app/api/kangur/auth/parent-magic-link/request/route.ts` | 30 |
| `src/app/api/user/preferences/route.ts` | 26 |
| `src/app/api/v2/metadata/[type]/[id]/route.ts` | 24 |
| `src/app/api/cms/slugs/[id]/route.ts` | 23 |
| `src/app/api/auth/users/[id]/route.ts` | 22 |

## Top Cross-Feature Dependencies

| Edge | References |
| --- | ---: |

## Top File Hotspots (by LOC)

| File | LOC |
| --- | ---: |
| `src/features/integrations/services/tradera-listing/browser.test.ts` | 4399 |
| `src/features/products/components/ProductModals.test.tsx` | 1543 |
| `src/features/products/components/list/ProductColumns.test.tsx` | 1246 |
| `src/features/integrations/services/tradera-listing-service.test.ts` | 1130 |
| `src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts` | 1095 |
| `src/features/integrations/components/listings/product-listings-modal/ProductListingsContent.test.tsx` | 1055 |
| `src/shared/lib/products/services/productService.test.ts` | 1048 |
| `src/features/ai/ai-paths/components/ai-paths-settings/runtime/__tests__/useLocalExecutionTriggers.test.tsx` | 1035 |
| `src/features/products/components/list/columns/buttons/BaseQuickExportButton.test.tsx` | 1015 |
| `src/shared/lib/ai-paths/portable-engine/__tests__/portable-engine.test.ts` | 1014 |
| `src/features/products/server/product-scans-service.test.ts` | 1012 |
| `src/features/integrations/services/imports/base-mapper.test.ts` | 1004 |
| `src/features/ai/ai-paths/components/__tests__/run-trace-utils.test.ts` | 999 |
| `src/features/ai/ai-paths/services/playwright-node-runner.ts` | 993 |
| `src/shared/lib/ai-paths/hooks/trigger-event-settings.test.ts` | 993 |
| `src/features/integrations/pages/marketplaces/tradera/TraderaParameterMappingPage.tsx` | 991 |
| `src/shared/lib/products/services/product-ai-graph-model-payload.test.ts` | 991 |
| `src/app/api/kangur/ai-tutor/chat/handler.ts` | 989 |
| `src/app/api/settings/handler.ts` | 983 |
| `src/features/kangur/social/admin/workspace/AdminKangurSocialPage.hooks.test.tsx` | 982 |
