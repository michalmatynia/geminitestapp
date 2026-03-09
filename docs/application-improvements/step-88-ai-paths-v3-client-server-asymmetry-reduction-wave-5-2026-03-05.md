---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 88 Execution: v3 Client/Server Asymmetry Reduction (Wave 5)

Date: 2026-03-05

## Objective

Reduce server-only native runtime asymmetry by enabling `db_schema` in client runtime with deterministic contract-level regression coverage.

## Implemented

1. Client runtime native mapping expansion:
   - `src/shared/lib/ai-paths/core/runtime/engine-client.ts`
   - Added client runtime handler mapping for:
     - `db_schema`
   - Added native code-object ID:
     - `ai-paths.node-code-object.db_schema.v3`

2. Asymmetry guardrail update:
   - `src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts`
   - Removed `db_schema` from remaining server-only node families.
   - Added positive native execution coverage for `db_schema` with mocked `dbApi.schema` payload to keep tests deterministic and network-independent.

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

- `db_schema` is now in the client-native runtime subset with contract-backed regression coverage.
- Remaining server-only families are reduced and pinned by parity guardrails:
  - `agent`, `ai_description`, `api_advanced`, `database`, `description_updater`, `learner_agent`, `model`, `playwright`
