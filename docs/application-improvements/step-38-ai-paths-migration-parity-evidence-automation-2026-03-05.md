---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 38 Execution: AI-Paths Migration Parity-Evidence Automation

Date: 2026-03-05

## Objective

Improve migration-readiness robustness by replacing hardcoded parity status with explicit, test-backed parity evidence that is validated by migration-doc generation/check scripts.

## Implemented

1. Added shared parity-evidence loader:
   - `scripts/docs/node-migration-parity-evidence.ts`
   - Provides normalized summary:
     - source file/path
     - schema version
     - suite count + suite IDs
     - validated node types
     - `suiteIdsByNodeType`

2. Added parity evidence artifact:
   - `docs/ai-paths/node-code-objects-v3/parity-evidence.json`
   - Schema: `ai-paths.node-migration-parity-evidence.v1`
   - Includes `v3-pilot-parity-core` evidence from:
     - `src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.v3-pilot-parity.test.ts`
   - Tracks validated pilot node types:
     - `constant, context, mapper, math, mutator, parser, regex, string_mutator, template`

3. Updated migration docs generator:
   - `scripts/docs/generate-ai-paths-node-migration-docs.ts`
   - `migrationChecklistTemplate.dualRunParityValidated` is now computed from parity evidence.
   - Per-node row now includes `parityEvidenceSuiteIds`.
   - `migration-index.json` now includes top-level `parityEvidence` summary.
   - Per-node migration sheets include `Parity evidence suite IDs`.
   - `MIGRATION_GUIDE.md` includes `Parity Evidence` section and parity-evidence input source.

4. Updated migration docs checker:
   - `scripts/docs/check-ai-paths-node-migration-docs.ts`
   - Requires parity-evidence file existence and schema version.
   - Validates per-node `parityEvidenceSuiteIds` against evidence source.
   - Validates checklist booleans against derived expected values.
   - Computes expected readiness from derived checklist (not raw row booleans).
   - Validates `migration-index.json.parityEvidence` summary and guide parity section.

5. Updated migration docs overview references:
   - `docs/ai-paths/node-code-objects-v3.md`
   - `docs/ai-paths/node-code-objects-v3/README.md`

## Validation

1. Regeneration:
   - `npm run docs:ai-paths:node-migration:generate`
   - Result: pass.

2. Contract checks:
   - `npm run docs:ai-paths:node-migration:check`
   - Result: pass.

3. Pilot parity suite:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.v3-pilot-parity.test.ts`
   - Result: pass.

## Outcome

- `parity_not_validated` blocker is no longer a static default for pilot nodes.
- Readiness now reflects explicit evidence contracts.
- Current migration blocker profile shifted to:
  - `missing_v3_scaffold: 27`
  - `not_in_v3_pilot: 27`
  - `rollout_not_approved: 9`
- Average readiness increased to `49/100` with the same pilot coverage footprint.
