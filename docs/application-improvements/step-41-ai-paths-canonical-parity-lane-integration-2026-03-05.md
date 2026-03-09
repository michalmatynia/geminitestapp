---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 41 Execution: AI-Paths Canonical Parity-Lane Integration

Date: 2026-03-05

## Objective

Promote parity-evidence coverage from optional tooling into canonical AI-Paths quality gates and align canonical manifest rules with the current constant-based enqueue event contract.

## Implemented

1. Canonical docs-check chain now includes parity-evidence regression lane:
   - `package.json`
   - Updated:
     - `docs:ai-paths:node-docs:check`
   - Added execution of:
     - `npm run test:ai-paths:node-migration-parity-evidence`
   - Effect:
     - `ai-paths:check:canonical` now enforces parity-evidence regression automatically via inherited docs-check chain.

2. Canonical manifest contract updated for enqueue event constants/parser:
   - `scripts/ai-paths/legacy-prune-manifest.json`
   - Updated rule:
     - `run_enqueued_event_contract`
   - Required snippets now match current implementation:
     - constant-based event name dispatch/listener (`AI_PATH_RUN_ENQUEUED_EVENT_NAME`)
     - parser-based payload handling (`parseAiPathRunEnqueuedEventPayload`)
   - This removes false negatives caused by outdated literal-snippet expectations.

3. Documentation updates for explicit parity test lane usage:
   - `docs/ai-paths/node-code-objects-v3.md`
   - `docs/ai-paths/node-code-objects-v3/README.md`

## Validation

1. Updated docs-check lane:
   - `npm run docs:ai-paths:node-docs:check`
   - Result: pass.

2. Full canonical AI-Paths gate:
   - `npm run ai-paths:check:canonical`
   - Result: pass.
   - Includes:
     - canonical manifest checks
     - portable-schema-diff strict check
     - semantic/v2/v3 migration checks
     - parity-evidence regression test
     - tooltip coverage
     - kernel-transition readiness

## Outcome

- Parity-evidence regression is now part of canonical enforcement, not a side lane.
- Canonical manifest checks are aligned to current enqueue contract architecture.
- End-to-end canonical AI-Paths quality chain is green with the stricter parity policy in place.
