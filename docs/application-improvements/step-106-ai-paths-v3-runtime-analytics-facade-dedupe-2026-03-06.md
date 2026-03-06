# Step 106 Execution: v3 Runtime-Analytics Service Facade De-Dupe

Date: 2026-03-06

## Objective

Reduce drift risk in `runtime-analytics-service` by removing duplicated config/cache/availability/trace/recording internals and reusing shared runtime-analytics modules as the single implementation source.

## Implemented

1. Refactored feature runtime-analytics service into shared-module facade:
   - `src/features/ai/ai-paths/services/runtime-analytics-service.ts`
   - Switched to shared imports for:
     - config keys/constants (`keyRuns`, `keyNodes`, `keyBrain`, `keyDurations`, `DURATION_SAMPLE_LIMIT`, `SUMMARY_QUERY_TIMEOUT_MS`);
     - cache handling (`buildSummaryCacheKey`, `readCachedSummary`, `readStaleSummary`, `setCachedSummary`, `summaryInFlight`);
     - availability gate (`getRuntimeAnalyticsAvailability`);
     - trace analytics (`emptyTraceAnalytics`, `loadRuntimeTraceAnalytics`, `summarizeRuntimeTraceAnalytics`);
     - recording handlers (`recordRuntimeRunQueued`, `recordRuntimeRunStarted`, `recordRuntimeRunFinished`, `recordRuntimeNodeStatus`);
     - generic utilities (`withTimeout`, `clampRate`, pipeline parsers, timestamp/prune helpers).

2. Preserved feature-specific behavior:
   - Kept feature-side summary assembly + portable-engine analytics snapshot payload.
   - Kept feature-specific `recordBrainInsightAnalytics` implementation and counters behavior unchanged.

3. Export parity preserved:
   - Continued exporting `RuntimeAnalyticsAvailability`, `getRuntimeAnalyticsAvailability`, `summarizeRuntimeTraceAnalytics`, run/node recorders, `recordBrainInsightAnalytics`, `resolveRuntimeAnalyticsRangeWindow`, and `getRuntimeAnalyticsSummary` from the same feature module path.

## Validation

1. Focused runtime analytics + dependent service/worker suites:
   - `npx vitest run src/features/ai/ai-paths/services/__tests__/runtime-analytics-service.test.ts __tests__/features/ai/ai-paths/services/runtime-analytics-service.test.ts src/features/ai/ai-paths/workers/__tests__/aiPathRunQueue.test.ts src/features/ai/ai-paths/services/__tests__/path-run-service.test.ts src/features/ai/ai-paths/services/__tests__/path-run-executor.runtime-kernel-settings.test.ts`
   - Result: pass (21 tests).

2. Canonical/docs guardrails:
   - `npm run ai-paths:check:canonical`
   - Result: pass.

## Outcome

- Runtime analytics execution paths now rely on shared runtime-analytics modules rather than a second copied implementation.
- Feature service remains the stable import surface while internal logic drift risk is reduced.
