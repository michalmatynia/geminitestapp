---
owner: 'Platform Team'
last_reviewed: '2026-03-17'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Accessibility Route Crawl Report

Generated at: 2026-03-17T16:07:22.432Z

## Summary

- Status: PASSED
- Routes: 1
- Passed: 1
- Failed: 0
- Unexpected Playwright failures: 0
- Flaky results: 0
- Skipped: 0
- Error messages captured: 0

## Route Status

| Route | Audience | Status | Duration | Errors |
| --- | --- | --- | ---: | ---: |
| /kangur/game | public | PASS | 1.2m | 0 |

## Errors

No route crawl errors detected.
## Notes

- This crawl scans representative public and admin routes with the same axe helper used by the browser accessibility smoke suites.
- Admin routes establish a signed-in session through the shared Playwright admin auth helper before scanning.
- Run `npm run test:accessibility:gate` to execute component policies, smoke suites, and this route crawl together.
- Strict mode fails when any route scan fails.
