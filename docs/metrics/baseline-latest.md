---
owner: 'Platform Team'
last_reviewed: '2026-04-10'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Architecture & Performance Baseline

Generated at: 2026-04-10T11:37:09.941Z

## Snapshot

- Source files: 10178
- Source lines: 1671569
- use client files: 1771
- Files >= 1000 LOC: 7
- Files >= 1500 LOC: 0
- Largest file: `src/features/integrations/pages/marketplaces/tradera/TraderaParameterMappingPage.tsx` (1203 LOC)
- API routes: 30
- API delegated server routes: 185
- API routes without apiHandler/delegation: 0
- API explicit cache policy coverage: 311/30 (1036.7%)
- Cross-feature dependency pairs: 0
- Shared -> features imports: 0
- setInterval occurrences: 0
- Prop-drilling chains (depth >= 3): 230
- Prop-drilling chains (depth >= 4): 66

## Top API Hotspots (by LOC)

| Route | LOC |
| --- | ---: |
| `src/app/api/v2/integrations/[[...path]]/route.ts` | 144 |
| `src/app/api/image-studio/[[...path]]/route.ts` | 124 |
| `src/app/api/ai-paths/[[...path]]/route.ts` | 114 |
| `src/app/api/v2/products/[[...path]]/route.ts` | 112 |
| `src/app/api/agentcreator/[[...path]]/route.ts` | 109 |
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
| `src/features/integrations/services/tradera-listing/browser.test.ts` | 4292 |
| `src/features/products/components/ProductModals.test.tsx` | 1535 |
| `src/features/products/components/list/ProductColumns.test.tsx` | 1208 |
| `src/features/integrations/pages/marketplaces/tradera/TraderaParameterMappingPage.tsx` | 1203 |
| `src/features/integrations/services/imports/base-import-item-processor.ts` | 1170 |
| `src/features/integrations/services/tradera-listing-service.test.ts` | 1111 |
| `src/features/products/hooks/useProductListState.tsx` | 1105 |
| `src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts` | 1095 |
| `src/features/integrations/components/listings/TraderaStatusCheckModal.tsx` | 1085 |
| `src/features/integrations/services/tradera-listing/check-status-script.ts` | 1085 |
| `src/features/integrations/components/listings/product-listings-modal/ProductListingsContent.test.tsx` | 1055 |
| `src/shared/lib/products/services/productService.test.ts` | 1048 |
| `src/features/integrations/components/listings/product-listings-modal/listing-item/ProductListingDetails.tsx` | 1045 |
| `src/features/integrations/services/tradera-listing/tradera-browser-scripted.ts` | 1028 |
| `src/features/products/components/list/columns/buttons/BaseQuickExportButton.test.tsx` | 1015 |
| `src/features/ai/ai-paths/components/__tests__/run-trace-utils.test.ts` | 999 |
| `src/features/ai/ai-paths/services/playwright-node-runner.ts` | 993 |
| `src/shared/lib/ai-paths/hooks/trigger-event-settings.test.ts` | 993 |
| `src/shared/lib/products/services/product-ai-graph-model-payload.test.ts` | 991 |
| `src/app/api/kangur/ai-tutor/chat/handler.ts` | 989 |
