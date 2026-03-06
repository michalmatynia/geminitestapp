# AI Paths Improvement Plan (2026-03-06)

## Reference Basis

1. `docs/AGENTS.md`
2. `docs/AI_PATHS.md`
3. `docs/AI_PATHS_EXTENDED_REFERENCE.md`
4. `docs/ARCHITECTURE_GUARDRAILS.md`
5. `docs/ai-paths/ai-paths-development-plan-2026-02-20.md`
6. `docs/ai-paths/ai-paths-development-plan-2026-02-20-phase-3.md`
7. `docs/ai-paths/kernel-engine-transition-plan-2026-03-05.md`
8. `docs/ai-paths/ai-paths-improvements-roadmap.json`

## Companion Artifact

Machine-readable roadmap:
`docs/ai-paths/ai-paths-improvements-roadmap.json`

Validation command:
`npm run docs:ai-paths:improvements-roadmap:check`

First sprint execution brief:
`docs/ai-paths/ai-paths-v1-sprint-1-execution-brief-2026-03-06.md`

## Objective

Advance AI Paths from the current run-history and queue-aware execution model into a contract-driven, replayable, trace-first workflow runtime without regressing canonical schema, kernel-transition, or admin authoring stability.

This plan re-baselines from the codebase as it exists on 2026-03-06. It should be read as a follow-up to earlier development plans, not as a clean-room rewrite.

## Planning Assumption

1. This roadmap assumes AI Paths remains internal power-user and admin-first in the near term.
2. That assumption matches the current product shape: admin UI editing, run history, runtime analysis, starter workflow seeding, and operator-oriented docs.
3. Because of that, the recommended order is reliability first, observability second, reuse ergonomics third.
4. If AI Paths shifts toward end-user no-code workflows, move composite nodes and reusable templates ahead of advanced cache and failure-policy work.

## Operating Constraints

1. Do not introduce workflow-specific runtime behavior keyed to path id, starter id, or path name.
2. Portable semantic path code remains the canonical transfer unit.
3. Extend existing contracts where possible instead of creating parallel configuration systems.
4. Keep local and server execution semantics aligned.
5. New contracts must integrate with existing guardrails:
   `npm run ai-paths:check:canonical`,
   `npm run ai-paths:check:portable-schema-diff -- --strict`,
   `npm run docs:ai-paths:node-docs:check`,
   `npm run docs:ai-paths:kernel-transition:check`.

## Current Baseline

1. Run orchestration already supports queued execution, inline fallback, cancel, retry-node, and `resume` vs `replay` dispatch through `src/features/ai/ai-paths/services/path-run-service.ts`.
2. Server execution already persists `runtimeState`, node inputs and outputs, hashes, history, runtime profile snapshots, and can skip completed upstream nodes on `resume` and `retry` through `src/features/ai/ai-paths/services/path-run-executor/index.ts` and `src/features/ai/ai-paths/services/path-run-executor.logic.ts`.
3. Contracts already expose named ports plus `inputContracts`, `outputContracts`, `inputCardinality`, cache policy, side-effect policy, timeout, and retry through `src/shared/contracts/ai-paths-core/nodes.ts`.
4. UI already exposes run history, run compare, run timeline, runtime analysis, cache controls, and required or optional input configuration through `src/features/ai/ai-paths/components/run-history-panel.tsx`, `src/features/ai/ai-paths/components/run-timeline.tsx`, `src/features/ai/ai-paths/components/ai-paths-settings/panels/AiPathsRuntimeAnalysis.tsx`, and `src/features/ai/ai-paths/components/node-config/dialog/RuntimeNodeConfigSection.tsx`.
5. Runtime analytics already aggregates runs, nodes, and trace summaries through `src/shared/lib/ai-paths/services/runtime-analytics/summary.ts` and `src/shared/lib/ai-paths/services/runtime-analytics/trace.ts`.
6. Run metadata already persists `runtimeTrace.profile` summaries and runtime-kernel parity snapshots through `src/features/ai/ai-paths/services/path-run-executor/execution-completion.ts`.
7. Security already has a central outbound URL policy with local/private host blocking plus allow and deny rules through `src/shared/lib/security/outbound-url-policy.ts`.
8. Starter workflows already exist as versioned semantic assets, but reuse currently stops at full-path templates rather than composite subflows through `src/shared/lib/ai-paths/core/starter-workflows/`.

