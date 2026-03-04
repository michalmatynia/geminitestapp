# Canonical Migration Inventory (2026-03-04)

## Scope

Goal: migrate feature surfaces to their canonical latest contracts and remove runtime legacy compatibility paths.

## Wave Plan

1. AI Paths
2. Case Resolver
3. Observability
4. Validation Patterns
5. Folder Tree / CMS
6. Integrations / Prompt Exploder

## Inventory Snapshot

| Feature | Canonical Target | Legacy Compatibility Surface | Status |
| --- | --- | --- | --- |
| AI Paths | `ai_paths_index` + `ai_paths_config_*` + strict runtime config sanitization | `ai_paths_validation_v1` read in settings hydration; cross-provider cancel fallback lookup | Completed |
| Case Resolver | `case_resolver_workspace_v2` + detached sidecar schema v2 + latest folder-tree instance contracts | migrate node-file snapshot contract from `case_resolver_node_file_snapshot_v1` to `case_resolver_node_file_snapshot_v2`; prune detached sidecar schema v1 runtime acceptance | Completed |
| Observability | shared `src/shared/lib/observability/*` + strict check gate | mostly already removed; guardrails active | Completed |
| Validation Patterns | validator pattern v2 contract + canonical runtime-config payload shape | remove migration `compat-only` mode and prune runtime config alias compatibility (`replacementPath`, `value`/`expected`, root DB payload keys) | Completed |
| Folder Tree / CMS | master folder-tree profile v2 per-instance keys | legacy combined profile payload migration logic | Completed |
| Integrations / Prompt Exploder | v2 routes/contracts only | legacy payload adapters and compat tests in selected areas | Completed |
| Auth Security | MFA/auth secret encryption uses dedicated auth key contract | runtime fallback from `AUTH_ENCRYPTION_KEY` to integration key | Completed |
| Prompt Exploder Persistence | canonical-only prompt exploder runtime identifiers | legacy persisted-setting migration module and alias constants | Completed |
| Prompt Exploder Runtime Scope | snake_case runtime scope contract only | mixed runtime-scope alias acceptance (`case-resolver-prompt-exploder`) | Completed |

## Executed Item 1 (AI Paths)

- Removed legacy settings hydration key read: `ai_paths_validation_v1`.
- Removed cross-provider run-cancel fallback lookup; cancel now uses only canonical resolved repository provider.
- Added regression test to prevent requesting `ai_paths_validation_v1` during hydration.

## Executed Item 2 (Case Resolver)

- Migrated node-file snapshot contract kind to `case_resolver_node_file_snapshot_v2`.
- Updated Case Resolver runtime + tests to use canonical `v2` kind only.

## Executed Item 3 (Validation Patterns)

- Removed `--compat-only` legacy mode from `migrate-validator-pattern-feature-v2`.
- Kept migration behavior canonical-only (full pattern rewrite + list normalization).

## Executed Item 4 (AI Paths Guardrails)

- Added canonical guardrail script: `scripts/ai-paths/check-canonical.mjs`.
- Wired npm script: `ai-paths:check:canonical`.
- Added dedicated CI job in `.github/workflows/test-matrix.yml` to run guardrail checks on every push/PR.

## Executed Item 5 (Observability Legacy Prune)

- Removed legacy AI-path observability compatibility shims:
  - `src/shared/lib/observability/ai-path-run-static-context.ts`
  - `src/shared/lib/observability/runtime-context/adapters/ai-path-run.ts`
- Removed obsolete compatibility shim test:
  - `__tests__/shared/lib/observability/ai-path-run-static-context.test.ts`
- Tightened observability guardrails:
  - `scripts/observability/check-observability.mjs` now blocks legacy shim imports and file reintroduction.
  - Added regression test in `scripts/observability/check-observability.test.ts`.
- Hardened canonical CI script:
  - `test:ci` now runs `npm run observability:check`.

## Executed Item 6 (Folder Tree / CMS Canonical Prune)

- Promoted CMS page-builder runtime to canonical-only behavior (no runtime auto-migration):
  - Grid runtime reducers now act only on canonical grid structures.
  - Strict hidden-state normalization (`isHidden` must be boolean true to be treated as hidden).
  - Template stores now keep only canonical records and drop malformed/legacy entries.
- Added CMS migration helpers/tests to keep migration-only compatibility outside runtime:
  - `src/features/cms/migrations/page-builder-template-contract-migration.ts`
  - `src/features/cms/migrations/__tests__/page-builder-runtime-prune.test.ts`
  - `src/features/cms/migrations/__tests__/page-builder-template-contract-migration.test.ts`
- Added Folder Tree runtime prune guard:
  - `src/shared/utils/__tests__/folder-tree-runtime-prune.test.ts`
  - Blocks reintroduction of aggregate legacy profile tokens/helpers (`folder_tree_profiles_v2`, `FOLDER_TREE_PROFILES_V2_SETTING_KEY`, `parseFolderTreeProfilesV2`, `coerceProfileV2`) in runtime `src/`.

