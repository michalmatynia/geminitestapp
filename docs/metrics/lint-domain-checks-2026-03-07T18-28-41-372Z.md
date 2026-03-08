# Lint Domain Checks Report

Generated at: 2026-03-07T18:28:41.372Z

## Summary

- Domains: 5
- Passed: 5
- Failed: 0
- Timed out: 0
- Skipped: 0
- Total duration: 1.4m
- Include test probes: no
- Include test tree: no

## Domain Status

| Domain | Status | Duration | Exit | Targets | Test Trees | Test Probes |
| --- | --- | ---: | ---: | --- | --- | --- |
| Auth | PASS | 10.8s | 0 | `src/features/auth`, `src/app/api/auth` | - | - |
| Products | PASS | 16.2s | 0 | `src/features/products`, `src/app/api/v2/products` | - | - |
| AI Paths | PASS | 21.5s | 0 | `src/features/ai/ai-paths`, `src/app/api/ai-paths` | - | - |
| Image Studio | PASS | 20.2s | 0 | `src/features/ai/image-studio`, `src/app/api/image-studio` | - | - |
| Case Resolver | PASS | 16.0s | 0 | `src/features/case-resolver`, `src/features/case-resolver-capture`, `src/app/api/case-resolver` | - | - |

## Notes

- Chunked lint checks reduce long single-run bottlenecks and isolate failing domains.
- Run `node scripts/quality/run-lint-domain-checks.mjs --strict` in CI-style enforcement mode.
- Test probes run with `--no-warn-ignored`; if a probe is ignored by ESLint config, it will not emit lint signal.
- Full test-tree mode sets `ESLINT_INCLUDE_TESTS=1` to opt test files into ESLint scope.
