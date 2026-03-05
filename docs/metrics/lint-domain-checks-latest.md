# Lint Domain Checks Report

Generated at: 2026-03-05T04:00:57.270Z

## Summary

- Domains: 5
- Passed: 0
- Failed: 5
- Timed out: 0
- Skipped: 0
- Total duration: 5.1s

## Domain Status

| Domain | Status | Duration | Exit | Targets |
| --- | --- | ---: | ---: | --- |
| Auth | FAIL | 1.7s | 2 | `src/features/auth`, `__tests__/features/auth`, `__tests__/api/auth`, `src/app/api/auth` |
| Products | FAIL | 821ms | 2 | `src/features/products`, `__tests__/features/products`, `__tests__/api/products`, `src/app/api/v2/products` |
| AI Paths | FAIL | 841ms | 2 | `src/features/ai/ai-paths`, `__tests__/features/ai/ai-paths`, `src/app/api/ai-paths` |
| Image Studio | FAIL | 847ms | 2 | `src/features/ai/image-studio`, `__tests__/features/ai/image-studio`, `src/app/api/image-studio` |
| Case Resolver | FAIL | 873ms | 2 | `src/features/case-resolver`, `src/features/case-resolver-capture`, `__tests__/features/case-resolver-capture`, `src/app/api/case-resolver` |

## Notes

- Chunked lint checks reduce long single-run bottlenecks and isolate failing domains.
- Run `node scripts/quality/run-lint-domain-checks.mjs --strict` in CI-style enforcement mode.
