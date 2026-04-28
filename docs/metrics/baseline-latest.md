---
owner: 'Platform Team'
last_reviewed: '2026-04-28'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Architecture & Performance Baseline

Generated at: 2026-04-28T16:20:23.093Z

## Snapshot

- Source files: 11820
- Source lines: 1967842
- use client files: 2106
- Files >= 1000 LOC: 39
- Files >= 1500 LOC: 10
- Largest file: `src/features/products/server/product-scan-ai-evaluator.ts` (2751 LOC)
- API routes: 31
- API delegated server routes: 241
- API routes without apiHandler/delegation: 2
- API explicit cache policy coverage: 372/31 (1200.0%)
- Cross-feature dependency pairs: 3
- Shared -> features imports: 0
- setInterval occurrences: 3
- Prop-drilling chains (depth >= 3): 1127
- Prop-drilling chains (depth >= 4): 394

## Top API Hotspots (by LOC)

| Route | LOC |
| --- | ---: |
| `src/app/api/v2/integrations/[[...path]]/route.ts` | 148 |
| `src/app/api/image-studio/[[...path]]/route.ts` | 124 |
| `src/app/api/v2/products/[[...path]]/route.ts` | 122 |
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
| `src/features/playwright/pages/AdminPlaywrightProgrammableIntegrationPage.test.tsx` | 3129 |
| `src/features/products/components/form/ProductFormScans.test.tsx` | 2832 |
| `src/shared/lib/browser-execution/__tests__/product-scan-sequencers.test.ts` | 2825 |
| `src/features/products/server/product-scan-ai-evaluator.ts` | 2751 |
| `src/features/playwright/server/ai-step-service.ts` | 2620 |
| `src/features/products/components/list/ProductScanModal.tsx` | 2578 |
| `src/features/filemaker/__tests__/AdminFilemakerMailPages.routing.test.tsx` | 2451 |
| `src/features/products/server/product-scans-service.amazon.test.ts` | 2255 |
| `src/features/integrations/services/tradera-listing-service.test.ts` | 2125 |
| `src/features/ai/ai-paths/services/playwright-node-runner.ts` | 2103 |
| `src/features/integrations/components/listings/product-listings-modal/listing-item/ProductListingDetails.test.tsx` | 2018 |
| `src/features/product-sync/services/product-sync-processor.ts` | 1925 |
| `src/features/products/components/ProductModals.test.tsx` | 1920 |
| `src/features/filemaker/server/filemaker-mail-service.ts` | 1896 |
| `src/features/filemaker/__tests__/AdminFilemakerMailClientPage.test.tsx` | 1781 |
| `src/features/job-board/server/email-finder.ts` | 1721 |
| `src/shared/lib/browser-execution/sequencers/Supplier1688ScanSequencer.ts` | 1667 |
| `src/shared/lib/browser-execution/selectors/tradera.ts` | 1643 |
