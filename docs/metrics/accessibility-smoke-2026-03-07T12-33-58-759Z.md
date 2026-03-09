---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: false
---
# Accessibility Smoke Report

Generated at: 2026-03-07T12:33:58.759Z

## Summary

- Suites: 8
- Passed: 7
- Failed: 1
- React act warnings: 1
- Warning budget: 10
- Warning budget status: ok
- Warning budget enforcement: telemetry-only

## Suite Status

| Suite | Runner | Status | Duration | Exit | Tests |
| --- | --- | --- | ---: | ---: | --- |
| App Shell Accessibility | vitest | PASS | 2.7s | 0 | `src/app/__tests__/shell-accessibility.test.tsx` |
| Auth Sign-In Accessibility | vitest | PASS | 4.6s | 0 | `__tests__/features/auth/pages/signin-page.test.tsx` |
| Products Edit Form Accessibility | vitest | PASS | 7.2s | 0 | `__tests__/features/products/pages/product-edit-page.test.tsx` |
| Image Studio UI Accessibility | vitest | PASS | 5.4s | 0 | `src/features/ai/image-studio/components/__tests__/ImageStudioAnalysisTab.apply-intent.test.tsx` |
| AI Paths Canvas Accessibility | vitest | PASS | 6.4s | 0 | `src/features/ai/ai-paths/components/__tests__/AiPathsRuntimeAnalysis.test.tsx` |
| Case Resolver Header Accessibility | vitest | PASS | 7.7s | 0 | `src/features/case-resolver/__tests__/case-resolver-tree-header.test.tsx` |
| Kangur Profile Accessibility | vitest | PASS | 5.2s | 0 | `__tests__/features/kangur/kangur-accessibility-smoke.test.tsx` |
| Public Auth Route Accessibility | playwright | FAIL | 4.1s | 1 | `e2e/features/accessibility/public-auth-accessibility.spec.ts` |

## Warning Details

| Suite | React act warnings |
| --- | ---: |
| App Shell Accessibility | 0 |
| Auth Sign-In Accessibility | 0 |
| Products Edit Form Accessibility | 1 |
| Image Studio UI Accessibility | 0 |
| AI Paths Canvas Accessibility | 0 |
| Case Resolver Header Accessibility | 0 |
| Kangur Profile Accessibility | 0 |
| Public Auth Route Accessibility | 0 |

## Notes

- This smoke suite tracks keyboard/focus/label checks plus axe-core scans across critical user flows.
- Unit suites cover shared semantics and component states; Playwright suites cover browser-rendered routes.
- Run `npm run test:accessibility-smoke` before UI-facing changes.
- Use `--fail-on-warning-budget-exceed` in strict mode to fail when warning budget is exceeded.
