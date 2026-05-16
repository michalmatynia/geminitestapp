---
owner: 'Platform Team'
last_reviewed: '2026-04-15'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# High-Risk Coverage Report

Generated at: 2026-04-15T09:38:27.221Z

## Summary

- Status: PASSED
- Coverage summary source: `coverage/high-risk/*/coverage-summary.json (merged)`
- Targets scanned: 5
- Matched targets: 5
- Passing targets: 5
- Failing targets: 0
- Unmatched targets: 0
- Errors: 0
- Warnings: 0
- Info: 0

## Target Coverage

| Target | Directory | Files | Status | Lines | Statements | Functions | Branches |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: |
| API Routes | `src/app/api` | 1138 | PASS | 57.8% | 56.4% | 60.3% | 45.6% |
| Shared Contracts | `src/shared/contracts` | 245 | PASS | 89.9% | 88.6% | 72.8% | 53.7% |
| Shared Lib | `src/shared/lib` | 763 | PASS | 79.5% | 76.9% | 75.8% | 64.4% |
| Kangur | `src/features/kangur` | 1595 | PASS | 77% | 76% | 75.1% | 65.2% |
| AI Paths | `src/features/ai/ai-paths` | 363 | PASS | 64.8% | 62.4% | 56.4% | 47.5% |

## Thresholds

| Target | Lines | Statements | Functions | Branches |
| --- | ---: | ---: | ---: | ---: |
| API Routes | 57% | 56% | 60% | 45% |
| Shared Contracts | 85% | 85% | 70% | 50% |
| Shared Lib | 75% | 75% | 75% | 64% |
| Kangur | 76% | 75% | 75% | 65% |
| AI Paths | 55% | 50% | 45% | 40% |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |

## Issues

All high-risk directories meet the configured coverage thresholds.

## Notes

- This check reads an existing `coverage-summary.json` artifact; it does not run coverage itself.
- Threshold misses are errors. Missing coverage artifacts or unmatched target directories remain warnings until this gate is adopted broadly.
