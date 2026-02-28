# AI Paths Improvement Plan: Phase 3 (2026-03-23 to 2026-04-03)

## Objective

Ship a policy-driven side-effect execution model so AI Paths no longer relies on implicit one-time suppression (`executed.*` sets). The phase focuses on deterministic behavior across loops/retries while preventing duplicate external effects.

## Why Phase 3

Current behavior is functional but ambiguous in looped graphs:

- Some side-effect nodes are suppressed implicitly and globally per run.
- Users cannot predict whether a side-effect node will execute again after branch changes, retries, or iterator advances.
- Run history lacks explicit decision fields explaining why a side effect did or did not fire.

Phase 3 resolves this by introducing explicit policy + idempotency + traceable decisions.

## Target Outcomes

1. Every side-effect node has a declared execution policy.
2. Runtime decisions are explicit and persisted (`policy`, `decision`, `idempotencyKey`, `reason`).
3. Loop and retry behavior is predictable and test-covered.
4. Duplicate external writes decrease without suppressing intended repeated calls.

## Scope

### In scope

1. Policy model for side-effect nodes (`per_run`, `per_activation`).
2. Decision engine in runtime core to replace implicit suppression paths.
3. Idempotency key generation for `model`, `http`, `api_advanced`, `database`.
4. Run-event and history schema updates for side-effect decisions.
5. UI controls for policy selection and read-only decision inspection.
6. Unit/integration tests for loops, retries, and restart safety.

### Out of scope

1. Durable queue infrastructure redesign (Phase 4).
2. Full cancellation lifecycle refactor (Phase 5).
3. Outbound SSRF/governance controls (Phase 6).

## Design Contract

### Policy definitions

1. `per_run`: execute at most once per node instance per run.
2. `per_activation`: execute once per unique activation (input hash + activation context).

### Default mapping (Phase 3 initial)

1. `model`: `per_activation`
2. `http`: `per_activation`
3. `api_advanced`: `per_activation`
4. `database`:
   - `query`: `per_activation`
   - `insert|update|delete`: `per_activation` (with idempotency key required)
5. `notification`: `per_run`
6. `delay` / `poll`: no side-effect policy change this phase (existing semantics retained)

### Runtime decision outputs

Persist on each side-effect candidate:

1. `policy`
2. `decision` (`executed`, `skipped_duplicate`, `skipped_policy`, `skipped_missing_idempotency`, `failed`)
3. `idempotencyKey` (nullable)
4. `activationHash`
5. `attempt`
6. `reason`

## Implementation Workstreams

### Workstream A: Contracts and schema

Files:

1. `/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/src/shared/contracts/ai-paths.ts`
2. `/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/src/shared/contracts/ai-paths-runtime.ts`

Tasks:

1. Add node runtime side-effect policy schema.
2. Add run/node event schema fields for decision telemetry.
3. Add backward-compatible defaults for legacy configs.

Acceptance:

1. Legacy paths validate without edits.
2. New policy fields round-trip through persistence.

### Workstream B: Policy decision engine

Files:

1. `/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/src/features/ai/ai-paths/lib/core/runtime/engine.ts`
2. `/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/src/features/ai/ai-paths/lib/core/runtime/execution-helpers.ts`

Tasks:

1. Replace implicit `executed.*` branching with a centralized policy evaluator.
2. Compute `activationHash` from node config + normalized inputs + iteration context.
3. Enforce policy before handler execution.
4. Emit decision events for every candidate execution.

Acceptance:

1. No hidden suppression paths remain for policy-controlled nodes.
2. Decision path is deterministic for identical seeded state.

### Workstream C: Idempotency key strategy

Files:

1. `/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/src/features/ai/ai-paths/lib/core/runtime/handlers/integration-http-handler.ts`
2. `/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/src/features/ai/ai-paths/lib/core/runtime/handlers/integration-api-advanced-handler.ts`
3. `/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/src/features/ai/ai-paths/lib/core/runtime/handlers/integration-database-handler.ts`
4. `/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/src/features/ai/ai-paths/lib/core/runtime/handlers/model-handler.ts`

Tasks:

1. Generate stable keys from pathId/runId/nodeId/activationHash plus operation discriminator.
2. Allow optional user override key template for advanced use.
3. Persist key in history/events and pass to downstream integrations where supported.

Acceptance:

1. Retries reuse the same key for the same activation.
2. Distinct activations produce distinct keys.

### Workstream D: UI + DX

Files:

1. `/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/src/features/ai/ai-paths/components/node-config/dialog/RuntimeNodeConfigSection.tsx`
2. `/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/src/features/ai/ai-paths/components/run-timeline.tsx`

Tasks:

1. Add policy selector and help text in runtime config panel.
2. Render side-effect decision tags in run timeline/history.
3. Show explicit skip reasons when execution was suppressed.

Acceptance:

1. Users can explain each side-effect skip from UI alone.
2. Config defaults are visible and overridable per node.

### Workstream E: Tests and safeguards

Test files:

1. `/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/__tests__/features/ai-paths/lib/core/runtime/engine.test.ts`
2. `/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/__tests__/features/ai/ai-paths/services/path-run-executor.test.ts`
3. `/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/src/features/ai/ai-paths/lib/core/runtime/handlers/__tests__/`

Required scenarios:

1. Iterator loop with `per_activation` calls executes once per unique activation.
2. Retry flow keeps idempotency key stable.
3. Branch split with same side-effect node respects policy and records reason.
4. Legacy run behavior remains compatible where policy not set.

Acceptance:

1. New policy tests pass.
2. Existing regression suite remains green.

## Delivery Timeline

### Week 1 (2026-03-23 to 2026-03-27)

1. Finalize schema and runtime policy evaluator.
2. Implement event/history decision fields.
3. Add base tests for policy resolution.

### Week 2 (2026-03-30 to 2026-04-03)

1. Integrate idempotency keys into handlers.
2. Ship UI policy controls + run timeline decision rendering.
3. Run canary rollout and compare duplicate-write/error metrics.

## Rollout Strategy

1. Feature flag: `ai_paths_side_effect_policy_v1`.
2. Canary cohort: internal workspaces only for 3 days.
3. Expand to selected tenant cohort if duplicate-side-effect rate is stable.
4. Full rollout after no severity-1 regressions and metrics hold.

## Metrics

1. Duplicate side-effect incidents per 1k runs.
2. Side-effect skip transparency rate (skips with explicit reason recorded).
3. Retry success rate for policy-controlled nodes.
4. Mean time to explain skipped execution from run timeline.

## Risks and Mitigations

1. Risk: Policy defaults alter existing behavior.
   - Mitigation: feature flag + per-workspace canary + baseline diff run comparison.
2. Risk: Idempotency key collisions.
   - Mitigation: include nodeId + activationHash + operation discriminator; add collision test.
3. Risk: Over-suppression in loops.
   - Mitigation: prefer `per_activation` defaults for iterative side-effect nodes.

## Exit Criteria

1. All side-effect node executions use explicit policy decision path.
2. Decision fields are persisted and visible in run inspection surfaces.
3. Canary metrics show no duplicate-write increase and no critical regressions.
4. Legacy paths run without manual migration edits.
