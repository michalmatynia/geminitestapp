---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: false
---
# Accessibility Route Crawl Report

Generated at: 2026-03-08T12:34:19.685Z

## Summary

- Status: PASSED
- Routes: 17
- Passed: 17
- Failed: 0
- Unexpected Playwright failures: 0
- Flaky results: 0
- Skipped: 0
- Error messages captured: 0

## Route Status

| Route | Audience | Status | Duration | Errors |
| --- | --- | --- | ---: | ---: |
| / | public | PASS | 2.3s | 0 |
| /auth/signin | public | PASS | 1.2s | 0 |
| /auth/register | public | PASS | 1.2s | 0 |
| /admin | admin | PASS | 3.6s | 0 |
| /admin/products | admin | PASS | 3.4s | 0 |
| /admin/notes | admin | PASS | 2.6s | 0 |
| /admin/integrations | admin | PASS | 2.3s | 0 |
| /admin/case-resolver | admin | PASS | 3.6s | 0 |
| /admin/cms | admin | PASS | 2.3s | 0 |
| /admin/ai-paths | admin | PASS | 3.1s | 0 |
| /admin/image-studio | admin | PASS | 3.5s | 0 |
| /admin/chatbot | admin | PASS | 2.4s | 0 |
| /admin/agentcreator | admin | PASS | 2.2s | 0 |
| /admin/prompt-engine/validation | admin | PASS | 2.3s | 0 |
| /admin/kangur | admin | PASS | 3.5s | 0 |
| /admin/databases/engine | admin | PASS | 2.7s | 0 |
| /admin/brain?tab=routing | admin | PASS | 3.7s | 0 |

## Errors

No route crawl errors detected.
## Notes

- This crawl scans representative public and admin routes with the same axe helper used by the browser accessibility smoke suites.
- Admin routes establish a signed-in session through the shared Playwright admin auth helper before scanning.
- Run `npm run test:accessibility:gate` to execute component policies, smoke suites, and this route crawl together.
- Strict mode fails when any route scan fails.
