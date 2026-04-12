---
owner: 'Platform Team'
last_reviewed: '2026-04-12'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Architecture & Performance Baseline

Generated at: 2026-04-12T10:55:35.354Z

## Snapshot

- Source files: 10350
- Source lines: 1735645
- use client files: 1761
- Files >= 1000 LOC: 10
- Files >= 1500 LOC: 4
- Largest file: `src/features/products/server/product-scans-service.ts` (2670 LOC)
- API routes: 30
- API delegated server routes: 186
- API routes without apiHandler/delegation: 0
- API explicit cache policy coverage: 312/30 (1040.0%)
- Cross-feature dependency pairs: 2
- Shared -> features imports: 0
- setInterval occurrences: 0
- Prop-drilling chains (depth >= 3): 88
- Prop-drilling chains (depth >= 4): 0

## Top API Hotspots (by LOC)

| Route | LOC |
| --- | ---: |
| `src/app/api/v2/integrations/[[...path]]/route.ts` | 144 |
| `src/app/api/image-studio/[[...path]]/route.ts` | 124 |
| `src/app/api/v2/products/[[...path]]/route.ts` | 120 |
| `src/app/api/ai-paths/[[...path]]/route.ts` | 116 |
| `src/app/api/agentcreator/[[...path]]/route.ts` | 115 |
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
| `products -> playwright` | 2 |
| `products -> integrations` | 1 |

## Top File Hotspots (by LOC)

| File | LOC |
| --- | ---: |
| `src/features/integrations/services/tradera-listing/browser.test.ts` | 4648 |
| `src/features/products/server/product-scans-service.test.ts` | 4610 |
| `src/features/products/components/list/ProductAmazonScanModal.test.tsx` | 3677 |
| `src/features/products/server/product-scans-service.ts` | 2670 |
| `src/features/products/components/form/ProductFormScans.test.tsx` | 2518 |
| `src/features/products/components/ProductModals.test.tsx` | 1730 |
| `src/features/products/server/parts/product-scan-amazon-script.part1.ts` | 1721 |
| `src/features/products/components/list/ProductAmazonScanModal.tsx` | 1528 |
| `src/features/product-sync/services/product-sync-service.ts` | 1502 |
| `src/features/products/server/parts/product-scan-amazon-script.part2.ts` | 1475 |
| `src/features/products/server/parts/product-scan-1688-script.part1.ts` | 1366 |
| `src/features/products/components/list/ProductColumns.test.tsx` | 1302 |
| `src/features/integrations/services/tradera-listing-service.test.ts` | 1288 |
| `src/features/products/components/scans/ProductScanAmazonDetails.tsx` | 1249 |
| `src/features/products/components/form/ProductFormScans.tsx` | 1183 |
| `src/features/product-sync/components/ProductSyncSettings.tsx` | 1111 |
| `src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts` | 1095 |
| `src/features/ai/ai-paths/services/path-run-executor/callbacks.ts` | 1056 |
| `src/features/integrations/components/listings/product-listings-modal/ProductListingsContent.test.tsx` | 1055 |
| `src/shared/lib/products/services/productService.test.ts` | 1048 |
