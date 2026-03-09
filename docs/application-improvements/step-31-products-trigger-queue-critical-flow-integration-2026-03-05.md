---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 31 Execution: Products Trigger-Queue Critical Flow Integration

Date: 2026-03-05

## Objective

Promote the Product Trigger Button -> enqueue -> queue refresh regression lane into the shared critical-flow tracker so it is continuously measured alongside other platform-critical user flows.

## Implemented Artifacts

1. Updated critical-flow runner:
   - `scripts/testing/run-critical-flow-tests.mjs`
   - Added flow:
     - `id`: `products-trigger-queue-integration`
     - KPI: `Trigger enqueue updates queue state without invalid run-id regressions`
     - Tests:
       - `src/features/ai/ai-paths/components/__tests__/job-queue-context.enqueue-events.test.tsx`
       - `src/shared/contracts/__tests__/ai-paths-run-enqueued-event.contract-runtime.test.ts`
       - `src/shared/lib/__tests__/query-invalidation.notify-ai-path-run-enqueued.test.ts`
       - `src/shared/lib/ai-paths/api/__tests__/enqueue-client-contract.test.ts`
       - `src/features/products/hooks/useProductAiPathsRunSync.test.tsx`
   - Updated notes wording from fixed “top 5” to generic “critical user flows”.

2. Refreshed latest critical-flow report outputs:
   - `docs/metrics/critical-flow-tests-latest.json`
   - `docs/metrics/critical-flow-tests-latest.md`

## Validation

1. Trigger-queue subset direct run:
   - `npx vitest run --project unit <5 trigger-queue tests>`
   - Result: pass (`20` tests).

2. Critical-flow suite integration run:
   - `npm run test:critical-flows -- --ci --no-history`
   - Result: new flow `products-trigger-queue-integration` passed.

## Observed Existing Risk (Pre-existing)

Critical-flow run still reports one unrelated failure:
- Flow: `ai-paths-runtime`
- Test: `__tests__/features/ai/ai-paths/services/path-run-executor.test.ts`
- Error: module resolution for `next/server` imported by `next-auth/lib/env.js` in this local environment.

This issue is outside the trigger-queue lane but should be addressed to keep `test:critical-flows:strict` fully green.
