---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 96 Execution: v3 Client Runtime Wait-Failure Guardrails

Date: 2026-03-06

## Objective

Increase client-native runtime robustness by adding deterministic regression coverage for async wait-path failure branches in `model` and `agent` nodes.

## Implemented

1. Client parity test hardening:
   - `src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts`
   - Added explicit negative-branch tests for:
     - `model` with `waitForResult=true` when poll reports `failed`.
     - `model` enqueue response missing a valid `jobId`.
     - `agent` with `waitForResult=true` when poll reports `failed`.

2. Assertion scope:
   - Ensures failure outputs are deterministic (`status: failed`), preserve identifiers where available, and surface failure messaging for model enqueue/poll branches.
   - Confirms no unintended poll call when model enqueue payload is invalid.

## Validation

1. Updated client subset suite:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts`
   - Result: pass (26 tests).

2. Runtime guardrail suites:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/server-native-code-object-registry-coverage.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-server.runtime-kernel.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.edge-sanitization.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/node-code-object-v3-legacy-bridge.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/node-runtime-kernel.test.ts`
   - Result: pass (32 tests).

3. Canonical/docs contract checks:
   - `npm run ai-paths:check:canonical`
   - Result: pass.

## Outcome

- Client-native wait-path parity now includes deterministic failure-mode guardrails for both `model` and `agent`.
- Portable runtime migration confidence is improved for async error branches, not only happy-path queue/completion flows.
