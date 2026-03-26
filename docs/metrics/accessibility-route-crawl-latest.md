---
owner: 'Platform Team'
last_reviewed: '2026-03-26'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Accessibility Route Crawl Report

Generated at: 2026-03-26T13:38:01.211Z

## Summary

- Status: FAILED
- Routes: 32
- Passed: 30
- Failed: 2
- Unexpected Playwright failures: 1
- Flaky results: 0
- Skipped: 1
- Error messages captured: 1

## Route Status

| Route | Audience | Status | Duration | Errors |
| --- | --- | --- | ---: | ---: |
| / | public | PASS | 1.8m | 0 |
| /auth/signin | public | PASS | 9.4s | 0 |
| /auth/register | public | PASS | 8.4s | 0 |
| /kangur/login | public | FAIL | 52.4s | 1 |
| /kangur | public | FAIL | 0ms | 0 |
| /kangur/game | public | PASS | 1.2m | 0 |
| /kangur/lessons | public | PASS | 41.6s | 0 |
| /kangur/profile | public | PASS | 43.7s | 0 |
| /kangur/tests | public | PASS | 2.0m | 0 |
| /kangur/parent-dashboard | public | PASS | 1.8m | 0 |
| /kangur/duels | public | PASS | 1.4m | 0 |
| /kangur/social-updates | public | PASS | 39.7s | 0 |
| /kangur/competition | public | PASS | 32.4s | 0 |
| /admin | admin | PASS | 58.3s | 0 |
| /admin/prompt-engine/validation | admin | PASS | 19.5s | 0 |
| /admin/products | admin | PASS | 48.3s | 0 |
| /admin/notes | admin | PASS | 27.0s | 0 |
| /admin/integrations | admin | PASS | 15.7s | 0 |
| /admin/case-resolver | admin | PASS | 31.9s | 0 |
| /admin/cms | admin | PASS | 25.4s | 0 |
| /admin/ai-paths | admin | PASS | 1.2m | 0 |
| /admin/image-studio | admin | PASS | 24.8s | 0 |
| /admin/chatbot | admin | PASS | 18.8s | 0 |
| /admin/agentcreator | admin | PASS | 24.9s | 0 |
| /admin/kangur | admin | PASS | 1.6m | 0 |
| /admin/kangur/builder | admin | PASS | 2.0m | 0 |
| /admin/kangur/lessons-manager | admin | PASS | 1.1m | 0 |
| /admin/kangur/observability | admin | PASS | 51.4s | 0 |
| /admin/kangur/appearance | admin | PASS | 2.5m | 0 |
| /admin/kangur/settings | admin | PASS | 33.3s | 0 |
| /admin/databases/engine | admin | PASS | 40.6s | 0 |
| /admin/brain?tab=routing | admin | PASS | 14.3s | 0 |

## Errors

### Kangur Login

- Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed

Locator:  locator('#kangur-main-content')
Expected: visible
Received: undefined
Timeout:  30000ms

Call log:
[2m  - Expect "toBeVisible" with timeout 30000ms[22m
[2m  - waiting for locator('#kangur-main-content')[22m


  48 |
  49 |     const main = page.locator('#kangur-main-content');
> 50 |     await expect(main).toBeVisible({ timeout: MAIN_READY_TIMEOUT_MS });
     |                        ^
  51 |     await expect(main).toHaveAttribute('tabindex', '-1', { timeout: MAIN_READY_TIMEOUT_MS });
  52 |
  53 |     const skipLink = page.getByRole('link', { name: 'Skip to content', includeHidden: true }).first();
    at /Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/e2e/features/accessibility/accessibility-route-crawl.spec.ts:50:24

## Notes

- This crawl scans representative public and admin routes with the same axe helper used by the browser accessibility smoke suites.
- Admin routes establish a signed-in session through the shared Playwright admin auth helper before scanning.
- Run `npm run test:accessibility:gate` to execute component policies, smoke suites, and this route crawl together.
- Strict mode fails when any route scan fails.
