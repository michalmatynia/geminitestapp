---
owner: 'Platform Team'
last_reviewed: '2026-03-10'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Accessibility Component Policy Report

Generated at: 2026-03-10T20:22:32.923Z

## Summary

- Status: WARN
- Files scanned: 68
- Dialogs checked: 4
- Alert dialogs checked: 1
- Tablists checked: 32
- Tooltips checked: 73
- Errors: 0
- Warnings: 2

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| tooltip-trigger-not-focusable | 0 | 2 | 0 |
| tabs-list-missing-label | 0 | 0 | 1 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| WARN | tooltip-trigger-not-focusable | src/features/data-import-export/components/imports/sections/ImportListPreviewSection.tsx:158:17 | Tooltip wraps a non-focusable <span> trigger. Use a focusable trigger or add keyboard focus support. |
| WARN | tooltip-trigger-not-focusable | src/features/observability/components/EventStreamPanel.tsx:92:17 | Tooltip wraps a non-focusable <span> trigger. Use a focusable trigger or add keyboard focus support. |
| INFO | tabs-list-missing-label | src/features/ai/ai-context-registry/pages/AdminAiContextRegistryPage.tsx:235:9 | TabsList should set aria-label or aria-labelledby for a stable tablist name. |

## Notes

- This check validates shared primitive usage contracts before browser-level accessibility smoke tests.
- Strict mode fails on accessibility policy errors. Use --fail-on-warnings to additionally gate tooltip triggers that stay mouse-only.
- Unlabeled tablists are reported as informational guidance so the report stays focused on real keyboard and naming regressions.
