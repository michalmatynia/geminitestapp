# Step 97 Execution: v3 Client Runtime Terminal-State Guardrails

Date: 2026-03-06

## Objective

Extend client-native runtime robustness by hardening deterministic terminal-state coverage for `model` and `agent` around `blocked` and `skipped` outcomes, not only queue/complete/fail paths.

## Implemented

1. Client parity test expansion:
   - `src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts`
   - Added explicit coverage for:
     - `model` with missing prompt input:
       - asserts engine-level block contract (`status: blocked`, `blockedReason: missing_inputs`, `waitingOnPorts: ['prompt']`) and no AI API calls.
     - `model` with `skipAiJobs=true`:
       - asserts deterministic skip contract (`status: skipped`, `skipReason: ai_jobs_disabled`) and no enqueue/poll calls.
     - `agent` with missing prompt input:
       - asserts engine-level block contract (`status: blocked`, `blockedReason: missing_inputs`, `waitingOnPorts: ['prompt']`) and no settings/enqueue/poll calls.
     - `agent` with `skipAiJobs=true`:
       - asserts deterministic skip contract (`status: skipped`, `skipReason: ai_jobs_disabled`) with `bundle.status: skipped` and no settings/enqueue/poll calls.

2. Contract-semantics alignment:
   - Normalized new assertions to canonical engine-readiness semantics for missing required inputs (`missing_inputs`) to avoid brittle handler-level assumptions.

## Validation

1. Updated client subset suite:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts`
   - Result: pass (30 tests).

2. Runtime guardrail suites:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/server-native-code-object-registry-coverage.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-server.runtime-kernel.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.edge-sanitization.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/node-code-object-v3-legacy-bridge.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/node-runtime-kernel.test.ts`
   - Result: pass (32 tests).

3. Canonical/docs contract checks:
   - `npm run ai-paths:check:canonical`
   - Result: pass.

## Outcome

- Client-native parity now includes deterministic terminal-state coverage for async AI nodes across queue, completion, failure, blocked, and skipped branches.
- Regression resistance is improved for signal-flow/state representation under degraded or disabled AI execution conditions.
