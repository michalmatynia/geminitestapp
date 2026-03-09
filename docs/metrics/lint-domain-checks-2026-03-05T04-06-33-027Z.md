---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: false
---
# Lint Domain Checks Report

Generated at: 2026-03-05T04:06:33.027Z

## Summary

- Domains: 5
- Passed: 5
- Failed: 0
- Timed out: 0
- Skipped: 0
- Total duration: 1.7m

## Domain Status

| Domain | Status | Duration | Exit | Targets |
| --- | --- | ---: | ---: | --- |
| Auth | PASS | 11.1s | 0 | `src/features/auth`, `src/app/api/auth` |
| Products | PASS | 22.6s | 0 | `src/features/products`, `src/app/api/v2/products` |
| AI Paths | PASS | 23.7s | 0 | `src/features/ai/ai-paths`, `src/app/api/ai-paths` |
| Image Studio | PASS | 21.6s | 0 | `src/features/ai/image-studio`, `src/app/api/image-studio` |
| Case Resolver | PASS | 20.3s | 0 | `src/features/case-resolver`, `src/features/case-resolver-capture`, `src/app/api/case-resolver` |

## Notes

- Chunked lint checks reduce long single-run bottlenecks and isolate failing domains.
- Run `node scripts/quality/run-lint-domain-checks.mjs --strict` in CI-style enforcement mode.
