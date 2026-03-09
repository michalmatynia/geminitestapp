---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: false
---
# Critical Path Performance Report

Generated at: 2026-03-05T03:23:24.341Z

## Summary

- Paths checked: 10
- Within budget: 10
- Over budget: 0
- UI paths checked: 5 (pass=5, fail=0)
- API routes checked: 5 (pass=5, fail=0)

## Critical UI Path Budgets (LOC)

| Path | Status | Total LOC | Budget LOC | Delta |
| --- | --- | ---: | ---: | ---: |
| Authentication + Session Bootstrap (UI) | PASS | 183 | 220 | -37 |
| Products CRUD + Listing Refresh (UI) | PASS | 43 | 80 | -37 |
| Image Studio Generate + Preview (UI) | PASS | 311 | 360 | -49 |
| AI Paths Run Execution (UI) | PASS | 84 | 120 | -36 |
| Case Resolver OCR + Capture Mapping (UI) | PASS | 28 | 60 | -32 |

## Critical API Route Budgets (LOC)

| Path | Status | Total LOC | Budget LOC | Delta |
| --- | --- | ---: | ---: | ---: |
| Authentication + Session Bootstrap (API) | PASS | 184 | 240 | -56 |
| Products CRUD + Listing Refresh (API) | PASS | 138 | 180 | -42 |
| Image Studio Generate + Preview (API) | PASS | 711 | 760 | -49 |
| AI Paths Run Execution (API) | PASS | 220 | 260 | -40 |
| Case Resolver OCR + Capture Mapping (API) | PASS | 90 | 120 | -30 |

## UI File Breakdown

### Authentication + Session Bootstrap (UI)

- `src/features/auth/pages/public/SignInPage.tsx`: 183 LOC

### Products CRUD + Listing Refresh (UI)

- `src/features/products/pages/AdminProductsPage.tsx`: 43 LOC

### Image Studio Generate + Preview (UI)

- `src/features/ai/image-studio/pages/AdminImageStudioPage.tsx`: 311 LOC

### AI Paths Run Execution (UI)

- `src/features/ai/ai-paths/pages/AdminAiPathsPage.tsx`: 84 LOC

### Case Resolver OCR + Capture Mapping (UI)

- `src/features/case-resolver/pages/AdminCaseResolverPage.tsx`: 28 LOC

## API File Breakdown

### Authentication + Session Bootstrap (API)

- `src/app/api/auth/verify-credentials/handler.ts`: 184 LOC

### Products CRUD + Listing Refresh (API)

- `src/app/api/v2/products/handler.ts`: 138 LOC

### Image Studio Generate + Preview (API)

- `src/app/api/image-studio/projects/[projectId]/handler.ts`: 711 LOC

### AI Paths Run Execution (API)

- `src/app/api/ai-paths/runs/handler.ts`: 220 LOC

### Case Resolver OCR + Capture Mapping (API)

- `src/app/api/case-resolver/ocr/jobs/handler.ts`: 90 LOC

## Top Repo Hotspots (Reference)

| File | LOC |
| --- | ---: |
| `src/shared/lib/ai-paths/portable-engine/index.ts` | 1905 |
| `src/features/case-resolver/__tests__/workspace.test.ts` | 1802 |
| `src/features/case-resolver/__tests__/workspace-persistence.test.ts` | 1521 |
| `src/shared/lib/ai-paths/core/utils/__tests__/graph-compile.test.ts` | 1406 |
| `src/shared/contracts/image-studio.ts` | 1240 |
| `src/shared/contracts/ai-paths-core/nodes.ts` | 1161 |
| `src/shared/lib/observability/system-logger.ts` | 1090 |
| `src/shared/lib/ai-paths/core/runtime/engine-core.ts` | 1060 |
| `src/shared/contracts/cms.ts` | 1029 |
| `src/shared/lib/ai-paths/core/validation-engine/docs-registry-adapter.loaders.ts` | 986 |

## Top API Route Hotspots (Reference)

| Route | LOC |
| --- | ---: |
| `src/app/api/chatbot/agent/[runId]/[action]/route.ts` | 83 |
| `src/app/api/v2/products/[id]/studio/[action]/route.ts` | 40 |
| `src/app/api/marketplace/[resource]/route.ts` | 37 |
| `src/app/api/v2/products/[id]/route.ts` | 31 |
| `src/app/api/v2/integrations/imports/base/runs/route.ts` | 25 |
| `src/app/api/auth/users/[id]/route.ts` | 23 |
| `src/app/api/v2/products/sync/profiles/[id]/route.ts` | 23 |
| `src/app/api/ai/schema/[entity]/route.ts` | 22 |
| `src/app/api/v2/integrations/exports/base/[setting]/route.ts` | 22 |
| `src/app/api/v2/integrations/imports/base/[setting]/route.ts` | 22 |

## Notes

- LOC is a static complexity heuristic, not runtime latency.
- Keep critical-path pages/routes below budget before adding more conditional branches.
