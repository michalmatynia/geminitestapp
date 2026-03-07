# Critical Path Performance Report

Generated at: 2026-03-07T10:03:08.199Z

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
| Image Studio Generate + Preview (UI) | PASS | 325 | 360 | -35 |
| AI Paths Run Execution (UI) | PASS | 90 | 120 | -30 |
| Case Resolver OCR + Capture Mapping (UI) | PASS | 31 | 60 | -29 |

## Critical API Route Budgets (LOC)

| Path | Status | Total LOC | Budget LOC | LOC Delta | Branch Points | Branch Budget | Branch Delta |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Authentication + Session Bootstrap (API) | PASS | 184 | 240 | -56 | 10 | 14 | -4 |
| Products CRUD + Listing Refresh (API) | PASS | 138 | 180 | -42 | 10 | 14 | -4 |
| Image Studio Generate + Preview (API) | PASS | 711 | 760 | -49 | 85 | 95 | -10 |
| AI Paths Run Execution (API) | PASS | 223 | 260 | -37 | 15 | 22 | -7 |
| Case Resolver OCR + Capture Mapping (API) | PASS | 90 | 120 | -30 | 11 | 15 | -4 |

## UI File Breakdown

### Authentication + Session Bootstrap (UI)

- `src/features/auth/pages/public/SignInPage.tsx`: 183 LOC | 8 branch points

### Products CRUD + Listing Refresh (UI)

- `src/features/products/pages/AdminProductsPage.tsx`: 43 LOC | 0 branch points

### Image Studio Generate + Preview (UI)

- `src/features/ai/image-studio/pages/AdminImageStudioPage.tsx`: 325 LOC | 15 branch points

### AI Paths Run Execution (UI)

- `src/features/ai/ai-paths/pages/AdminAiPathsPage.tsx`: 90 LOC | 0 branch points

### Case Resolver OCR + Capture Mapping (UI)

- `src/features/case-resolver/pages/AdminCaseResolverPage.tsx`: 31 LOC | 0 branch points

## API File Breakdown

### Authentication + Session Bootstrap (API)

- `src/app/api/auth/verify-credentials/handler.ts`: 184 LOC | 10 branch points

### Products CRUD + Listing Refresh (API)

- `src/app/api/v2/products/handler.ts`: 138 LOC | 10 branch points

### Image Studio Generate + Preview (API)

- `src/app/api/image-studio/projects/[projectId]/handler.ts`: 711 LOC | 85 branch points

### AI Paths Run Execution (API)

- `src/app/api/ai-paths/runs/handler.ts`: 223 LOC | 15 branch points

### Case Resolver OCR + Capture Mapping (API)

- `src/app/api/case-resolver/ocr/jobs/handler.ts`: 90 LOC | 11 branch points

## Top Repo Hotspots (Reference)

| File | LOC |
| --- | ---: |
| `src/features/kangur/cms-builder/project.ts` | 2855 |
| `src/features/kangur/ui/design/primitives.tsx` | 1170 |
| `src/features/cms/components/page-builder/registry/block-definitions-content.ts` | 1138 |
| `src/features/ai/ai-paths/components/__tests__/canvas-connection-preview.test.tsx` | 1055 |
| `src/features/ai/ai-paths/components/__tests__/run-trace-utils.test.ts` | 1003 |
| `src/shared/contracts/ai-paths.ts` | 993 |
| `src/shared/lib/ai-paths/core/validation-engine/docs-registry-adapter.loaders.ts` | 989 |
| `src/shared/contracts/image-studio.ts` | 983 |
| `src/shared/lib/ai-paths/portable-engine/__tests__/portable-engine.test.ts` | 969 |
| `src/features/ai/ai-paths/components/JobQueueContext.tsx` | 968 |

## Top API Route Hotspots (Reference)

| Route | LOC |
| --- | ---: |
| `src/app/api/chatbot/agent/[runId]/[action]/route.ts` | 83 |
| `src/app/api/v2/products/[id]/studio/[action]/route.ts` | 40 |
| `src/app/api/marketplace/[resource]/route.ts` | 37 |
| `src/app/api/v2/products/[id]/route.ts` | 36 |
| `src/app/api/v2/products/sync/profiles/[id]/route.ts` | 28 |
| `src/app/api/v2/products/categories/[id]/route.ts` | 25 |
| `src/app/api/v2/products/categories/route.ts` | 24 |
| `src/app/api/v2/products/parameters/route.ts` | 24 |
| `src/app/api/auth/users/[id]/route.ts` | 23 |
| `src/app/api/v2/products/sync/profiles/route.ts` | 23 |

## Notes

- LOC is a static complexity heuristic, not runtime latency.
- Branch points are a coarse static control-flow complexity heuristic (if/switch/case/catch/for/while).
- Keep critical-path pages/routes below budget before adding more conditional branches.
