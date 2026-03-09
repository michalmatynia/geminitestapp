---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 93 Execution: v3 Client/Server Asymmetry Reduction (Wave 10)

Date: 2026-03-06

## Objective

Reduce remaining server-only native node families by enabling `agent` and `learner_agent` in client runtime with deterministic regression coverage.

## Implemented

1. Client runtime native mapping expansion:
   - `src/shared/lib/ai-paths/core/runtime/engine-client.ts`
   - Added client runtime mappings for:
     - `agent`
     - `learner_agent`
   - Added native code-object IDs:
     - `ai-paths.node-code-object.agent.v3`
     - `ai-paths.node-code-object.learner_agent.v3`

2. Asymmetry guardrail and execution coverage update:
   - `src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts`
   - Removed `agent` and `learner_agent` from remaining server-only node families assertion.
   - Added deterministic native execution coverage:
     - `agent`: prompt-driven enqueue path with mocked `settingsApi.list` and `agentApi.enqueue`, asserting queued output and no poll when `waitForResult=false`.
     - `learner_agent`: prompt-driven chat path with mocked `learnerAgentsApi.chat`, asserting completed output with response/sources.

3. Documentation alignment:
   - `docs/ai-paths/node-code-objects-v3.md`
   - `docs/ai-paths/node-code-objects-v3/README.md`
   - Updated client-native subset and server-only remainder lists.

## Validation

1. Updated client subset suite:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts`
   - Result: pass (20 tests).

2. Runtime guardrail suites:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/server-native-code-object-registry-coverage.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-server.runtime-kernel.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.edge-sanitization.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/node-code-object-v3-legacy-bridge.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/node-runtime-kernel.test.ts`
   - Result: pass (32 tests).

3. Canonical/docs contract checks:
   - `npm run ai-paths:check:canonical`
   - Result: pass.

## Outcome

- `agent` and `learner_agent` are now part of the client-native runtime subset with deterministic regression coverage.
- Remaining server-only family is now:
  - `model`
