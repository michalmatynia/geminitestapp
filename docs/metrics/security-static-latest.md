---
owner: 'Platform Team'
last_reviewed: '2026-04-07'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Static Security Review

Generated at: 2026-03-30T15:09:33.268Z

## Summary

- Status: WARN
- Files scanned: 6673
- Errors: 0
- Warnings: 2
- Info: 0

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| dangerouslysetinnerhtml-review | 0 | 1 | 0 |
| document-cookie-review | 0 | 1 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| WARN | dangerouslysetinnerhtml-review | src/features/kangur/ui/components/KangurAppLoader.tsx:394:14 | dangerouslySetInnerHTML is used without an obvious sanitize/safe marker in the inline expression. |
| WARN | document-cookie-review | src/features/kangur/ui/components/KangurPrimaryNavigation.test-support.tsx:554:14 | Direct document.cookie access should stay isolated to reviewed helpers/components. |

## Notes

- This scan focuses on browser isolation, direct cookie access, runtime code execution, and raw HTML sinks.
- Strict mode fails on error findings. Add --fail-on-warnings to promote review warnings into a gate.
