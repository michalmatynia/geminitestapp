# Accessibility Smoke Report

Generated at: 2026-03-05T04:25:53.028Z

## Summary

- Suites: 5
- Passed: 5
- Failed: 0

## Suite Status

| Suite | Status | Duration | Exit | Tests |
| --- | --- | ---: | ---: | --- |
| Auth Sign-In Accessibility | PASS | 2.8s | 0 | `__tests__/features/auth/pages/signin-page.test.tsx` |
| Products Edit Form Accessibility | PASS | 3.8s | 0 | `__tests__/features/products/pages/product-edit-page.test.tsx` |
| Image Studio UI Accessibility | PASS | 2.7s | 0 | `src/features/ai/image-studio/components/__tests__/ImageStudioAnalysisTab.apply-intent.test.tsx` |
| AI Paths Canvas Accessibility | PASS | 3.2s | 0 | `src/features/ai/ai-paths/components/__tests__/AiPathsRuntimeAnalysis.test.tsx` |
| Case Resolver Header Accessibility | PASS | 2.4s | 0 | `src/features/case-resolver/__tests__/case-resolver-tree-header.test.tsx` |

## Notes

- This smoke suite tracks keyboard/focus/label accessibility checks across critical user flows.
- Run `npm run test:accessibility-smoke` before UI-facing changes.
