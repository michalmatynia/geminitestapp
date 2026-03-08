# Accessibility Component Policy Report

Generated at: 2026-03-08T12:53:41.691Z

## Summary

- Status: PASSED
- Files scanned: 67
- Dialogs checked: 4
- Alert dialogs checked: 1
- Tablists checked: 31
- Tooltips checked: 73
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
