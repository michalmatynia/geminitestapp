---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 16 Execution: Accessibility Keyboard Smoke Expansion

Date: 2026-03-05

## Objective

Expand accessibility smoke coverage with keyboard tab-order/focus assertions across all five critical-flow domains.

## Implemented Artifacts

- Updated tests:
  - `__tests__/features/auth/pages/signin-page.test.tsx`
    - Added keyboard tab-order assertions across email/password/sign-in controls.
  - `__tests__/features/products/pages/product-edit-page.test.tsx`
    - Added keyboard tab-order assertion from active tab trigger into tab panel content.
  - `src/features/ai/image-studio/components/__tests__/ImageStudioAnalysisTab.apply-intent.test.tsx`
    - Added keyboard traversal assertion ensuring the `Apply To Auto Scaler` action is reachable via tabbing.
  - `src/features/ai/ai-paths/components/__tests__/AiPathsRuntimeAnalysis.test.tsx`
    - Added keyboard focus + enter activation assertion for `Refresh` when runtime analytics is enabled.
  - `src/features/case-resolver/__tests__/case-resolver-tree-header.test.tsx`
    - Added keyboard tab-order assertion between primary case actions.
- Smoke suite validation target:
  - `scripts/testing/run-accessibility-smoke-tests.mjs`
  - confirms keyboard/focus coverage across five critical-flow suites in current mapping.
- Reports:
  - `docs/metrics/accessibility-smoke-latest.json`
  - `docs/metrics/accessibility-smoke-latest.md`
  - `docs/metrics/accessibility-smoke-2026-03-05T04-25-53-028Z.json`
  - `docs/metrics/accessibility-smoke-2026-03-05T04-25-53-028Z.md`

## Validation

- Targeted domain files:
  - `npx vitest run --project unit __tests__/features/auth/pages/signin-page.test.tsx __tests__/features/products/pages/product-edit-page.test.tsx src/features/ai/image-studio/components/__tests__/ImageStudioAnalysisTab.apply-intent.test.tsx src/features/ai/ai-paths/components/__tests__/AiPathsRuntimeAnalysis.test.tsx src/features/case-resolver/__tests__/case-resolver-tree-header.test.tsx`
  - Result: pass (`5/5` files, `29/29` tests)
- Accessibility smoke gate:
  - `node scripts/testing/run-accessibility-smoke-tests.mjs --strict --ci --no-history`: pass (`5/5`)
  - `node scripts/testing/run-accessibility-smoke-tests.mjs`: pass (`5/5`, history written)

## Notes

- Product keyboard test logs a non-failing React `act(...)` warning in this environment; assertions and suite status are fully passing.
