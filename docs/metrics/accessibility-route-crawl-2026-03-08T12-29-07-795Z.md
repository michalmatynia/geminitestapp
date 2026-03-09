---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: false
---
# Accessibility Route Crawl Report

Generated at: 2026-03-08T12:29:07.795Z

## Summary

- Status: FAILED
- Routes: 17
- Passed: 13
- Failed: 4
- Unexpected Playwright failures: 1
- Flaky results: 0
- Skipped: 3
- Error messages captured: 1

## Route Status

| Route | Audience | Status | Duration | Errors |
| --- | --- | --- | ---: | ---: |
| / | public | PASS | 2.4s | 0 |
| /auth/signin | public | PASS | 2.1s | 0 |
| /auth/register | public | PASS | 1.7s | 0 |
| /admin | admin | PASS | 4.0s | 0 |
| /admin/products | admin | PASS | 4.1s | 0 |
| /admin/notes | admin | PASS | 3.6s | 0 |
| /admin/integrations | admin | PASS | 3.4s | 0 |
| /admin/case-resolver | admin | PASS | 8.0s | 0 |
| /admin/cms | admin | PASS | 3.1s | 0 |
| /admin/ai-paths | admin | PASS | 5.1s | 0 |
| /admin/image-studio | admin | PASS | 6.3s | 0 |
| /admin/chatbot | admin | PASS | 3.6s | 0 |
| /admin/agentcreator | admin | PASS | 2.4s | 0 |
| /admin/prompt-engine/validation | admin | FAIL | 3.4s | 1 |
| /admin/kangur | admin | FAIL | 0ms | 0 |
| /admin/databases/engine | admin | FAIL | 0ms | 0 |
| /admin/brain?tab=routing | admin | FAIL | 0ms | 0 |

## Errors

### Admin Prompt Engine Validation

- Error: Accessibility violations detected:

[critical] aria-valid-attr-value: ARIA attributes must conform to valid values
Ensure all ARIA attributes have valid values
- #radix-_r_v_-trigger-core
Fix all of the following:
  Invalid ARIA attribute value: aria-controls="radix-_r_v_-content-core"
https://dequeuniversity.com/rules/axe/4.11/aria-valid-attr-value?application=axeAPI

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
- Run `npm run test:accessibility:gate` to execute component policies, smoke suites, and this route crawl together.
- Strict mode fails when any route scan fails.
