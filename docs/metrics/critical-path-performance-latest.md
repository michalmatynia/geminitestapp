---
owner: 'Platform Team'
last_reviewed: '2026-03-21'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Critical Path Performance Report

Generated at: 2026-03-21T16:42:44.564Z

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
| Image Studio Generate + Preview (UI) | PASS | 22 | 180 | -158 |
| AI Paths Run Execution (UI) | PASS | 16 | 60 | -44 |
| Case Resolver OCR + Capture Mapping (UI) | PASS | 24 | 30 | -6 |

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

- `src/features/ai/image-studio/pages/AdminImageStudioPage.tsx`: 22 LOC | 0 branch points

### AI Paths Run Execution (UI)

- `src/features/ai/ai-paths/pages/AdminAiPathsPage.tsx`: 16 LOC | 0 branch points

### Case Resolver OCR + Capture Mapping (UI)

- `src/features/case-resolver/pages/AdminCaseResolverPage.tsx`: 24 LOC | 1 branch points

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
| `src/features/kangur/ui/components/KangurGameOperationSelectorWidget.tsx` | 1888 |
| `src/features/kangur/ui/components/SubtractingLesson.tsx` | 1701 |
| `src/features/kangur/ui/components/AddingLesson.tsx` | 1681 |
| `src/features/kangur/server/ai-tutor-content-locale-scaffold.ts` | 1617 |
| `src/features/kangur/ui/components/KangurPrimaryNavigation.test.tsx` | 1549 |
| `src/features/kangur/page-content-catalog.ts` | 1461 |
| `src/features/kangur/admin/appearance/appearance.copy.ts` | 1396 |
| `src/features/kangur/server/ai-tutor-native-guide-locale-scaffold.ts` | 1265 |
| `src/features/kangur/ui/pages/Game.tsx` | 1152 |
| `src/features/kangur/admin/components/KangurAiTutorContentSettingsPanel.tsx` | 1139 |

## Top API Route Hotspots (Reference)

| Route | LOC |
| --- | ---: |
| `src/app/api/v2/products/[[...path]]/route.ts` | 277 |
| `src/app/api/image-studio/[[...path]]/route.ts` | 232 |
| `src/app/api/v2/integrations/[[...path]]/route.ts` | 228 |
| `src/app/api/agentcreator/[[...path]]/route.ts` | 225 |
| `src/app/api/ai-paths/[[...path]]/route.ts` | 202 |
| `src/app/api/databases/[[...path]]/route.ts` | 200 |
| `src/app/api/chatbot/[[...path]]/route.ts` | 165 |
| `src/app/api/agent/leases/route.ts` | 122 |
| `src/app/api/kangur/[[...path]]/route.ts` | 62 |
| `src/app/api/agent/resources/route.ts` | 59 |

## Notes

- LOC is a static complexity heuristic, not runtime latency.
- Branch points are a coarse static control-flow complexity heuristic (if/switch/case/catch/for/while).
- Keep critical-path pages/routes below budget before adding more conditional branches.
