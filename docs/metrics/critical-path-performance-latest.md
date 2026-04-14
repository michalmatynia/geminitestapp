---
owner: 'Platform Team'
last_reviewed: '2026-04-14'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Critical Path Performance Report

Generated at: 2026-04-14T12:37:41.093Z

## Summary

- Paths checked: 10
- Within budget: 10
- Over budget: 0
- UI paths checked: 5 (pass=5, fail=0)
- API routes checked: 5 (pass=5, fail=0)

## Critical UI Path Budgets (LOC)

| Path | Status | Total LOC | Budget LOC | Delta |
| --- | --- | ---: | ---: | ---: |
| Authentication + Session Bootstrap (UI) | PASS | 2 | 110 | -108 |
| Products CRUD + Listing Refresh (UI) | PASS | 2 | 40 | -38 |
| Image Studio Generate + Preview (UI) | PASS | 20 | 180 | -160 |
| AI Paths Run Execution (UI) | PASS | 15 | 60 | -45 |
| Case Resolver OCR + Capture Mapping (UI) | PASS | 25 | 30 | -5 |

## Critical API Route Budgets (LOC)

| Path | Status | Total LOC | Budget LOC | LOC Delta | Branch Points | Branch Budget | Branch Delta |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Authentication + Session Bootstrap (API) | PASS | 2 | 120 | -118 | 0 | 7 | -7 |
| Products CRUD + Listing Refresh (API) | PASS | 2 | 90 | -88 | 0 | 7 | -7 |
| Image Studio Generate + Preview (API) | PASS | 2 | 380 | -378 | 0 | 47 | -47 |
| AI Paths Run Execution (API) | PASS | 2 | 130 | -128 | 0 | 11 | -11 |
| Case Resolver OCR + Capture Mapping (API) | PASS | 2 | 60 | -58 | 0 | 7 | -7 |

## UI File Breakdown

### Authentication + Session Bootstrap (UI)

- `src/features/auth/pages/public/SignInPage.tsx`: 2 LOC | 0 branch points

### Products CRUD + Listing Refresh (UI)

- `src/features/products/pages/AdminProductsPage.tsx`: 2 LOC | 0 branch points

### Image Studio Generate + Preview (UI)

- `src/features/ai/image-studio/pages/AdminImageStudioPage.tsx`: 20 LOC | 0 branch points

### AI Paths Run Execution (UI)

- `src/features/ai/ai-paths/pages/AdminAiPathsPage.tsx`: 15 LOC | 0 branch points

### Case Resolver OCR + Capture Mapping (UI)

- `src/features/case-resolver/pages/AdminCaseResolverPage.tsx`: 25 LOC | 1 branch points

## API File Breakdown

### Authentication + Session Bootstrap (API)

- `src/app/api/auth/verify-credentials/handler.ts`: 2 LOC | 0 branch points

### Products CRUD + Listing Refresh (API)

- `src/app/api/v2/products/handler.ts`: 2 LOC | 0 branch points

### Image Studio Generate + Preview (API)

- `src/app/api/image-studio/projects/[projectId]/handler.ts`: 2 LOC | 0 branch points

### AI Paths Run Execution (API)

- `src/app/api/ai-paths/runs/handler.ts`: 2 LOC | 0 branch points

### Case Resolver OCR + Capture Mapping (API)

- `src/app/api/case-resolver/ocr/jobs/handler.ts`: 2 LOC | 0 branch points

## Top Repo Hotspots (Reference)

| File | LOC |
| --- | ---: |
| `src/features/products/server/product-scans-service.ts` | 4542 |
| `src/features/products/components/list/ProductAmazonScanModal.test.tsx` | 4175 |
| `src/features/products/server/parts/product-scan-amazon-script.part1.ts` | 3221 |
| `src/features/products/components/form/ProductFormScans.test.tsx` | 3065 |
| `src/features/products/server/parts/product-scan-1688-script.part1.ts` | 2205 |
| `src/features/products/server/product-scans-service.amazon.test.ts` | 2166 |
| `src/features/products/components/list/ProductAmazonScanModal.tsx` | 2130 |
| `src/features/products/components/ProductModals.test.tsx` | 1920 |
| `src/features/products/server/parts/product-scan-amazon-script.part2.ts` | 1719 |
| `src/features/products/server/product-scan-amazon-evaluator.ts` | 1709 |

## Top API Route Hotspots (Reference)

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

## Notes

- LOC is a static complexity heuristic, not runtime latency.
- Branch points are a coarse static control-flow complexity heuristic (if/switch/case/catch/for/while).
- Keep critical-path pages/routes below budget before adding more conditional branches.