## Gaps That Still Matter

1. `replay` currently means rerunning the graph from persisted config and runtime state, not deterministic history replay of external side effects.
2. Port contracts currently cover requiredness and cardinality, but not canonical value kind, schema, or user-facing type diagnostics.
3. `runtimeTrace` is still summary-oriented. It is not yet a normalized trace document that can drive UI inspection, diffs, or audit.
4. Cache and retry knobs exist, but they do not yet form a portable execution contract keyed by config, normalized inputs, and code version.
5. Async node outputs are node-family specific (`jobId`, `status`, `bundle`) rather than a single job-envelope contract.
6. Debugging is still history-first rather than trace-first.
7. Reuse, governance, and CI-grade fixture execution are partial.

## Delivery Priorities

### P0

1. Port Contracts V3
2. Deterministic Replay and Resume Ledger
3. Trace Record V1 and trace-first inspection UI

### P1

1. Unified execution controls
2. Safe persisted cache keys and refresh semantics
3. Unified async job envelope and concurrency controls

### P2

1. Debug inspector and run diff polish
2. Composite nodes and reusable templates
3. Governance, linting, and CI fixture runner

## Product Roadmap

### V1: Reliability and Debuggability Baseline

Target window:
2026-03-09 to 2026-04-17

Scope:

1. Port Contracts V3
2. Deterministic replay ledger for side-effect nodes
3. Resume semantics hardening
4. Trace Record V1
5. Unified timeout and retry semantics
6. Trace-backed run timeline improvements

Default posture:

1. Conservative and operator-first
2. Prefer explicit failures over silent coercion
3. Prefer replay-safe defaults over maximum throughput

Release gate:

1. A failed run can be diagnosed from UI and trace data without raw log digging.
2. A replay can finish without hitting external systems when effect records exist.
3. Port mismatches fail with canonical, user-facing diagnostics.

### V2: Throughput and Reuse

Target window:
2026-04-20 to 2026-05-22

Scope:

1. Durable cache contract
2. Async job envelope normalization
3. Concurrency controls and safe branch parallelism
4. Composite nodes
5. Versioned reusable templates
6. Run diff and waterfall inspector polish

Default posture:

1. Preserve V1 determinism guarantees
2. Add throughput only where trace and policy visibility remain intact

Release gate:

1. Parallel execution does not change semantic outcomes relative to serialized execution.
2. Composite nodes round-trip through canonical semantic assets.
3. Cache hits and misses are explainable from trace data alone.

### V3: Governance and CI Platform

Target window:
2026-05-25 to 2026-06-26

Scope:

1. Headless fixture runner
2. Golden-run snapshots
3. Path linter expansion
4. Secret-ref enforcement
5. Payload retention and redaction policies
6. Rollout policy and audit-grade exports

Default posture:

1. Treat AI Paths as production infrastructure, not only an admin convenience
2. Move policy validation left into authoring and CI

Release gate:

1. Paths can be validated and regression-tested in CI without the canvas UI.
2. Governance checks block unsafe outbound calls, raw-secret persistence, and unsupported trace-retention modes.

## Immediate Next Execution Step

1. Start with Port Contracts V3 and Trace Record V1 design docs in parallel.
2. Freeze the minimal contract additions before changing UI copy or adding adapter nodes.
3. Implement deterministic replay ledger immediately after the trace schema lands so effect records and spans share identifiers.
4. Delay branch parallelism until replay and cache key contracts are stable.

## Phase 1 (2026-03-09 to 2026-03-27): Contract-Driven Execution Foundation

### Workstream A: Port Contracts V3

Goal:
Finish the port-contract model by extending the existing `inputContracts` and `outputContracts` shape rather than adding a second schema system.

Tasks:

1. Add `kind` and optional schema metadata to port contracts while preserving existing `required` and `cardinality` fields as the canonical requiredness and fan-in model.
2. Teach compile and runtime validation to reject mismatched wiring before execution when possible, and to fail fast with localized runtime errors when only runtime values expose the mismatch.
3. Add explicit adapter nodes such as `to_array`, `first`, `flatten`, `json_parse`, and `stringify` so coercion is intentional, searchable, and traceable.
4. Surface contract mismatches in server enqueue, local execution, run history, and canvas validation messaging.

