---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 90 Execution: v3 Client/Server Asymmetry Reduction (Wave 7)

Date: 2026-03-05

## Objective

Reduce server-only native runtime asymmetry by enabling `database` in client runtime through existing guardrailed handler behavior.

## Implemented

1. Client runtime native mapping expansion:
   - `src/shared/lib/ai-paths/core/runtime/engine-client.ts`
   - Added client runtime handler mapping for:
     - `database`
   - Added native code-object ID:
     - `ai-paths.node-code-object.database.v3`

2. Asymmetry guardrail update:
   - `src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts`
   - Removed `database` from remaining server-only node families.
   - Added positive client-native execution coverage for `database` using a deterministic guardrail path (`query-resolution` with no explicit query), asserting no outbound fetch call.

3. Documentation alignment:
   - `docs/ai-paths/node-code-objects-v3.md`
   - `docs/ai-paths/node-code-objects-v3/README.md`
   - Updated client-native subset and server-only remainder lists.

## Validation

1. Runtime guardrail suites:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/server-native-code-object-registry-coverage.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.edge-sanitization.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-server.runtime-kernel.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/node-code-object-v3-legacy-bridge.test.ts`
   - Result: pass.

2. Docs contract check:
   - `npm run docs:ai-paths:node-code-v3:check`
   - Result: pass.

## Outcome

- `database` is now in the client-native runtime subset under existing runtime guardrails.
- Remaining server-only native families are reduced and pinned by guardrails:
  - `agent`, `ai_description`, `description_updater`, `learner_agent`, `model`, `playwright`
