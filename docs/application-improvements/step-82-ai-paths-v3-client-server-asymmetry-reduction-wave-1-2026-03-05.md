---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 82 Execution: v3 Client/Server Asymmetry Reduction (Wave 1)

Date: 2026-03-05

## Objective

Reduce client/server native runtime asymmetry by enabling additional code-object v3 node families for client execution and tighten regression tracking for remaining server-only families.

## Implemented

1. Client runtime native support expansion:
   - `src/shared/lib/ai-paths/core/runtime/engine-client.ts`
   - Added client-native handlers/mappings for:
     - `prompt`
     - `template`
     - `trigger`
     - `notification`
   - Added native code-object IDs:
     - `ai-paths.node-code-object.prompt.v3`
     - `ai-paths.node-code-object.template.v3`
     - `ai-paths.node-code-object.trigger.v3`
     - `ai-paths.node-code-object.notification.v3`

2. Asymmetry guardrail strengthening:
   - `src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts`
   - Added explicit expected remaining server-only native node-type set:
     - `agent`, `ai_description`, `api_advanced`, `audio_oscillator`, `audio_speaker`, `database`, `db_schema`, `description_updater`, `fetcher`, `http`, `learner_agent`, `model`, `playwright`, `poll`, `simulation`
   - Updated unsupported-client execution assertion to use `model` (since `prompt` is now client-supported).
   - Added positive execution tests for client-native `prompt` and `trigger`.

3. Documentation alignment:
   - `docs/ai-paths/node-code-objects-v3.md`
   - `docs/ai-paths/node-code-objects-v3/README.md`
   - Added explicit client-native subset list and remaining server-only family list.

## Validation

1. Runtime guardrail tests:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts`
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/server-native-code-object-registry-coverage.test.ts`
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/engine-server.runtime-kernel.test.ts`
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.edge-sanitization.test.ts`
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/node-code-object-v3-legacy-bridge.test.ts`
   - Result: pass.

2. Canonical AI-Paths gate:
   - `npm run ai-paths:check:canonical`
   - Result: pass.

## Outcome

- Client-native v3 mapping coverage expanded by four node families.
- Remaining asymmetry is reduced and now explicitly pinned by regression tests.
- Docs now expose the client-native subset and server-only remainder as an explicit migration tracking surface.
