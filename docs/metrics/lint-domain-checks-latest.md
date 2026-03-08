# Lint Domain Checks Report

Generated at: 2026-03-08T19:08:49.499Z

## Summary

- Domains: 5
- Passed: 5
- Failed: 0
- Timed out: 0
- Skipped: 0
- Total duration: 3.1m
- Include test probes: no
- Include test tree: yes

## Domain Status

| Domain | Status | Duration | Exit | Targets | Test Trees | Test Probes |
| --- | --- | ---: | ---: | --- | --- | --- |
| Auth | PASS | 20.9s | 0 | `src/features/auth`, `src/app/api/auth` | `__tests__/features/auth` | - |
| Products | PASS | 44.9s | 0 | `src/features/products`, `src/app/api/v2/products` | `__tests__/features/products` | - |
| AI Paths | PASS | 50.1s | 0 | `src/features/ai/ai-paths`, `src/app/api/ai-paths` | `src/features/ai/ai-paths/__tests__`, `src/features/ai/ai-paths/components/__tests__` | - |
| Image Studio | PASS | 35.5s | 0 | `src/features/ai/image-studio`, `src/app/api/image-studio` | `src/features/ai/image-studio/components/__tests__` | - |
| Case Resolver | PASS | 34.1s | 0 | `src/features/case-resolver`, `src/features/case-resolver-capture`, `src/app/api/case-resolver` | `src/features/case-resolver/__tests__`, `src/features/case-resolver-capture/__tests__` | - |

## Notes

- Chunked lint checks reduce long single-run bottlenecks and isolate failing domains.
- Run `node scripts/quality/run-lint-domain-checks.mjs --strict` in CI-style enforcement mode.
- Test probes run with `--no-warn-ignored`; if a probe is ignored by ESLint config, it will not emit lint signal.
- Full test-tree mode sets `ESLINT_INCLUDE_TESTS=1` to opt test files into ESLint scope.
