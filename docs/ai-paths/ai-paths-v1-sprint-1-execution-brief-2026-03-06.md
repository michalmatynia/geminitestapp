---
owner: 'AI Paths Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'plan'
scope: 'feature:ai-paths'
canonical: true
---

# AI Paths V1 Sprint 1 Execution Brief (2026-03-06)

This is a retained sprint execution brief for the V1 contract/trace work. Keep it
as historical delivery context, not as the primary current-state doc.

## References

1. `docs/ai-paths/ai-paths-improvements-plan-2026-03-06.md`
2. `docs/ai-paths/ai-paths-improvements-roadmap.json`
3. `docs/ai-paths/kernel-engine-transition-plan-2026-03-05.md`
4. `docs/ai-paths/overview.md`
5. `docs/ai-paths/reference.md`
6. `docs/ai-paths/port-contracts-v3-design-2026-03-06.md`
7. `docs/ai-paths/trace-record-v1-design-2026-03-06.md`
8. `docs/ai-paths/port-contract-validation-ownership-2026-03-06.md`
9. `docs/ai-paths/replay-ledger-identifier-strategy-2026-03-06.md`
10. `docs/ai-paths/ai-paths-v1-sprint-1-test-plan-2026-03-06.md`
11. `docs/ai-paths/ai-paths-v1-sprint-1-implementation-checklist-2026-03-06.md`

## Sprint Window

1. Start: 2026-03-09
2. End: 2026-03-20
3. Track: `v1`

## Sprint Objective

Freeze the minimum contract surface for `Port Contracts V3` and `Trace Record V1`, then align replay-ledger identifiers to those contracts so Sprint 2 can implement deterministic effect recording without reworking schema or stream payloads.

## Why This Sprint Exists

The improvement plan already identifies three highest-leverage upgrades:

1. typed port contracts
2. deterministic replay or resume
3. trace-first debugging

These cannot be implemented safely in parallel unless the shared contract additions are frozen first. This sprint is therefore a contract and observability sprint, not a UI-polish sprint.

## In Scope

1. Canonical port-contract additions:
   `kind`, optional schema metadata, and explicit adapter-node direction.
2. Canonical trace additions:
   `traceId`, `spanId`, node attempts, branch decision metadata, cache decision metadata, and edge-traversal correlation ids.
3. Stream and run-detail payload shape updates needed for trace-backed inspection.
4. Replay-ledger identifier model:
   effect records must reuse canonical trace ids and span ids instead of inventing a second correlation system.
5. Validation gap audit for compile-time versus runtime type mismatches.

## Out of Scope

1. Full effect ledger persistence implementation.
2. Durable cache implementation.
3. Branch parallel execution.
4. Composite nodes.
5. CI fixture runner.
6. Secret-ref enforcement.

## Sprint Deliverables

1. Contract update in shared schemas for port kinds and trace record fields.
2. Runtime validation design decisions documented in code-backed contracts and implementation notes.
3. Initial trace schema wired through executor, analytics, and stream payloads.
4. Timeline and run-detail UI consuming the first trace-backed fields.
5. Replay-ledger identifier alignment decisions captured in executor and service seams.

## Execution Order

### Step 1: Freeze Contract Additions

Goal:
Define the smallest backward-compatible additions that unblock the rest of V1.

Tasks:

1. Add `kind` and optional schema carrier fields to port contracts in `src/shared/contracts/ai-paths-core/nodes.ts`.
2. Add canonical trace record fields in `src/shared/contracts/ai-paths-runtime.ts`.
3. Keep legacy configs valid by making new fields optional and defaultable.
4. Document reserved adapter-node ids or types for explicit coercion nodes.

Exit criteria:

1. Contract shape is stable enough that executor, stream, and UI work can proceed without further schema churn.

### Step 2: Audit Validation Gaps

Goal:
Identify where mismatches can be blocked before execution and where runtime validation must remain the enforcement point.

Tasks:

1. Inventory current compile and runtime validation coverage for port requiredness, cardinality, and type shape.
2. Identify node families where output kind is statically knowable versus dynamic.
3. Define canonical runtime error taxonomy for contract mismatches.
4. Decide which mismatches become compile errors, compile warnings, or runtime failures.

Primary touchpoints:

1. `src/shared/lib/ai-paths/core/validation-engine/`
2. `src/shared/lib/ai-paths/core/runtime/engine-core.ts`
3. `src/shared/lib/ai-paths/core/runtime/engine-modules/engine-utils.ts`

Exit criteria:

1. No ambiguous ownership remains between compile validation and runtime validation for the first V1 contract slice.

### Step 3: Land Trace Record V1

Goal:
Make trace the canonical execution narrative instead of a summary-only projection.

Tasks:

