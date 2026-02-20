# AI Paths Development Plan v2 (2026-02-20)

## Objective
Continue AI Paths development from the current compile/runtime baseline and deliver production-grade correctness, reliability, security, and observability by staged rollout.

## Current Status (as of 2026-02-20)
1. Graph compile checks are live for invalid edges, fan-in on single ports, unsupported cycles, terminal fan-out, required-input missing wiring, and optional-input incompatible wiring.
2. Compile preflight blocks runs in local start, API enqueue, service enqueue, and executor safety check.
3. Runtime now supports required/optional input contracts for `waitForInputs` gating with backward-compatible fallback.
4. Runtime config UI supports selecting required and optional input ports.
5. Baseline tests for compile/runtime/service/executor paths are passing on the new contract behavior.

## Plan Window
1. Start date: 2026-02-23
2. End date: 2026-07-31
3. Cadence: 2-week sprints with canary toggles and rollback flags.

## Sprint Roadmap
### Sprint 1 (2026-02-23 to 2026-03-06): Contract Rollout Completion
1. Add node-definition-driven default input contracts for all node types (not only high-risk nodes).
2. Add compile metadata rendering in local runtime panel and server run timeline.
3. Add migration utility to backfill missing contracts in persisted path configs.
4. Add compile warning surfacing (non-blocking) in editor canvas and path save flow.
5. Exit criteria:
   - No regression in legacy path execution.
   - Existing paths with no explicit contracts still run under fallback semantics.

### Sprint 2 (2026-03-09 to 2026-03-20): Scheduler and Deadlock Hardening
1. Add deadlock detection heuristics for cyclic waits (`waitForInputs=true` with unresolved required sets).
2. Add iteration diagnostics event fields (`waitingOnPorts`, `requiredPorts`, `optionalPorts`).
3. Add deterministic replay tests for mixed required/optional loops.
4. Add compile warning for cycles where every node in the cycle has unresolved required dependencies.
5. Exit criteria:
   - Known loop templates complete or fail fast with actionable diagnostics.

### Sprint 3 (2026-03-23 to 2026-04-03): Side-Effect Policy Engine
1. Introduce explicit side-effect policy per node:
   - `per_run`
   - `per_activation`
2. Replace implicit `executed.*` suppression with policy-driven decision path.
3. Add idempotency key generation support for `model`, `http`, `api_advanced`, `database`.
4. Persist execution decision fields in run events (`policy`, `decision`, `idempotencyKey`).
5. Exit criteria:
   - Loop and retry behavior no longer silently suppresses intended side effects.

### Sprint 4 (2026-04-06 to 2026-04-17): Durable Queue and Retry Consistency
1. Enforce queue-first execution in production profiles.
2. Standardize retry policy evaluation for run-level and node-level retries.
3. Add explicit state transitions for retries and dead-letter flow.
4. Add worker heartbeat/stuck-run detector and requeue guardrails.
5. Exit criteria:
   - Stuck `running` runs older than 15 minutes < 0.3%.

### Sprint 5 (2026-04-20 to 2026-05-08): Cancellation and Poll Lifecycle
1. Add cancellation propagation through worker + runtime engine + poll node.
2. Add cancellation-aware node handler wrappers with abort-signal enforcement.
3. Add run transition model for cancellation race handling (`running -> canceling -> canceled`).
4. Add poll timeout classification and reason taxonomy.
5. Exit criteria:
   - Cancellation p95 below 5 seconds in staging.

### Sprint 6 (2026-05-11 to 2026-05-29): Outbound Security Controls
1. Implement central outbound URL policy service for HTTP/image fetch paths.
2. Enforce scheme/domain/IP rules and redirect revalidation.
3. Add workspace policy gates for sensitive nodes (`database`, `http`, `api_advanced`, `model`, `db_schema`).
4. Add structured security audit events for blocked outbound calls.
5. Exit criteria:
   - Internal/private address fetch attempts are blocked and traceable.

### Sprint 7 (2026-06-01 to 2026-06-19): Traceability and Run Explorer Foundation
1. Add run-level and node-level tracing hooks with runId/nodeId correlation.
2. Add timeline-level attempt visualization and branch path rendering.
3. Add "rerun from node" safeguards using compile + side-effect policy checks.
4. Persist reproducibility snapshot fields:
   - node config snapshot
   - resolved template inputs
   - runtime version
