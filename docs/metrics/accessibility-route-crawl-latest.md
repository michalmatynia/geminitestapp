# Accessibility Route Crawl Report

Generated at: 2026-03-08T17:16:23.830Z

## Summary

- Status: FAILED
- Routes: 17
- Passed: 10
- Failed: 7
- Unexpected Playwright failures: 1
- Flaky results: 0
- Skipped: 6
- Error messages captured: 1

## Route Status

| Route | Audience | Status | Duration | Errors |
| --- | --- | --- | ---: | ---: |
| / | public | PASS | 21.2s | 0 |
| /auth/signin | public | PASS | 16.2s | 0 |
| /auth/register | public | PASS | 14.3s | 0 |
| /admin | admin | PASS | 41.4s | 0 |
| /admin/products | admin | PASS | 46.2s | 0 |
| /admin/notes | admin | PASS | 38.4s | 0 |
| /admin/integrations | admin | PASS | 3.6s | 0 |
| /admin/case-resolver | admin | PASS | 10.7s | 0 |
| /admin/cms | admin | PASS | 6.3s | 0 |
| /admin/ai-paths | admin | PASS | 19.7s | 0 |
| /admin/image-studio | admin | FAIL | 56.1s | 1 |
| /admin/chatbot | admin | FAIL | 0ms | 0 |
| /admin/agentcreator | admin | FAIL | 0ms | 0 |
| /admin/prompt-engine/validation | admin | FAIL | 0ms | 0 |
| /admin/kangur | admin | FAIL | 0ms | 0 |
| /admin/databases/engine | admin | FAIL | 0ms | 0 |
| /admin/brain?tab=routing | admin | FAIL | 0ms | 0 |

## Errors

### Admin Image Studio

- Error: Accessibility violations detected:

[critical] aria-required-children: Certain ARIA roles must contain particular children
Ensure elements with an ARIA role that require child roles contain them
- div[role="tree"]
Fix any of the following:
  Element has children which are not allowed: button[aria-label], button[tabindex]
https://dequeuniversity.com/rules/axe/4.11/aria-required-children?application=axeAPI

   at support/accessibility.ts:100

   98 |   if (violations.length === 0) return;
   99 |
> 100 |   throw new Error(`Accessibility violations detected:\n\n${formatViolations(violations)}`);
      |         ^
  101 | }
  102 |
    at expectPageToHaveNoAxeViolations (/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/e2e/support/accessibility.ts:100:9)
    at /Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/e2e/features/accessibility/accessibility-route-crawl.spec.ts:42:5

## Notes

- This crawl scans representative public and admin routes with the same axe helper used by the browser accessibility smoke suites.
- Admin routes establish a signed-in session through the shared Playwright admin auth helper before scanning.
- Run `npm run test:accessibility:gate` to execute component policies, smoke suites, and this route crawl together.
- Strict mode fails when any route scan fails.
