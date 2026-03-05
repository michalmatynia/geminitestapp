# Step 63 Execution: Rollout Approvals + v3 Resolver Hook

Date: 2026-03-05

## Objective

Improve robustness of the portable engine migration by:

1. Introducing an explicit rollout-approval workflow (instead of auto-approving all pilot nodes).
2. Starting direct v3 execution support via a runtime-kernel code-object handler hook with legacy fallback.

## Implemented

1. Rollout-approval contract:
   - `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`
   - Added schema-backed source of truth:
     - `schemaVersion: ai-paths.node-migration-rollout-approvals.v1`
     - `approvedNodeTypes: []` (initially empty)

2. Rollout-approval loader:
   - `scripts/docs/node-migration-rollout-approvals.ts`
   - Added typed summary loader used by docs generation/checking.

3. Migration docs generator/check integration:
   - `scripts/docs/generate-ai-paths-node-migration-docs.ts`
   - `scripts/docs/check-ai-paths-node-migration-docs.ts`
   - `migrationChecklistTemplate.rolloutApproved` now derives from `rollout-approvals.json`.
   - `migration-index.json` now includes `rolloutApprovals` summary block.
   - `MIGRATION_GUIDE.md` now includes `## Rollout Approvals`.
   - Per-node sheets include rollout-approval status line with source-file reference.
   - Check script validates:
     - rollout-approvals schema/source/summary linkage
     - approved-node type validity and pilot membership
     - per-node rollout status line consistency

4. Rollout-approval regression tests:
   - `__tests__/scripts/docs/node-migration-rollout-approvals.test.ts`
   - Extended script:
     - `test:ai-paths:node-migration-parity-evidence` now runs both parity-evidence and rollout-approval tests.

5. Runtime-kernel direct v3 resolver hook (migration bridge step):
   - `src/shared/lib/ai-paths/core/runtime/node-runtime-kernel.ts`
   - Added optional `resolveCodeObjectHandler({ nodeType, codeObjectId })`.
   - Resolution order:
     - explicit override handler
     - direct code-object handler (for `code_object_v3` node types)
     - legacy handler fallback
   - This enables staged adoption of executable v3 handlers without breaking parity-safe fallback.

6. Runtime-kernel tests:
   - `src/shared/lib/ai-paths/core/runtime/__tests__/node-runtime-kernel.test.ts`
   - Added coverage for:
     - preferring direct code-object handler for pilot types
     - fallback to legacy handler when no direct code-object handler exists

## Validation

1. Runtime-kernel tests:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/node-runtime-kernel.test.ts`
   - Result: pass.

2. Migration docs/contracts generation:
   - `npm run docs:ai-paths:node-migration:generate`
   - Result: pass.

3. Rollout/parity tests:
   - `npm run test:ai-paths:node-migration-parity-evidence`
   - Result: pass.

4. Canonical AI-Paths gate:
   - `npm run ai-paths:check:canonical`
   - Result: pass.

## Outcome

- Runtime strategy coverage remains:
  - `legacy_adapter=0`, `code_object_v3=36`
- Readiness now correctly reflects manual rollout gating:
  - `rollout_candidate=36`, `rollout_approved=0`
  - blocker: `rollout_not_approved` (until approvals are added to `rollout-approvals.json`)
- Direct v3 handler execution path is now scaffolded in runtime kernel with safe legacy fallback.