Primary files:

1. `src/shared/contracts/ai-paths-core/nodes.ts`
2. `src/shared/contracts/ai-paths-runtime.ts`
3. `src/shared/lib/ai-paths/core/runtime/engine-core.ts`
4. `src/shared/lib/ai-paths/core/runtime/engine-modules/engine-utils.ts`
5. `src/shared/lib/ai-paths/core/validation-engine/`
6. `src/features/ai/ai-paths/components/node-config/dialog/RuntimeNodeConfigSection.tsx`

Acceptance:

1. Port mismatch errors name the source node, source port, expected contract, and received value kind.
2. Static mismatches fail during compile validation.
3. Dynamic mismatches fail during execution with canonical error codes and actionable messages.
4. Existing `required` and `cardinality` configs remain backward-compatible.

### Workstream B: Deterministic Replay and Resume Ledger

Goal:
Turn the existing `resume` and `replay` controls into deterministic, crash-safe execution behavior rather than operational rerun shortcuts.

Tasks:

1. Introduce explicit effect-ledger entries for side-effect handlers including `model`, `agent`, `http`, `api_advanced`, `database`, `notification`, and `playwright`.
2. Record request fingerprint, result fingerprint, execution policy, external identifiers, and replay eligibility per effect attempt.
3. Keep `resume` as the current skip-from-last-success behavior, but validate that reused upstream outputs are still replay-compatible before consuming them.
4. Redefine `replay` to default to recorded-effect reuse, with an explicit opt-in mode for replaying live side effects.
5. Persist node config snapshot, runtime fingerprint, and handler or code-object version alongside effect records.
6. Make crash recovery restart from the last durable checkpoint without double-firing completed side-effect nodes.

Primary files:

1. `src/features/ai/ai-paths/services/path-run-service.ts`
2. `src/features/ai/ai-paths/services/path-run-executor/index.ts`
3. `src/features/ai/ai-paths/services/path-run-executor/execution-completion.ts`
4. `src/features/ai/ai-paths/services/path-run-executor.runtime-state.ts`
5. `src/shared/contracts/ai-paths.ts`
6. `src/shared/contracts/ai-paths-runtime.ts`
7. `src/shared/lib/ai-paths/core/runtime/handlers/`

Acceptance:

1. Deterministic replay can complete without re-calling external systems when recorded effect results exist.
2. Resume after crash or failure never re-executes completed upstream side-effect nodes unless policy explicitly allows it.
3. Run detail makes live execution and recorded-effect reuse clearly distinguishable.

### Workstream C: Trace Record V1

Goal:
Promote `runtimeTrace` from a summary snapshot into the canonical trace contract for execution, debugging, and audit.

Tasks:

1. Add a normalized trace document with `runId`, `traceId`, per-node span ids, attempts, start and finish timestamps, branch decisions, input hashes, cache decisions, and error references.
2. Add a message or activation correlation id to values crossing edges so a payload can be followed across fan-out and fan-in.
3. Preserve the current runtime profile summary as a projection of the canonical trace rather than a separate source of truth.
4. Extend SSE stream payloads and run-detail APIs to expose trace slices without requiring one large metadata blob download.

Primary files:

1. `src/shared/contracts/ai-paths-runtime.ts`
2. `src/features/ai/ai-paths/services/run-stream-publisher.ts`
3. `src/features/ai/ai-paths/services/path-run-executor/index.ts`
4. `src/shared/lib/ai-paths/services/runtime-analytics/trace.ts`
5. `src/features/ai/ai-paths/components/run-history-panel.tsx`
6. `src/features/ai/ai-paths/components/run-timeline.tsx`

Acceptance:

1. Every node execution attempt has a stable span id and timestamps.
2. Branch decisions and cached or effect-reused executions are visible in the trace.
3. Analytics summary and inspection UI are derived from the same trace contract.

## Phase 2 (2026-03-30 to 2026-04-17): Reliable Execution Controls

### Workstream D: Execution Policy V1

