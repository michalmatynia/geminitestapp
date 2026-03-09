---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 98 Execution: v3 Signal-Flow + Learner Terminal-State Parity

Date: 2026-03-06

## Objective

Execute the next robustness wave by hardening:

1. UI signal-flow rendering semantics for runtime terminal/processing states.
2. Client-native `learner_agent` terminal-state parity coverage (`completed`, `blocked`, `skipped`, `failed`).

## Implemented

1. Signal-flow visual-state guardrail expansion:
   - `src/features/ai/ai-paths/components/__tests__/signal-flow-visual-state.test.ts`
   - Added assertions that:
     - edge flow remains disabled for terminal and non-flow statuses (`waiting_callback`, `advance_pending`, `queued`, `completed`, `failed`, `blocked`, `skipped`, `cached`, `timeout`, `canceled`);
     - blocker terminal statuses (`blocked`, `skipped`) are not treated as processing.

2. Canvas edge-rendering regression coverage:
   - `src/features/ai/ai-paths/components/__tests__/canvas-connection-preview.test.tsx`
   - Added chain test ensuring no wire animation occurs while model node status is `blocked`.

3. Client-native learner-agent terminal-state parity:
   - `src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts`
   - Added deterministic coverage for:
     - blocked learner node when `agentId` is missing (`missing_agent_id`);
     - skipped learner node when `skipAiJobs=true`;
     - failed learner node when chat API responds with an error.

## Validation

1. Focused suites:
   - `npx vitest run src/features/ai/ai-paths/components/__tests__/signal-flow-visual-state.test.ts src/features/ai/ai-paths/components/__tests__/canvas-connection-preview.test.tsx src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts`
   - Result: pass (53 tests total).

2. Runtime guardrail suites:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/server-native-code-object-registry-coverage.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-server.runtime-kernel.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.edge-sanitization.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/node-code-object-v3-legacy-bridge.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/node-runtime-kernel.test.ts`
   - Result: pass (32 tests).

3. Canonical/docs contract checks:
   - `npm run ai-paths:check:canonical`
   - Result: pass.

## Outcome

- Signal-flow rendering semantics are now explicitly regression-protected for blocked/waiting/processing boundaries.
- Client-native async AI-node parity now extends further into `learner_agent` terminal states under disabled and error scenarios.
