---
owner: 'Platform Team'
last_reviewed: '2026-03-10'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Static Security Review

Generated at: 2026-03-10T20:22:29.466Z

## Summary

- Status: WARN
- Files scanned: 4611
- Errors: 0
- Warnings: 5
- Info: 0

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| document-cookie-review | 0 | 3 | 0 |
| dangerouslysetinnerhtml-review | 0 | 2 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| WARN | document-cookie-review | src/features/admin/layout/AdminLayout.tsx:49:16 | Direct document.cookie access should stay isolated to reviewed helpers/components. |
| WARN | dangerouslysetinnerhtml-review | src/features/document-editor/components/MarkdownSplitEditor.tsx:197:15 | dangerouslySetInnerHTML is used without an obvious sanitize/safe marker in the inline expression. |
| WARN | document-cookie-review | src/features/kangur/observability/client.ts:37:26 | Direct document.cookie access should stay isolated to reviewed helpers/components. |
| WARN | document-cookie-review | src/features/kangur/observability/client.ts:46:12 | Direct document.cookie access should stay isolated to reviewed helpers/components. |
| WARN | dangerouslysetinnerhtml-review | src/features/notesapp/components/list/NoteCardContent.tsx:45:9 | dangerouslySetInnerHTML is used without an obvious sanitize/safe marker in the inline expression. |

## Notes

- This scan focuses on browser isolation, direct cookie access, runtime code execution, and raw HTML sinks.
- Strict mode fails on error findings. Add --fail-on-warnings to promote review warnings into a gate.
