---
owner: 'Platform Team'
last_reviewed: '2026-04-08'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Architecture & Performance Baseline

Generated at: 2026-04-08T18:58:41.357Z

## Snapshot

- Source files: 10049
- Source lines: 1633639
- use client files: 1749
- Files >= 1000 LOC: 6
- Files >= 1500 LOC: 0
- Largest file: `src/features/integrations/services/tradera-listing/script-partials/part-4.ts` (1423 LOC)
- API routes: 30
- API delegated server routes: 180
- API routes without apiHandler/delegation: 0
- API explicit cache policy coverage: 306/30 (1020.0%)
- Cross-feature dependency pairs: 0
- Shared -> features imports: 1
- setInterval occurrences: 0
- Prop-drilling chains (depth >= 3): 230
- Prop-drilling chains (depth >= 4): 66

## Top API Hotspots (by LOC)

| Route | LOC |
| --- | ---: |
| `src/app/api/v2/integrations/[[...path]]/route.ts` | 144 |
| `src/app/api/image-studio/[[...path]]/route.ts` | 124 |
| `src/app/api/ai-paths/[[...path]]/route.ts` | 114 |
| `src/app/api/v2/products/[[...path]]/route.ts` | 111 |
| `src/app/api/agentcreator/[[...path]]/route.ts` | 109 |
| `src/app/api/databases/[[...path]]/route.ts` | 100 |
| `src/app/api/chatbot/[[...path]]/route.ts` | 80 |
| `src/app/api/kangur/[[...path]]/route.ts` | 60 |
| `src/app/api/marketplace/[resource]/route.ts` | 37 |
| `src/app/api/kangur/auth/parent-magic-link/exchange/route.ts` | 30 |
| `src/app/api/kangur/auth/parent-magic-link/request/route.ts` | 30 |
| `src/app/api/v2/metadata/[type]/[id]/route.ts` | 24 |
| `src/app/api/cms/slugs/[id]/route.ts` | 23 |
| `src/app/api/auth/users/[id]/route.ts` | 22 |
| `src/app/api/ai/schema/[entity]/route.ts` | 21 |

## Top Cross-Feature Dependencies

| Edge | References |
| --- | ---: |

## Top File Hotspots (by LOC)

| File | LOC |
| --- | ---: |
| `src/features/integrations/services/tradera-listing/browser.test.ts` | 4093 |
| `src/features/integrations/services/tradera-listing/script-partials/part-4.ts` | 1423 |
| `src/features/integrations/services/imports/base-mapper.ts` | 1345 |
| `src/features/integrations/pages/marketplaces/tradera/TraderaParameterMappingPage.tsx` | 1203 |
| `src/features/products/components/list/ProductColumns.test.tsx` | 1154 |
| `src/features/products/hooks/useProductListState.tsx` | 1090 |
| `src/features/integrations/components/listings/product-listings-modal/ProductListingsContent.test.tsx` | 1055 |
| `src/features/integrations/services/imports/base-import-item-processor.ts` | 1031 |
| `src/features/integrations/components/listings/product-listings-modal/listing-item/ProductListingDetails.tsx` | 1022 |
| `src/features/products/components/list/columns/buttons/BaseQuickExportButton.test.tsx` | 1015 |
| `src/features/ai/ai-paths/components/__tests__/run-trace-utils.test.ts` | 999 |
| `src/shared/lib/products/services/product-ai-graph-model-payload.test.ts` | 991 |
| `src/app/api/kangur/ai-tutor/chat/handler.ts` | 989 |
| `src/features/kangur/social/admin/workspace/AdminKangurSocialPage.hooks.test.tsx` | 982 |
| `src/features/kangur/ui/services/geometry-drawing.ts` | 981 |
| `src/app/api/settings/handler.ts` | 978 |
| `src/features/kangur/admin/AdminKangurLessonsManagerPage.tsx` | 977 |
| `src/features/kangur/admin/KangurQuestionsManagerPanel.test.tsx` | 976 |
| `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx` | 974 |
| `src/features/kangur/social/admin/workspace/hooks/useSocialPipelineRunner.test.tsx` | 970 |
