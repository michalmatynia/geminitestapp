# Accessibility Component Policy Report

Generated at: 2026-03-07T21:47:14.768Z

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
| WARN | tooltip-trigger-not-focusable | src/features/ai/ai-paths/components/node-config/dialog/regex/RegexAiPromptSection.tsx:86:11 | Tooltip wraps a non-focusable <span> trigger. Use a focusable trigger or add keyboard focus support. |
| WARN | tooltip-trigger-not-focusable | src/features/ai/ai-paths/components/node-config/dialog/regex/RegexAiPromptSection.tsx:91:11 | Tooltip wraps a non-focusable <span> trigger. Use a focusable trigger or add keyboard focus support. |
| WARN | tooltip-trigger-not-focusable | src/features/ai/ai-paths/components/run-timeline.tsx:375:17 | Tooltip wraps a non-focusable <span> trigger. Use a focusable trigger or add keyboard focus support. |
| WARN | tooltip-trigger-not-focusable | src/features/ai/ai-paths/components/run-timeline.tsx:394:17 | Tooltip wraps a non-focusable <span> trigger. Use a focusable trigger or add keyboard focus support. |
| WARN | tooltip-trigger-not-focusable | src/features/data-import-export/components/imports/sections/ImportListPreviewSection.tsx:156:17 | Tooltip wraps a non-focusable <span> trigger. Use a focusable trigger or add keyboard focus support. |
| WARN | tooltip-trigger-not-focusable | src/features/observability/components/EventStreamPanel.tsx:90:17 | Tooltip wraps a non-focusable <span> trigger. Use a focusable trigger or add keyboard focus support. |
| WARN | tooltip-trigger-not-focusable | src/features/products/components/list/ProductColumns.tsx:201:11 | Tooltip wraps a non-focusable <span> trigger. Use a focusable trigger or add keyboard focus support. |
| WARN | tooltip-trigger-not-focusable | src/features/products/components/list/ProductColumns.tsx:275:11 | Tooltip wraps a non-focusable <span> trigger. Use a focusable trigger or add keyboard focus support. |

## Notes

- This check validates shared primitive usage contracts before browser-level accessibility smoke tests.
- Strict mode fails on accessibility policy errors. Use --fail-on-warnings to additionally gate tooltip triggers that stay mouse-only.
- Unlabeled tablists are reported as informational guidance so the report stays focused on real keyboard and naming regressions.
