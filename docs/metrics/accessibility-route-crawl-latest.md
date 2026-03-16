---
owner: 'Platform Team'
last_reviewed: '2026-03-16'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Accessibility Route Crawl Report

Generated at: 2026-03-16T20:55:53.128Z

## Summary

- Status: FAILED
- Routes: 28
- Passed: 15
- Failed: 13
- Unexpected Playwright failures: 1
- Flaky results: 0
- Skipped: 12
- Error messages captured: 1

## Route Status

| Route | Audience | Status | Duration | Errors |
| --- | --- | --- | ---: | ---: |
| / | public | PASS | 1.1m | 0 |
| /auth/signin | public | PASS | 8.6s | 0 |
| /auth/register | public | PASS | 7.1s | 0 |
| /kangur/login | public | PASS | 30.1s | 0 |
| /kangur | public | PASS | 36.9s | 0 |
| /kangur/game | public | PASS | 54.7s | 0 |
| /kangur/lessons | public | PASS | 16.2s | 0 |
| /kangur/profile | public | PASS | 12.9s | 0 |
| /kangur/parent-dashboard | public | PASS | 18.7s | 0 |
| /admin | admin | PASS | 1.4m | 0 |
| /admin/products | admin | PASS | 56.6s | 0 |
| /admin/notes | admin | PASS | 17.3s | 0 |
| /admin/integrations | admin | PASS | 36.4s | 0 |
| /admin/case-resolver | admin | PASS | 51.3s | 0 |
| /admin/cms | admin | PASS | 19.7s | 0 |
| /admin/ai-paths | admin | FAIL | 3.2m | 1 |
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

### Admin AI Paths

- Error: Accessibility violations detected:

[serious] scrollable-region-focusable: Scrollable region must have keyboard access
Ensure elements that have scrollable content are accessible by keyboard
- #app-content
Fix any of the following:
  Element should have focusable content
  Element should be focusable
https://dequeuniversity.com/rules/axe/4.11/scrollable-region-focusable?application=axeAPI

   at support/accessibility.ts:100

   98 |   if (violations.length === 0) return;
   99 |
> 100 |   throw new Error(`Accessibility violations detected:\n\n${formatViolations(violations)}`);
      |         ^
  101 | }
  102 |
    at expectPageToHaveNoAxeViolations (/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/e2e/support/accessibility.ts:100:9)
    at /Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/e2e/features/accessibility/accessibility-route-crawl.spec.ts:55:5

## Notes

- This crawl scans representative public and admin routes with the same axe helper used by the browser accessibility smoke suites.
- Admin routes establish a signed-in session through the shared Playwright admin auth helper before scanning.
- Run `npm run test:accessibility:gate` to execute component policies, smoke suites, and this route crawl together.
- Strict mode fails when any route scan fails.
