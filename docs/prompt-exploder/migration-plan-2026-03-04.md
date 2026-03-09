---
owner: 'Prompt Exploder Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'plan'
scope: 'feature:prompt-exploder'
canonical: true
---

# Prompt Exploder Migration Plan (Newest Version, Legacy Prune)

Date: 2026-03-04
Owner: Prompt Exploder + Validator maintainers

Status update (2026-03-04):

- Phase 0 and Phase 1 delivered (contract constants, telemetry baseline, persistence migration script/tests).
- Runtime hard cutover delivered:
  - orchestrator canary/env override removal,
  - strict canonical stack resolution,
  - strict retry/fallback path removal,
  - parser runtime stricter compile behavior.
- Bridge runtime alias normalization removed; canonical payloads are now required at runtime.
- Post-cutover legacy cleanup delivered:
  - obsolete persistence migration runtime helper and migration script removed from active toolchain.

## Goal

Migrate Prompt Exploder to a single modern runtime contract and remove legacy compatibility paths (alias scopes, fallback runtime recovery, bridge payload back-compat, and rollout toggles that keep old behavior alive).

## Assumption

- Newest canonical form should be one naming/runtime contract across Prompt Exploder, Case Resolver, and Image Studio.
- Recommendation: use hyphenated stack/target identifiers as canonical in runtime-facing interfaces and remove mixed snake_case/hyphen support.
- If product/API constraints require snake_case as canonical, keep the same plan but invert mapping direction in Phase 1.

## Current Legacy Surfaces (to remove)

1. Orchestrator rollout/canary split in `feature-flags`.
2. Validation stack aliasing and fallback reasons (`scope_fallback`, `default_scope`, `invalid_stack`).
3. Runtime strict-mode bypass/retry in settings data flow.
4. Parser runtime default-fallback behavior for missing stack patterns.
5. Bridge source/target dual-format acceptance and missing-target compatibility behavior.
6. Settings parser deprecated-key recovery path that silently re-defaults.

## Migration Sequence (PR-by-PR)

### Phase 0: Contract Freeze + Telemetry Baseline (PR1)

Scope:

- Define the canonical IDs and publish a mapping table old -> new.
- Freeze schema/runtime version labels (single target version).
- Baseline fallback usage before removal.

Code/doc targets:

- `src/shared/contracts/prompt-exploder-core.ts`
- `src/shared/contracts/prompt-exploder/base.ts`
- `src/shared/contracts/prompt-exploder/bridge.ts`
- `src/shared/contracts/prompt-exploder/settings.ts`
- `docs/PROMPT_EXPLODER_FEATURE_DOCUMENTATION.md`
- `docs/PROMPT_EXPLODER_OPERATIONS_RUNBOOK.md`

Deliverables:

- Canonical contract decision recorded in docs.
- Temporary telemetry counters/dashboards for legacy path usage (must trend to zero before hard cut).

Exit criteria:

- Team sign-off on canonical naming and runtime contract.
- Legacy usage visibility available in logs/metrics.

### Phase 1: Persistence/Data Migration (PR2)

Scope:

- Migrate persisted Prompt Exploder settings and bridge payload records to canonical IDs.
- Remove/deprecate persisted keys that only exist for back-compat.

Code targets:

- `src/features/prompt-exploder/settings.ts`
- `src/shared/contracts/prompt-exploder/settings.ts`
- `src/shared/contracts/prompt-exploder/bridge.ts`
- Add one migration script in `scripts/` (project convention) for settings/payload rewrite.

Deliverables:

- Idempotent migration script with dry-run and apply modes.
- Migration report: records scanned, updated, skipped, invalid.
- Historical script entrypoint (retired after cutover): `scripts/db/migrate-prompt-exploder-contract-v2.ts`

Exit criteria:

- 100% of active records in canonical format.
- No new writes in legacy format.

### Phase 2: Runtime Hard Cutover (PR3)

Scope:

- Remove runtime compatibility logic and force strict behavior.
- Remove canary/rollout branches that preserve old execution.

Code targets:

- `src/features/prompt-exploder/feature-flags.ts`
- `src/features/prompt-exploder/validation-stack.ts`
- `src/features/prompt-exploder/prompt-validation-orchestrator.ts`
- `src/features/prompt-exploder/runtime-guardrails.ts`
- `src/features/prompt-exploder/context/settings/useSettingsDataImpl.ts`
- `src/features/prompt-exploder/parser-runtime-patterns.ts`

Required changes:

- Remove alias acceptance (`prompt_exploder`/`case_resolver_prompt_exploder` alternates if non-canonical).
- Remove strict-retry fallback path (`strictUnknownStack: false` retry).
- Remove default-scope fallback and invalid-stack silent recovery.
- Make parser runtime fail-fast on unknown/invalid stack selection.

Exit criteria:

- Runtime never reports fallback-selected stack.
- No code path can parse/normalize legacy IDs at runtime.

### Phase 3: Bridge + Integration Cutover (PR4)

Scope:

- Enforce canonical bridge payload contract at all integration boundaries.
- Remove compatibility parsing and inferred target behavior.

Code targets:

- `src/features/prompt-exploder/bridge.ts`
- `src/features/prompt-exploder/context/DocumentContext.tsx`
- Case Resolver handoff/return integration points using Prompt Exploder bridge payloads.

Required changes:

- `source` and `target` must be explicit canonical values.
- Reject legacy payload variants with actionable errors.
- Update integration emitters to only send canonical values.

Exit criteria:

- Case Resolver and Image Studio round-trip works with canonical payload only.
- Legacy payload fixtures removed from tests.

### Phase 4: Test Suite Realignment + Legacy Prune (PR5)

Scope:

- Update tests to match strict non-compat runtime.
- Remove dead code, dead docs, and stale env flags.

Test targets:

- `src/features/prompt-exploder/__tests__/bridge.test.ts`
- `src/features/prompt-exploder/__tests__/runtime-guardrails.test.ts`
- `src/features/prompt-exploder/__tests__/settings.test.ts`
- `src/features/prompt-exploder/__tests__/prompt-exploder-runtime-contexts.test.tsx`
- `src/features/prompt-exploder/__tests__/case-resolver-extraction.test.ts`
- Add migration-script tests (unit + smoke).

Cleanup targets:

- `docs/PROMPT_EXPLODER_MASTER_PLAN.md` (add migration completion note)
- `docs/PROMPT_EXPLODER_OPERATIONS_RUNBOOK.md`
- `docs/case-resolver/runbooks/prompt-exploder-capture-handoff.md`

Exit criteria:

- All Prompt Exploder tests pass with legacy compat removed.
- No remaining references to removed legacy IDs/flags in runtime code.

## Release Strategy

1. Deploy PR1 + PR2 first and run migration in dry-run then apply mode.
2. Observe for one release window: legacy-usage metrics must stay at zero after migration apply.
3. Deploy PR3 + PR4 hard cutover.
4. Deploy PR5 cleanup once production confirms zero legacy payload/errors.

## Rollback Strategy

- Primary rollback: deploy previous release artifact.
- Data rollback: migration script must emit reversible mapping log for updated records.
- No long-lived runtime fallback flag should remain after cutover.

## Acceptance Criteria (Program-Level)

1. Prompt Exploder uses one canonical scope/stack/bridge contract end-to-end.
2. Runtime fallback compatibility paths are deleted (not just disabled).
3. Case Resolver and Image Studio integrations operate without legacy translation.
4. Tests and runbooks document only canonical behavior.
5. Production telemetry confirms zero legacy-format traffic after cutover.
