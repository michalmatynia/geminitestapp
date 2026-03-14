---
owner: 'Platform Team'
last_reviewed: '2026-03-14'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Critical Path Performance Report

Generated at: 2026-03-14T15:03:50.298Z

## Summary

- Paths checked: 10
- Within budget: 10
- Over budget: 0
- UI paths checked: 5 (pass=5, fail=0)
- API routes checked: 5 (pass=5, fail=0)

## Critical UI Path Budgets (LOC)

| Path | Status | Total LOC | Budget LOC | Delta |
| --- | --- | ---: | ---: | ---: |
| Authentication + Session Bootstrap (UI) | PASS | 184 | 220 | -36 |
| Products CRUD + Listing Refresh (UI) | PASS | 76 | 80 | -4 |
| Image Studio Generate + Preview (UI) | PASS | 325 | 360 | -35 |
| AI Paths Run Execution (UI) | PASS | 119 | 120 | -1 |
| Case Resolver OCR + Capture Mapping (UI) | PASS | 32 | 60 | -28 |

## Critical API Route Budgets (LOC)

| Path | Status | Total LOC | Budget LOC | LOC Delta | Branch Points | Branch Budget | Branch Delta |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Authentication + Session Bootstrap (API) | PASS | 221 | 240 | -19 | 12 | 14 | -2 |
| Products CRUD + Listing Refresh (API) | PASS | 180 | 180 | 0 | 14 | 14 | 0 |
| Image Studio Generate + Preview (API) | PASS | 673 | 760 | -87 | 79 | 95 | -16 |
| AI Paths Run Execution (API) | PASS | 255 | 260 | -5 | 22 | 22 | 0 |
| Case Resolver OCR + Capture Mapping (API) | PASS | 90 | 120 | -30 | 11 | 15 | -4 |

## UI File Breakdown

### Authentication + Session Bootstrap (UI)

- `src/features/auth/pages/public/SignInPage.tsx`: 184 LOC | 8 branch points

### Products CRUD + Listing Refresh (UI)

- `src/features/products/pages/AdminProductsPage.tsx`: 76 LOC | 0 branch points

### Image Studio Generate + Preview (UI)

- `src/features/ai/image-studio/pages/AdminImageStudioPage.tsx`: 325 LOC | 15 branch points

### AI Paths Run Execution (UI)

- `src/features/ai/ai-paths/pages/AdminAiPathsPage.tsx`: 119 LOC | 0 branch points

### Case Resolver OCR + Capture Mapping (UI)

- `src/features/case-resolver/pages/AdminCaseResolverPage.tsx`: 32 LOC | 0 branch points

## API File Breakdown

### Authentication + Session Bootstrap (API)

- `src/app/api/auth/verify-credentials/handler.ts`: 221 LOC | 12 branch points

### Products CRUD + Listing Refresh (API)

- `src/app/api/v2/products/handler.ts`: 180 LOC | 14 branch points

### Image Studio Generate + Preview (API)

- `src/app/api/image-studio/projects/[projectId]/handler.ts`: 673 LOC | 79 branch points

### AI Paths Run Execution (API)

- `src/app/api/ai-paths/runs/handler.ts`: 255 LOC | 22 branch points

### Case Resolver OCR + Capture Mapping (API)

- `src/app/api/case-resolver/ocr/jobs/handler.ts`: 90 LOC | 11 branch points

## Top Repo Hotspots (Reference)

| File | LOC |
| --- | ---: |
| `src/features/kangur/server/knowledge-graph/retrieval.ts` | 1649 |
| `src/features/kangur/admin/AdminKangurTestSuitesManagerPage.tsx` | 1572 |
| `src/features/kangur/ui/components/ClockTrainingGame.tsx` | 1466 |
| `src/features/kangur/admin/KangurLessonDocumentEditor.tsx` | 1442 |
| `src/features/kangur/server/context-registry.ts` | 1433 |
| `src/features/kangur/cms-builder/project-defaults.ts` | 1422 |
| `src/features/cms/components/frontend/CmsStorefrontAppearance.logic.ts` | 1415 |
| `src/shared/contracts/kangur-ai-tutor-native-guide-entries.ts` | 1414 |
| `src/features/kangur/observability/summary.ts` | 1401 |
| `src/features/kangur/ui/components/LessonAnimations.tsx` | 1374 |

## Top API Route Hotspots (Reference)

| Route | LOC |
| --- | ---: |
| `src/app/api/agent/leases/route.ts` | 119 |
| `src/app/api/chatbot/agent/[runId]/[action]/route.ts` | 83 |
| `src/app/api/agent/resources/route.ts` | 59 |
| `src/app/api/agent/approval-gates/route.ts` | 50 |
| `src/app/api/v2/products/[id]/route.ts` | 42 |
| `src/app/api/v2/products/[id]/studio/[action]/route.ts` | 40 |
| `src/app/api/marketplace/[resource]/route.ts` | 38 |
| `src/app/api/v2/products/metadata/[type]/[id]/route.ts` | 35 |
| `src/app/api/v2/products/metadata/[type]/route.ts` | 32 |
| `src/app/api/v2/products/sync/profiles/[id]/route.ts` | 30 |

## Notes

- LOC is a static complexity heuristic, not runtime latency.
- Branch points are a coarse static control-flow complexity heuristic (if/switch/case/catch/for/while).
- Keep critical-path pages/routes below budget before adding more conditional branches.
