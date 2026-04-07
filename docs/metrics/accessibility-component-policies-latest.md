---
owner: 'Platform Team'
last_reviewed: '2026-04-07'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Accessibility Component Policy Report

Generated at: 2026-04-07T12:46:07.066Z

## Summary

- Status: PASSED
- Files scanned: 8
- Dialogs checked: 1
- Alert dialogs checked: 1
- Tablists checked: 5
- Tooltips checked: 8
- Errors: 0
- Warnings: 0

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |

## Issues

No accessibility component policy issues detected.

## Notes

- This check validates shared primitive usage contracts before browser-level accessibility smoke tests.
- Strict mode fails on accessibility policy errors. Use --fail-on-warnings to additionally gate tooltip triggers that stay mouse-only.
- Unlabeled tablists are reported as informational guidance so the report stays focused on real keyboard and naming regressions.
