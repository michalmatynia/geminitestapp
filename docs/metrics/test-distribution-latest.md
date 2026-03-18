---
owner: 'Platform Team'
last_reviewed: '2026-03-18'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Test Distribution Check

Generated at: 2026-03-18T19:19:39.347Z

## Summary

- Status: PASSED
- Total features: 28
- Features with tests: 28
- Features without tests: 0
- Features without fast tests: 0
- Features without negative-path tests: 2
- Total test files: 1750
- .only() occurrences: 0
- .skip() occurrences: 32
- .todo() occurrences: 0

## Test Coverage by Feature

| Feature | Test Files | Fast | E2E | Negative |
| --- | ---: | ---: | ---: | ---: |
| kangur | 327 | 314 | 13 | 66 |
| ai | 232 | 232 | 0 | 86 |
| products | 83 | 76 | 7 | 28 |
| case-resolver | 78 | 77 | 1 | 32 |
| cms | 63 | 62 | 1 | 15 |
| prompt-exploder | 47 | 47 | 0 | 24 |
| integrations | 40 | 39 | 1 | 13 |
| foldertree | 27 | 25 | 2 | 7 |
| observability | 21 | 20 | 1 | 3 |
| admin | 14 | 12 | 2 | 4 |
| database | 11 | 10 | 1 | 7 |
| notesapp | 11 | 9 | 2 | 3 |
| auth | 10 | 10 | 0 | 6 |
| filemaker | 7 | 7 | 0 | 3 |
| viewer3d | 7 | 6 | 1 | 3 |
| jobs | 6 | 6 | 0 | 3 |
| files | 5 | 4 | 1 | 2 |
| internationalization | 5 | 5 | 0 | 4 |
| case-resolver-capture | 4 | 4 | 0 | 3 |
| data-import-export | 4 | 3 | 1 | 1 |
| document-editor | 4 | 4 | 0 | 1 |
| drafter | 4 | 3 | 1 | 1 |
| playwright | 3 | 3 | 0 | 3 |
| prompt-engine | 3 | 3 | 0 | 0 |
| tooltip-engine | 2 | 2 | 0 | 2 |
| app-embeds | 1 | 1 | 0 | 0 |
| gsap | 1 | 1 | 0 | 1 |
| product-sync | 1 | 1 | 0 | 1 |

## Features Without Negative-Path Test Signals

- app-embeds
- prompt-engine

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| feature-no-negative-tests | 0 | 0 | 2 |
| test-skip-left | 0 | 0 | 32 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| INFO | feature-no-negative-tests | - | Feature "app-embeds" has tests, but no negative-path signal was detected in its attributed test files. |
| INFO | feature-no-negative-tests | - | Feature "prompt-engine" has tests, but no negative-path signal was detected in its attributed test files. |
| INFO | test-skip-left | e2e/duels-motion.spec.ts:13 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/ai-paths/ai-paths-runtime-kernel.spec.ts:52 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/ai-paths/ai-paths.spec.ts:518 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/case-resolver/case-resolver.spec.ts:280 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/case-resolver/case-resolver.spec.ts:301 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/case-resolver/case-resolver.spec.ts:398 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/case-resolver/case-resolver.spec.ts:483 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/case-resolver/case-resolver.spec.ts:537 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-advanced.spec.ts:52 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-freshness.spec.ts:177 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-freshness.spec.ts:218 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-parameter-inference.spec.ts:96 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:802 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:817 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:833 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:838 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:870 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:899 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:932 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:949 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:965 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:983 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:995 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:1012 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:1043 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:1074 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:1126 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:1167 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:1210 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:1255 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-workflow-success.spec.ts:84 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products.spec.ts:34 | .skip() in test file. Consider removing or adding a TODO comment. |

## Notes

- `test-only-left` (error): .only() causes CI to skip other tests silently.
- `test-skip-left` (info): Skipped tests should be tracked and eventually resolved.
- `test-todo-left` (info): Placeholder tests should become executable coverage once behavior is ready.
- `feature-no-tests` (warn): Every feature should have at least basic test coverage.
- `feature-no-fast-tests` (warn): Features should have at least one fast, local non-e2e test.
- `feature-no-negative-tests` (info): Features should add at least one negative-path or failure-mode test.
