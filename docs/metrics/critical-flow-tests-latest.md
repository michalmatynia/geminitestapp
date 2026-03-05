# Critical Flow Regression Report

Generated at: 2026-03-05T11:37:35.483Z

## Summary

- Flows: 6
- Passed: 6
- Failed: 0

## Flow Status

| Flow | KPI | Status | Duration | Exit | Tests |
| --- | --- | --- | ---: | ---: | --- |
| Authentication + Session Bootstrap | Successful sign-in completion rate | PASS | 2.7s | 0 | `__tests__/features/auth/pages/signin-page.test.tsx` |
| Products CRUD + Listing Refresh | Create/edit success rate without retries | PASS | 1.3s | 0 | `__tests__/features/products/services/getSettingValue.test.ts` |
| Image Studio Generate + Preview | Generation completion under timeout budget | PASS | 1.3s | 0 | `src/features/ai/image-studio/utils/__tests__/studio-settings.test.ts` |
| AI Paths Run Execution | Run completion without fallback/error path | PASS | 2.8s | 0 | `__tests__/features/ai/ai-paths/services/path-run-executor.test.ts` |
| Case Resolver OCR + Capture Mapping | Queue-to-review completion without manual recovery | PASS | 1.8s | 0 | `src/features/case-resolver/__tests__/workspace-persistence.test.ts` |
| Products Trigger Button Queue Integration | Trigger enqueue updates queue state without invalid run-id regressions | PASS | 4.5s | 0 | `src/features/ai/ai-paths/components/__tests__/job-queue-context.enqueue-events.test.tsx`, `src/shared/contracts/__tests__/ai-paths-run-enqueued-event.contract-runtime.test.ts`, `src/shared/lib/__tests__/query-invalidation.notify-ai-path-run-enqueued.test.ts`, `src/shared/lib/ai-paths/api/__tests__/enqueue-client-contract.test.ts`, `src/features/products/hooks/useProductAiPathsRunSync.test.tsx` |

## Notes

- This suite is intentionally narrow and maps directly to critical user flows.
- Use `npm run test:critical-flows` for local regression checks and PR validation.
