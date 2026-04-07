---
owner: 'Platform Team'
last_reviewed: '2026-04-07'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Timer Cleanup Check

Generated at: 2026-04-07T11:43:02.880Z

## Summary

- Status: WARN
- Files scanned: 3026
- Errors: 0
- Warnings: 1

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| settimeout-no-cleanup | 0 | 1 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| WARN | settimeout-no-cleanup | src/features/integrations/hooks/useVintedQuickExportPolling.ts:46 | setTimeout() in a component with useEffect but no clearTimeout(). Consider cleaning up timers on unmount. |

## Notes

- `setinterval-no-cleanup` (error): setInterval without clearInterval causes memory leaks.
- `settimeout-no-cleanup` (warn): setTimeout in useEffect without clearTimeout may fire after unmount.
- `addeventlistener-no-removal` (warn): Event listeners without removeEventListener cause memory leaks.
