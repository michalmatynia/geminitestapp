---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: false
---
# Accessibility Smoke Report

Generated at: 2026-03-06T03:13:47.603Z

## Summary

- Suites: 5
- Passed: 5
- Failed: 0
- React act warnings: 1
- Warning budget: 10
- Warning budget status: ok
- Warning budget enforcement: telemetry-only

## Suite Status

| Suite | Status | Duration | Exit | Tests |
| --- | --- | ---: | ---: | --- |
| Auth Sign-In Accessibility | PASS | 2.8s | 0 | `__tests__/features/auth/pages/signin-page.test.tsx` |
| Products Edit Form Accessibility | PASS | 3.8s | 0 | `__tests__/features/products/pages/product-edit-page.test.tsx` |
| Image Studio UI Accessibility | PASS | 2.8s | 0 | `src/features/ai/image-studio/components/__tests__/ImageStudioAnalysisTab.apply-intent.test.tsx` |
| AI Paths Canvas Accessibility | PASS | 3.2s | 0 | `src/features/ai/ai-paths/components/__tests__/AiPathsRuntimeAnalysis.test.tsx` |
| Case Resolver Header Accessibility | PASS | 2.4s | 0 | `src/features/case-resolver/__tests__/case-resolver-tree-header.test.tsx` |

## Warning Details

| Suite | React act warnings |
| --- | ---: |
| Auth Sign-In Accessibility | 0 |
| Products Edit Form Accessibility | 1 |
| Image Studio UI Accessibility | 0 |
| AI Paths Canvas Accessibility | 0 |
| Case Resolver Header Accessibility | 0 |

## Notes

- This smoke suite tracks keyboard/focus/label accessibility checks across critical user flows.
- Run `npm run test:accessibility-smoke` before UI-facing changes.
- Use `--fail-on-warning-budget-exceed` in strict mode to fail when warning budget is exceeded.