Goal:
Make retry, timeout, and error-routing semantics consistent across local and server execution.

Tasks:

1. Keep existing `runtime.retry` and `timeoutMs` fields, but extend the runtime policy surface with `continueOnError`, `failFast`, and error-routing semantics.
2. Normalize retry backoff and timeout behavior across engine-core, server executor, and queue worker.
3. Persist retryability, retry attempts, timeout classification, and routed-error outcomes in trace and history data.
4. Add sensible defaults per node family instead of forcing every path author to rediscover failure policy manually.

Primary files:

1. `src/shared/contracts/ai-paths-core/nodes.ts`
2. `src/shared/contracts/ai-paths-runtime.ts`
3. `src/shared/lib/ai-paths/core/runtime/engine-core.ts`
4. `src/features/ai/ai-paths/services/path-run-executor/index.ts`
5. `src/features/ai/ai-paths/components/node-config/dialog/RuntimeNodeConfigSection.tsx`

Acceptance:

1. Local and server execution behave the same for retry, timeout, and routed-error decisions.
2. Node error handling is explicit in the UI and persisted trace data.

### Workstream E: Cache Contract V1

Goal:
Turn the current cache knobs into predictable, portable execution behavior.

Tasks:

1. Build cache keys from node type, canonical config snapshot, normalized inputs, runtime or kernel version, and handler or code-object version.
2. Keep the current `cache.mode` and `cache.scope` UI, but persist cache-key and cache-decision metadata per execution.
3. Add durable cache backing for server mode plus per-run and per-node refresh controls.
4. Ensure retries, resume, and replay interact with cache deterministically and do not hide stale effect results.

Primary files:

1. `src/shared/contracts/ai-paths-core/nodes.ts`
2. `src/shared/lib/ai-paths/core/runtime/engine-core.ts`
3. `src/features/ai/ai-paths/services/path-run-executor/index.ts`
4. `src/features/ai/ai-paths/components/node-config/dialog/RuntimeNodeConfigSection.tsx`

Acceptance:

1. Code changes invalidate cached outputs automatically.
2. Users can explain every cache hit or miss from trace data.
3. Server restarts do not silently discard all useful cache state when durable cache is enabled.

### Workstream F: Async Envelope and Concurrency

Goal:
Make async execution easier to compose without relying on node-family-specific conventions.

Tasks:

1. Standardize async outputs around a shared job-envelope contract while keeping `jobId` compatibility adapters for existing nodes.
2. Add per-node-type, per-path, and tag-based concurrency limits in server execution.
3. Allow safe parallel branch execution when the dependency graph permits it and node policies allow it.
4. Make `poll`, callback waits, and queued model or browser execution consume the same envelope contract.

Primary files:

1. `src/shared/contracts/ai-paths-runtime.ts`
2. `src/shared/lib/ai-paths/core/runtime/handlers/generation.ts`
3. `src/shared/lib/ai-paths/core/runtime/handlers/integration-poll-handler.ts`
4. `src/shared/lib/ai-paths/core/runtime/handlers/integration-playwright-handler.ts`
5. `src/features/ai/ai-paths/workers/ai-path-run-queue/queue.ts`
6. `src/features/ai/ai-paths/workers/aiPathRunQueue.ts`

Acceptance:

1. Async node families expose consistent status, result, and progress semantics.
2. Independent branches can run concurrently in server mode without changing semantic outcomes.
3. Saturation controls exist above raw worker concurrency.

## Phase 3 (2026-04-20 to 2026-05-08): Productization and Governance

### Workstream G: Trace-First Debugging UX

Goal:
Upgrade existing run history and timeline surfaces into an operator-grade inspector.

Tasks:

1. Add an inspector panel for per-node inputs, outputs, effect refs, trace ids, and attempt metadata.
2. Add a waterfall view derived from canonical spans.
3. Add run diff support for outputs, branch path, and duration deltas.
4. Show inline node badges on canvas for `running`, `cached`, `effect_reused`, `failed`, and `waiting_callback`.

Primary files:

