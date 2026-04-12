---
owner: 'Platform Team'
last_reviewed: '2026-04-12'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Architecture & Performance Baseline

Generated at: 2026-04-12T19:22:01.638Z

## Snapshot

- Source files: 10386
- Source lines: 1752823
- use client files: 1767
- Files >= 1000 LOC: 15
- Files >= 1500 LOC: 7
- Largest file: `src/features/products/server/product-scans-service.ts` (3028 LOC)
- API routes: 30
- API delegated server routes: 187
- API routes without apiHandler/delegation: 0
- API explicit cache policy coverage: 313/30 (1043.3%)
- Cross-feature dependency pairs: 2
- Shared -> features imports: 0
- setInterval occurrences: 0
- Prop-drilling chains (depth >= 3): 12
- Prop-drilling chains (depth >= 4): 0

## Top API Hotspots (by LOC)

| Route | LOC |
| --- | ---: |
| `src/app/api/v2/integrations/[[...path]]/route.ts` | 144 |
| `src/app/api/image-studio/[[...path]]/route.ts` | 124 |
| `src/app/api/v2/products/[[...path]]/route.ts` | 121 |
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
| `src/features/products/components/list/ProductAmazonScanModal.test.tsx` | 4175 |
| `src/features/products/server/product-scans-service.ts` | 3028 |
| `src/features/products/components/form/ProductFormScans.test.tsx` | 3017 |
| `src/features/products/server/parts/product-scan-amazon-script.part1.ts` | 2915 |
| `src/features/products/components/list/ProductAmazonScanModal.tsx` | 2128 |
| `src/features/products/server/product-scans-service.amazon.test.ts` | 1919 |
| `src/features/products/components/ProductModals.test.tsx` | 1730 |
| `src/features/products/server/parts/product-scan-1688-script.part1.ts` | 1712 |
| `src/features/products/server/parts/product-scan-amazon-script.part2.ts` | 1664 |
| `src/features/ai/ai-paths/services/playwright-node-runner.ts` | 1599 |
| `src/features/products/components/form/ProductFormScans.tsx` | 1582 |
| `src/features/integrations/services/tradera-listing-service.test.ts` | 1356 |
| `src/features/product-sync/services/product-sync-processor.ts` | 1324 |
| `src/features/integrations/services/tradera-listing/BrowserListing.3.test.ts` | 1317 |
| `src/features/products/components/list/ProductColumns.test.tsx` | 1302 |
| `src/features/integrations/services/tradera-listing/BrowserListing.1.test.ts` | 1283 |
| `src/features/ai/ai-paths/services/__tests__/playwright-node-runner.test.ts` | 1253 |
| `src/features/products/components/scans/ProductScanAmazonDetails.tsx` | 1250 |
| `src/features/products/server/product-scans-service.helpers.ts` | 1159 |
| `src/features/integrations/services/tradera-listing/BrowserListing.2.test.ts` | 1155 |
