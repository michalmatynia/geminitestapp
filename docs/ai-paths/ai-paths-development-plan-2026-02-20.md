# AI Paths Development Plan (2026-02-20)

## Scope

This plan continues AI Paths development after the graph compile/fan-in enforcement rollout and focuses on runtime correctness, reliability, security, and observability.

## Current Baseline (Completed)

1. Graph compile pass added with blocking errors for invalid edges, single-port fan-in, unsupported cycles, and terminal-node fan-out.
2. Compile blocking integrated into server enqueue, local run start, and server executor safety net.
3. Editor guard added to block second incoming connection to single-cardinality ports.
4. Node runtime contract extended with `inputCardinality`.

## Plan Window

1. Start date: 2026-02-23
2. Target completion date: 2026-06-26
3. Delivery model: 2-week implementation waves with feature flags and canary rollout.

## Wave 1 (2026-02-23 to 2026-03-06): Port Contracts v2

1. Add node-level input contracts for `required` and `optional` semantics in shared contracts and node definitions.
2. Add compile checks for required-port missing wiring and incompatible optional wiring.
3. Expose contract controls in node runtime config UI.
4. Persist compile report metadata in run records and local runtime events.
5. Definition of done: graph compile failures must surface in both API responses and local runtime panel with actionable messages.

## Wave 2 (2026-03-09 to 2026-03-20): Scheduler Semantics Upgrade

1. Replace `waitForInputs = all-connected` gating with `required-ready` execution model.
2. Keep optional ports non-blocking and available opportunistically at execution time.
3. Add deadlock-avoidance guards for cycles that contain only optional waits.
4. Add deterministic iteration behavior tests for mixed required/optional input graphs.
5. Definition of done: known cyclic and optional-port test graphs execute without deadlock under strict mode.

## Wave 3 (2026-03-23 to 2026-04-03): Side-Effect Execution Policy

1. Replace implicit `executed.*` behavior with explicit side-effect policy per node.
2. Add policies: `per_run` and `per_activation`.
3. Wire per-node idempotency key strategy for Model, HTTP, and Database side-effect nodes.
4. Add runtime event fields for side-effect decisioning (`executed`, `skipped_duplicate`, `policy`).
5. Definition of done: loop and retry scenarios no longer silently suppress intended side effects.

## Wave 4 (2026-04-06 to 2026-04-24): Queue Reliability and Cancellation

1. Harden queue behavior so production does not silently degrade into inline processing.
2. Add cancellation propagation to active worker execution and local fallback timers.
3. Add explicit run state transitions for cancellation races (`running -> canceling -> canceled` if needed).
4. Add poll-node cancellation behavior checks and timeout classification.
5. Definition of done: cancellation p95 latency below 5 seconds in staging load tests.

## Wave 5 (2026-04-27 to 2026-05-15): Security Hardening for Outbound Fetch

1. Introduce central outbound URL policy service for HTTP and image-fetch paths.
2. Enforce scheme and host policy with DNS resolution checks and private-range deny rules.
3. Re-validate redirect hops and final destination.
4. Add workspace policy gate for high-risk node types.
5. Definition of done: blocked SSRF attempts are logged and internal network targets are denied.

## Wave 6 (2026-05-18 to 2026-06-05): Run Explorer and Traceability

1. Add run-level and node-level tracing spans with runId/nodeId correlation.
2. Extend run timeline UI with branch path and attempt diffs.
3. Add "rerun from node" safety checks using compile + side-effect policy.
4. Add run metadata snapshot for reproducibility: node config snapshot, resolved templates, runtime version.
5. Definition of done: mean-time-to-debug reduced via trace-linked run investigation flow.

## Wave 7 (2026-06-08 to 2026-06-26): Storage Refinement and Rollout

1. Normalize event payload columns for queryability while retaining metadata blob compatibility.
2. Move large node outputs to artifact references where payload size exceeds threshold.
3. Add migration jobs for historical runs where needed.
4. Roll out by cohort with rollback flags per wave.
5. Definition of done: no regression in run throughput and no increase in failed terminal states post rollout.

## File-Level Implementation Map

1. Runtime contracts:
   - `src/shared/contracts/ai-paths.ts`
   - `src/features/ai/ai-paths/lib/core/definitions/index.ts`
2. Compiler and validation:
   - `src/features/ai/ai-paths/lib/core/utils/graph.ts`
   - `src/features/ai/ai-paths/lib/core/validation-engine/evaluator.ts`
   - `src/features/ai/ai-paths/lib/core/validation-engine/defaults.ts`
3. Runtime engine and handlers:
   - `src/features/ai/ai-paths/lib/core/runtime/engine.ts`
   - `src/features/ai/ai-paths/lib/core/runtime/handlers/integration-http-handler.ts`
   - `src/features/ai/ai-paths/lib/core/runtime/handlers/integration-api-advanced-handler.ts`
   - `src/features/ai/ai-paths/lib/core/runtime/handlers/integration-poll-handler.ts`
4. Run orchestration and queue:
   - `src/features/ai/ai-paths/services/path-run-service.ts`
   - `src/features/ai/ai-paths/services/path-run-executor.ts`
   - `src/features/jobs/workers/aiPathRunQueue.ts`
   - `src/shared/lib/queue/queue-factory.ts`
5. API entrypoints:
   - `src/app/api/ai-paths/runs/enqueue/handler.ts`
   - `src/app/api/ai-paths/runs/[runId]/cancel/handler.ts`
   - `src/app/api/ai-paths/runs/[runId]/stream/handler.ts`
6. UI/editor/runtime panels:
   - `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsCanvasInteractions.ts`
   - `src/features/ai/ai-paths/components/ai-paths-settings/runtime/useAiPathsLocalExecution.ts`
   - `src/features/ai/ai-paths/components/run-timeline.tsx`
7. Security-linked image fetch paths:
   - `src/features/products/services/image-base64.ts`
   - `src/features/products/services/aiDescriptionService.ts`

## Test Strategy

1. Unit tests for compiler rules and scheduler gating behavior.
2. Integration tests for enqueue/cancel/retry lifecycle and state transitions.
3. Security tests for URL policy and redirect handling.
4. Load tests for queue latency, cancellation responsiveness, and polling behavior.
5. Regression tests for existing strict-flow and validation-preflight behavior.

## Success Metrics

1. Fan-in and wiring runtime incidents reduced by at least 80%.
2. Stale `running` runs older than 15 minutes below 0.3%.
3. Cancellation p95 under 5 seconds.
4. Dead-letter rate reduced release-over-release.
5. Mean-time-to-debug reduced by at least 50%.

## Next Execution Step

1. Implement Wave 1 contract additions (`required` + `optional`) and wire them into compiler + local/server preflight.
