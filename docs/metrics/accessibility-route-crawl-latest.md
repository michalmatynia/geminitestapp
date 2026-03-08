# Accessibility Route Crawl Report

Generated at: 2026-03-08T15:36:35.054Z

## Summary

- Status: FAILED
- Routes: 17
- Passed: 3
- Failed: 14
- Unexpected Playwright failures: 1
- Flaky results: 0
- Skipped: 13
- Error messages captured: 2

## Route Status

| Route | Audience | Status | Duration | Errors |
| --- | --- | --- | ---: | ---: |
| / | public | PASS | 15.8s | 0 |
| /auth/signin | public | PASS | 10.1s | 0 |
| /auth/register | public | PASS | 4.8s | 0 |
| /admin | admin | FAIL | 30.8s | 2 |
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
| /admin/databases/engine | admin | FAIL | 0ms | 0 |
| /admin/brain?tab=routing | admin | FAIL | 0ms | 0 |

## Errors

### Admin Dashboard

- [31mTest timeout of 30000ms exceeded.[39m
- Error: locator.waitFor: Target page, context or browser has been closed

   at support/admin-auth.ts:45

  43 |
  44 |   for (const candidate of credentialCandidates) {
> 45 |     await page.getByRole('textbox', { name: /email/i }).waitFor({ state: 'visible', timeout: 20_000 });
     |                                                         ^
  46 |     await page.getByRole('textbox', { name: /email/i }).fill(candidate.email);
  47 |     await page.getByRole('textbox', { name: /password/i }).fill(candidate.password);
  48 |     await page.getByRole('button', { name: /sign in/i }).click();
    at ensureAdminSession (/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/e2e/support/admin-auth.ts:45:57)
    at /Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/e2e/features/accessibility/accessibility-route-crawl.spec.ts:18:7

## Notes

- This crawl scans representative public and admin routes with the same axe helper used by the browser accessibility smoke suites.
- Admin routes establish a signed-in session through the shared Playwright admin auth helper before scanning.
- Run `npm run test:accessibility:gate` to execute component policies, smoke suites, and this route crawl together.
- Strict mode fails when any route scan fails.
