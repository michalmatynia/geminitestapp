---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: false
---
# Lint Domain Checks Report

Generated at: 2026-03-05T04:33:16.757Z

## Summary

- Domains: 5
- Passed: 5
- Failed: 0
- Timed out: 0
- Skipped: 0
- Total duration: 1.2m
- Include test probes: yes

## Domain Status

| Domain | Status | Duration | Exit | Targets | Test Probes |
| --- | --- | ---: | ---: | --- | --- |
| Auth | PASS | 10.1s | 0 | `src/features/auth`, `src/app/api/auth` | `__tests__/features/auth/pages/signin-page.test.tsx` |
| Products | PASS | 14.6s | 0 | `src/features/products`, `src/app/api/v2/products` | `__tests__/features/products/pages/product-edit-page.test.tsx` |
| AI Paths | PASS | 18.0s | 0 | `src/features/ai/ai-paths`, `src/app/api/ai-paths` | `src/features/ai/ai-paths/components/__tests__/AiPathsRuntimeAnalysis.test.tsx` |
| Image Studio | PASS | 17.2s | 0 | `src/features/ai/image-studio`, `src/app/api/image-studio` | `src/features/ai/image-studio/components/__tests__/ImageStudioAnalysisTab.apply-intent.test.tsx` |
| Case Resolver | PASS | 12.9s | 0 | `src/features/case-resolver`, `src/features/case-resolver-capture`, `src/app/api/case-resolver` | `src/features/case-resolver/__tests__/case-resolver-tree-header.test.tsx` |

## Notes

- Chunked lint checks reduce long single-run bottlenecks and isolate failing domains.
- Run `node scripts/quality/run-lint-domain-checks.mjs --strict` in CI-style enforcement mode.
