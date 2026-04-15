---
owner: 'Platform Team'
last_reviewed: '2026-04-15'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Architecture & Performance Baseline

Generated at: 2026-04-15T14:56:08.509Z

## Snapshot

- Source files: 10457
- Source lines: 1781962
- use client files: 1782
- Files >= 1000 LOC: 19
- Files >= 1500 LOC: 9
- Largest file: `src/features/products/server/parts/product-scan-amazon-script.part1.ts` (2939 LOC)
- API routes: 30
- API delegated server routes: 187
- API routes without apiHandler/delegation: 0
- API explicit cache policy coverage: 313/30 (1043.3%)
- Cross-feature dependency pairs: 2
- Shared -> features imports: 0
- setInterval occurrences: 0
- Prop-drilling chains (depth >= 3): 9
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
| `src/features/products/components/list/ProductAmazonScanModal.test.tsx` | 4175 |
| `src/features/products/components/form/ProductFormScans.test.tsx` | 3065 |
| `src/features/products/server/parts/product-scan-amazon-script.part1.ts` | 2939 |
| `src/features/products/server/parts/product-scan-1688-script.part1.ts` | 2227 |
| `src/features/products/server/product-scans-service.amazon.test.ts` | 2166 |
| `src/features/products/components/list/ProductAmazonScanModal.tsx` | 2130 |
| `src/features/products/components/ProductModals.test.tsx` | 1920 |
| `src/features/products/server/product-scan-amazon-evaluator.ts` | 1712 |
| `src/features/integrations/services/tradera-listing-service.test.ts` | 1676 |
| `src/features/integrations/components/listings/product-listings-modal/listing-item/ProductListingDetails.test.tsx` | 1673 |
| `src/features/products/server/parts/product-scan-amazon-script.part2.ts` | 1665 |
| `src/features/ai/ai-paths/services/playwright-node-runner.ts` | 1599 |
| `src/features/products/components/form/ProductFormScans.tsx` | 1582 |
| `src/features/products/pages/AdminProductScannerSettingsPage.tsx` | 1540 |
| `src/shared/lib/browser-execution/sequencers/AmazonScanSequencer.ts` | 1517 |
| `src/features/products/server/product-scans-service.helpers.ts` | 1512 |
| `src/features/integrations/services/tradera-listing/BrowserListing.3.test.ts` | 1498 |
| `src/features/integrations/services/tradera-listing/BrowserListing.1.test.ts` | 1442 |
| `src/features/integrations/services/tradera-listing/script-partials/part-5.ts` | 1417 |
| `src/features/products/server/product-scans-sync-amazon-handlers.ts` | 1377 |