## Executed Item 7 (Integrations / Prompt Exploder Canonical Prune)

- Promoted Base integration export warehouse settings to canonical exports namespace only:
  - added `/api/v2/integrations/exports/base/export-warehouse`
  - removed legacy `/api/v2/integrations/imports/base/export-warehouse` runtime route path.
- Removed default export-connection runtime fallback resolution; handler now serves canonical stored setting only.
- Migrated Base import parameter link-map preference parsing/writing to canonical scoped v2 contract.
- Pruned Prompt Exploder runtime legacy adapters/retries and added runtime guard tests.

## Executed Item 8 (Case Resolver Detached Sidecar Contract v2)

- Promoted detached payload schemas to canonical `v2`:
  - `case_resolver_workspace_detached_history_v2`
  - `case_resolver_workspace_detached_documents_v2`
- Tightened runtime parsing to require explicit canonical schema and reject legacy/schema-less payloads.
- Added migration helper + DB migration script:
  - `src/features/case-resolver/workspace-detached-contract-migration.ts`
  - `scripts/db/migrate-case-resolver-workspace-detached-contract-v2.ts`
- Added regression guards/tests for runtime legacy token reintroduction and legacy payload rejection.

## Executed Item 9 (Validation Patterns Runtime Canonical Prune)

- Promoted validator runtime config schema to canonical payload-only form:
  - removed legacy aliases in runtime config contracts (`replacementPath`, `value`, `expected`)
  - removed root-level DB payload alias support (`collection`, `query`, `provider`, etc.) in favor of `payload`.
- Updated runtime evaluation path to use canonical config keys only (no alias fallback reads).
- Extended validator migration script to canonicalize legacy runtime config aliases into canonical payload shape during migration writes:
  - `scripts/db/migrate-validator-pattern-feature-v2.ts`
- Removed validator scope fallback coupling from runtime/API/repository/UI paths:
  - `replacementAppliesToScopes` and `launchAppliesToScopes` now normalize independently, without fallback to `appliesToScopes`.
  - runtime scope checks now use canonical two-argument gates only (no third-argument fallback).
- Added runtime prune guard tests to block alias reintroduction:
  - `src/features/products/validations/__tests__/runtime-prune.test.ts`
  - `__tests__/features/products/validations/validator-runtime-config.test.ts`

## Executed Item 10 (Auth Encryption Canonical Key Prune)

- Removed auth secret encryption fallback to integration key:
  - `encryptAuthSecret` / `decryptAuthSecret` now require `AUTH_ENCRYPTION_KEY` only.
- Removed fallback-env support from generic encryption helpers to keep key resolution explicit.
- Added `AUTH_ENCRYPTION_KEY` to shared env schema for canonical config discoverability.
- Added auth regression test to prevent reintroducing fallback to `INTEGRATION_ENCRYPTION_KEY`.

## Executed Item 11 (Prompt Exploder Persistence Legacy Prune)

- Removed legacy persistence migration module and migration-only tests:
  - `src/features/prompt-exploder/persistence-contract-migration.ts`
  - `src/features/prompt-exploder/__tests__/persistence-contract-migration.test.ts`
- Removed legacy alias exports from prompt exploder migration contract declarations:
  - `PROMPT_EXPLODER_LEGACY_VALIDATION_STACK_ALIASES`
  - `PROMPT_EXPLODER_LEGACY_BRIDGE_SOURCE_ALIASES`
  - `PROMPT_EXPLODER_LEGACY_BRIDGE_TARGET_ALIASES`
- Retired obsolete DB migration entrypoint and npm script:
  - `scripts/db/migrate-prompt-exploder-contract-v2.ts`
  - `migrate:prompt-exploder:contract:v2`
- Updated runbook to reflect hard-cut canonical persistence posture.

## Executed Item 12 (Prompt Exploder Runtime Scope Alias Prune)

- Removed mixed-format runtime scope acceptance in orchestrator:
  - case-resolver runtime scope is now matched only as canonical `case_resolver_prompt_exploder`.
- Extended runtime prune guard to block reintroduction of hyphenated runtime scope alias checks in runtime source.

## Executed Item 12 (AI Paths Trigger API Compatibility Prune)

- Removed trigger-buttons API client compatibility wrappers:
  - removed `triggerButtonsApi.remove` alias; canonical deletion now uses `triggerButtonsApi.delete`
  - removed reorder overload compatibility (`string[]` and `buttonIds`) and kept canonical payload `{ orderedIds: string[] }`
- Updated AI Paths Trigger Buttons admin page runtime callsites to canonical signatures.
- Extended `scripts/ai-paths/check-canonical.mjs` guardrails to block reintroduction of trigger-button compatibility snippets in `src/shared/lib/ai-paths/api/client.ts`.

## Next Item

Continue opportunistic canonicalization in remaining non-critical surfaces outside the current wave plan.
