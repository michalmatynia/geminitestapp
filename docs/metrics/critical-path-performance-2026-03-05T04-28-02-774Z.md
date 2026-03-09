---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: false
---
# Critical Path Performance Report

Generated at: 2026-03-05T04:28:02.774Z

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

| Path | Status | Total LOC | Budget LOC | LOC Delta | Branch Points | Branch Budget | Branch Delta |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Authentication + Session Bootstrap (API) | PASS | 184 | 240 | -56 | 10 | 14 | -4 |
| Products CRUD + Listing Refresh (API) | PASS | 138 | 180 | -42 | 10 | 14 | -4 |
| Image Studio Generate + Preview (API) | PASS | 711 | 760 | -49 | 85 | 95 | -10 |
| AI Paths Run Execution (API) | PASS | 220 | 260 | -40 | 15 | 22 | -7 |
| Case Resolver OCR + Capture Mapping (API) | PASS | 90 | 120 | -30 | 11 | 15 | -4 |

## UI File Breakdown

### Authentication + Session Bootstrap (UI)

- `src/features/auth/pages/public/SignInPage.tsx`: 183 LOC | 8 branch points

### Products CRUD + Listing Refresh (UI)

- `src/features/products/pages/AdminProductsPage.tsx`: 43 LOC | 0 branch points

### Image Studio Generate + Preview (UI)

- `src/features/ai/image-studio/pages/AdminImageStudioPage.tsx`: 311 LOC | 15 branch points

### AI Paths Run Execution (UI)

- `src/features/ai/ai-paths/pages/AdminAiPathsPage.tsx`: 84 LOC | 0 branch points

### Case Resolver OCR + Capture Mapping (UI)

- `src/features/case-resolver/pages/AdminCaseResolverPage.tsx`: 28 LOC | 0 branch points

## API File Breakdown

### Authentication + Session Bootstrap (API)

- `src/app/api/auth/verify-credentials/handler.ts`: 184 LOC | 10 branch points

### Products CRUD + Listing Refresh (API)

- `src/app/api/v2/products/handler.ts`: 138 LOC | 10 branch points

### Image Studio Generate + Preview (API)

- `src/app/api/image-studio/projects/[projectId]/handler.ts`: 711 LOC | 85 branch points

### AI Paths Run Execution (API)

- `src/app/api/ai-paths/runs/handler.ts`: 220 LOC | 15 branch points

### Case Resolver OCR + Capture Mapping (API)

- `src/app/api/case-resolver/ocr/jobs/handler.ts`: 90 LOC | 11 branch points

## Top Repo Hotspots (Reference)

| File | LOC |
| --- | ---: |
| `src/shared/lib/ai-paths/portable-engine/index.ts` | 2931 |
| `src/features/case-resolver/__tests__/workspace.test.ts` | 1802 |
| `src/features/case-resolver/__tests__/workspace-persistence.test.ts` | 1521 |
| `src/shared/lib/ai-paths/core/utils/__tests__/graph-compile.test.ts` | 1406 |
| `src/shared/contracts/image-studio.ts` | 1240 |
| `src/shared/contracts/ai-paths-core/nodes.ts` | 1161 |
| `src/shared/lib/observability/system-logger.ts` | 1090 |
| `src/shared/lib/ai-paths/core/runtime/engine-core.ts` | 1060 |
| `src/shared/lib/ai-paths/portable-engine/__tests__/portable-engine.test.ts` | 1052 |
| `src/shared/contracts/cms.ts` | 1029 |

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
- Branch points are a coarse static control-flow complexity heuristic (if/switch/case/catch/for/while).
- Keep critical-path pages/routes below budget before adding more conditional branches.
