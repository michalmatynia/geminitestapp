---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: false
---
# Accessibility Route Crawl Report

Generated at: 2026-03-07T22:25:32.547Z

## Summary

- Status: FAILED
- Routes: 11
- Passed: 7
- Failed: 4
- Unexpected Playwright failures: 1
- Flaky results: 0
- Skipped: 3
- Error messages captured: 1

## Route Status

| Route | Audience | Status | Duration | Errors |
| --- | --- | --- | ---: | ---: |
| / | public | PASS | 4.9s | 0 |
| /auth/signin | public | PASS | 1.3s | 0 |
| /auth/register | public | PASS | 1.3s | 0 |
| /admin | admin | PASS | 2.7s | 0 |
| /admin/products | admin | PASS | 3.6s | 0 |
| /admin/ai-paths | admin | PASS | 3.5s | 0 |
| /admin/image-studio | admin | PASS | 3.2s | 0 |
| /admin/chatbot | admin | FAIL | 2.7s | 1 |
| /admin/kangur | admin | FAIL | 0ms | 0 |
| /admin/databases/engine | admin | FAIL | 0ms | 0 |
| /admin/brain?tab=routing | admin | FAIL | 0ms | 0 |

## Errors

### Admin Chatbot

- Error: Accessibility violations detected:

[serious] nested-interactive: Interactive controls must not be nested
Ensure interactive controls are not nested as they are not always announced by screen readers or can cause focus problems for assistive technologies
- .bg-primary\/10
Fix any of the following:
  Element has focusable descendants
https://dequeuniversity.com/rules/axe/4.11/nested-interactive?application=axeAPI

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
