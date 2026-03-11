---
owner: 'Platform Team'
last_reviewed: '2026-03-11'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Test Distribution Check

Generated at: 2026-03-11T04:30:40.113Z

## Summary

- Status: PASSED
- Total features: 28
- Features with tests: 28
- Features without tests: 0
- Total test files: 1538
- .only() occurrences: 0
- .skip() occurrences: 26

## Test Coverage by Feature

| Feature | Test Files |
| --- | ---: |
| ai | 225 |
| kangur | 223 |
| products | 79 |
| case-resolver | 78 |
| cms | 60 |
| prompt-exploder | 47 |
| integrations | 36 |
| foldertree | 27 |
| observability | 22 |
| notesapp | 15 |
| admin | 14 |
| database | 12 |
| auth | 9 |
| viewer3d | 8 |
| filemaker | 7 |
| jobs | 6 |
| drafter | 5 |
| files | 5 |
| internationalization | 5 |
| case-resolver-capture | 4 |
| document-editor | 4 |
| playwright | 3 |
| prompt-engine | 3 |
| data-import-export | 2 |
| tooltip-engine | 2 |
| app-embeds | 1 |
| gsap | 1 |
| product-sync | 1 |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| test-skip-left | 0 | 0 | 26 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| INFO | test-skip-left | e2e/features/ai-paths/ai-paths-runtime-kernel.spec.ts:52 | .skip() in test file. Consider removing or adding a TODO comment. |
| INFO | test-skip-left | e2e/features/ai-paths/ai-paths.spec.ts:527 | .skip() in test file. Consider removing or adding a TODO comment. |
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
- `feature-no-tests` (warn): Every feature should have at least basic test coverage.