5. Exit criteria:
   - Failure triage can identify root node and reason from one run view.

### Sprint 8 (2026-06-22 to 2026-07-31): Storage Optimization and Production Rollout
1. Move large outputs to artifact references and keep lightweight run metadata in DB.
2. Add compatibility reader for legacy run payloads.
3. Roll out by cohort:
   - cohort A: internal paths
   - cohort B: selected tenant workspaces
   - cohort C: default production
4. Add rollback toggles per subsystem (contracts, scheduler, side-effect policy, queue).
5. Exit criteria:
   - No throughput regression and no terminal failure rate increase after rollout.

## Workstreams and File Map
### A. Contracts and Compiler
1. `/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/src/shared/contracts/ai-paths.ts`
2. `/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/src/features/ai/ai-paths/lib/core/definitions/index.ts`
3. `/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/src/features/ai/ai-paths/lib/core/utils/graph.ts`
4. `/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/src/features/ai/ai-paths/lib/core/utils/dependency-inspector.ts`

### B. Runtime and Node Policies
1. `/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/src/features/ai/ai-paths/lib/core/runtime/engine.ts`
2. `/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/src/features/ai/ai-paths/lib/core/runtime/handlers/`
3. `/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/src/features/ai/ai-paths/components/node-config/dialog/RuntimeNodeConfigSection.tsx`

### C. Run Orchestration and Queue
1. `/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/src/features/ai/ai-paths/services/path-run-service.ts`
2. `/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/src/features/ai/ai-paths/services/path-run-executor.ts`
3. `/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/src/features/jobs/workers/aiPathRunQueue.ts`
4. `/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/src/shared/lib/queue/queue-factory.ts`

### D. API and Streaming
1. `/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/src/app/api/ai-paths/runs/enqueue/handler.ts`
2. `/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/src/app/api/ai-paths/runs/[runId]/cancel/handler.ts`
3. `/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/src/app/api/ai-paths/runs/[runId]/stream/handler.ts`

### E. Security
1. `/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/src/features/products/services/image-base64.ts`
2. `/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/src/features/products/services/aiDescriptionService.ts`
3. `/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/src/features/ai/ai-paths/lib/core/runtime/handlers/integration-http-handler.ts`
4. `/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/src/features/ai/ai-paths/lib/core/runtime/handlers/integration-api-advanced-handler.ts`

## Quality Gates
1. Unit tests:
   - compile findings and contract resolution
   - runtime gating and deadlock detection
   - side-effect policy resolution
2. Integration tests:
   - enqueue -> execute -> stream -> cancel lifecycle
   - retry and dead-letter flow
3. Security tests:
   - blocked private IP
   - blocked metadata endpoint
   - redirect chain revalidation
4. Performance tests:
   - queue latency p50/p95
   - cancellation latency p95
   - run completion throughput

## Metrics and SLO Targets
1. Compile-blocked runtime incidents reduced by 80% from current baseline.
2. Stuck runs older than 15 minutes below 0.3%.
3. Cancellation p95 below 5 seconds.
4. Dead-letter rate down release-over-release by at least 20%.
5. Mean-time-to-debug reduced by 50%.

## Risks and Mitigations
1. Risk: Legacy paths rely on implicit all-connected behavior.
   - Mitigation: fallback semantics + migration dry-run + feature flag.
2. Risk: Side-effect policy changes alter existing run output.
   - Mitigation: canary by workspace + event-level diff comparison.
3. Risk: Queue hardening introduces retry storms.
   - Mitigation: bounded retries + exponential backoff + dead-letter cap.
4. Risk: Security controls block valid external providers.
   - Mitigation: workspace allowlist workflow and audit logs.

## Next 10-Day Execution Checklist (2026-02-23 to 2026-03-06)
1. Backfill input contracts for remaining palette nodes and node templates.
2. Add compile warning rendering to local runtime event stream and run explorer API payload.
3. Build migration command for persisted path configs and run in dry-run mode.
4. Add tests for contract backfill and migration compatibility.
5. Open canary for internal AI Paths workspaces only.

