---
owner: 'Platform Team'
last_reviewed: '2026-04-29'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Architecture & Performance Baseline

Generated at: 2026-04-29T20:23:52.701Z

## Snapshot

- Source files: 11991
- Source lines: 2020401
- use client files: 2126
- Files >= 1000 LOC: 49
- Files >= 1500 LOC: 14
- Largest file: `src/features/products/server/product-scan-ai-evaluator.ts` (2751 LOC)
- API routes: 31
- API delegated server routes: 251
- API routes without apiHandler/delegation: 2
- API explicit cache policy coverage: 383/31 (1235.5%)
- Cross-feature dependency pairs: 3
- Shared -> features imports: 0
- setInterval occurrences: 5
- Prop-drilling chains (depth >= 3): 1250
- Prop-drilling chains (depth >= 4): 409

## Top API Hotspots (by LOC)

| Route | LOC |
| --- | ---: |
| `src/app/api/v2/integrations/[[...path]]/route.ts` | 148 |
| `src/app/api/v2/products/[[...path]]/route.ts` | 125 |
| `src/app/api/image-studio/[[...path]]/route.ts` | 124 |
| `src/app/api/agentcreator/[[...path]]/route.ts` | 115 |
| `src/app/api/ai-paths/[[...path]]/route.ts` | 104 |
| `src/app/api/databases/[[...path]]/route.ts` | 100 |
| `src/app/api/chatbot/[[...path]]/route.ts` | 80 |
| `src/app/api/kangur/[[...path]]/route.ts` | 60 |
| `src/app/api/marketplace/[resource]/route.ts` | 37 |
| `src/app/api/kangur/auth/parent-magic-link/exchange/route.ts` | 30 |
| `src/app/api/kangur/auth/parent-magic-link/request/route.ts` | 30 |
| `src/app/api/user/preferences/route.ts` | 26 |
| `src/app/api/v2/metadata/[type]/[id]/route.ts` | 24 |
| `src/app/api/v2/metadata/[type]/route.ts` | 24 |
| `src/app/api/ai/schema/[entity]/route.ts` | 23 |

## Top Cross-Feature Dependencies

| Edge | References |
| --- | ---: |
| `filemaker -> kangur` | 4 |
| `playwright -> integrations` | 2 |
| `products -> playwright` | 1 |

## Top File Hotspots (by LOC)

| File | LOC |
| --- | ---: |
| `src/features/products/components/list/ProductScanModal.test.tsx` | 4631 |
| `src/features/playwright/server/ai-step-service.test.ts` | 3242 |
| `src/features/filemaker/server/filemaker-job-board-scrape.test.ts` | 3189 |
| `src/features/playwright/pages/AdminPlaywrightProgrammableIntegrationPage.test.tsx` | 3129 |
| `src/features/products/components/form/ProductFormScans.test.tsx` | 2832 |
| `src/shared/lib/browser-execution/__tests__/product-scan-sequencers.test.ts` | 2825 |
| `src/features/products/server/product-scan-ai-evaluator.ts` | 2751 |
| `src/features/playwright/server/ai-step-service.ts` | 2650 |
| `src/features/products/components/list/ProductScanModal.tsx` | 2578 |
| `src/features/filemaker/components/page/FilemakerJobBoardScrapeModal.tsx` | 2513 |
| `src/features/filemaker/server/filemaker-job-board-scrape.ts` | 2492 |
| `src/features/filemaker/__tests__/AdminFilemakerMailPages.routing.test.tsx` | 2451 |
| `src/features/products/server/product-scans-service.amazon.test.ts` | 2255 |
| `src/features/integrations/services/tradera-listing-service.test.ts` | 2217 |
| `src/features/ai/ai-paths/services/playwright-node-runner.ts` | 2112 |
| `src/features/integrations/components/listings/product-listings-modal/listing-item/ProductListingDetails.test.tsx` | 2018 |
| `src/features/integrations/services/tradera-listing/OtherOperations.test.ts` | 2016 |
| `src/features/filemaker/server/job-board-scrape/offer-from-evaluation.ts` | 1977 |
| `src/features/filemaker/components/page/OrganizationJobListingsSection.tsx` | 1948 |
| `src/features/product-sync/services/product-sync-processor.ts` | 1925 |
