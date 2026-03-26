---
owner: 'Platform Team'
last_reviewed: '2026-03-26'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Static Security Review

Generated at: 2026-03-26T12:26:31.766Z

## Summary

- Status: WARN
- Files scanned: 5824
- Errors: 0
- Warnings: 3
- Info: 0

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| dangerouslysetinnerhtml-review | 0 | 3 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| WARN | dangerouslysetinnerhtml-review | src/app/(frontend)/layout.tsx:101:17 | dangerouslySetInnerHTML is used without an obvious sanitize/safe marker in the inline expression. |
| WARN | dangerouslysetinnerhtml-review | src/features/kangur/ui/components/KangurAppLoader.tsx:253:14 | dangerouslySetInnerHTML is used without an obvious sanitize/safe marker in the inline expression. |
| WARN | dangerouslysetinnerhtml-review | src/features/kangur/ui/KangurSSRSkeleton.tsx:112:9 | dangerouslySetInnerHTML is used without an obvious sanitize/safe marker in the inline expression. |

## Notes

- This scan focuses on browser isolation, direct cookie access, runtime code execution, and raw HTML sinks.
- Strict mode fails on error findings. Add --fail-on-warnings to promote review warnings into a gate.
