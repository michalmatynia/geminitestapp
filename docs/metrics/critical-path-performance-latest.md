---
owner: 'Platform Team'
last_reviewed: '2026-03-16'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Critical Path Performance Report

Generated at: 2026-03-16T20:05:22.952Z

## Summary

- Paths checked: 10
- Within budget: 10
- Over budget: 0
- UI paths checked: 5 (pass=5, fail=0)
- API routes checked: 5 (pass=5, fail=0)

## Critical UI Path Budgets (LOC)

| Path | Status | Total LOC | Budget LOC | Delta |
| --- | --- | ---: | ---: | ---: |
| Authentication + Session Bootstrap (UI) | PASS | 186 | 220 | -34 |
| Products CRUD + Listing Refresh (UI) | PASS | 76 | 80 | -4 |
| Image Studio Generate + Preview (UI) | PASS | 336 | 360 | -24 |
| AI Paths Run Execution (UI) | PASS | 120 | 120 | 0 |
| Case Resolver OCR + Capture Mapping (UI) | PASS | 32 | 60 | -28 |

## Critical API Route Budgets (LOC)

| Path | Status | Total LOC | Budget LOC | LOC Delta | Branch Points | Branch Budget | Branch Delta |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Authentication + Session Bootstrap (API) | PASS | 221 | 240 | -19 | 12 | 14 | -2 |
| Products CRUD + Listing Refresh (API) | PASS | 178 | 180 | -2 | 14 | 14 | 0 |
| Image Studio Generate + Preview (API) | PASS | 679 | 760 | -81 | 79 | 95 | -16 |
| AI Paths Run Execution (API) | PASS | 255 | 260 | -5 | 22 | 22 | 0 |
| Case Resolver OCR + Capture Mapping (API) | PASS | 94 | 120 | -26 | 11 | 15 | -4 |

## UI File Breakdown

### Authentication + Session Bootstrap (UI)

- `src/features/auth/pages/public/SignInPage.tsx`: 186 LOC | 8 branch points

### Products CRUD + Listing Refresh (UI)

- `src/features/products/pages/AdminProductsPage.tsx`: 76 LOC | 0 branch points

### Image Studio Generate + Preview (UI)

- `src/features/ai/image-studio/pages/AdminImageStudioPage.tsx`: 336 LOC | 15 branch points

### AI Paths Run Execution (UI)

- `src/features/ai/ai-paths/pages/AdminAiPathsPage.tsx`: 120 LOC | 0 branch points

### Case Resolver OCR + Capture Mapping (UI)

- `src/features/case-resolver/pages/AdminCaseResolverPage.tsx`: 32 LOC | 0 branch points

## API File Breakdown

### Authentication + Session Bootstrap (API)

- `src/app/api/auth/verify-credentials/handler.ts`: 221 LOC | 12 branch points

### Products CRUD + Listing Refresh (API)

- `src/app/api/v2/products/handler.ts`: 178 LOC | 14 branch points

### Image Studio Generate + Preview (API)

- `src/app/api/image-studio/projects/[projectId]/handler.ts`: 679 LOC | 79 branch points

### AI Paths Run Execution (API)

- `src/app/api/ai-paths/runs/handler.ts`: 255 LOC | 22 branch points

### Case Resolver OCR + Capture Mapping (API)

- `src/app/api/case-resolver/ocr/jobs/handler.ts`: 94 LOC | 11 branch points

## Top Repo Hotspots (Reference)

| File | LOC |
| --- | ---: |
| `src/features/kangur/ui/pages/Duels.tsx` | 3738 |
| `src/features/kangur/duels/server.ts` | 1672 |
| `src/features/kangur/ui/KangurLoginPage.tsx` | 1648 |
| `src/features/kangur/observability/summary.ts` | 1550 |
| `src/shared/contracts/kangur-ai-tutor-native-guide-entries.ts` | 1459 |
| `src/features/cms/components/frontend/CmsStorefrontAppearance.logic.ts` | 1414 |
| `src/features/kangur/server/ai-tutor-adaptive.ts` | 1226 |
| `src/features/kangur/admin/AdminKangurSettingsPage.tsx` | 1219 |
| `src/features/kangur/ui/components/AddingBallGame.tsx` | 1196 |
| `src/shared/contracts/kangur-ai-tutor-content.ts` | 1189 |

## Top API Route Hotspots (Reference)

| Route | LOC |
| --- | ---: |
| `src/app/api/kangur/[[...path]]/route.ts` | 1045 |
| `src/app/api/v2/products/[[...path]]/route.ts` | 383 |
| `src/app/api/v2/integrations/[[...path]]/route.ts` | 325 |
| `src/app/api/image-studio/[[...path]]/route.ts` | 289 |
| `src/app/api/ai-paths/[[...path]]/route.ts` | 256 |
| `src/app/api/databases/[[...path]]/route.ts` | 229 |
| `src/app/api/agentcreator/[[...path]]/route.ts` | 214 |
| `src/app/api/chatbot/[[...path]]/route.ts` | 172 |
| `src/app/api/agent/leases/route.ts` | 122 |
| `src/app/api/agent/resources/route.ts` | 59 |

## Notes

- LOC is a static complexity heuristic, not runtime latency.
- Branch points are a coarse static control-flow complexity heuristic (if/switch/case/catch/for/while).
- Keep critical-path pages/routes below budget before adding more conditional branches.
