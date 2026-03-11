---
owner: 'Platform Team'
last_reviewed: '2026-03-11'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Accessibility Route Crawl Report

Generated at: 2026-03-08T21:54:13.648Z

## Summary

- Status: FAILED
- Routes: 17
- Passed: 0
- Failed: 17
- Unexpected Playwright failures: 1
- Flaky results: 0
- Skipped: 16
- Error messages captured: 1

## Route Status

| Route | Audience | Status | Duration | Errors |
| --- | --- | --- | ---: | ---: |
| / | public | FAIL | 26.3s | 1 |
| /auth/signin | public | FAIL | 0ms | 0 |
| /auth/register | public | FAIL | 0ms | 0 |
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
| /admin/databases/engine | admin | FAIL | 0ms | 0 |
| /admin/brain?tab=routing | admin | FAIL | 0ms | 0 |

## Errors

### Public Home

- Error: Accessibility violations detected:

[moderate] region: All page content should be contained by landmarks
Ensure all page content is contained by landmarks
- .items-start
Fix any of the following:
  Some page content is not contained by landmarks
https://dequeuniversity.com/rules/axe/4.11/region?application=axeAPI

   at support/accessibility.ts:100

   98 |   if (violations.length === 0) return;
   99 |
> 100 |   throw new Error(`Accessibility violations detected:\n\n${formatViolations(violations)}`);
      |         ^
  101 | }
  102 |
    at expectPageToHaveNoAxeViolations (/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/e2e/support/accessibility.ts:100:9)
    at /Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/e2e/features/accessibility/accessibility-route-crawl.spec.ts:50:5

## Notes

- This crawl scans representative public and admin routes with the same axe helper used by the browser accessibility smoke suites.
- Admin routes establish a signed-in session through the shared Playwright admin auth helper before scanning.
- Run `npm run test:accessibility:gate` to execute component policies, smoke suites, and this route crawl together.
- Strict mode fails when any route scan fails.
