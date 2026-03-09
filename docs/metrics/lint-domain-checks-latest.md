---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Lint Domain Checks Report

Generated at: 2026-03-09T08:33:35.031Z

## Summary

- Domains: 5
- Passed: 5
- Failed: 0
- Timed out: 0
- Skipped: 0
- Total duration: 2.3m
- Include test probes: no
- Include test tree: yes

## Domain Status

| Domain | Status | Duration | Exit | Targets | Test Trees | Test Probes |
| --- | --- | ---: | ---: | --- | --- | --- |
| Auth | PASS | 17.4s | 0 | `src/features/auth`, `src/app/api/auth` | `__tests__/features/auth` | - |
| Products | PASS | 32.8s | 0 | `src/features/products`, `src/app/api/v2/products` | `__tests__/features/products` | - |
| AI Paths | PASS | 33.4s | 0 | `src/features/ai/ai-paths`, `src/app/api/ai-paths` | `src/features/ai/ai-paths/__tests__`, `src/features/ai/ai-paths/components/__tests__` | - |
| Image Studio | PASS | 28.6s | 0 | `src/features/ai/image-studio`, `src/app/api/image-studio` | `src/features/ai/image-studio/components/__tests__` | - |
| Case Resolver | PASS | 22.9s | 0 | `src/features/case-resolver`, `src/features/case-resolver-capture`, `src/app/api/case-resolver` | `src/features/case-resolver/__tests__`, `src/features/case-resolver-capture/__tests__` | - |

## Notes

- Chunked lint checks reduce long single-run bottlenecks and isolate failing domains.
- Run `node scripts/quality/run-lint-domain-checks.mjs --strict` in CI-style enforcement mode.
- Test probes run with `--no-warn-ignored`; if a probe is ignored by ESLint config, it will not emit lint signal.
- Full test-tree mode sets `ESLINT_INCLUDE_TESTS=1` to opt test files into ESLint scope.
