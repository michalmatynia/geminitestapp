# Lint Domain Checks Report

Generated at: 2026-03-05T04:36:38.577Z

## Summary

- Domains: 5
- Passed: 5
- Failed: 0
- Timed out: 0
- Skipped: 0
- Total duration: 1.7m
- Include test probes: yes

## Domain Status

| Domain | Status | Duration | Exit | Targets | Test Probes |
| --- | --- | ---: | ---: | --- | --- |
| Auth | PASS | 10.0s | 0 | `src/features/auth`, `src/app/api/auth` | `__tests__/features/auth/pages/signin-page.test.tsx` |
| Products | PASS | 16.3s | 0 | `src/features/products`, `src/app/api/v2/products` | `__tests__/features/products/pages/product-edit-page.test.tsx` |
| AI Paths | PASS | 25.1s | 0 | `src/features/ai/ai-paths`, `src/app/api/ai-paths` | `src/features/ai/ai-paths/components/__tests__/AiPathsRuntimeAnalysis.test.tsx` |
| Image Studio | PASS | 34.0s | 0 | `src/features/ai/image-studio`, `src/app/api/image-studio` | `src/features/ai/image-studio/components/__tests__/ImageStudioAnalysisTab.apply-intent.test.tsx` |
| Case Resolver | PASS | 18.9s | 0 | `src/features/case-resolver`, `src/features/case-resolver-capture`, `src/app/api/case-resolver` | `src/features/case-resolver/__tests__/case-resolver-tree-header.test.tsx` |

## Notes

- Chunked lint checks reduce long single-run bottlenecks and isolate failing domains.
- Run `node scripts/quality/run-lint-domain-checks.mjs --strict` in CI-style enforcement mode.
- Test probes run with `--no-warn-ignored`; if a probe is ignored by ESLint config, it will not emit lint signal.
