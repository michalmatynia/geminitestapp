---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: false
---
# Critical Flow Regression Report

Generated at: 2026-03-05T00:46:55.567Z

## Summary

- Flows: 5
- Passed: 5
- Failed: 0

## Flow Status

| Flow | KPI | Status | Duration | Exit | Tests |
| --- | --- | --- | ---: | ---: | --- |
| Authentication + Session Bootstrap | Successful sign-in completion rate | PASS | 3.5s | 0 | `__tests__/features/auth/pages/signin-page.test.tsx` |
| Products CRUD + Listing Refresh | Create/edit success rate without retries | PASS | 1.4s | 0 | `__tests__/features/products/services/getSettingValue.test.ts` |
| Image Studio Generate + Preview | Generation completion under timeout budget | PASS | 1.3s | 0 | `src/features/ai/image-studio/utils/__tests__/studio-settings.test.ts` |
| AI Paths Run Execution | Run completion without fallback/error path | PASS | 2.8s | 0 | `__tests__/features/ai/ai-paths/services/path-run-executor.test.ts` |
| Case Resolver OCR + Capture Mapping | Queue-to-review completion without manual recovery | PASS | 1.7s | 0 | `src/features/case-resolver/__tests__/workspace-persistence.test.ts` |

## Notes

- This suite is intentionally narrow and maps directly to the top 5 critical user flows.
- Use `npm run test:critical-flows` for local regression checks and PR validation.
