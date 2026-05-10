---
owner: 'Platform Team'
last_reviewed: '2026-05-10'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Architecture & Performance Baseline

Generated at: 2026-05-10T01:05:09.478Z

## Snapshot

- Source files: 13170
- Source lines: 2143450
- use client files: 2362
- Files >= 1000 LOC: 39
- Files >= 1500 LOC: 12
- Largest file: `src/features/filemaker/components/page/OrganizationJobListingsSection.tsx` (4883 LOC)
- API routes: 30
- API delegated server routes: 247
- API routes without apiHandler/delegation: 19
- API explicit cache policy coverage: 379/30 (1263.3%)
- Cross-feature dependency pairs: 4
- Shared -> features imports: 5
- setInterval occurrences: 0
- Prop-drilling chains (depth >= 3): 2133
- Prop-drilling chains (depth >= 4): 691

## Top API Hotspots (by LOC)

| Route | LOC |
| --- | ---: |
| `src/app/api/v2/integrations/[[...path]]/route.ts` | 160 |
| `src/app/api/v2/products/[[...path]]/route.ts` | 136 |
| `src/app/api/image-studio/[[...path]]/route.ts` | 124 |
| `src/app/api/agentcreator/[[...path]]/route.ts` | 115 |
| `src/app/api/ai-paths/[[...path]]/route.ts` | 104 |
| `src/app/api/chatbot/[[...path]]/route.ts` | 80 |
| `src/app/api/kangur/[[...path]]/route.ts` | 60 |
| `src/app/api/marketplace/[resource]/route.ts` | 37 |
| `src/app/api/settings/route.ts` | 37 |
| `src/app/api/kangur/auth/parent-magic-link/exchange/route.ts` | 30 |
| `src/app/api/kangur/auth/parent-magic-link/request/route.ts` | 30 |
| `src/app/api/settings/google-oauth/route.ts` | 28 |
| `src/app/api/settings/lite/route.ts` | 27 |
| `src/app/api/user/preferences/route.ts` | 26 |
| `src/app/api/client-errors/route.ts` | 25 |

## Top Cross-Feature Dependencies

| Edge | References |
| --- | ---: |
| `filemaker -> kangur` | 15 |
| `products -> playwright` | 3 |
| `products -> integrations` | 3 |
| `playwright -> integrations` | 2 |

## Top File Hotspots (by LOC)

| File | LOC |
| --- | ---: |
| `src/features/filemaker/components/page/OrganizationJobListingsSection.tsx` | 4883 |
| `src/features/products/components/list/ProductScanModal.test.tsx` | 4631 |
| `src/features/filemaker/server/filemaker-job-board-scrape.test.ts` | 3676 |
| `src/features/playwright/server/ai-step-service.test.ts` | 3242 |
| `src/features/playwright/pages/AdminPlaywrightProgrammableIntegrationPage.test.tsx` | 3129 |
| `src/features/products/components/form/ProductFormScans.test.tsx` | 2832 |
| `src/shared/lib/browser-execution/__tests__/product-scan-sequencers.test.ts` | 2825 |
| `src/features/filemaker/components/page/FilemakerJobBoardScrapeModal.tsx` | 2629 |
| `src/features/filemaker/__tests__/AdminFilemakerMailPages.routing.test.tsx` | 2451 |
| `src/features/playwright/server/ai-step-service.ts` | 2443 |
| `src/features/filemaker/server/filemaker-job-board-scrape.ts` | 2263 |
| `src/features/products/server/product-scans-service.amazon.test.ts` | 2255 |
| `src/features/integrations/services/tradera-listing-service.test.ts` | 2224 |
| `src/features/filemaker/components/page/FilemakerJobBoardScrapeModal.test.tsx` | 2146 |
| `src/features/ai/ai-paths/services/playwright-node-runner.ts` | 2111 |
| `src/features/filemaker/__tests__/OrganizationJobListingsSection.test.tsx` | 2060 |
| `src/features/integrations/components/listings/product-listings-modal/listing-item/ProductListingDetails.test.tsx` | 2027 |
| `src/features/integrations/services/tradera-listing/OtherOperations.test.ts` | 2026 |
| `src/features/filemaker/server/job-board-scrape/offer-from-evaluation.ts` | 2020 |
| `src/features/products/components/ProductModals.test.tsx` | 1920 |
