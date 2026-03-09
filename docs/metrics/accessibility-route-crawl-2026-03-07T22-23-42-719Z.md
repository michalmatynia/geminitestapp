---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: false
---
# Accessibility Route Crawl Report

Generated at: 2026-03-07T22:23:42.719Z

## Summary

- Status: FAILED
- Routes: 11
- Passed: 9
- Failed: 2
- Unexpected Playwright failures: 1
- Flaky results: 0
- Skipped: 1
- Error messages captured: 1

## Route Status

| Route | Audience | Status | Duration | Errors |
| --- | --- | --- | ---: | ---: |
| / | public | PASS | 13.2s | 0 |
| /auth/signin | public | PASS | 1.8s | 0 |
| /auth/register | public | PASS | 1.3s | 0 |
| /admin | admin | PASS | 3.2s | 0 |
| /admin/products | admin | PASS | 3.1s | 0 |
| /admin/ai-paths | admin | PASS | 3.4s | 0 |
| /admin/image-studio | admin | PASS | 4.0s | 0 |
| /admin/chatbot | admin | PASS | 3.4s | 0 |
| /admin/kangur | admin | PASS | 3.7s | 0 |
| /admin/databases/engine | admin | FAIL | 4.7s | 1 |
| /admin/brain?tab=routing | admin | FAIL | 0ms | 0 |

## Errors

### Admin Databases

- Error: Accessibility violations detected:

[critical] button-name: Buttons must have discernible text
Ensure buttons have discernible text
- .hover\:bg-accent\/5.bg-white\/5.border-white\/5:nth-child(1) > .shrink-0.items-center.flex > .peer.h-4[data-state="unchecked"]
Fix any of the following:
  Element does not have inner text that is visible to screen readers
  aria-label attribute does not exist or is empty
  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty
  Element has no title attribute
  Element does not have an implicit (wrapped) <label>
  Element does not have an explicit <label>
  Element's default semantics were not overridden with role="none" or role="presentation"
- .hover\:bg-accent\/5.bg-white\/5.border-white\/5:nth-child(2) > .shrink-0.items-center.flex > .peer.h-4[data-state="unchecked"]
Fix any of the following:
  Element does not have inner text that is visible to screen readers
  aria-label attribute does not exist or is empty
  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty
  Element has no title attribute
  Element does not have an implicit (wrapped) <label>
  Element does not have an explicit <label>
  Element's default semantics were not overridden with role="none" or role="presentation"
- .peer.h-4[data-state="checked"]
Fix any of the following:
  Element does not have inner text that is visible to screen readers
  aria-label attribute does not exist or is empty
  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty
  Element has no title attribute
  Element does not have an implicit (wrapped) <label>
  Element does not have an explicit <label>
  Element's default semantics were not overridden with role="none" or role="presentation"
- .hover\:bg-accent\/5.bg-white\/5.border-white\/5:nth-child(4) > .shrink-0.items-center.flex > .peer.h-4[data-state="unchecked"]
Fix any of the following:
  Element does not have inner text that is visible to screen readers
  aria-label attribute does not exist or is empty
  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty
  Element has no title attribute
  Element does not have an implicit (wrapped) <label>
  Element does not have an explicit <label>
  Element's default semantics were not overridden with role="none" or role="presentation"
https://dequeuniversity.com/rules/axe/4.11/button-name?application=axeAPI

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