1. `src/features/ai/ai-paths/components/run-timeline.tsx`
2. `src/features/ai/ai-paths/components/run-history-panel.tsx`
3. `src/features/ai/ai-paths/components/ai-paths-settings/panels/AiPathsRuntimeAnalysis.tsx`
4. `src/features/ai/ai-paths/context/RuntimeContext.tsx`

Acceptance:

1. Operators can diagnose a failed run from UI alone.
2. Comparing two runs shows branch, output, and duration deltas without raw JSON spelunking.

### Workstream H: Composite Nodes and Reuse

Goal:
Move reuse up from full-path starters to reusable subgraphs.

Tasks:

1. Introduce a subgraph-as-node authoring model with explicit input and output surfacing.
2. Keep starter workflows, but add a reusable composite library and versioned internal templates.
3. Reuse the existing semantic asset pipeline instead of adding workflow-specific TypeScript builders.
4. Support parameterized defaults and lineage metadata for composites and templates.

Primary files:

1. `src/shared/lib/ai-paths/core/starter-workflows/`
2. `src/shared/contracts/ai-paths-semantic-grammar.ts`
3. `src/features/ai/ai-paths/components/`

Acceptance:

1. Common chains such as Fetcher to Context to Parser or model plus validation can be inserted as one reusable unit.
2. Composite version upgrades are traceable and reversible.

### Workstream I: Governance, Linting, and CI

Goal:
Turn existing safety rules and canonical checks into a full AI Paths policy layer.

Tasks:

1. Extend the current outbound URL baseline into first-class AI Paths policy controls for allow or deny, redaction, payload retention mode, and secret references.
2. Keep raw secrets out of node JSON by storing secret refs or ids only.
3. Add path linter rules for unconnected required ports, unreachable nodes, cycles, port kind mismatches, unsafe side-effect patterns, and missing governance metadata.
4. Add a headless fixture runner and golden-run snapshots so paths can be tested in CI without the canvas UI.
5. Build the fixture runner on top of the shared runtime and semantic path assets rather than introducing a test-only graph format.
6. Fold the new checks into existing canonical, schema-diff, and docs pipelines.

Primary files:

1. `src/shared/lib/security/outbound-url-policy.ts`
2. `src/shared/lib/observability/log-redaction.ts`
3. `scripts/ai-paths/check-canonical.mjs`
4. `scripts/ai-paths/`
5. `package.json`

Acceptance:

1. CI can execute fixture-based path runs deterministically.
2. Paths cannot persist raw API keys in canonical config.
3. Trace and history storage mode is selectable and auditable.

## Recommended Sequence If Only 3 Items Ship Next

1. Port Contracts V3

Why:
The schema already has `inputContracts` and `cardinality`. Adding canonical value kind and schema finishes the contract story and removes the highest day-to-day authoring pain.

2. Deterministic Replay and Resume Ledger

Why:
`resume` and `replay` already exist operationally, so this has the highest reliability leverage relative to current code.

3. Trace Record V1 and Debugging UX

Why:
Runtime analytics, run timeline, and `runtimeTrace.profile` already exist. Promoting them into one canonical trace contract immediately improves debugging, auditability, and future diff tooling.

## Rollout Rules

1. Hide replay ledger, port kinds, trace v1, and composite nodes behind separate feature flags.
2. Use shadow-write and shadow-derive mode for Trace Record V1 before making it authoritative.
3. Preserve backward compatibility for legacy path configs by auto-defaulting missing contract fields.
4. Do not promote branch parallelism until deterministic replay and effect-ledger acceptance gates pass.
5. Keep canonical, schema-diff, and kernel-transition readiness checks green throughout rollout.

## Success Metrics

1. Port mismatch incidents caught before execution versus at runtime.
2. Replay runs completed without live side-effect re-execution.
3. Mean time to explain failed runs from the admin UI.
4. Duplicate external side effects per 1k runs.
5. Cache hit explainability rate.
6. CI fixture pass rate and snapshot drift rate.

## Exit Criteria

1. AI Paths has one canonical trace contract, one canonical port-contract model, and one deterministic replay story.
2. Local and server execution share the same contract behavior for typing, retries, caching, and error routing.
3. Run inspection surfaces are trace-driven rather than ad hoc metadata-driven.
4. Governance and CI checks prevent raw-secret persistence, unsafe outbound calls, and path-contract drift.
