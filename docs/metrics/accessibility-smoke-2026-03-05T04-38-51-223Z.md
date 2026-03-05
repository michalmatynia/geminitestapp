# Accessibility Smoke Report

Generated at: 2026-03-05T04:38:51.223Z

## Summary

- Suites: 5
- Passed: 5
- Failed: 0
- React act warnings: 1
- Warning budget: 10
- Warning budget status: ok

## Suite Status

| Suite | Status | Duration | Exit | Tests |
| --- | --- | ---: | ---: | --- |
| Auth Sign-In Accessibility | PASS | 4.6s | 0 | `__tests__/features/auth/pages/signin-page.test.tsx` |
| Products Edit Form Accessibility | PASS | 8.8s | 0 | `__tests__/features/products/pages/product-edit-page.test.tsx` |
| Image Studio UI Accessibility | PASS | 5.4s | 0 | `src/features/ai/image-studio/components/__tests__/ImageStudioAnalysisTab.apply-intent.test.tsx` |
| AI Paths Canvas Accessibility | PASS | 6.1s | 0 | `src/features/ai/ai-paths/components/__tests__/AiPathsRuntimeAnalysis.test.tsx` |
| Case Resolver Header Accessibility | PASS | 6.5s | 0 | `src/features/case-resolver/__tests__/case-resolver-tree-header.test.tsx` |

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
- React act warnings are tracked as non-failing telemetry for accessibility test hygiene.
