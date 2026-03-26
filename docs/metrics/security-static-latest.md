---
owner: 'Platform Team'
last_reviewed: '2026-03-26'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Static Security Review

Generated at: 2026-03-26T16:58:50.566Z

## Summary

- Status: WARN
- Files scanned: 5869
- Errors: 0
- Warnings: 4
- Info: 0

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| dangerouslysetinnerhtml-review | 0 | 4 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| WARN | dangerouslysetinnerhtml-review | src/app/(frontend)/layout.tsx:133:17 | dangerouslySetInnerHTML is used without an obvious sanitize/safe marker in the inline expression. |
| WARN | dangerouslysetinnerhtml-review | src/app/(frontend)/layout.tsx:136:17 | dangerouslySetInnerHTML is used without an obvious sanitize/safe marker in the inline expression. |
| WARN | dangerouslysetinnerhtml-review | src/features/kangur/ui/components/KangurAppLoader.tsx:253:14 | dangerouslySetInnerHTML is used without an obvious sanitize/safe marker in the inline expression. |
| WARN | dangerouslysetinnerhtml-review | src/features/kangur/ui/KangurSSRSkeleton.tsx:112:9 | dangerouslySetInnerHTML is used without an obvious sanitize/safe marker in the inline expression. |

## Notes

- This scan focuses on browser isolation, direct cookie access, runtime code execution, and raw HTML sinks.
- Strict mode fails on error findings. Add --fail-on-warnings to promote review warnings into a gate.
