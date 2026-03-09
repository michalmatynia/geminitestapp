---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 7 Execution: Accessibility Smoke Gate

Date: 2026-03-05

## Objective

Add a fast, repeatable accessibility smoke suite across the five critical flow domains and enforce it in CI.

## Implemented Artifacts

- Script: `scripts/testing/run-accessibility-smoke-tests.mjs`
- NPM scripts:
  - `npm run test:accessibility-smoke`
  - `npm run test:accessibility-smoke:strict`
- CI integration:
  - `.github/workflows/test-matrix.yml`
  - Added job: `accessibility-smoke`
- Reports:
  - `docs/metrics/accessibility-smoke-latest.json`
  - `docs/metrics/accessibility-smoke-latest.md`
  - `docs/metrics/accessibility-smoke-2026-03-05T03-19-42-781Z.json`
  - `docs/metrics/accessibility-smoke-2026-03-05T03-19-42-781Z.md`

## Coverage Mapping

| Domain | Test |
| --- | --- |
| Auth | `__tests__/features/auth/pages/signin-page.test.tsx` |
| Products | `__tests__/features/products/pages/product-edit-page.test.tsx` |
| Image Studio | `src/features/ai/image-studio/components/__tests__/ImageStudioAnalysisSummaryChip.test.tsx` |
| AI Paths | `src/features/ai/ai-paths/components/__tests__/canvas-connector-tooltip.test.tsx` |
| Case Resolver | `src/features/case-resolver/__tests__/case-resolver-tree-header.test.tsx` |

## Validation

- `node scripts/testing/run-accessibility-smoke-tests.mjs`: pass (`5/5`)
- `node scripts/testing/run-accessibility-smoke-tests.mjs --strict --ci --no-history`: pass (`5/5`)
