# Accessibility Smoke Report

Generated at: 2026-03-05T03:19:42.781Z

## Summary

- Suites: 5
- Passed: 5
- Failed: 0

## Suite Status

| Suite | Status | Duration | Exit | Tests |
| --- | --- | ---: | ---: | --- |
| Auth Sign-In Accessibility | PASS | 5.2s | 0 | `__tests__/features/auth/pages/signin-page.test.tsx` |
| Products Edit Form Accessibility | PASS | 9.2s | 0 | `__tests__/features/products/pages/product-edit-page.test.tsx` |
| Image Studio UI Accessibility | PASS | 2.1s | 0 | `src/features/ai/image-studio/components/__tests__/ImageStudioAnalysisSummaryChip.test.tsx` |
| AI Paths Canvas Accessibility | PASS | 4.8s | 0 | `src/features/ai/ai-paths/components/__tests__/canvas-connector-tooltip.test.tsx` |
| Case Resolver Header Accessibility | PASS | 3.3s | 0 | `src/features/case-resolver/__tests__/case-resolver-tree-header.test.tsx` |

## Notes

- This smoke suite tracks keyboard/focus/label accessibility checks across critical user flows.
- Run `npm run test:accessibility-smoke` before UI-facing changes.
