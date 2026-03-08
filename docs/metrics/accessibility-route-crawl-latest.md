# Accessibility Route Crawl Report

Generated at: 2026-03-08T17:59:51.409Z

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
| / | public | PASS | 16.2s | 0 |
| /auth/signin | public | PASS | 1.7s | 0 |
| /auth/register | public | PASS | 2.5s | 0 |
| /admin | admin | PASS | 8.5s | 0 |
| /admin/products | admin | PASS | 9.7s | 0 |
| /admin/notes | admin | PASS | 6.0s | 0 |
| /admin/integrations | admin | PASS | 6.6s | 0 |
| /admin/case-resolver | admin | PASS | 9.7s | 0 |
| /admin/cms | admin | PASS | 35.1s | 0 |
| /admin/ai-paths | admin | PASS | 17.9s | 0 |
| /admin/image-studio | admin | PASS | 36.9s | 0 |
| /admin/chatbot | admin | PASS | 6.5s | 0 |
| /admin/agentcreator | admin | PASS | 3.4s | 0 |
| /admin/prompt-engine/validation | admin | PASS | 3.3s | 0 |
| /admin/kangur | admin | PASS | 6.0s | 0 |
| /admin/databases/engine | admin | PASS | 13.2s | 0 |
| /admin/brain?tab=routing | admin | PASS | 8.1s | 0 |

## Errors

No route crawl errors detected.
## Notes

- This crawl scans representative public and admin routes with the same axe helper used by the browser accessibility smoke suites.
- Admin routes establish a signed-in session through the shared Playwright admin auth helper before scanning.
- Run `npm run test:accessibility:gate` to execute component policies, smoke suites, and this route crawl together.
- Strict mode fails when any route scan fails.
