---
owner: 'Platform Team'
last_reviewed: '2026-03-22'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Accessibility Route Crawl Report

Generated at: 2026-03-22T10:11:14.516Z

## Summary

- Status: FAILED
- Routes: 32
- Passed: 10
- Failed: 22
- Unexpected Playwright failures: 1
- Flaky results: 0
- Skipped: 21
- Error messages captured: 1

## Route Status

| Route | Audience | Status | Duration | Errors |
| --- | --- | --- | ---: | ---: |
| / | public | PASS | 1.4m | 0 |
| /auth/signin | public | PASS | 9.9s | 0 |
| /auth/register | public | PASS | 18.4s | 0 |
| /kangur/login | public | PASS | 59.3s | 0 |
| /kangur | public | PASS | 45.8s | 0 |
| /kangur/game | public | PASS | 46.7s | 0 |
| /kangur/lessons | public | PASS | 38.0s | 0 |
| /kangur/profile | public | PASS | 48.9s | 0 |
| /kangur/tests | public | PASS | 17.0s | 0 |
| /kangur/parent-dashboard | public | PASS | 36.5s | 0 |
| /kangur/duels | public | FAIL | 42.1s | 1 |
| /kangur/social-updates | public | FAIL | 0ms | 0 |
| /kangur/competition | public | FAIL | 0ms | 0 |
| /admin | admin | FAIL | 0ms | 0 |
| /admin/prompt-engine/validation | admin | FAIL | 0ms | 0 |
| /admin/products | admin | FAIL | 0ms | 0 |
| /admin/notes | admin | FAIL | 0ms | 0 |
| /admin/integrations | admin | FAIL | 0ms | 0 |
| /admin/case-resolver | admin | FAIL | 0ms | 0 |
| /admin/cms | admin | FAIL | 0ms | 0 |
| /admin/ai-paths | admin | FAIL | 0ms | 0 |
| /admin/image-studio | admin | FAIL | 0ms | 0 |
| /admin/chatbot | admin | FAIL | 0ms | 0 |
| /admin/agentcreator | admin | FAIL | 0ms | 0 |
| /admin/kangur | admin | FAIL | 0ms | 0 |
| /admin/kangur/builder | admin | FAIL | 0ms | 0 |
| /admin/kangur/lessons-manager | admin | FAIL | 0ms | 0 |
| /admin/kangur/observability | admin | FAIL | 0ms | 0 |
| /admin/kangur/appearance | admin | FAIL | 0ms | 0 |
| /admin/kangur/settings | admin | FAIL | 0ms | 0 |
| /admin/databases/engine | admin | FAIL | 0ms | 0 |
| /admin/brain?tab=routing | admin | FAIL | 0ms | 0 |

## Errors

### Kangur Duels

- Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed

Locator: locator('#kangur-main-content')
Expected: visible
Timeout: 30000ms
Error: element(s) not found

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
