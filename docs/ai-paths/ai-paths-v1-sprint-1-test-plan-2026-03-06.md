# AI Paths V1 Sprint 1 Test Plan (2026-03-06)

## References

1. `docs/ai-paths/ai-paths-v1-sprint-1-execution-brief-2026-03-06.md`
2. `docs/ai-paths/port-contracts-v3-design-2026-03-06.md`
3. `docs/ai-paths/trace-record-v1-design-2026-03-06.md`
4. `docs/ai-paths/port-contract-validation-ownership-2026-03-06.md`
5. `docs/ai-paths/replay-ledger-identifier-strategy-2026-03-06.md`

## Objective

Verify that Sprint 1 contract work is backward-compatible, trace-backed, and ready for replay-ledger implementation without breaking current AI Paths runtime behavior.

## Test Goals

1. New Port Contracts V3 fields remain additive and backward-compatible.
2. Validation ownership is enforced at the correct stage.
3. Trace Record V1 identifiers are stable and consumable by runtime analytics and UI.
4. Stream payload updates do not break current run-detail consumers.
5. Replay-ledger identifier alignment does not change current `resume` or `replay` operational behavior.

## Existing Test Surfaces To Reuse

### Contracts and validation

1. `src/shared/lib/ai-paths/core/validation-engine/__tests__/runtime-middleware.test.ts`
2. `src/shared/lib/ai-paths/core/validation-engine/__tests__/evaluator.stage.test.ts`
3. `src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.runtime-validation-middleware.test.ts`

### Runtime executor and state

1. `src/features/ai/ai-paths/services/__tests__/path-run-executor.runtime-state.test.ts`
2. `src/features/ai/ai-paths/services/__tests__/path-run-executor.logic.test.ts`
3. `src/features/ai/ai-paths/services/__tests__/path-run-executor.runtime-kernel-settings.test.ts`
4. `__tests__/features/ai/ai-paths/services/path-run-executor.test.ts`

### Queue and orchestration

1. `__tests__/features/jobs/workers/aiPathRunQueue.test.ts`
2. `__tests__/api/ai-paths-runs-fail-fast-handlers.test.ts`

## New Test Coverage Needed

### A. Schema and backward compatibility

Add:

1. contract parse tests for `nodePortContractSchema`
2. runtime trace parse tests for the new trace contract fields
3. compatibility tests proving legacy nodes and legacy run metadata still validate

Suggested file targets:

1. `src/shared/contracts/__tests__/ai-paths-core.port-contracts.test.ts`
2. `src/shared/contracts/__tests__/ai-paths-runtime.trace-record.test.ts`

Assertions:

1. omitted `kind` is valid
2. omitted `schema` and `schemaRef` are valid
3. legacy `runtimeTrace.profile` payload remains valid without V1 trace spans
4. `traceId = runId` remains valid

### B. Validation-stage ownership

Add:

1. compile-stage tests for explicit stable mismatches
2. runtime-stage tests for dynamic mismatches
3. no-duplication tests where compile blocks first and runtime is only a fallback

Suggested file targets:

1. `src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.runtime-validation-middleware.test.ts`
2. `src/shared/lib/ai-paths/core/validation-engine/__tests__/runtime-middleware.test.ts`

Assertions:

1. invalid contract shape blocks at `graph_parse`
2. explicit stable bind mismatch blocks at `graph_bind`
3. runtime-only materialized input mismatch blocks at `node_pre_execute`
4. invalid emitted output kind blocks at `node_post_execute`

### C. Span and trace identifier stability

Add:

1. node-attempt span id tests
2. retry-path tests for attempt increments
3. repeated iteration tests for `nodeId:attempt:iteration` stability

Suggested file targets:

1. `src/features/ai/ai-paths/services/__tests__/path-run-executor.logic.test.ts`
2. `src/features/ai/ai-paths/services/__tests__/path-run-executor.runtime-state.test.ts`
3. `__tests__/features/ai/ai-paths/services/path-run-executor.test.ts`

Assertions:

1. first attempt span id is deterministic
2. retry increments `attempt` but preserves `nodeId` and `iteration`
3. trace ids remain rooted at `run.id`

### D. Trace analytics compatibility

Add:

1. analytics summary tests for the new trace record shape
2. compatibility tests proving old profile-only metadata still aggregates

Suggested file targets:

1. `src/shared/lib/ai-paths/services/runtime-analytics/__tests__/trace.test.ts`
2. `__tests__/api/ai-paths-runtime-analytics-summary-handler.test.ts`

Assertions:

1. top slow-node and failed-node summaries still compute
2. missing V1 spans degrade gracefully to current behavior

### E. Stream and run-detail compatibility

Add:

1. stream payload shape tests for trace-backed node metadata
2. run-detail UI tests for displaying attempt metadata if present

Suggested file targets:

1. `src/features/ai/ai-paths/services/__tests__/run-stream-publisher.test.ts`
2. `src/features/ai/ai-paths/components/__tests__/RunTimeline.test.tsx`

Assertions:

1. `publishRunUpdate` payload shape remains consumable by current subscribers
2. run timeline renders attempt or span metadata without requiring raw JSON parsing

### F. Resume and replay behavior safety

Add:

1. `resume` keeps current skip-set behavior
2. `replay` still creates a fresh execution story while referencing the same root identifier model

Suggested file targets:

1. `src/features/ai/ai-paths/services/__tests__/path-run-executor.logic.test.ts`
2. `__tests__/api/ai-paths-runs-fail-fast-handlers.test.ts`

Assertions:

1. `resumeMode='resume'` still skips completed unaffected nodes
2. `resumeMode='replay'` still reruns from scratch operationally
3. new identifier alignment does not change current handler contracts

## Minimum Passing Set For Sprint Exit

1. schema compatibility tests
2. one test per validation ownership stage
3. one trace span stability test
4. one analytics compatibility test
5. one run-timeline trace rendering test
6. one resume or replay safety test

## Non-Goals For Sprint 1 Testing

1. full effect-ledger persistence behavior
2. durable cache behavior
3. branch parallelism
4. CI fixture runner execution

## Exit Criteria

1. Contract additions are covered by backward-compatibility tests.
2. Trace identifier semantics are covered by executor-level tests.
3. Validation ownership is demonstrated with at least one test per relevant stage.
4. Existing runtime analytics and run-detail behavior remain green after the schema additions.
