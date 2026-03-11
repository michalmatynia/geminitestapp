---
owner: 'Platform Team'
last_reviewed: '2026-03-11'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Test Distribution Check

Generated at: 2026-03-11T07:30:19.933Z

## Summary

- Status: PASSED
- Total features: 28
- Features with tests: 28
- Features without tests: 0
- Features without fast tests: 0
- Features without negative-path tests: 2
- Total test files: 1540
- .only() occurrences: 0
- .skip() occurrences: 26
- .todo() occurrences: 0

## Test Coverage by Feature

| Feature | Test Files | Fast | E2E | Negative |
| --- | ---: | ---: | ---: | ---: |
| ai | 227 | 227 | 0 | 85 |
| kangur | 223 | 214 | 9 | 44 |
| products | 79 | 73 | 6 | 28 |
| case-resolver | 78 | 77 | 1 | 32 |
| cms | 60 | 59 | 1 | 14 |
| prompt-exploder | 47 | 47 | 0 | 24 |
| integrations | 36 | 35 | 1 | 15 |
| foldertree | 27 | 25 | 2 | 7 |
| observability | 22 | 21 | 1 | 3 |
| notesapp | 15 | 13 | 2 | 7 |
| admin | 14 | 12 | 2 | 4 |
| database | 12 | 11 | 1 | 8 |
| auth | 9 | 9 | 0 | 6 |
| viewer3d | 8 | 7 | 1 | 4 |
| filemaker | 7 | 7 | 0 | 3 |
| jobs | 6 | 6 | 0 | 3 |
| drafter | 5 | 4 | 1 | 2 |
| files | 5 | 4 | 1 | 2 |
| internationalization | 5 | 5 | 0 | 4 |
| case-resolver-capture | 4 | 4 | 0 | 3 |
| document-editor | 4 | 4 | 0 | 1 |
| playwright | 3 | 3 | 0 | 3 |
| prompt-engine | 3 | 3 | 0 | 0 |
| data-import-export | 2 | 1 | 1 | 1 |
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
| test-skip-left | 0 | 0 | 26 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| INFO | feature-no-negative-tests | - | Feature "app-embeds" has tests, but no negative-path signal was detected in its attributed test files. |
| INFO | feature-no-negative-tests | - | Feature "prompt-engine" has tests, but no negative-path signal was detected in its attributed test files. |
| INFO | test-skip-left | e2e/features/ai-paths/ai-paths-runtime-kernel.spec.ts:52 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/ai-paths/ai-paths.spec.ts:518 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/case-resolver/case-resolver.spec.ts:274 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/case-resolver/case-resolver.spec.ts:295 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/case-resolver/case-resolver.spec.ts:387 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/case-resolver/case-resolver.spec.ts:471 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/case-resolver/case-resolver.spec.ts:524 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-advanced.spec.ts:52 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-freshness.spec.ts:177 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-freshness.spec.ts:218 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-parameter-inference.spec.ts:96 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:831 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:846 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:862 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:869 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:902 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:919 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:935 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:953 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:965 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:982 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:1013 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:1044 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:1096 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-workflow-success.spec.ts:61 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products.spec.ts:34 | .skip() in test file. Consider removing or adding a TODO comment. |

## Notes

- `test-only-left` (error): .only() causes CI to skip other tests silently.
- `test-skip-left` (info): Skipped tests should be tracked and eventually resolved.
- `test-todo-left` (info): Placeholder tests should become executable coverage once behavior is ready.
- `feature-no-tests` (warn): Every feature should have at least basic test coverage.
- `feature-no-fast-tests` (warn): Features should have at least one fast, local non-e2e test.
- `feature-no-negative-tests` (info): Features should add at least one negative-path or failure-mode test.
