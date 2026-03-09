---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 86 Execution: v3 Client/Server Asymmetry Reduction (Wave 3)

Date: 2026-03-05

## Objective

Continue reducing client/server native runtime asymmetry by enabling additional low-risk native node families in client runtime.

## Implemented

1. Client-native runtime expansion:
   - `src/shared/lib/ai-paths/core/runtime/engine-client.ts`
   - Added client runtime handler mappings for:
     - `audio_oscillator`
     - `audio_speaker`
   - Added native code-object IDs:
     - `ai-paths.node-code-object.audio_oscillator.v3`
     - `ai-paths.node-code-object.audio_speaker.v3`

2. Guardrail regression expansion:
   - `src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts`
   - Updated remaining server-only node set to remove audio families.
   - Added positive native execution coverage for:
     - `audio_oscillator`
     - `audio_speaker`

3. Documentation alignment:
   - `docs/ai-paths/node-code-objects-v3.md`
   - `docs/ai-paths/node-code-objects-v3/README.md`
   - Updated client-native subset and remaining server-only family lists.

## Validation

1. Runtime guardrail suites:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/server-native-code-object-registry-coverage.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.edge-sanitization.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-server.runtime-kernel.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/node-code-object-v3-legacy-bridge.test.ts`
   - Result: pass.

2. Docs contract check:
   - `npm run docs:ai-paths:node-code-v3:check`
   - Result: pass.

## Outcome

- Client-native runtime now includes audio oscillator/speaker families.
- Remaining server-only families are further reduced and explicitly tracked by contract-subset guardrails.
