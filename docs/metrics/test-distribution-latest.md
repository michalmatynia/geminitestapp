---
owner: 'Platform Team'
last_reviewed: '2026-04-11'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Test Distribution Check

Generated at: 2026-04-11T14:55:46.638Z

## Summary

- Status: PASSED
- Total features: 24
- Features with tests: 24
- Features without tests: 0
- Features without fast tests: 0
- Features without negative-path tests: 0
- Total test files: 3528
- .only() occurrences: 0
- .skip() occurrences: 32
- .todo() occurrences: 0

## Test Coverage by Feature

| Feature | Test Files | Fast | E2E | Negative |
| --- | ---: | ---: | ---: | ---: |
| kangur | 948 | 928 | 20 | 181 |
| ai | 402 | 402 | 0 | 170 |
| products | 183 | 175 | 8 | 69 |
| integrations | 173 | 172 | 1 | 63 |
| case-resolver | 94 | 93 | 1 | 42 |
| cms | 85 | 84 | 1 | 21 |
| prompt-exploder | 54 | 54 | 0 | 29 |
| filemaker | 41 | 41 | 0 | 15 |
| playwright | 35 | 35 | 0 | 18 |
| admin | 26 | 23 | 3 | 4 |
| database | 24 | 23 | 1 | 14 |
| data-import-export | 18 | 17 | 1 | 4 |
| notesapp | 18 | 16 | 2 | 6 |
| auth | 17 | 17 | 0 | 8 |
| files | 12 | 11 | 1 | 6 |
| viewer3d | 12 | 11 | 1 | 5 |
| prompt-engine | 9 | 9 | 0 | 3 |
| drafter | 8 | 7 | 1 | 3 |
| internationalization | 8 | 8 | 0 | 5 |
| jobs | 7 | 7 | 0 | 3 |
| app-embeds | 3 | 3 | 0 | 1 |
| gsap | 3 | 3 | 0 | 1 |
| product-sync | 3 | 3 | 0 | 3 |
| tooltip-engine | 3 | 3 | 0 | 2 |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| test-skip-left | 0 | 0 | 32 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
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
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.modal.spec.ts:19 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.modal.spec.ts:60 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.modal.spec.ts:98 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.modal.spec.ts:143 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:21 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:36 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:52 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:57 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:93 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:124 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:157 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:174 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:190 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:208 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:220 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:237 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:268 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-queue-integration.spec.ts:299 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products-trigger-workflow-success.spec.ts:84 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/products/products.spec.ts:34 | .skip() in test file. Consider removing or adding a TODO comment. |

## Notes

- `test-only-left` (error): .only() causes CI to skip other tests silently.
- `test-skip-left` (info): Skipped tests should be tracked and eventually resolved.
- `test-todo-left` (info): Placeholder tests should become executable coverage once behavior is ready.
- `feature-no-tests` (warn): Every feature should have at least basic test coverage.
- `feature-no-fast-tests` (warn): Features should have at least one fast, local non-e2e test.
- `feature-no-negative-tests` (info): Features should add at least one negative-path or failure-mode test.
