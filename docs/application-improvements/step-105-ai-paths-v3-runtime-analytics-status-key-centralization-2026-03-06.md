# Step 105 Execution: v3 Runtime-Analytics Status-Key Centralization

Date: 2026-03-06

## Objective

Continue runtime status-normalizer consolidation by centralizing analytics node-status key resolution (`running -> started`, tracked-status filtering) into one shared helper used by both runtime analytics recorder paths.

## Implemented

1. Shared status-key resolver in runtime analytics utils:
   - `src/shared/lib/ai-paths/services/runtime-analytics/utils.ts`
   - Added `RUNTIME_ANALYTICS_NODE_STATUS_KEYS` contract list.
   - Added `resolveRuntimeAnalyticsNodeStatusKey(...)` to canonicalize and filter tracked node statuses.

2. Recorder parity alignment:
   - `src/shared/lib/ai-paths/services/runtime-analytics/recording.ts`
   - Replaced local tracked-status set + `running` remap with `resolveRuntimeAnalyticsNodeStatusKey(...)`.

3. Feature service parity alignment:
   - `src/features/ai/ai-paths/services/runtime-analytics-service.ts`
   - Removed duplicated local status normalizer/tracked-status logic.
   - Reused shared `resolveRuntimeAnalyticsNodeStatusKey(...)` path.

4. Regression coverage:
   - `src/shared/lib/ai-paths/services/runtime-analytics/__tests__/utils.test.ts`
   - Added assertions for:
     - tracked-status key resolution;
     - `running -> started` normalization;
     - rejection of untracked statuses (`skipped`, `dead_lettered`);
     - stable tracked-status key list contract.

## Validation

1. Focused analytics suites:
   - `npx vitest run src/shared/lib/ai-paths/services/runtime-analytics/__tests__/utils.test.ts src/features/ai/ai-paths/services/__tests__/runtime-analytics-service.test.ts __tests__/features/ai/ai-paths/services/runtime-analytics-service.test.ts`
   - Result: pass (12 tests).

2. Canonical/contracts/docs guardrails:
   - `npm run ai-paths:check:canonical`
   - Result: pass.

## Outcome

- Analytics node-status tracking rules now have one shared source of truth across shared and feature runtime analytics recorders.
- `running` remap and tracked-status filtering cannot drift between the two recorder paths.
