# Accessibility Route Crawl Report

Generated at: 2026-03-07T22:27:44.678Z

## Summary

- Status: FAILED
- Routes: 11
- Passed: 9
- Failed: 2
- Unexpected Playwright failures: 1
- Flaky results: 0
- Skipped: 1
- Error messages captured: 1

## Route Status

| Route | Audience | Status | Duration | Errors |
| --- | --- | --- | ---: | ---: |
| / | public | PASS | 6.1s | 0 |
| /auth/signin | public | PASS | 1.6s | 0 |
| /auth/register | public | PASS | 1.5s | 0 |
| /admin | admin | PASS | 3.2s | 0 |
| /admin/products | admin | PASS | 3.1s | 0 |
| /admin/ai-paths | admin | PASS | 2.9s | 0 |
| /admin/image-studio | admin | PASS | 3.4s | 0 |
| /admin/chatbot | admin | PASS | 2.5s | 0 |
| /admin/kangur | admin | PASS | 3.8s | 0 |
| /admin/databases/engine | admin | FAIL | 21.6s | 1 |
| /admin/brain?tab=routing | admin | FAIL | 0ms | 0 |

## Errors

### Admin Databases

- Error: Unable to establish an admin session for /admin/databases/engine.

   at support/admin-auth.ts:56

  54 |   }
  55 |
> 56 |   throw new Error(`Unable to establish an admin session for ${destination}.`);
     |         ^
  57 | }
  58 |
    at ensureAdminSession (/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/e2e/support/admin-auth.ts:56:9)
    at /Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/e2e/features/accessibility/accessibility-route-crawl.spec.ts:18:7

## Notes

- This crawl scans representative public and admin routes with the same axe helper used by the browser accessibility smoke suites.
- Admin routes establish a signed-in session through the shared Playwright admin auth helper before scanning.
- Strict mode fails when any route scan fails.
