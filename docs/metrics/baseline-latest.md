---
owner: 'Platform Team'
last_reviewed: '2026-05-18'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Architecture & Performance Baseline

Generated at: 2026-05-18T08:10:58.373Z

## Snapshot

- Source files: 13516
- Source lines: 2182850
- use client files: 2484
- Files >= 1000 LOC: 40
- Files >= 1500 LOC: 13
- Largest file: `src/features/filemaker/components/page/OrganizationJobListingsSection.tsx` (4868 LOC)
- API routes: 30
- API delegated server routes: 249
- API routes without apiHandler/delegation: 19
- API explicit cache policy coverage: 382/30 (1273.3%)
- Cross-feature dependency pairs: 4
- Shared -> features imports: 6
- setInterval occurrences: 2
- Prop-drilling chains (depth >= 3): 2727
- Prop-drilling chains (depth >= 4): 933

## Top API Hotspots (by LOC)

| Route | LOC |
| --- | ---: |
| `src/app/api/v2/integrations/[[...path]]/route.ts` | 160 |
| `src/app/api/v2/products/[[...path]]/route.ts` | 156 |
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
| `filemaker -> kangur` | 11 |
| `products -> playwright` | 3 |
| `products -> integrations` | 3 |
| `playwright -> integrations` | 2 |

## Top File Hotspots (by LOC)

| File | LOC |
| --- | ---: |
| `src/features/filemaker/components/page/OrganizationJobListingsSection.tsx` | 4868 |
| `src/features/products/components/list/ProductScanModal.test.tsx` | 4631 |
| `src/features/page-manager/milkbardesigners/AdminMilkbarDesignersCmsPage.tsx` | 3883 |
| `src/features/filemaker/server/filemaker-job-board-scrape.test.ts` | 3676 |
| `src/features/playwright/server/ai-step-service.test.ts` | 3242 |
| `src/features/playwright/pages/AdminPlaywrightProgrammableIntegrationPage.test.tsx` | 3129 |
| `src/features/products/components/form/ProductFormScans.test.tsx` | 2832 |
| `src/shared/lib/browser-execution/__tests__/product-scan-sequencers.test.ts` | 2825 |
| `src/features/filemaker/components/page/FilemakerJobBoardScrapeModal.tsx` | 2630 |
| `src/features/playwright/server/ai-step-service.ts` | 2441 |
| `src/features/integrations/services/tradera-listing-service.test.ts` | 2336 |
| `src/features/filemaker/server/filemaker-job-board-scrape.ts` | 2263 |
| `src/features/products/server/product-scans-service.amazon.test.ts` | 2255 |
| `src/features/integrations/components/listings/product-listings-modal/listing-item/ProductListingDetails.test.tsx` | 2170 |
| `src/features/integrations/services/tradera-listing/OtherOperations.test.ts` | 2151 |
| `src/features/filemaker/components/page/FilemakerJobBoardScrapeModal.test.tsx` | 2146 |
| `src/features/ai/ai-paths/services/playwright-node-runner.ts` | 2111 |
| `src/features/filemaker/__tests__/OrganizationJobListingsSection.test.tsx` | 2060 |
| `src/features/filemaker/server/job-board-scrape/offer-from-evaluation.ts` | 2020 |
| `src/features/filemaker/server/filemaker-mail-service.ts` | 1926 |
