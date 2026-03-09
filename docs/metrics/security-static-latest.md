---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Static Security Review

Generated at: 2026-03-08T14:42:53.811Z

## Summary

- Status: FAILED
- Files scanned: 4386
- Errors: 7
- Warnings: 5
- Info: 0

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| jsx-target-blank-missing-rel | 4 | 0 | 0 |
| window-open-missing-isolation | 3 | 0 | 0 |
| document-cookie-review | 0 | 3 | 0 |
| dangerouslysetinnerhtml-review | 0 | 2 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| ERROR | jsx-target-blank-missing-rel | src/app/(frontend)/home-fallback-content.tsx:204:23 | JSX target="_blank" is missing rel="noopener noreferrer". |
| ERROR | window-open-missing-isolation | src/features/admin/components/menu/NavTree.tsx:84:51 | window.open should include both noopener and noreferrer features. |
| ERROR | jsx-target-blank-missing-rel | src/features/case-resolver/components/page/CaseResolverScanFileEditor.tsx:355:39 | JSX target="_blank" is missing rel="noopener noreferrer". |
| ERROR | window-open-missing-isolation | src/features/case-resolver/hooks/useAdminCaseResolverDocumentActions.ts:275:36 | window.open should include both noopener and noreferrer features. |
| ERROR | jsx-target-blank-missing-rel | src/features/cms/components/frontend/CmsMenu.tsx:379:21 | JSX target="_blank" is missing rel="noopener noreferrer". |
| ERROR | window-open-missing-isolation | src/features/cms/components/page-builder/PagePreviewPanel.tsx:269:34 | window.open should include both noopener and noreferrer features. |
| ERROR | jsx-target-blank-missing-rel | src/features/kangur/admin/AdminKangurObservabilityPage.tsx:702:17 | JSX target="_blank" is missing rel="noopener noreferrer". |
| WARN | document-cookie-review | src/features/admin/layout/AdminLayout.tsx:53:16 | Direct document.cookie access should stay isolated to reviewed helpers/components. |
| WARN | dangerouslysetinnerhtml-review | src/features/document-editor/components/MarkdownSplitEditor.tsx:196:15 | dangerouslySetInnerHTML is used without an obvious sanitize/safe marker in the inline expression. |
| WARN | document-cookie-review | src/features/kangur/observability/client.ts:37:26 | Direct document.cookie access should stay isolated to reviewed helpers/components. |
| WARN | document-cookie-review | src/features/kangur/observability/client.ts:46:12 | Direct document.cookie access should stay isolated to reviewed helpers/components. |
| WARN | dangerouslysetinnerhtml-review | src/features/notesapp/components/list/NoteCardContent.tsx:44:9 | dangerouslySetInnerHTML is used without an obvious sanitize/safe marker in the inline expression. |

## Notes

- This scan focuses on browser isolation, direct cookie access, runtime code execution, and raw HTML sinks.
- Strict mode fails on error findings. Add --fail-on-warnings to promote review warnings into a gate.
