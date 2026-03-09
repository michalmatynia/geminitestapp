---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 85 Execution: v3 Client/Server Asymmetry Reduction (Wave 2)

Date: 2026-03-05

## Objective

Continue reducing native runtime asymmetry by enabling additional safe client-native node families and tightening explicit tracking for remaining server-only families.

## Implemented

1. Client-native mapping expansion:
   - `src/shared/lib/ai-paths/core/runtime/engine-client.ts`
   - Added client runtime support for:
     - `fetcher`
     - `simulation`
   - Added native code-object IDs:
     - `ai-paths.node-code-object.fetcher.v3`
     - `ai-paths.node-code-object.simulation.v3`

2. Guardrail expansion and asymmetry tracking:
   - `src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts`
   - Updated explicit remaining server-only native node-type list to:
     - `agent`, `ai_description`, `api_advanced`, `audio_oscillator`, `audio_speaker`, `database`, `db_schema`, `description_updater`, `http`, `learner_agent`, `model`, `playwright`, `poll`
   - Added positive client-native execution coverage for:
     - `simulation`
     - `fetcher`
   - Existing positive coverage for `prompt` and `trigger` remains.

3. Documentation alignment:
   - `docs/ai-paths/node-code-objects-v3.md`
   - `docs/ai-paths/node-code-objects-v3/README.md`
   - Updated client-native subset and remaining server-only family lists.

## Validation

1. Runtime guardrail tests:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/server-native-code-object-registry-coverage.test.ts`
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.edge-sanitization.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-server.runtime-kernel.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/node-code-object-v3-legacy-bridge.test.ts`
   - Result: pass.

2. Canonical AI-Paths gate:
   - `npm run ai-paths:check:canonical`
   - Result: pass.

## Outcome

- Client-native coverage now includes `fetcher` and `simulation`, reducing server-only asymmetry further.
- Remaining server-only families are explicitly pinned by tests for safe, incremental follow-up reductions.
