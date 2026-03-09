---
owner: 'AI Paths Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'plan'
scope: 'feature:ai-paths'
canonical: true
---

# Trace Record V1 Design (2026-03-06)

## References

1. `docs/ai-paths/ai-paths-improvements-plan-2026-03-06.md`
2. `docs/ai-paths/ai-paths-v1-sprint-1-execution-brief-2026-03-06.md`
3. `src/shared/contracts/ai-paths-runtime.ts`
4. `src/features/ai/ai-paths/services/path-run-executor/index.ts`
5. `src/features/ai/ai-paths/services/path-run-executor/execution-completion.ts`
6. `src/shared/lib/ai-paths/services/runtime-analytics/trace.ts`

## Goal

Promote `runtimeTrace` from a summary-oriented metadata blob into the canonical execution trace contract for AI Paths.

The trace should answer:

1. what happened
2. in what order
3. on which attempt
4. why a branch or cache decision happened
5. which effect execution or replay decision was taken

It should not duplicate every large payload already stored elsewhere.

## Current State

Today the system already persists:

1. run records
2. run nodes with inputs, outputs, attempt counts, and timestamps
3. run events
4. runtime history entries
5. `runtimeTrace.profile` summaries and node span snapshots in run metadata

This is useful, but fragmented:

1. `runtimeTrace` is mostly profile and analytics-oriented
2. history carries payloads and some execution metadata
3. run events are human-readable but not canonical trace spans

## Decision Summary

Trace Record V1 becomes the canonical execution skeleton.

Payload ownership stays split:

1. trace stores execution metadata, identifiers, decisions, and references
2. history stores payload snapshots and directional links
3. run nodes remain the current summary table for node state

## Proposed Shape

### Top-level trace

Proposed logical shape under `run.meta.runtimeTrace`:

```ts
type RuntimeTraceRecordV1 = {
  version: 'ai-paths.trace.v1';
  traceId: string;
  runId: string;
  source: 'local' | 'server';
  startedAt: string;
  finishedAt?: string | null;
  spans: RuntimeTraceSpan[];
  links?: RuntimeTraceLink[];
  profile?: RuntimeProfileSnapshot | null;
  kernelParity?: Record<string, unknown>;
};
```

### Span shape

```ts
type RuntimeTraceSpan = {
  spanId: string;
  parentSpanId?: string | null;
  runId: string;
  traceId: string;
  nodeId: string;
  nodeType: string;
  nodeTitle?: string | null;
  iteration: number;
  attempt: number;
  startedAt: string;
  finishedAt?: string | null;
  status:
    | 'running'
    | 'completed'
    | 'cached'
    | 'failed'
    | 'blocked'
    | 'waiting_callback'
    | 'skipped';
  inputHash?: string | null;
  activationHash?: string | null;
  correlationIds?: string[];
  cache?: {
    key?: string | null;
    decision?: 'miss' | 'hit' | 'refresh' | 'disabled';
    scope?: 'run' | 'activation' | 'session' | null;
  };
  branch?: {
    route?: string | null;
    fromPort?: string | null;
    toPort?: string | null;
  };
  effect?: {
    policy?: 'per_run' | 'per_activation' | null;
    decision?: string | null;
    recordId?: string | null;
  };
  error?: {
    code?: string | null;
    message?: string | null;
  };
};
```

### Link shape

```ts
type RuntimeTraceLink = {
  correlationId: string;
  fromNodeId: string;
  fromPort: string | null;
  toNodeId: string;
  toPort: string | null;
  valueKind?: string | null;
  timestamp: string;
};
```

## Identifier Rules

### `runId`

1. Existing run identifier remains the canonical run identity.

### `traceId`

1. For V1, `traceId` should equal `runId`.
2. This avoids a second root identifier while still reserving the trace concept explicitly.

### `spanId`

1. `spanId` must uniquely identify a node attempt within a run.
2. The current executor shape already uses `nodeId:attempt:iteration`.
3. V1 should formalize that existing shape rather than invent a new opaque id immediately.

### `correlationId`

