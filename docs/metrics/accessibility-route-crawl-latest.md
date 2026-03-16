---
owner: 'Platform Team'
last_reviewed: '2026-03-16'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Accessibility Route Crawl Report

Generated at: 2026-03-16T19:21:43.563Z

## Summary

- Status: FAILED
- Routes: 28
- Passed: 9
- Failed: 19
- Unexpected Playwright failures: 1
- Flaky results: 0
- Skipped: 18
- Error messages captured: 1

## Route Status

| Route | Audience | Status | Duration | Errors |
| --- | --- | --- | ---: | ---: |
| / | public | PASS | 23.7s | 0 |
| /auth/signin | public | PASS | 1.9s | 0 |
| /auth/register | public | PASS | 2.5s | 0 |
| /kangur/login | public | PASS | 6.3s | 0 |
| /kangur | public | PASS | 10.0s | 0 |
| /kangur/game | public | PASS | 5.7s | 0 |
| /kangur/lessons | public | PASS | 5.0s | 0 |
| /kangur/profile | public | PASS | 3.1s | 0 |
| /kangur/parent-dashboard | public | PASS | 3.0s | 0 |
| /admin | admin | FAIL | 1.0m | 1 |
| /admin/products | admin | FAIL | 0ms | 0 |
| /admin/notes | admin | FAIL | 0ms | 0 |
| /admin/integrations | admin | FAIL | 0ms | 0 |
| /admin/case-resolver | admin | FAIL | 0ms | 0 |
| /admin/cms | admin | FAIL | 0ms | 0 |
| /admin/ai-paths | admin | FAIL | 0ms | 0 |
| /admin/image-studio | admin | FAIL | 0ms | 0 |
| /admin/chatbot | admin | FAIL | 0ms | 0 |
| /admin/agentcreator | admin | FAIL | 0ms | 0 |
| /admin/prompt-engine/validation | admin | FAIL | 0ms | 0 |
| /admin/kangur | admin | FAIL | 0ms | 0 |
| /admin/kangur/builder | admin | FAIL | 0ms | 0 |
| /admin/kangur/lessons-manager | admin | FAIL | 0ms | 0 |
| /admin/kangur/observability | admin | FAIL | 0ms | 0 |
| /admin/kangur/appearance | admin | FAIL | 0ms | 0 |
| /admin/kangur/settings | admin | FAIL | 0ms | 0 |
| /admin/databases/engine | admin | FAIL | 0ms | 0 |
| /admin/brain?tab=routing | admin | FAIL | 0ms | 0 |

## Errors

### Admin Dashboard

- TimeoutError: page.waitForURL: Timeout 60000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
  navigated to "http://127.0.0.1:63940/auth/signin?error=AccessDenied"
  navigated to "http://127.0.0.1:63940/auth/signin?error=AccessDenied"
  navigated to "http://127.0.0.1:63940/auth/signin?error=AccessDenied"
============================================================

   at support/admin-auth.ts:100

   98 |
   99 |     if (!matchesDestination(getCurrentUrl())) {
> 100 |       await page.waitForURL(
      |                  ^
  101 |         (url) =>
  102 |           url.pathname === destinationUrl.pathname &&
  103 |           (destinationUrl.search ? url.search === destinationUrl.search : true),
    at navigateToDestination (/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/e2e/support/admin-auth.ts:100:18)
    at ensureAdminSession (/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/e2e/support/admin-auth.ts:168:7)
    at /Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/e2e/features/accessibility/accessibility-route-crawl.spec.ts:20:7

## Notes

- This crawl scans representative public and admin routes with the same axe helper used by the browser accessibility smoke suites.
- Admin routes establish a signed-in session through the shared Playwright admin auth helper before scanning.
- Run `npm run test:accessibility:gate` to execute component policies, smoke suites, and this route crawl together.
- Strict mode fails when any route scan fails.
