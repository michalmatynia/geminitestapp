---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 19 Execution: Lint Domain Test-Probe Evaluation

Date: 2026-03-05

## Objective

Evaluate optional `__tests__` inclusion in lint-domain reporting without destabilizing existing ESLint behavior.

## Implemented Artifacts

- Updated `scripts/quality/run-lint-domain-checks.mjs`:
  - Added optional flag: `--include-test-probes`
  - Added one representative test probe per domain:
    - Auth: `__tests__/features/auth/pages/signin-page.test.tsx`
    - Products: `__tests__/features/products/pages/product-edit-page.test.tsx`
    - AI Paths: `src/features/ai/ai-paths/components/__tests__/AiPathsRuntimeAnalysis.test.tsx`
    - Image Studio: `src/features/ai/image-studio/components/__tests__/ImageStudioAnalysisTab.apply-intent.test.tsx`
    - Case Resolver: `src/features/case-resolver/__tests__/case-resolver-tree-header.test.tsx`
  - Added markdown summary field: `Include test probes`
  - Added domain table column: `Test Probes`
  - Added note clarifying probe behavior with `--no-warn-ignored`.
- Refreshed reports:
  - `docs/metrics/lint-domain-checks-latest.json`
  - `docs/metrics/lint-domain-checks-latest.md`

## Validation

- `node scripts/quality/run-lint-domain-checks.mjs --include-test-probes --strict --ci --no-history`: pass (`5/5`)
- `node scripts/quality/run-lint-domain-checks.mjs --include-test-probes --ci --no-history`: pass (`5/5`)
- `node scripts/quality/run-lint-domain-checks.mjs --include-test-probes`: pass (`5/5`, history written)

## Notes

- This is an evaluation mode. Probe files are included safely and report context is expanded, while current ESLint ignore behavior is preserved.
