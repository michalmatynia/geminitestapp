---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: false
---
# Accessibility Component Policy Report

Generated at: 2026-03-08T03:49:32.053Z

## Summary

- Status: WARN
- Files scanned: 68
- Dialogs checked: 4
- Alert dialogs checked: 1
- Tablists checked: 33
- Tooltips checked: 73
- Errors: 0
- Warnings: 9

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| tooltip-trigger-not-focusable | 0 | 9 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| WARN | tooltip-trigger-not-focusable | src/features/ai/ai-paths/components/node-config/dialog/regex/RegexAiPromptSection.tsx:81:11 | Tooltip wraps a non-focusable <span> trigger. Use a focusable trigger or add keyboard focus support. |
| WARN | tooltip-trigger-not-focusable | src/features/ai/ai-paths/components/node-config/dialog/regex/RegexAiPromptSection.tsx:89:11 | Tooltip wraps a non-focusable <span> trigger. Use a focusable trigger or add keyboard focus support. |
| WARN | tooltip-trigger-not-focusable | src/features/ai/ai-paths/components/node-config/dialog/regex/RegexAiPromptSection.tsx:97:11 | Tooltip wraps a non-focusable <span> trigger. Use a focusable trigger or add keyboard focus support. |
| WARN | tooltip-trigger-not-focusable | src/features/ai/ai-paths/components/run-timeline.tsx:375:17 | Tooltip wraps a non-focusable <span> trigger. Use a focusable trigger or add keyboard focus support. |
| WARN | tooltip-trigger-not-focusable | src/features/ai/ai-paths/components/run-timeline.tsx:397:17 | Tooltip wraps a non-focusable <span> trigger. Use a focusable trigger or add keyboard focus support. |
| WARN | tooltip-trigger-not-focusable | src/features/data-import-export/components/imports/sections/ImportListPreviewSection.tsx:156:17 | Tooltip wraps a non-focusable <span> trigger. Use a focusable trigger or add keyboard focus support. |
| WARN | tooltip-trigger-not-focusable | src/features/observability/components/EventStreamPanel.tsx:90:17 | Tooltip wraps a non-focusable <span> trigger. Use a focusable trigger or add keyboard focus support. |
| WARN | tooltip-trigger-not-focusable | src/features/products/components/list/ProductColumns.tsx:201:11 | Tooltip wraps a non-focusable <span> trigger. Use a focusable trigger or add keyboard focus support. |
| WARN | tooltip-trigger-not-focusable | src/features/products/components/list/ProductColumns.tsx:283:11 | Tooltip wraps a non-focusable <span> trigger. Use a focusable trigger or add keyboard focus support. |

## Notes

- This check validates shared primitive usage contracts before browser-level accessibility smoke tests.
- Strict mode fails on accessibility policy errors. Use --fail-on-warnings to additionally gate tooltip triggers that stay mouse-only.
- Unlabeled tablists are reported as informational guidance so the report stays focused on real keyboard and naming regressions.