1. `correlationId` tracks value traversal over edges.
2. One correlation id may fan out to multiple downstream links.
3. When a node transforms or re-materializes data, it may emit a new correlation id.

## Relationship To Existing Structures

### Runtime history

History remains the payload ledger.

It should continue to own:

1. `inputs`
2. `outputs`
3. directional `inputsFrom` and `outputsTo`
4. status, duration, waiting-port, and side-effect metadata

Trace should refer to history conceptually rather than duplicate all payload content.

### Run nodes

Run nodes remain the summary table for:

1. latest node status
2. latest inputs and outputs snapshot
3. attempt count
4. started and finished timestamps

Trace spans provide the ordered attempt timeline behind those rows.

### Run events

Run events remain useful operator-facing log entries.

They should not be the source of truth for:

1. attempt ordering
2. branch choice
3. cache decision
4. effect decision

Those belong in trace spans.

## Streaming Rules

1. SSE `nodes` updates should be allowed to carry trace-backed attempt metadata.
2. SSE `events` updates may continue carrying operator-oriented logs.
3. A future dedicated `trace` event type is acceptable, but V1 should avoid breaking existing consumers if `nodes` and `events` are enough.
4. When Redis pub-sub is unavailable, DB polling fallbacks must still expose trace-backed state through run detail.

## Analytics Rules

1. Runtime analytics should derive slow-node and failed-node summaries from trace spans.
2. Existing `runtimeTrace.profile` should remain as a derived projection for quick UI consumption.
3. `kernelParity` remains alongside trace during V1 to avoid analytics regression.

## Payload Size Rules

Trace should store metadata and references, not large payload duplication.

V1 should avoid putting full `inputs` and `outputs` into every span because:

1. run history already carries those values
2. run node records already carry latest snapshots
3. payload duplication would make run metadata growth unpredictable

## Replay-Ledger Alignment

Future effect-record persistence must align to the trace contract.

Rules:

1. every side-effect execution attempt should point to a `spanId`
2. replayed or reused effect results should still attach to a `spanId`
3. effect record ids should not replace trace ids
4. replay and resume workflows should reuse `traceId` and `spanId` as their canonical correlation handles

## Backward Compatibility

1. Existing runs without `version: 'ai-paths.trace.v1'` remain readable.
2. Existing `runtimeTrace.profile` payloads remain valid.
3. New fields are additive in V1.
4. The validator must accept older run metadata while V1 rolls out.

## Initial Implementation Slice

Sprint 1 should land:

1. `traceId`
2. stable `spanId`
3. `attempt`
4. `iteration`
5. `status`
6. `startedAt`
7. `finishedAt`
8. `inputHash`
9. basic branch and cache-decision fields

Later V1 follow-up can add:

1. effect record references
2. richer correlation-id propagation
3. deeper inspector views

## Implementation Touchpoints

### Contracts

1. `src/shared/contracts/ai-paths-runtime.ts`
2. `src/shared/contracts/ai-paths.ts`

### Executor

1. `src/features/ai/ai-paths/services/path-run-executor/index.ts`
2. `src/features/ai/ai-paths/services/path-run-executor/execution-completion.ts`
3. `src/features/ai/ai-paths/services/path-run-executor.logic.ts`

### Analytics and UI

1. `src/shared/lib/ai-paths/services/runtime-analytics/trace.ts`
2. `src/features/ai/ai-paths/components/run-timeline.tsx`
3. `src/features/ai/ai-paths/components/run-history-panel.tsx`
4. `src/features/ai/ai-paths/services/run-stream-publisher.ts`

## Acceptance Checks

1. Every node attempt has a stable span id in the trace contract.
2. Trace spans and runtime profile summaries do not contradict each other.
3. Run inspection can show attempt-level metadata without parsing raw event logs.
4. Replay-ledger work can attach to trace ids without changing the root schema again.

## Non-Goals For V1

1. OpenTelemetry-native end-to-end distributed tracing
2. Full payload duplication in spans
3. Artifact storage redesign for large outputs
4. Replacing run events entirely
