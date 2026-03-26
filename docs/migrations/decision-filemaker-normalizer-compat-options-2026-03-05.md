---
owner: 'Platform Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'decision'
scope: 'cross-feature'
canonical: true
---

# Decision Record: `filemaker-normalizer-compat-options` (2026-03-05)

Date: 2026-03-05  
Status: Accepted + Implemented (2026-03-05)  
Owner: filemaker  
Reviewers: case-resolver, platform-architecture  
Backlog ID: `filemaker-normalizer-compat-options`

This document is the retained hard-cut decision record from the 2026-03-05
execution wave. For the active stabilization and closeout state, use
[`wave-execution-status-2026-04-17.md`](./wave-execution-status-2026-04-17.md),
[`stabilization-window-2026-04-17.md`](./stabilization-window-2026-04-17.md),
and [`docs/plans/canonical-closeout-2026-04-17.md`](../plans/canonical-closeout-2026-04-17.md).

## Context

`normalizeFilemakerDatabase` currently supports compatibility options:

- `rejectLegacyInlinePayloads?: boolean`
- `stripCompatibilityFields?: boolean`

in:

- `src/features/filemaker/filemaker-settings.database.ts`

The options increase behavioral variance and preserve a compatibility control surface in runtime normalization.

## Decision

1. Move Filemaker runtime normalization to strict canonical behavior by default.
2. Remove compatibility options from the exported runtime-normalization surface.
3. Keep persistence-specific cleanup in dedicated persistence path (`toPersistedFilemakerDatabase`) rather than generic runtime options.
4. Preserve unsupported-shape validation errors for inline legacy payload fields.

## Rationale

1. Canonical runtime contracts should not depend on opt-in compatibility flags.
2. Option-driven behavior makes enforcement and debugging harder across call sites.
3. Persisted-shape cleanup is a storage concern and should remain explicit and isolated.

## Implementation Scope

1. Refactor `src/features/filemaker/filemaker-settings.database.ts`:
   - Remove or internalize option flags from public API.
   - Keep strict unsupported-field validation.
   - Keep persistence cleanup in `toPersistedFilemakerDatabase`.
2. Update call sites that depend on options:
   - `src/features/filemaker/settings/database-getters.ts`
   - Other Filemaker settings/update/removal flows.
3. Update tests:
   - `src/features/filemaker/__tests__/settings.test.ts`
   - Additional call-site behavior tests if needed.

## Rollback Plan

1. Revert the refactor commit if strict mode introduces blocking regressions.
2. If temporary compatibility paths are restored, require exception-register entry with owner and sunset date.

## Acceptance Criteria

1. Runtime normalization no longer exposes compatibility option flags.
2. Legacy inline payloads remain rejected with canonical unsupported-field errors.
3. Persisted payloads continue to be stripped to canonical shape.
4. Filemaker unit tests and canonical checks pass:
   - `npm run test:unit`
   - `npm run canonical:check:sitewide`

## Verification Snapshot (2026-03-05)

1. Runtime API is canonical-only in:
   - `src/features/filemaker/filemaker-settings.database.ts`
   - `src/features/filemaker/settings/database-getters.ts`
2. Targeted test passed:
   - `npx vitest run src/features/filemaker/__tests__/settings.test.ts`
3. Canonical guardrails passed:
   - `npm run canonical:check:sitewide`
   - `npm run observability:check`
