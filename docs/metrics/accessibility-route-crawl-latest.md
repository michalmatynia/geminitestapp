---
owner: 'Platform Team'
last_reviewed: '2026-03-15'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Accessibility Route Crawl Report

Generated at: 2026-03-15T20:21:25.356Z

## Summary

- Status: FAILED
- Routes: 28
- Passed: 8
- Failed: 20
- Unexpected Playwright failures: 1
- Flaky results: 0
- Skipped: 19
- Error messages captured: 1

## Route Status

| Route | Audience | Status | Duration | Errors |
| --- | --- | --- | ---: | ---: |
| / | public | PASS | 15.8s | 0 |
| /auth/signin | public | PASS | 1.3s | 0 |
| /auth/register | public | PASS | 1.8s | 0 |
| /kangur/login | public | PASS | 5.0s | 0 |
| /kangur | public | PASS | 5.3s | 0 |
| /kangur/game | public | PASS | 3.3s | 0 |
| /kangur/lessons | public | PASS | 3.1s | 0 |
| /kangur/profile | public | PASS | 3.1s | 0 |
| /kangur/parent-dashboard | public | FAIL | 7.6s | 1 |
| /admin | admin | FAIL | 0ms | 0 |
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

### Kangur Parent Dashboard

- Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeFocused[2m([22m[2m)[22m failed

Locator:  locator('#app-content')
Expected: focused
Received: inactive
Timeout:  5000ms

Call log:
[2m  - Expect "toBeFocused" with timeout 5000ms[22m
[2m  - waiting for locator('#app-content')[22m
[2m    8 × locator resolved to <main tabindex="-1" id="app-content" data-kangur-appearance-mode="default" data-kangur-prev-surface-background="" data-kangur-prev-surface-appearance-mode="" data-kangur-prev-surface-scrollbar-gutter="" class="min-h-screen bg-background focus:outline-none kangur-surface-active" data-kangur-prev-surface-vars="{"--kangur-font-heading":"","--kangur-font-body":"","--kangur-font-base-size":"","--kangur-font-line-height":"","--kangur-font-heading-line-height":"","--kangur-page-max-width":"","--kangur-page…>…</main>[22m
[2m      - unexpected value "inactive"[22m


  42 |     await page.keyboard.press('Enter');
  43 |     await expect(page).toHaveURL(/#app-content$/);
> 44 |     await expect(main).toBeFocused();
     |                        ^
  45 |
  46 |     if (routeEntry.readySelector) {
  47 |       await expect(page.locator(routeEntry.readySelector)).toBeVisible();
    at /Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/e2e/features/accessibility/accessibility-route-crawl.spec.ts:44:24

## Notes

- This crawl scans representative public and admin routes with the same axe helper used by the browser accessibility smoke suites.
- Admin routes establish a signed-in session through the shared Playwright admin auth helper before scanning.
- Run `npm run test:accessibility:gate` to execute component policies, smoke suites, and this route crawl together.
- Strict mode fails when any route scan fails.
