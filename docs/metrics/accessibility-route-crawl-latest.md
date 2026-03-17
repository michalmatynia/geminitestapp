---
owner: 'Platform Team'
last_reviewed: '2026-03-17'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Accessibility Route Crawl Report

Generated at: 2026-03-17T14:07:17.504Z

## Summary

- Status: FAILED
- Routes: 28
- Passed: 8
- Failed: 20
- Unexpected Playwright failures: 4
- Flaky results: 0
- Skipped: 16
- Error messages captured: 5

## Route Status

| Route | Audience | Status | Duration | Errors |
| --- | --- | --- | ---: | ---: |
| / | public | FAIL | 3.2m | 2 |
| /auth/signin | public | FAIL | 0ms | 0 |
| /auth/register | public | FAIL | 0ms | 0 |
| /kangur/login | public | FAIL | 0ms | 0 |
| /kangur | public | FAIL | 0ms | 0 |
| /kangur/game | public | FAIL | 0ms | 0 |
| /kangur/lessons | public | FAIL | 2.3m | 1 |
| /kangur/profile | public | FAIL | 0ms | 0 |
| /kangur/parent-dashboard | public | FAIL | 0ms | 0 |
| /admin | admin | FAIL | 0ms | 0 |
| /admin/prompt-engine/validation | admin | FAIL | 0ms | 0 |
| /admin/products | admin | FAIL | 0ms | 0 |
| /admin/notes | admin | PASS | 30.6s | 0 |
| /admin/integrations | admin | PASS | 8.9s | 0 |
| /admin/case-resolver | admin | PASS | 45.8s | 0 |
| /admin/cms | admin | PASS | 15.8s | 0 |
| /admin/ai-paths | admin | PASS | 58.6s | 0 |
| /admin/image-studio | admin | PASS | 18.3s | 0 |
| /admin/chatbot | admin | PASS | 12.0s | 0 |
| /admin/agentcreator | admin | PASS | 12.7s | 0 |
| /admin/kangur | admin | FAIL | 2.2m | 1 |
| /admin/kangur/builder | admin | FAIL | 0ms | 0 |
| /admin/kangur/lessons-manager | admin | FAIL | 0ms | 0 |
| /admin/kangur/observability | admin | FAIL | 0ms | 0 |
| /admin/kangur/appearance | admin | FAIL | 3.1m | 1 |
| /admin/kangur/settings | admin | FAIL | 0ms | 0 |
| /admin/databases/engine | admin | FAIL | 0ms | 0 |
| /admin/brain?tab=routing | admin | FAIL | 0ms | 0 |

## Errors

### Public Home

- [31mTest timeout of 180000ms exceeded.[39m
- TimeoutError: page.goto: Timeout 180000ms exceeded.
Call log:
[2m  - navigating to "http://127.0.0.1:59884/", waiting until "domcontentloaded"[22m


  36 |       await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  37 |     } else {
> 38 |       await page.goto(routeEntry.route, {
     |                  ^
  39 |         waitUntil: 'domcontentloaded',
  40 |         timeout: PUBLIC_ROUTE_TIMEOUT_MS,
  41 |       });
    at /Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/e2e/features/accessibility/accessibility-route-crawl.spec.ts:38:18

### Kangur Lessons

- Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed

Locator: locator('#app-content')
Expected: visible
Timeout: 30000ms
Error: element(s) not found

Call log:
[2m  - Expect "toBeVisible" with timeout 30000ms[22m
[2m  - waiting for locator('#app-content')[22m


  44 |
  45 |     const main = page.locator('#app-content');
> 46 |     await expect(main).toBeVisible({ timeout: MAIN_READY_TIMEOUT_MS });
     |                        ^
  47 |     await expect(main).toHaveAttribute('tabindex', '-1', { timeout: MAIN_READY_TIMEOUT_MS });
  48 |
  49 |     const skipLink = page.getByRole('link', { name: 'Skip to content', includeHidden: true }).first();
    at /Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/e2e/features/accessibility/accessibility-route-crawl.spec.ts:46:24

### Admin Kangur

- Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed

Locator: locator('#app-content')
Expected: visible
Timeout: 30000ms
Error: element(s) not found

Call log:
[2m  - Expect "toBeVisible" with timeout 30000ms[22m
[2m  - waiting for locator('#app-content')[22m


  44 |
  45 |     const main = page.locator('#app-content');
> 46 |     await expect(main).toBeVisible({ timeout: MAIN_READY_TIMEOUT_MS });
     |                        ^
  47 |     await expect(main).toHaveAttribute('tabindex', '-1', { timeout: MAIN_READY_TIMEOUT_MS });
  48 |
  49 |     const skipLink = page.getByRole('link', { name: 'Skip to content', includeHidden: true }).first();
    at /Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/e2e/features/accessibility/accessibility-route-crawl.spec.ts:46:24

### Admin Kangur Appearance

- Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed

Locator: locator('#app-content')
Expected: visible
Timeout: 30000ms
Error: element(s) not found

Call log:
[2m  - Expect "toBeVisible" with timeout 30000ms[22m
[2m  - waiting for locator('#app-content')[22m


  44 |
  45 |     const main = page.locator('#app-content');
> 46 |     await expect(main).toBeVisible({ timeout: MAIN_READY_TIMEOUT_MS });
     |                        ^
  47 |     await expect(main).toHaveAttribute('tabindex', '-1', { timeout: MAIN_READY_TIMEOUT_MS });
  48 |
  49 |     const skipLink = page.getByRole('link', { name: 'Skip to content', includeHidden: true }).first();
    at /Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/e2e/features/accessibility/accessibility-route-crawl.spec.ts:46:24

## Notes

- This crawl scans representative public and admin routes with the same axe helper used by the browser accessibility smoke suites.
- Admin routes establish a signed-in session through the shared Playwright admin auth helper before scanning.
- Run `npm run test:accessibility:gate` to execute component policies, smoke suites, and this route crawl together.
- Strict mode fails when any route scan fails.
