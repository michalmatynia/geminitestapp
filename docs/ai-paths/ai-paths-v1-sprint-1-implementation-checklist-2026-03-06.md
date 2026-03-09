---
owner: 'AI Paths Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'plan'
scope: 'feature:ai-paths'
canonical: true
---

# AI Paths V1 Sprint 1 Implementation Checklist (2026-03-06)

## References

1. `docs/ai-paths/ai-paths-v1-sprint-1-execution-brief-2026-03-06.md`
2. `docs/ai-paths/port-contracts-v3-design-2026-03-06.md`
3. `docs/ai-paths/trace-record-v1-design-2026-03-06.md`
4. `docs/ai-paths/port-contract-validation-ownership-2026-03-06.md`
5. `docs/ai-paths/replay-ledger-identifier-strategy-2026-03-06.md`
6. `docs/ai-paths/ai-paths-v1-sprint-1-test-plan-2026-03-06.md`

## 10-Day Checklist

### Day 1-2: Contract freeze

1. Add proposed Port Contracts V3 fields to `src/shared/contracts/ai-paths-core/nodes.ts`.
2. Add Trace Record V1 fields to `src/shared/contracts/ai-paths-runtime.ts`.
3. Preserve optionality for all new fields.
4. Confirm legacy runtime-state parsing still accepts old payloads.

### Day 2-3: Validation ownership implementation

1. Map compile-detectable contract failures to `graph_parse` and `graph_bind`.
2. Map runtime-only input mismatches to `node_pre_execute`.
3. Map output contract failures to `node_post_execute`.
4. Reserve canonical mismatch error codes.

### Day 3-5: Executor trace slice

1. Formalize `traceId = run.id`.
2. Formalize `spanId = nodeId:attempt:iteration`.
3. Persist trace-backed attempt metadata from executor callbacks.
4. Keep `runtimeTrace.profile` functioning as a derived view.

### Day 5-6: Stream and UI slice

1. Extend run-stream payloads with trace-backed node attempt metadata.
2. Update run timeline rendering to show attempt-level metadata.
3. Keep current stream consumers compatible.

### Day 6-7: Replay identifier alignment

1. Reserve effect provenance fields in trace metadata.
2. Ensure replay and resume orchestration paths carry canonical ids, not ad hoc values.
3. Confirm orchestration metadata such as `resumeMode` and `retryNodeIds` is not treated as identity.

### Day 7-9: Tests

1. Add contract compatibility tests.
2. Add validation-stage tests.
3. Add span stability tests.
4. Add analytics compatibility tests.
5. Add run timeline trace rendering tests.

### Day 9-10: Final verification

1. Run `npm run docs:ai-paths:improvements-roadmap:check`.
2. Run focused tests for contracts, validation, executor, analytics, and timeline surfaces.
3. If all focused checks pass, run the broader AI Paths canonical check bundle.

## Blocking Dependencies

1. Port Contracts V3 schema freeze must land before validation-stage implementation.
2. Trace Record V1 schema freeze must land before stream and timeline updates.
3. Replay identifier alignment must not start before trace ids and span ids are frozen.

## Done Criteria

1. Shared contracts are merged and backward-compatible.
2. Trace-backed node attempt metadata is visible in at least one UI surface.
3. Validation ownership is implemented at the correct stage boundaries.
4. Focused tests from the Sprint 1 test plan pass.
