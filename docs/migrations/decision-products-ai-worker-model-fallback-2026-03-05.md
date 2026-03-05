# Decision Record: `products-ai-worker-model-fallback` (2026-03-05)

Date: 2026-03-05  
Status: Accepted + Implemented (2026-03-05)  
Owner: products  
Reviewers: platform-architecture, ai-paths  
Backlog ID: `products-ai-worker-model-fallback`

## Context

The graph-model worker currently contains a compatibility branch in:

- `src/features/products/workers/product-ai-processors.ts`

When `resolveAiPathsNodeExecutionConfig` fails for AI Paths jobs, runtime falls back to node-selected `modelId` and emits `brainFallbackReason`. This preserves pre-canonical behavior but weakens the canonical contract where model resolution should come from AI Brain routing.

## Decision

1. Remove the legacy fallback branch in `processGraphModel` for `source === 'ai_paths'`.
2. Require canonical Brain resolution for AI Paths model execution.
3. Remove `brainFallbackReason` from the returned graph-model runtime payload.
4. Treat missing Brain assignment as a hard configuration error that fails fast.

## Rationale

1. Canonical contracts must be deterministic and single-source for model selection.
2. Silent runtime fallback hides misconfiguration and delays operational fixes.
3. Existing backlog classifies this path as `compatibility_behavior` with high severity.

## Implementation Scope

1. Update `src/features/products/workers/product-ai-processors.ts`:
   - Remove compatibility `catch` fallback block.
   - Keep only canonical failure behavior.
2. Update tests:
   - `src/features/products/workers/__tests__/product-ai-processors.graph-model.test.ts`
3. Add guardrails:
   - Add/extend canonical token checks to prevent reintroduction of fallback wording/logic.
   - Keep backlog entry status in sync.

## Rollback Plan

1. Revert the hard-cut commit if critical production regression is detected.
2. Use explicit rollback PR only; do not reintroduce hidden runtime fallback paths.
3. If temporary compatibility is reintroduced, add a same-PR exception entry with sunset date.

## Acceptance Criteria

1. AI Paths graph-model execution fails when Brain config is missing, regardless of node payload `modelId`.
2. No `brainFallbackReason` compatibility output for this path.
3. Unit tests and canonical guardrails pass:
   - `npm run test:unit`
   - `npm run canonical:check:sitewide`
   - `npm run ai-paths:check:canonical`