1. Add stable span identifiers for node attempts.
2. Persist branch-path and cache-decision metadata into the trace record.
3. Add correlation ids for values traversing edges.
4. Keep `runtimeTrace.profile` as a derived projection of the new trace contract.

Primary touchpoints:

1. `src/shared/contracts/ai-paths-runtime.ts`
2. `src/features/ai/ai-paths/services/path-run-executor/index.ts`
3. `src/features/ai/ai-paths/services/path-run-executor/execution-completion.ts`
4. `src/shared/lib/ai-paths/services/runtime-analytics/trace.ts`

Exit criteria:

1. Every node attempt in a run has a stable trace identifier and attempt number.
2. Analytics and inspection consume the same underlying trace fields.

### Step 4: Stream and UI Slice

Goal:
Expose enough trace data to prove the contract is usable before deeper UX work starts.

Tasks:

1. Extend stream payloads with trace-backed node attempt metadata.
2. Show span or attempt information in run timeline and run detail surfaces.
3. Preserve backward compatibility for existing stream consumers.

Primary touchpoints:

1. `src/features/ai/ai-paths/services/run-stream-publisher.ts`
2. `src/features/ai/ai-paths/components/run-timeline.tsx`
3. `src/features/ai/ai-paths/components/run-history-panel.tsx`

Exit criteria:

1. Operators can see trace-backed attempt information without opening raw metadata blobs.

### Step 5: Replay-Ledger Identifier Alignment

Goal:
Prevent replay-ledger implementation from inventing a competing id model later.

Tasks:

1. Decide the canonical relationship between `runId`, `traceId`, `spanId`, and future effect-record ids.
2. Reserve effect-record fields in run metadata or runtime state where needed.
3. Ensure replay and resume modes can reference stable upstream trace identifiers.

Primary touchpoints:

1. `src/features/ai/ai-paths/services/path-run-service.ts`
2. `src/features/ai/ai-paths/services/path-run-executor/index.ts`
3. `src/shared/contracts/ai-paths.ts`
4. `src/shared/contracts/ai-paths-runtime.ts`

Exit criteria:

1. Sprint 2 can add effect persistence without changing trace identifiers or stream contracts.

## File-Level Work Map

### Contracts

1. `src/shared/contracts/ai-paths-core/nodes.ts`
2. `src/shared/contracts/ai-paths.ts`
3. `src/shared/contracts/ai-paths-runtime.ts`

### Runtime

1. `src/shared/lib/ai-paths/core/runtime/engine-core.ts`
2. `src/shared/lib/ai-paths/core/runtime/engine-modules/engine-utils.ts`
3. `src/features/ai/ai-paths/services/path-run-executor/index.ts`
4. `src/features/ai/ai-paths/services/path-run-executor/execution-completion.ts`

### Validation

1. `src/shared/lib/ai-paths/core/validation-engine/`

### Streaming and UI

1. `src/features/ai/ai-paths/services/run-stream-publisher.ts`
2. `src/features/ai/ai-paths/components/run-timeline.tsx`
3. `src/features/ai/ai-paths/components/run-history-panel.tsx`

## Required Tests

### Contract tests

1. Port-contract schemas accept legacy nodes with no explicit `kind`.
2. Port-contract schemas validate new `kind` and schema metadata.
3. Trace schema accepts legacy run records and new trace-backed fields.

### Runtime tests

1. Node-attempt spans are stable across retries.
2. Stream payloads include trace-backed node metadata without breaking current consumers.
3. Runtime validation emits canonical mismatch errors for at least one compile-catchable case and one runtime-only case.

### Integration checks

1. `resume` continues to reuse completed upstream nodes.
2. `replay` still works operationally while identifier alignment lands.
3. Runtime analytics summary still parses trace data after the schema change.

## Acceptance Criteria

1. Shared contracts for port kinds and trace fields are merged and backward-compatible.
2. Run timeline can display trace-backed attempt metadata.
3. Validation ownership for compile-time versus runtime mismatch handling is explicitly decided.
4. Replay-ledger work can start next sprint without re-opening contract design.

## Risks and Mitigations

1. Risk: schema churn blocks downstream work.
   Mitigation: freeze minimal contract additions first and defer non-essential fields.
2. Risk: trace payload expansion bloats run metadata too early.
   Mitigation: keep Sprint 1 focused on identifiers and attempt metadata, not full payload duplication.
3. Risk: type validation overlaps awkwardly with existing required or cardinality rules.
   Mitigation: keep requiredness and fan-in semantics unchanged in Sprint 1.

## Handoff To Sprint 2

If this sprint exits cleanly, Sprint 2 should start with:

1. effect-ledger persistence for side-effect handlers
2. cache-decision persistence keyed by the new trace and contract model
3. deeper trace inspector UX
