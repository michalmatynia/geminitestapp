# Accessibility Route Crawl Report

Generated at: 2026-03-07T22:20:07.129Z

## Summary

- Status: FAILED
- Routes: 11
- Passed: 8
- Failed: 3
- Unexpected Playwright failures: 1
- Flaky results: 0
- Skipped: 2
- Error messages captured: 1

## Route Status

| Route | Audience | Status | Duration | Errors |
| --- | --- | --- | ---: | ---: |
| / | public | PASS | 9.3s | 0 |
| /auth/signin | public | PASS | 1.4s | 0 |
| /auth/register | public | PASS | 1.6s | 0 |
| /admin | admin | PASS | 2.9s | 0 |
| /admin/products | admin | PASS | 3.3s | 0 |
| /admin/ai-paths | admin | PASS | 6.5s | 0 |
| /admin/image-studio | admin | PASS | 5.8s | 0 |
| /admin/chatbot | admin | PASS | 3.4s | 0 |
| /admin/kangur | admin | FAIL | 4.8s | 1 |
| /admin/databases | admin | FAIL | 0ms | 0 |
| /admin/settings/brain | admin | FAIL | 0ms | 0 |

## Errors

### Admin Kangur

- Error: Accessibility violations detected:

[moderate] landmark-main-is-top-level: Main landmark should not be contained in another landmark
Ensure the main landmark is at top level
- #kangur-game-main
Fix any of the following:
  The main landmark is contained in another landmark.
https://dequeuniversity.com/rules/axe/4.11/landmark-main-is-top-level?application=axeAPI

[moderate] landmark-no-duplicate-main: Document should not have more than one main landmark
Ensure the document has at most one main landmark
- #app-content
Fix any of the following:
  Document has more than one main landmark
https://dequeuniversity.com/rules/axe/4.11/landmark-no-duplicate-main?application=axeAPI

   at support/accessibility.ts:100

   98 |   if (violations.length === 0) return;
   99 |
> 100 |   throw new Error(`Accessibility violations detected:\n\n${formatViolations(violations)}`);
      |         ^
  101 | }
  102 |
    at expectPageToHaveNoAxeViolations (/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/e2e/support/accessibility.ts:100:9)
    at /Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/e2e/features/accessibility/accessibility-route-crawl.spec.ts:39:5

## Notes

- This crawl scans representative public and admin routes with the same axe helper used by the browser accessibility smoke suites.
- Admin routes establish a signed-in session through the shared Playwright admin auth helper before scanning.
- Strict mode fails when any route scan fails.
