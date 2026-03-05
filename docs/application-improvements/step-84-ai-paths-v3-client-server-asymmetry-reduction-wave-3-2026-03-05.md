# Step 84 Execution: v3 Client/Server Asymmetry Reduction (Wave 3)

Date: 2026-03-05

## Objective

Further reduce client/server native runtime asymmetry by enabling `poll` on client runtime and tightening explicit guardrails for the remaining server-only families.

## Implemented

1. Client-native `poll` support:
   - `src/shared/lib/ai-paths/core/runtime/engine-client.ts`
   - Added client handler mapping for `poll`.
   - Added native code-object mapping for `ai-paths.node-code-object.poll.v3`.

2. Guardrail and execution regression updates:
   - `src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts`
   - Removed `poll` from the expected server-only native node-type remainder list.
   - Added positive `poll` execution test through client-native contract resolver.
   - Kept positive `http` execution check deterministic through canonical `http` input contracts and a missing-URL branch (no outbound network dependency).

3. Documentation alignment:
   - `docs/ai-paths/node-code-objects-v3.md`
   - `docs/ai-paths/node-code-objects-v3/README.md`
   - Updated client-native subset list to include `poll`.
   - Updated remaining server-only families list (now excludes `poll`).

## Validation

1. Focused runtime suites:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts`
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/server-native-code-object-registry-coverage.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-server.runtime-kernel.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.edge-sanitization.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/node-code-object-v3-legacy-bridge.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/node-runtime-kernel.test.ts`
   - Result: pass.

2. Canonical AI-Paths gate:
   - `npm run ai-paths:check:canonical`
   - Result: pass.

## Outcome

- `poll` is now client-native, reducing server-only asymmetry further.
- Remaining server-only families are now explicitly pinned to:
  - `agent`, `ai_description`, `api_advanced`, `database`, `db_schema`, `description_updater`, `learner_agent`, `model`, `playwright`
- Guardrails and docs remain synchronized and canonical after the reduction.
