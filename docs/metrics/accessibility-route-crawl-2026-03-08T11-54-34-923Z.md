---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: false
---
# Accessibility Route Crawl Report

Generated at: 2026-03-08T11:54:34.923Z

## Summary

- Status: FAILED
- Routes: 17
- Passed: 0
- Failed: 17
- Unexpected Playwright failures: 0
- Flaky results: 0
- Skipped: 0
- Error messages captured: 18

## Route Status

| Route | Audience | Status | Duration | Errors |
| --- | --- | --- | ---: | ---: |
| / | public | FAIL | 0ms | 1 |
| /auth/signin | public | FAIL | 0ms | 1 |
| /auth/register | public | FAIL | 0ms | 1 |
| /admin | admin | FAIL | 0ms | 1 |
| /admin/products | admin | FAIL | 0ms | 1 |
| /admin/notes | admin | FAIL | 0ms | 1 |
| /admin/integrations | admin | FAIL | 0ms | 1 |
| /admin/case-resolver | admin | FAIL | 0ms | 1 |
| /admin/cms | admin | FAIL | 0ms | 1 |
| /admin/ai-paths | admin | FAIL | 0ms | 1 |
| /admin/image-studio | admin | FAIL | 0ms | 1 |
| /admin/chatbot | admin | FAIL | 0ms | 1 |
| /admin/agentcreator | admin | FAIL | 0ms | 1 |
| /admin/prompt-engine/validation | admin | FAIL | 0ms | 1 |
| /admin/kangur | admin | FAIL | 0ms | 1 |
| /admin/databases/engine | admin | FAIL | 0ms | 1 |
| /admin/brain?tab=routing | admin | FAIL | 0ms | 1 |

## Errors

### Public Home

- No Playwright result was recorded for [public-home] / passes the route-crawl accessibility scan.

### Auth Sign In

- No Playwright result was recorded for [auth-signin] /auth/signin passes the route-crawl accessibility scan.

### Auth Register

- No Playwright result was recorded for [auth-register] /auth/register passes the route-crawl accessibility scan.

### Admin Dashboard

- No Playwright result was recorded for [admin-dashboard] /admin passes the route-crawl accessibility scan.

### Admin Products

- No Playwright result was recorded for [admin-products] /admin/products passes the route-crawl accessibility scan.

### Admin Notes

- No Playwright result was recorded for [admin-notes] /admin/notes passes the route-crawl accessibility scan.

### Admin Integrations

- No Playwright result was recorded for [admin-integrations] /admin/integrations passes the route-crawl accessibility scan.

### Admin Case Resolver

- No Playwright result was recorded for [admin-case-resolver] /admin/case-resolver passes the route-crawl accessibility scan.

### Admin CMS

- No Playwright result was recorded for [admin-cms] /admin/cms passes the route-crawl accessibility scan.

### Admin AI Paths

- No Playwright result was recorded for [admin-ai-paths] /admin/ai-paths passes the route-crawl accessibility scan.

### Admin Image Studio

- No Playwright result was recorded for [admin-image-studio] /admin/image-studio passes the route-crawl accessibility scan.

### Admin Chatbot

- No Playwright result was recorded for [admin-chatbot] /admin/chatbot passes the route-crawl accessibility scan.

### Admin Agent Creator

- No Playwright result was recorded for [admin-agentcreator] /admin/agentcreator passes the route-crawl accessibility scan.

### Admin Prompt Engine Validation

- No Playwright result was recorded for [admin-prompt-engine-validation] /admin/prompt-engine/validation passes the route-crawl accessibility scan.

### Admin Kangur

- No Playwright result was recorded for [admin-kangur] /admin/kangur passes the route-crawl accessibility scan.

### Admin Databases

- No Playwright result was recorded for [admin-databases] /admin/databases/engine passes the route-crawl accessibility scan.

### Admin Brain Settings

- No Playwright result was recorded for [admin-brain-settings] /admin/brain?tab=routing passes the route-crawl accessibility scan.

### Playwright Errors

- Error: Timed out waiting 120000ms from config.webServer.

## Notes

- This crawl scans representative public and admin routes with the same axe helper used by the browser accessibility smoke suites.
- Admin routes establish a signed-in session through the shared Playwright admin auth helper before scanning.
- Run `npm run test:accessibility:gate` to execute component policies, smoke suites, and this route crawl together.
- Strict mode fails when any route scan fails.
