# Replay Ledger Identifier Strategy (2026-03-06)

## References

1. `docs/ai-paths/trace-record-v1-design-2026-03-06.md`
2. `docs/ai-paths/ai-paths-v1-sprint-1-execution-brief-2026-03-06.md`
3. `src/features/ai/ai-paths/services/path-run-service.ts`
4. `src/features/ai/ai-paths/services/path-run-executor/index.ts`
5. `src/shared/lib/ai-paths/core/runtime/engine-core.ts`

## Goal

Freeze the identifier model for deterministic replay and resume before effect-ledger persistence starts.

The system already has implicit identifiers in runtime code. This document turns those into explicit rules so replay does not introduce a competing correlation model.

## Current State

Today the runtime already uses:

1. `run.id` as the operational run identifier
2. `run.id` as `traceId` in executor and service metadata
3. `nodeId:attempt:iteration` as the node span identifier in executor profiling
4. `activationHash` and `idempotencyKey` in side-effect policy paths
5. `resumeMode` and `retryNodeIds` in run metadata for orchestration

These are enough to freeze the identifier strategy for V1.

## Decision Summary

### Root identifiers

1. `runId` remains the canonical execution identity.
2. `traceId` equals `runId` for V1.
3. `traceId` exists explicitly so future cross-run or distributed tracing can evolve without breaking the contract.

### Node attempt identifiers

1. `spanId` is the canonical node-attempt identifier.
2. V1 formalizes the current runtime format:
   `nodeId:attempt:iteration`
3. `attempt` and `iteration` remain first-class fields even though they are embedded in `spanId`.

### Effect identifiers

1. A replay-ledger record must never replace `spanId`.
2. Each effect record must reference:
   `runId`, `traceId`, `spanId`, `nodeId`, `attempt`, and `iteration`.
3. The effect record may have its own `effectRecordId`, but that id is secondary.

## Proposed Identifier Model

### Root

```ts
runId = run.id
traceId = runId
```

### Span

```ts
spanId = `${nodeId}:${attempt}:${iteration}`
```

### Effect record

```ts
effectRecordId = opaque_id()
source = {
  runId,
  traceId,
  spanId,
  nodeId,
  attempt,
  iteration
}
```

## Why This Model

1. It matches current code, so V1 does not force a synthetic id migration.
2. It keeps replay and trace aligned to one execution story.
3. It allows one node attempt to have one or more effect records later without changing span identity.
4. It prevents service-level replay logic from depending on human-readable run events for correlation.

## Relationship To Existing Runtime Fields

### `activationHash`

1. `activationHash` identifies the logical input activation for side-effect policy and replay eligibility.
2. It is not a span identifier.
3. Multiple spans may share an `activationHash` if retries occur.

### `idempotencyKey`

1. `idempotencyKey` is an external dedupe or request-safety token.
2. It is not a trace identifier.
3. Multiple effect records may share an `idempotencyKey` during retries of the same activation.

### `resumeMode`

1. `resumeMode` is orchestration metadata only.
2. It must not be used as an identifier component.

### `retryNodeIds`

1. `retryNodeIds` are orchestration selectors only.
2. They must not be used as effect-record ids or trace roots.

## Replay Semantics

### Resume

For `resume`:

1. completed upstream nodes are reused according to current skip-set behavior
2. no new span should be created for a node that is not re-executed
3. reused upstream outputs should still be traceable through their original span ids

### Replay

For `replay`:

1. the new run gets a new `runId` and therefore a new `traceId`
2. replayed effect results should attach to new execution spans in the new trace
3. each reused effect should reference both:
   the new `spanId`
   and the original source effect record or source span id

This is important:

1. replay should create a new execution story
2. replay should still preserve provenance back to the original effect result

## Provenance Link Model

When a replay uses a stored effect result, the new span should record:

1. `effect.decision = 'reused_recorded_result'`
2. `effect.recordId = <existing effect record id>`
3. optional `effect.sourceSpanId = <original span id>`

This preserves:

1. current trace story for the replayed run
2. provenance back to the original execution

## Storage Rules

### Run metadata

Run metadata may store:

1. top-level `traceId`
2. trace summary or trace record
3. replay provenance summary

### Runtime state

Runtime state may store:

1. history snapshots
2. hashes
3. node durations
4. future effect references if needed

But runtime state should not become the canonical identity registry. That belongs in trace and effect records.

## External API and Stream Rules

1. SSE updates should carry `traceId` and `spanId` when attempt-level updates are emitted.
2. Run-detail payloads should expose the current trace root and node-attempt identifiers.
3. Public or admin API responses should not expose effect-record ids without the associated `spanId`.

## Non-Goals For V1

1. globally unique distributed trace ids across subsystems
2. replacing `runId` with `traceId`
3. cross-run stable span ids
4. a requirement that `effectRecordId` be deterministic

## Acceptance Checks

1. Trace and replay share the same root identity model.
2. `spanId` remains stable for a given node attempt inside one run.
3. Replay can reference original effect provenance without mutating the new run’s trace root.
4. Orchestration flags such as `resumeMode` and `retryNodeIds` do not leak into identity semantics.
