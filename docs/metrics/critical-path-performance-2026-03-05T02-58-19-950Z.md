# Critical Path Performance Report

Generated at: 2026-03-05T02:58:19.950Z

## Summary

- Paths checked: 5
- Within budget: 5
- Over budget: 0

## Critical Path Budgets (LOC)

| Path | Status | Total LOC | Budget LOC | Delta |
| --- | --- | ---: | ---: | ---: |
| Authentication + Session Bootstrap | PASS | 183 | 220 | -37 |
| Products CRUD + Listing Refresh | PASS | 43 | 80 | -37 |
| Image Studio Generate + Preview | PASS | 311 | 360 | -49 |
| AI Paths Run Execution | PASS | 84 | 120 | -36 |
| Case Resolver OCR + Capture Mapping | PASS | 28 | 60 | -32 |

## File Breakdown

### Authentication + Session Bootstrap

- `src/features/auth/pages/public/SignInPage.tsx`: 183 LOC

### Products CRUD + Listing Refresh

- `src/features/products/pages/AdminProductsPage.tsx`: 43 LOC

### Image Studio Generate + Preview

- `src/features/ai/image-studio/pages/AdminImageStudioPage.tsx`: 311 LOC

### AI Paths Run Execution

- `src/features/ai/ai-paths/pages/AdminAiPathsPage.tsx`: 84 LOC

### Case Resolver OCR + Capture Mapping

- `src/features/case-resolver/pages/AdminCaseResolverPage.tsx`: 28 LOC

## Top Repo Hotspots (Reference)

| File | LOC |
| --- | ---: |
| `src/features/case-resolver/__tests__/workspace.test.ts` | 1802 |
| `src/features/case-resolver/__tests__/workspace-persistence.test.ts` | 1521 |
| `src/shared/lib/ai-paths/core/utils/__tests__/graph-compile.test.ts` | 1406 |
| `src/shared/contracts/image-studio.ts` | 1238 |
| `src/shared/lib/ai-paths/portable-engine/index.ts` | 1176 |
| `src/shared/contracts/ai-paths-core/nodes.ts` | 1161 |
| `src/shared/lib/observability/system-logger.ts` | 1090 |
| `src/shared/lib/ai-paths/core/runtime/engine-core.ts` | 1060 |
| `src/shared/contracts/cms.ts` | 1029 |
| `src/shared/lib/ai-paths/core/validation-engine/docs-registry-adapter.loaders.ts` | 986 |

## Notes

- LOC is a static complexity heuristic, not runtime latency.
- Keep critical-path pages below budget before splitting into additional sections/hooks.
