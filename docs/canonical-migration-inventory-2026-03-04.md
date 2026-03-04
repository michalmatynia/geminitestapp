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
| Base Token Storage | canonical Base token source in `baseApiToken` | legacy runtime fallback to `password` for Base API auth | Completed |
| Base Token Encryption | canonical encrypted `baseApiToken` values | runtime acceptance of plaintext Base API tokens | Completed |
| Tradera API Credentials | canonical `traderaApiAppKey` + `traderaApiToken` fields | runtime fallback from Tradera API credentials to `password` | Completed |
| Tradera API User ID | canonical `traderaApiUserId` field | runtime fallback from Tradera API user ID to `username` | Completed |
| Auth Security | MFA/auth secret encryption uses dedicated auth key contract | runtime fallback from `AUTH_ENCRYPTION_KEY` to integration key | Completed |
| Prompt Exploder Persistence | canonical-only prompt exploder runtime identifiers | legacy persisted-setting migration module and alias constants | Completed |
| Prompt Exploder Runtime Scope | snake_case runtime scope contract only | mixed runtime-scope alias acceptance (`case-resolver-prompt-exploder`) | Completed |
| Image Studio Fingerprints | canonical runtime fingerprint mode markers | legacy `_v1` fingerprint mode identifiers (`object_layout_v1`, `auto_scaler_v1`) | Completed |

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

## Executed Item 12 (AI Paths Trigger API Compatibility Prune)

- Removed trigger-buttons API client compatibility wrappers:
  - removed `triggerButtonsApi.remove` alias; canonical deletion now uses `triggerButtonsApi.delete`
  - removed reorder overload compatibility (`string[]` and `buttonIds`) and kept canonical payload `{ orderedIds: string[] }`
- Updated AI Paths Trigger Buttons admin page runtime callsites to canonical signatures.
- Extended `scripts/ai-paths/check-canonical.mjs` guardrails to block reintroduction of trigger-button compatibility snippets in `src/shared/lib/ai-paths/api/client.ts`.

## Executed Item 13 (Prompt Exploder Runtime Scope Alias Prune)

- Removed mixed-format runtime scope acceptance in orchestrator:
  - case-resolver runtime scope is now matched only as canonical `case_resolver_prompt_exploder`.
- Extended runtime prune guard to block reintroduction of hyphenated runtime scope alias checks in runtime source.

## Executed Item 14 (Image Studio Fingerprint Marker Prune)

- Removed legacy `_v1` fingerprint mode markers from runtime utilities:
  - `object_layout_v1` -> `object_layout`
  - `auto_scaler_v1` -> `auto_scaler`
- Added runtime prune guard test to block reintroduction of legacy markers:
  - `src/features/ai/image-studio/server/__tests__/fingerprint-runtime-prune.test.ts`

## Executed Item 15 (Prompt Exploder + CMS Compatibility Retirement)

- Prompt Exploder scope-coupling compatibility removed in regex rule factory:
  - `launchAppliesToScopes` now defaults independently to canonical prompt scope and no longer falls back to `appliesToScopes`.
- Added Prompt Exploder guard coverage:
  - `src/features/prompt-exploder/__tests__/rules-base.test.ts`
  - extended `src/features/prompt-exploder/__tests__/runtime-prune.test.ts` to block reintroduction of launch-scope fallback coupling.
- Retired CMS page-builder migration-only compatibility modules and entrypoints:
  - removed migration helpers:
    - `src/features/cms/migrations/page-builder-contract-migration.ts`
    - `src/features/cms/migrations/page-builder-template-contract-migration.ts`
  - removed migration-only tests tied to those helpers:
    - `src/features/cms/migrations/__tests__/page-builder-contract-migration.test.ts`
    - `src/features/cms/migrations/__tests__/page-builder-template-contract-migration.test.ts`
  - removed obsolete npm scripts and DB migration entrypoints:
    - `migrate:cms:page-builder:v2`
    - `migrate:cms:page-builder-templates:v2`
    - `scripts/db/migrate-cms-page-builder-contract-v2.ts`
    - `scripts/db/migrate-cms-page-builder-templates-contract-v2.ts`

## Executed Item 16 (Prompt Exploder Validation Stack Contract Cutover)

- Promoted Prompt Exploder `validationRuleStack` contract to canonical string-only form:
  - removed object-form stack acceptance from settings/runtime schemas.
  - removed runtime object-stack normalization branches (`parseStoredValidationRuleStack`, `stack.id` fallbacks).
- Updated Prompt Exploder UI/runtime callsites to canonical stack-id-only behavior.
- Extended regression coverage:
  - added settings test that rejects object-form `validationRuleStack`.
  - updated segmentation context tests to assert canonical custom stack-id persistence only.
  - expanded runtime prune guard tokens to block object-form stack helper reintroduction.

## Executed Item 17 (AI Paths Database Query Fallback Prune)

- Removed runtime legacy database-node query fallback:
  - `normalizeDatabaseNode` now reads only canonical `config.database.query`.
  - legacy top-level `config.dbQuery` is no longer consumed at runtime.
- Added normalization regression coverage:
  - `src/shared/lib/ai-paths/core/normalization/__tests__/database-node-normalization.test.ts`
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of database-node `dbQuery` compatibility snippets in runtime normalization.

## Executed Item 18 (AI Paths Collection Migration Compatibility Prune)

- Removed legacy top-level `config.dbQuery` handling from collection alias migration helpers:
  - `migratePathConfigCollections` now canonicalizes collection aliases only in canonical config surfaces (`database.query`, `poll.dbQuery`, `db_schema.collections`).
- Added utility regression tests:
  - `src/shared/lib/ai-paths/core/utils/__tests__/collection-names.test.ts`
  - covers canonical alias migration and guards that top-level `dbQuery` compatibility payloads are ignored.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of top-level `dbQuery` compatibility snippets in `src/shared/lib/ai-paths/core/utils/collection-names.ts`.

## Executed Item 19 (AI Paths Retry Legacy Flag Prune)

- Removed runtime retry compatibility fallback in AI Paths engine:
  - runtime retry policy is now derived from canonical `runtime.retry.attempts` only.
  - legacy `runtime.retry.enabled` fallback read was removed.
- Added retry policy regression coverage:
  - `src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.retry-policy.test.ts`
  - verifies no retry at `attempts: 1` and retry behavior at `attempts > 1`.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of legacy retry-enabled compatibility snippets in `src/shared/lib/ai-paths/core/runtime/engine-core.ts`.

## Executed Item 20 (AI Paths Halt Callback Compatibility Prune)

- Removed runtime halt callback compatibility fallback in engine runtime:
  - `evaluateGraphInternal` now resolves halt callbacks only from canonical `options.onHalt`.
  - legacy lookup in `options.control.onHalt` was removed.
- Migrated runtime callsites to canonical halt callback wiring:
  - `src/features/ai/ai-paths/services/path-run-executor/index.ts`
  - `src/features/ai/ai-paths/components/ai-paths-settings/runtime/segments/useLocalExecutionLoop.ts`
- Added runtime regression coverage:
  - `src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.on-halt-compat.test.ts`
  - verifies canonical `onHalt` invocation and blocks legacy `control.onHalt` behavior.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of legacy halt compatibility snippets in `src/shared/lib/ai-paths/core/runtime/engine-core.ts`.

## Executed Item 21 (AI Paths Trigger-Fetcher Legacy Migration Retirement)

- Removed legacy trigger-to-fetcher auto-migration module from runtime normalization surfaces:
  - removed `src/shared/lib/ai-paths/core/normalization/normalization.edges.ts`
  - removed legacy exports from `src/shared/lib/ai-paths/core/normalization/index.ts`
  - removed migration-only tests `src/shared/lib/ai-paths/core/normalization/__tests__/trigger-fetcher-migration.test.ts`
- Canonical behavior remains strict rejection/sanitization of legacy trigger data edges in runtime path validation and compile passes.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of trigger->fetcher migration module and legacy migration tokens (`migrateTriggerToFetcherGraph`, `TriggerToFetcherMigrationResult`) in runtime source.

## Executed Item 22 (Prompt Exploder + CMS Runtime Legacy Surface Prune)

- Retired Prompt Exploder migration contract export surface from shared contracts:
  - removed `src/shared/contracts/prompt-exploder/migration.ts`
  - removed `export * from './migration'` from `src/shared/contracts/prompt-exploder/index.ts`
- Promoted canonical bridge identifier exports to the canonical bridge contract module:
  - `PROMPT_EXPLODER_CANONICAL_BRIDGE_SOURCES`
  - `PROMPT_EXPLODER_CANONICAL_BRIDGE_TARGETS`
  - sourced directly from `promptExploderBridgeSourceSchema` / `promptExploderBridgeTargetSchema` options in `src/shared/contracts/prompt-exploder/bridge.ts`
- Removed CMS frontend synthetic legacy section-id generation:
  - `src/features/cms/components/frontend/CmsPageRenderer.tsx` now skips malformed components without canonical `content.sectionId` instead of creating `legacy-section-*` ids.
- Added regression guard coverage:
  - `src/features/cms/components/frontend/__tests__/CmsPageRenderer.nested.test.tsx` verifies no render occurs for missing/blank section ids.

## Executed Item 23 (AI Paths DB Query Provider Migration Compatibility Prune)

- Removed legacy database query provider migration helper from runtime normalization:
  - removed `migrateLegacyDbQueryProvider` and `DEFAULT_LEGACY_DB_QUERY_TEMPLATE` from `src/shared/lib/ai-paths/core/normalization/normalization.helpers.ts`.
  - removed `migrateLegacyDbQueryProvider` export from `src/shared/lib/ai-paths/core/normalization/index.ts`.
- Promoted database-node query normalization to canonical-only behavior:
  - `src/shared/lib/ai-paths/core/normalization/nodes/database.ts` now normalizes `queryTemplate` directly from canonical `config.database.query` and no longer rewrites canonical `provider: 'mongodb'` payloads to `provider: 'auto'`.
- Added regression coverage:
  - `src/shared/lib/ai-paths/core/normalization/__tests__/database-node-normalization.test.ts` now verifies canonical mongodb query defaults are preserved without legacy provider auto-migration.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` now blocks runtime reintroduction of `migrateLegacyDbQueryProvider` and `DEFAULT_LEGACY_DB_QUERY_TEMPLATE`.

## Executed Item 24 (Base Token Storage Runtime Compatibility Prune)

- Removed runtime Base API auth fallback to legacy `password` storage:
  - `src/features/integrations/services/base-token-resolver.ts` now resolves only canonical `baseApiToken`.
  - Base API routes/services now pass canonical token carrier shape (`{ baseApiToken }`) and no longer rely on `password`.
- Hardened Base connection selection/runtime checks to require canonical token presence:
  - listing/link flows now prefer connections with `baseApiToken` only.
- Added/updated regression coverage:
  - `__tests__/features/integrations/services/base-token-resolver.test.ts` verifies password fallback is disabled.
  - base import API tests now assert canonical token usage (`baseApiToken`).
- Added canonical migration helper and DB migration script:
  - `src/features/integrations/services/base-token-storage-migration.ts`
  - `__tests__/features/integrations/services/base-token-storage-migration.test.ts`
  - `scripts/db/migrate-base-connection-token-storage-v2.ts`
  - npm script: `migrate:base-connection-token-storage:v2`
- Updated Base connection write paths to keep canonical token field hydrated when saving Base credentials.

## Executed Item 25 (Base Marketplace Token Carrier Canonicalization)

- Removed residual non-canonical resolver callsites in marketplace fetch handlers:
  - `src/app/api/marketplace/categories/fetch/handler.ts`
  - `src/app/api/marketplace/producers/fetch/handler.ts`
  - `src/app/api/marketplace/tags/fetch/handler.ts`
- Each handler now passes canonical token carrier shape to token resolver:
  - `resolveBaseConnectionToken({ baseApiToken: connection.baseApiToken })`
- This completes runtime removal of `resolveBaseConnectionToken(connection)` callsites in source.

## Executed Item 26 (AI Paths Parser Image-Port Alias Compatibility Prune)

- Removed runtime parser image-port alias compatibility from shared port normalization:
  - `src/shared/lib/ai-paths/core/utils/graph.ports.ts` no longer rewrites legacy aliases:
    - `images (urls)`
    - `images(urls)`
    - `image urls`
  - canonical `images` remains the supported output/input port identifier.
- Updated normalization/runtime regression coverage:
  - `src/shared/lib/ai-paths/core/normalization/__tests__/parser-port-normalization.test.ts`
    - now asserts no automatic canonicalization of legacy parser image-port aliases.
  - `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/generation.model-handler.test.ts`
    - prompt-node fixture input ports use canonical `images`.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of legacy parser image-port alias snippets in `src/shared/lib/ai-paths/core/utils/graph.ports.ts`.

## Executed Item 27 (Tradera API Credential Fallback Prune)

- Removed runtime Tradera API credential fallback to legacy `password`:
  - `src/features/integrations/services/tradera-listing/api.ts` now resolves app key/token only from canonical `traderaApiAppKey` and `traderaApiToken`.
  - `src/app/api/v2/integrations/[id]/connections/[connectionId]/test/handler.ts` no longer reads `connection.password` as a fallback for Tradera API app key/token.
- Added runtime prune guard coverage:
  - `__tests__/features/integrations/services/tradera-api-runtime-prune.test.ts` blocks reintroduction of password-fallback snippets.
- Added canonical migration helper and DB migration script:
  - `src/features/integrations/services/tradera-api-credential-storage-migration.ts`
  - `__tests__/features/integrations/services/tradera-api-credential-storage-migration.test.ts`
  - `scripts/db/migrate-tradera-api-credential-storage-v2.ts`
  - npm script: `migrate:tradera-api-credential-storage:v2`

## Executed Item 28 (AI Paths Text-Port Alias Compatibility Prune)

- Removed runtime `text -> value` port alias compatibility from shared port normalization:
  - `src/shared/lib/ai-paths/core/utils/graph.ports.ts` no longer rewrites `text` ports to canonical `value`.
- Updated graph compile sanitization coverage to canonical-only behavior:
  - `src/shared/lib/ai-paths/core/utils/__tests__/graph-compile.test.ts`
    - legacy `toPort: 'text'` edges are now dropped instead of being auto-normalized to `value`.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of `normalized === 'text'` compatibility snippets in `src/shared/lib/ai-paths/core/utils/graph.ports.ts`.

## Executed Item 29 (Base Token Plaintext Compatibility Prune)

- Removed runtime plaintext Base token compatibility in resolver:
  - `src/features/integrations/services/base-token-resolver.ts` now rejects non-encrypted `baseApiToken` values.
  - canonical Base runtime expects encrypted token payloads only.
- Updated regression coverage:
  - `__tests__/features/integrations/services/base-token-resolver.test.ts` now verifies plaintext tokens are rejected.
  - updated Base import route tests to use encrypted canonical tokens.
  - added `__tests__/features/integrations/services/base-token-encryption-migration.test.ts`.
- Added canonical migration helper and DB migration script:
  - `src/features/integrations/services/base-token-encryption-migration.ts`
  - `scripts/db/migrate-base-token-encryption-v2.ts`
  - npm script: `migrate:base-token-encryption:v2`

## Executed Item 30 (AI Paths ProductJson/Simulation Port Alias Compatibility Prune)

- Removed runtime legacy port-name alias rewrites from shared port normalization:
  - `src/shared/lib/ai-paths/core/utils/graph.ports.ts` no longer rewrites:
    - `productjson -> entityJson`
    - `simulation -> context`
- Removed trigger connection compatibility branch tied to legacy simulation port alias:
  - `isValidConnection` now allows simulation->trigger context wiring only via canonical `fromPort: 'context'`.
- Updated graph compile sanitization coverage:
  - `src/shared/lib/ai-paths/core/utils/__tests__/graph-compile.test.ts`
    - legacy `fromPort: 'productjson'` and `fromPort: 'simulation'` edges are now dropped, while canonical `entityJson`/`context` edges remain.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of `productjson`, `simulation`, and legacy simulation-port compatibility snippets in `src/shared/lib/ai-paths/core/utils/graph.ports.ts`.

## Executed Item 31 (Tradera API Execution Mode Compatibility Prune)

- Removed runtime `TRADERA_PREFER_API` compatibility override from Tradera listing orchestration:
  - `src/features/integrations/services/tradera-listing-service.ts` now selects API mode only for canonical `tradera-api` integration slug.
  - non-API Tradera integrations stay on canonical browser execution mode.
- Extended Tradera runtime prune guard coverage:
  - `__tests__/features/integrations/services/tradera-api-runtime-prune.test.ts` now blocks reintroduction of `TRADERA_PREFER_API` and mixed-slug API fallback snippets.

## Executed Item 32 (Tradera API User ID Fallback Prune)

- Removed runtime Tradera API user-id fallback to legacy `username`:
  - `src/features/integrations/services/tradera-listing/api.ts` now resolves user ID only from canonical `traderaApiUserId`.
  - `src/app/api/v2/integrations/[id]/connections/[connectionId]/test/handler.ts` no longer falls back from `traderaApiUserId` to `username`.
- Extended Tradera runtime prune guard coverage:
  - `__tests__/features/integrations/services/tradera-api-runtime-prune.test.ts` now blocks reintroduction of `?? toPositiveInt(connection.username)` fallback snippets.
- Added canonical migration helper and DB migration script:
  - `src/features/integrations/services/tradera-api-user-id-storage-migration.ts`
  - `__tests__/features/integrations/services/tradera-api-user-id-storage-migration.test.ts`
  - `scripts/db/migrate-tradera-api-user-id-storage-v2.ts`
  - npm script: `migrate:tradera-api-user-id-storage:v2`

## Executed Item 33 (CMS Page-Builder Template Settings Key Cutover)

- Migrated page-builder template persistence keys to canonical `v2` runtime settings:
  - `cms_section_templates.v2`
  - `cms_grid_templates.v2`
- Runtime page-builder template reads/writes now target canonical keys only:
  - `src/features/cms/components/page-builder/section-template-store.ts`
  - `src/features/cms/components/page-builder/grid-templates.ts`
- Added canonical migration script to copy/prune legacy key payloads across Prisma and Mongo:
  - `scripts/db/migrate-cms-page-builder-template-settings-v2.ts`
  - npm script: `migrate:cms:page-builder-template-settings:v2`
- Extended CMS runtime prune coverage:
  - `src/features/cms/migrations/__tests__/page-builder-runtime-prune.test.ts` now blocks reintroduction of `cms_section_templates.v1` and `cms_grid_templates.v1` in runtime source.
- Extended page-builder template store tests:
  - `src/features/cms/components/page-builder/__tests__/template-stores.test.ts` now asserts canonical `v2` setting keys.

## Executed Item 34 (Import/Export Legacy Data Migration Verification)

- Executed the full Base import/export migration suite in dry-run and write modes:
  - `migrate:base-connection-token-storage:v2`
  - `migrate:base-token-encryption:v2`
  - `migrate:base-import-parameter-link-map:v2`
  - `migrate:base-import-run-connection-ids:v2`
  - `migrate:base-active-template-preferences:v2`
  - `migrate:base-export-warehouse-preferences:v2`
  - `migrate:base-export-template-parameter-sources:v2`
- Executed Tradera API credential-storage migration in dry-run and write modes:
  - `migrate:tradera-api-credential-storage:v2`
- Result:
  - no pending legacy payload rewrites detected (`changed: false`, `writesApplied: 0` across providers for active migration surfaces, including write-mode runs).
  - providers reported no Base/Tradera-API integration rows where expected (warnings only), with no runtime compatibility reintroduction.
- Re-validated canonical enforcement + prune guardrails:
  - `npm run ai-paths:check:canonical`
  - parity tests: `src/app/api/v2/integrations/{imports/base,exports/base}/routes-parity.test.ts` and `src/app/api/v2/integrations/routes-parity.test.ts`
  - token/credential runtime prune tests:
    - `__tests__/features/integrations/services/base-token-resolver.test.ts`
    - `__tests__/features/integrations/services/base-token-encryption-migration.test.ts`
    - `__tests__/features/integrations/services/tradera-api-runtime-prune.test.ts`
  - TypeScript compile check (`npx tsc --noEmit --incremental false`).

## Executed Item 35 (Tradera API User-ID Migration Verification)

- Executed Tradera API user-id storage migration in dry-run and write modes:
  - `migrate:tradera-api-user-id-storage:v2`
- Result:
  - no pending legacy username->user-id rewrites detected (`changed: false`, `writesApplied: 0` across Prisma and Mongo providers).
  - providers reported no Tradera API integration rows where migration data was expected (warnings only).
- Re-validated runtime prune + migration contracts:
  - `__tests__/features/integrations/services/tradera-api-user-id-storage-migration.test.ts`
  - `__tests__/features/integrations/services/tradera-api-runtime-prune.test.ts`

## Executed Item 36 (Prompt Exploder Rules-Key Compatibility Prune)

- Removed legacy Prompt Exploder settings hydration fallback that read rules from a separate compatibility key:
  - removed runtime read of `PROMPT_ENGINE_SETTINGS_KEY + '_rules'` in `src/features/prompt-exploder/context/settings/useSettingsDataImpl.ts`.
- Runtime now hydrates `sessionLearnedRules` from canonical prompt-engine payload only:
  - `promptSettings.promptValidation.learnedRules`.
- Extended Prompt Exploder runtime prune guardrails:
  - `src/features/prompt-exploder/__tests__/runtime-prune.test.ts` now blocks reintroduction of `_rules`-suffix key fallback usage.

## Executed Item 37 (Prompt Exploder Return-Target Scope Fallback Prune)

- Removed URL return-target based scope-forcing compatibility from settings hydration:
  - `src/features/prompt-exploder/context/settings/useSettingsDataImpl.ts` no longer treats `/admin/case-resolver` return targets as an implicit case-resolver validation-stack preference.
- Canonical scope preference now resolves only from bridge payload source:
  - `incomingBridgeSource === 'case-resolver'`.
- Extended Prompt Exploder runtime prune guardrails:
  - `src/features/prompt-exploder/__tests__/runtime-prune.test.ts` now blocks reintroduction of `incomingBridgeSource === 'case-resolver' || isCaseResolverReturnTarget` fallback coupling.

## Executed Item 38 (Prompt Exploder Legacy Hook Scope Fallback Prune)

- Removed URL return-target fallback coupling from legacy Prompt Exploder hook runtime selection:
  - `src/features/prompt-exploder/hooks/usePromptExploderState.ts` no longer treats `returnTarget === 'case-resolver'` as an implicit case-resolver validation-stack preference.
- Scope preference in that hook is now canonical bridge-source only:
  - `incomingBridgeSource === 'case-resolver'`.
- Extended Prompt Exploder runtime prune guardrails:
  - `src/features/prompt-exploder/__tests__/runtime-prune.test.ts` now blocks reintroduction of `incomingBridgeSource === 'case-resolver' || returnTarget === 'case-resolver'` fallback coupling.

## Executed Item 39 (Prompt Exploder Legacy State Hook Retirement)

- Retired orphaned legacy state hook module:
  - removed `src/features/prompt-exploder/hooks/usePromptExploderState.ts`.
- This removes a duplicate/legacy Prompt Exploder state surface that was no longer imported by runtime codepaths.
- Extended Prompt Exploder runtime prune guardrails:
  - `src/features/prompt-exploder/__tests__/runtime-prune.test.ts` now blocks reintroduction of `export function usePromptExploderState(` in runtime source.

## Executed Item 40 (AI Paths Enqueue Meta Source Compatibility Prune)

- Removed runtime compatibility rewrite for object-shaped enqueue metadata source:
  - `src/app/api/ai-paths/runs/enqueue/handler.ts` now rejects `meta.source` objects with `Invalid enqueue metadata: meta.source must be a string.`
- Added regression coverage:
  - `src/app/api/ai-paths/runs/enqueue/handler.test.ts` verifies object-shaped `meta.source` payloads are rejected and enqueue service is not called.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of enqueue source-object compatibility rewrite snippets.

## Executed Item 41 (AI Paths Queue Run Source Metadata Compatibility Prune)

- Removed queue panel compatibility reads for legacy run-source metadata shapes:
  - `src/features/ai/ai-paths/components/job-queue-panel-utils.ts` now resolves run source from canonical string `meta.source` only.
  - removed object-source tab fallback (`meta.source.tab`), `meta.sourceInfo.tab`, and `tab:*` origin classification.
  - removed `sourceInfo.executionMode` fallback in run execution-kind classification.
- Added/updated regression coverage:
  - `src/features/ai/ai-paths/components/__tests__/job-queue-panel-utils.test.ts`
    - verifies canonical string-source resolution and node-origin classification.
    - verifies object-shaped source/sourceInfo metadata and sourceInfo execution-mode metadata are ignored.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of queue-panel source metadata compatibility snippets.

## Executed Item 42 (AI Paths Run Repository Source-Tab Compatibility Prune)

- Removed legacy source-tab compatibility branches from run-list repository filters:
  - `src/features/ai/ai-paths/services/path-run-repository/prisma-path-run-repository.ts`
    - removed `['source', 'tab']` and `['sourceInfo', 'tab']` filter paths from `buildRunWhere`.
    - `ai_paths_ui` include/exclude source filtering now matches canonical `meta.source` values only.
  - `src/features/ai/ai-paths/services/path-run-repository/mongo-path-run-repository.ts`
    - removed `'meta.source.tab'` and `'meta.sourceInfo.tab'` clauses from `buildRunFilter`.
    - `ai_paths_ui` include/exclude source filtering now matches canonical `'meta.source'` only.
- Added focused regression coverage for source-filter builders:
  - `src/features/ai/ai-paths/services/path-run-repository/__tests__/run-source-filters.canonical.test.ts`
  - verifies Prisma/Mongo `ai_paths_ui` include/exclude filters are canonical and contain no source-tab/sourceInfo fallbacks.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of repository source-tab/sourceInfo compatibility snippets and requires canonical source-filter snippets.

## Executed Item 43 (AI Paths Queue Cache Source-Tab Compatibility Prune)

- Removed legacy run-source metadata fallback parsing from queue-cache filtering:
  - `src/shared/lib/query-invalidation.ts`
  - `resolveRunSource` now reads only canonical string `meta.source`.
  - removed compatibility reads for object-shaped source metadata (`meta.source.tab`) and `meta.sourceInfo.tab`.
  - removed `tab:*` source-prefix classification from `isAiPathsNodeSource`.
- Queue cache source matching now treats node-origin runs as canonical source values only:
  - uses `AI_PATHS_RUN_SOURCE_VALUES` via `AI_PATHS_NODE_SOURCES`.
- Added regression coverage:
  - `__tests__/shared/lib/query-invalidation.test.ts`
    - verifies `source=ai_paths_ui` include filter accepts canonical string-source runs.
    - verifies object-shaped source metadata is no longer treated as node-source for queue cache insertion.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of queue-cache source fallback snippets (`meta.sourceInfo`, object-source parsing, `tab:` handling, `AI_PATHS_RUN_SOURCE_TABS`) and requires canonical source snippets.

## Executed Item 44 (Prompt Exploder Route-Context Compatibility Prune)

- Removed Prompt Exploder runtime fallback to route-derived Case Resolver context during apply:
  - `src/features/prompt-exploder/context/DocumentContext.tsx` no longer reads `returnTo` query-derived `fileId` / `sessionId` as transfer context fallbacks.
  - Case Resolver apply transfer context now resolves from canonical incoming bridge payload context only.
- Removed draft payload consumability coupling to route session metadata:
  - runtime draft hydration now consumes canonical `target === 'prompt-exploder'` payloads without `sessionId` URL compatibility gating.
- Extended Prompt Exploder runtime prune guardrails:
  - `src/features/prompt-exploder/__tests__/runtime-prune.test.ts` now blocks reintroduction of route-context/session fallback tokens and legacy session-gate compatibility pattern.

## Executed Item 45 (AI Paths Run-Source Helper Surface Prune)

- Pruned shared run-source helper surface to canonical value-only APIs:
  - `src/shared/lib/ai-paths/run-sources.ts`
  - removed tab-helper exports:
    - `AI_PATHS_RUN_SOURCE_TABS`
    - `isAiPathsRunSourceTab`
  - retained canonical helpers:
    - `AI_PATHS_RUN_SOURCE_VALUES`
    - `isAiPathsRunSourceValue`
- Removed dead duplicate feature-local run-source helper module:
  - deleted `src/features/ai/ai-paths/lib/run-sources.ts`
- Updated regression coverage:
  - `__tests__/features/ai/ai-paths/lib/run-sources.test.ts` now asserts canonical value-only source classification.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` now enforces:
    - deleted duplicate feature-local run-sources module must remain removed.
    - shared run-sources must not reintroduce tab-helper compatibility exports.

## Executed Item 46 (AI Paths Run-Mode Queue Alias Compatibility Prune)

- Removed runtime run-mode compatibility alias `queue -> automatic` from settings state application flows:
  - `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsPersistence.ts`
  - `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsSettingsPathActions.ts`
- Canonical run-mode normalization now accepts only:
  - `manual`
  - `automatic`
  - `step`
  with non-canonical values defaulting to `manual`.
- Added regression coverage:
  - `src/features/ai/ai-paths/components/ai-paths-settings/__tests__/useAiPathsSettingsPathActions.switch-path.test.tsx`
  - verifies fetched config payloads with `runMode: 'queue'` are normalized via canonical fallback to `setRunMode('manual')`.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of `runMode === 'queue'` compatibility snippets in settings persistence/path-actions runtime files.

## Executed Item 47 (Prompt Exploder Launch Session-Query Compatibility Prune)

- Removed unused Prompt Exploder launch-time `sessionId` query compatibility parameter:
  - `src/features/case-resolver/hooks/useAdminCaseResolverDocumentActions.ts`
  - Case Resolver now navigates to `/admin/prompt-exploder` with canonical `returnTo` only.
- Prompt Exploder runtime session/context resolution remains bridge-payload driven:
  - no route-session query token is required for Prompt Exploder draft hydration or apply context.
- Extended Prompt Exploder runtime prune guardrails:
  - `src/features/prompt-exploder/__tests__/runtime-prune.test.ts` now blocks reintroduction of `searchParams?.get('sessionId')` runtime coupling in Prompt Exploder source.

## Executed Item 48 (AI Paths Runtime Node-Status Run-Alias Compatibility Prune)

- Removed runtime node-status alias mapping for run-only statuses:
  - `src/features/ai/ai-paths/services/path-run-executor.logic.ts`
    - `toRuntimeNodeStatus` no longer maps `paused -> running` or `dead_lettered -> failed`.
  - `src/features/ai/ai-paths/components/ai-paths-settings/runtime/utils.ts`
    - `normalizeNodeStatusForMerge` no longer maps `paused`/`dead_lettered` aliases.
- Hardened runtime snapshot merge behavior to canonical status-only application:
  - `mergeRuntimeNodeOutputsForStatus` now strips raw incoming `status` payloads and re-applies only normalized canonical statuses, preserving previous canonical status when available.
- Added/updated regression coverage:
  - `src/features/ai/ai-paths/services/__tests__/path-run-executor.logic.test.ts` now asserts `paused` and `dead_lettered` are rejected as node statuses.
  - `src/features/ai/ai-paths/components/ai-paths-settings/runtime/__tests__/runtime-utils.test.ts` now asserts alias/unknown incoming statuses are not remapped and do not leak as node status values without canonical prior state.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of runtime node-status alias snippets in:
    - `src/features/ai/ai-paths/services/path-run-executor.logic.ts`
    - `src/features/ai/ai-paths/components/ai-paths-settings/runtime/utils.ts`

## Executed Item 49 (AI Paths Versioned-Settings Key Compatibility Prune)

- Removed hardcoded legacy key special-casing from AI Paths settings API:
  - `src/app/api/ai-paths/settings/handler.ts` no longer contains explicit `ai_paths_index_v1` guard/filter branches.
- Promoted canonical key validation to versioned-key rule enforcement:
  - settings API now rejects versioned keys matching `ai_paths_*_vN` in request/query and write payload paths.
  - canonical unversioned `ai_paths_*` keys remain allowed.
- Updated API regression coverage:
  - `src/app/api/ai-paths/settings/handler.test.ts` now verifies versioned key rejection with canonical guard message and removes legacy index-filter expectations.
- Updated canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` now:
    - forbids runtime references to `ai_paths_index_v1` in all source files.
    - requires canonical versioned-key guard snippets in `src/app/api/ai-paths/settings/handler.ts`.
    - blocks reintroduction of legacy/special-case key snippets (`LEGACY_PATH_INDEX_KEY`, `ai_paths_index_v1`, legacy filter branch) in the settings handler.

## Executed Item 50 (AI Paths Presets Collection-Alias Runtime Migration Prune)

- Removed runtime collection-alias auto-migration from presets normalization:
  - `src/features/ai/ai-paths/context/PresetsContext.tsx`
  - `normalizeDbNodePreset` now stores `normalizeDatabasePresetConfig(raw.config)` directly without calling `migrateDatabaseConfigCollections`.
- Added regression coverage:
  - `src/features/ai/ai-paths/context/__tests__/PresetsContext.normalizeDbNodePreset.test.tsx`
    - verifies legacy alias values like `product_parameter` are not auto-canonicalized during runtime preset normalization.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` now blocks `migrateDatabaseConfigCollections` usage in `PresetsContext.tsx` and requires canonical direct normalization snippet.

## Executed Item 51 (AI Paths Validation-Config Legacy Schema Gating Prune)

- Removed legacy schema-version gating for validation evaluation timestamp normalization:
  - `src/shared/lib/ai-paths/core/validation-engine/defaults.ts`
  - `normalizeAiPathsValidationConfig` now preserves sanitized `lastEvaluatedAt` directly, without nulling it for legacy `schemaVersion` payloads.
- Added regression coverage:
  - `src/shared/lib/ai-paths/core/validation-engine/__tests__/defaults.normalization.test.ts`
    - verifies `lastEvaluatedAt` remains preserved for `schemaVersion: 1` payloads.
    - verifies missing timestamp still normalizes to `null`.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of `legacySchemaVersion`/schema-gated `lastEvaluatedAt` compatibility snippets in validation defaults and requires canonical `lastEvaluatedAt` normalization snippet.

## Executed Item 52 (AI Paths Collection-Alias Migration Helper Surface Retirement)

- Removed dead migration-helper surface from runtime collection utility module:
  - `src/shared/lib/ai-paths/core/utils/collection-names.ts`
  - deleted:
    - `migrateDatabaseConfigCollections`
    - `migratePathConfigCollections`
    - internal migration-only helper branches supporting those exports.
- Kept canonical runtime collection APIs:
  - `canonicalizeAiPathsCollectionName`
  - `findPathConfigCollectionAliasIssues`
- Updated regression coverage:
  - `src/shared/lib/ai-paths/core/utils/__tests__/collection-names.test.ts`
    - now verifies canonical alias detection scope and canonicalization behavior directly.
    - confirms top-level `dbQuery` compatibility payloads are ignored by runtime alias-issue detection.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of `migrateDatabaseConfigCollections`/`migratePathConfigCollections` exports in `collection-names.ts` and requires canonical alias API snippets.

## Executed Item 53 (Legacy Products Proxy Deprecation Shim Retirement)

- Removed runtime proxy-level legacy `/api/products` deprecation responder:
  - `src/proxy.ts` no longer intercepts legacy products paths to emit 410 successor metadata payloads.
- Canonical behavior now relies on standard API routing only:
  - `/api/*` requests pass through base proxy flow without legacy products path special-casing.
  - legacy `/api/products` paths are no longer handled by a compatibility shim in middleware/proxy.
- Updated regression coverage:
  - `src/proxy.test.ts` now verifies legacy `/api/products/*` paths fall through the standard API proxy path (`NextResponse.next`) and no deprecation payload contract remains.

## Executed Item 54 (AI Paths Settings Backup Payload Shape Compatibility Prune)

- Tightened settings backup parsing to canonical structured payload shape:
  - `src/shared/lib/ai-paths/settings-store-client.ts`
  - `readBackupSettings` now accepts only object payloads with:
    - numeric `savedAt`
    - array `records`
  - removed legacy array-root backup payload parsing branch.
- Added regression coverage:
  - `src/shared/lib/ai-paths/__tests__/settings-store-client.backup.test.ts`
    - verifies structured backup fallback remains functional on request failure.
    - verifies legacy array-root backup payloads are ignored.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of array-root backup payload compatibility parsing snippets in `settings-store-client.ts` and requires canonical structured backup parsing snippets.

## Executed Item 55 (AI Paths Backup-Key Version Compatibility Prune)

- Migrated AI Paths client settings backup storage key to canonical unversioned form:
  - `src/shared/lib/ai-paths/settings-store-client.ts`
  - `AI_PATHS_SETTINGS_BACKUP_KEY` now uses `ai_paths_settings_backup`.
- Updated backup parsing regression coverage:
  - `src/shared/lib/ai-paths/__tests__/settings-store-client.backup.test.ts`
  - tests now target canonical backup key.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` (`checkSettingsBackupPayloadCompatibilityPrune`) now:
    - blocks reintroduction of `ai_paths_settings_backup_v1`.
    - requires canonical backup key snippet in `settings-store-client.ts`.

## Executed Item 56 (AI Paths Validation Path-Meta Fallback Compatibility Prune)

- Removed validation-admin path-meta synthesis from config records:
  - `src/features/ai/ai-paths/pages/AdminAiPathsValidationUtils.ts`
  - `parseAiPathsSettings` now derives `pathMetas` from canonical `ai_paths_index` entries only.
- Updated regression coverage:
  - `src/features/ai/ai-paths/pages/__tests__/AdminAiPathsValidationUtils.test.ts`
    - verifies legacy `ai_path_index` payloads no longer produce synthetic `pathMetas`.
    - verifies configs missing canonical index entries are not surfaced as selectable path metas.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` (`checkValidationPathIndexMetaFallbackCompatibilityPrune`) now:
    - blocks reintroduction of `fallbackMetas` synthesis in validation settings parsing.
    - requires canonical index-driven `pathMetas` assembly snippet.

## Executed Item 57 (Site-Wide Legacy Route Namespace Hygiene + Exception Register Reconciliation)

- Added explicit legacy route-namespace guardrails to site-wide canonical checks:
  - `scripts/canonical/check-sitewide.mjs` now blocks these forbidden directories if present:
    - `src/app/api/import`
    - `src/app/api/catalogs/assign`
    - `src/app/api/ai-paths/legacy-compat/counters`
- Pruned remaining empty legacy route namespaces from runtime source tree:
  - removed empty directories:
    - `src/app/api/import`
    - `src/app/api/catalogs/assign`
    - `src/app/api/ai-paths/legacy-compat/counters`
- Reconciled stale temporary exceptions that were already retired by prior hard-cuts:
  - `docs/legacy-compatibility-exception-register-2026-03-04.json`
  - removed:
    - `products-api-legacy-gateway`
    - `integrations-base-import-action-import-rejection`
    - `ai-brain-provider-catalog-legacy-pools`
- Validation:
  - `npm run canonical:check:sitewide` passes with updated guardrails and exception register.

## Executed Item 58 (AI Paths Validation Collection-Map Delimiter Compatibility Prune)

- Removed legacy collection-map delimiter compatibility in validation admin parsing:
  - `src/features/ai/ai-paths/pages/AdminAiPathsValidationUtils.ts`
  - `parseCollectionMapText` now accepts canonical `entity:collection` lines only.
- Updated regression coverage:
  - `src/features/ai/ai-paths/pages/__tests__/AdminAiPathsValidationUtils.test.ts`
    - verifies canonical `:` collection-map lines parse correctly.
    - verifies legacy `=` collection-map lines are ignored.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` (`checkValidationCollectionMapLegacyDelimiterCompatibilityPrune`) now:
    - blocks reintroduction of `=` delimiter compatibility snippets in validation collection-map parsing.
    - requires canonical `line.indexOf(':')` delimiter parsing snippet.

## Executed Item 59 (AI Paths Validation Docs-Sources Delimiter Compatibility Prune)

- Removed legacy docs-sources comma delimiter compatibility in validation admin parsing:
  - `src/features/ai/ai-paths/pages/AdminAiPathsValidationUtils.ts`
  - `parseDocsSourcesText` now parses canonical one-source-per-line input and ignores comma-delimited lines.
- Updated regression coverage:
  - `src/features/ai/ai-paths/pages/__tests__/AdminAiPathsValidationUtils.test.ts`
    - verifies canonical newline-delimited docs sources parse correctly.
    - verifies legacy comma-delimited docs sources are ignored.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` (`checkValidationDocsSourcesLegacyDelimiterCompatibilityPrune`) now:
    - blocks reintroduction of comma-delimiter docs-sources parsing snippets.
    - requires canonical newline parsing and comma-line rejection snippets.

## Executed Item 60 (Migration-Only Helper Relocation Out Of Runtime Source Tree)

- Relocated migration-only helper modules from `src/features/**` to `scripts/db/lib/**`:
  - `src/features/integrations/services/imports/parameter-import/link-map-preference-migration.ts`
    -> `scripts/db/lib/integrations/link-map-preference-migration.ts`
  - `src/features/integrations/services/export-warehouse-preference-migration.ts`
    -> `scripts/db/lib/integrations/export-warehouse-preference-migration.ts`
  - `src/features/case-resolver/workspace-detached-contract-migration.ts`
    -> `scripts/db/lib/case-resolver/workspace-detached-contract-migration.ts`
- Updated migration entrypoint imports to script-local helper paths:
  - `scripts/db/migrate-base-import-parameter-link-map-v2.ts`
  - `scripts/db/migrate-base-export-warehouse-preferences-v2.ts`
  - `scripts/db/migrate-case-resolver-workspace-detached-contract-v2.ts`
- Removed runtime-tree helper files after relocation:
  - `src/features/integrations/services/imports/parameter-import/link-map-preference-migration.ts`
  - `src/features/integrations/services/export-warehouse-preference-migration.ts`
  - `src/features/case-resolver/workspace-detached-contract-migration.ts`
- Reconciled exception register to reflect completion:
  - `docs/legacy-compatibility-exception-register-2026-03-04.json` now has no active temporary exceptions (`"exceptions": []`).
- Regression coverage updates:
  - `src/features/case-resolver/__tests__/workspace-detached-contract-migration.test.ts` now targets the relocated script helper.
  - `src/features/case-resolver/__tests__/workspace-persistence.test.ts` now inlines legacy schema constants for runtime-side legacy payload rejection checks.

## Executed Item 61 (AI Paths Database Template catalogId Alias Compatibility Prune)

- Removed runtime catalogId alias auto-promotion from database template context preparation:
  - `src/shared/lib/ai-paths/core/runtime/handlers/integration-database-template-context.ts`
  - `prepareDatabaseTemplateContext` no longer infers/promotes `catalogId` from nested context records (`entity/catalogs/bundle`) into top-level template inputs/context.
- Updated regression coverage:
  - `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-template-context.test.ts`
    - verifies nested catalog metadata does not auto-populate top-level `catalogId`.
    - verifies explicitly provided canonical `catalogId` input remains preserved.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` (`checkDatabaseTemplateCatalogAliasCompatibilityPrune`) now:
    - blocks reintroduction of database template catalogId alias helper snippets.
    - requires canonical template-context assembly from `templateInputs` without alias sync helpers.

## Executed Item 62 (AI Paths Database Input catalogId Alias Compatibility Prune)

- Removed nested catalogId alias extraction from database input resolution:
  - `src/shared/lib/ai-paths/core/runtime/handlers/integration-database-input-resolution.ts`
  - `resolveDatabaseInputs` now reads `catalogId` only from explicit `catalogId` fields on source input objects.
- Updated regression coverage:
  - `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-input-resolution.test.ts`
    - verifies nested `context.entity.catalogId` / `context.entity.catalogs[]` payloads no longer auto-populate top-level `catalogId`.
    - verifies canonical direct `catalogId` fields still resolve/preserve correctly.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` (`checkDatabaseInputCatalogAliasCompatibilityPrune`) now:
    - blocks reintroduction of nested catalog alias traversal helpers in input resolution.
    - requires canonical direct `catalogId` read snippet.

## Executed Item 63 (Products Legacy API Utility Reintroduction Guard)

- Hardened site-wide canonical guardrails to prevent reintroduction of removed dead products API utility files:
  - `scripts/canonical/check-sitewide.mjs`
  - now blocks:
    - `src/features/products/api/versioning.ts`
    - `src/features/products/api/routes/v2-products-route.ts`
- Validation:
  - `npm run canonical:check:sitewide` passes with the new products-utility guard checks.

## Executed Item 64 (AI Paths Database Provider-Fallback Metadata Compatibility Prune)

- Removed provider-fallback compatibility metadata propagation from database runtime handlers:
  - `src/shared/lib/ai-paths/core/runtime/handlers/integration-database-query-execution.ts`
  - `src/shared/lib/ai-paths/core/runtime/handlers/integration-database-update-execution.ts`
  - runtime bundles/execution meta no longer emit `providerFallback` from provider response `fallback` payloads.
- Removed local runtime metadata extraction for deprecated provider fallback shape:
  - `src/features/ai/ai-paths/components/ai-paths-settings/runtime/useAiPathsLocalExecution.helpers.ts`
  - `extractDatabaseRuntimeMetadata` now keeps canonical provider metadata only (`requestedProvider`, `resolvedProvider`, `provider`, `count`).
- Updated regression coverage:
  - `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-query-execution.guardrails.test.ts`
    - verifies response `fallback` payload does not surface as `providerFallback` in runtime bundle.
  - `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-update-execution.test.ts`
    - verifies response `fallback` payload does not surface as `providerFallback` in execution metadata.
  - `src/features/ai/ai-paths/components/ai-paths-settings/runtime/__tests__/useAiPathsLocalExecution.helpers.test.ts`
    - verifies local runtime metadata ignores `providerFallback` payloads and returns `null` when no canonical metadata exists.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` (`checkDatabaseProviderFallbackCompatibilityPrune`) now:
    - blocks reintroduction of provider `fallback` -> `providerFallback` compatibility snippets in database query/update handlers and local execution metadata helpers.
    - requires canonical local execution database provider metadata snippets.

## Executed Item 65 (AI Paths Database Provider Alias Metadata Compatibility Prune)

- Removed duplicate `provider` alias emission from database query runtime bundle:
  - `src/shared/lib/ai-paths/core/runtime/handlers/integration-database-query-execution.ts`
  - bundle metadata now exposes canonical `resolvedProvider` only.
- Removed local runtime metadata fallback to deprecated `bundle.provider` alias:
  - `src/features/ai/ai-paths/components/ai-paths-settings/runtime/useAiPathsLocalExecution.helpers.ts`
  - `extractDatabaseRuntimeMetadata` now reads provider metadata from canonical `resolvedProvider` only.
- Updated regression coverage:
  - `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-query-execution.guardrails.test.ts`
    - verifies real execution bundles expose `resolvedProvider` and no legacy `provider` alias.
  - `src/features/ai/ai-paths/components/ai-paths-settings/runtime/__tests__/useAiPathsLocalExecution.helpers.test.ts`
    - verifies `bundle.provider` without canonical provider metadata does not surface runtime database metadata.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` (`checkDatabaseProviderAliasCompatibilityPrune`) now:
    - blocks reintroduction of `resolvedProvider -> provider` alias emission and `bundle.provider` fallback metadata reads.
    - requires canonical local execution `resolvedProvider` metadata snippet.

## Executed Item 66 (Products Metadata groupType Request-Alias Compatibility Prune)

- Removed legacy `groupType` request-alias reads from products metadata write handlers:
  - `src/app/api/v2/products/metadata/handler.ts`
    - `POST_products_metadata_handler` now resolves type from canonical `type` only.
  - `src/app/api/v2/products/metadata/[type]/[id]/handler.ts`
    - `PUT_products_metadata_id_handler` now resolves type updates from canonical `type` only.
    - update gating no longer branches on `'groupType' in data`.
- Added canonical regression coverage:
  - `src/app/api/v2/products/metadata/handler.canonical.test.ts`
  - new assertion verifies legacy `groupType` payloads do not drive type derivation (canonical `type`/`sourceGroupId` behavior only).
- Hardened site-wide guardrails against alias reintroduction:
  - `scripts/canonical/check-sitewide.mjs`
  - now blocks `groupType` request-alias snippets in:
    - `src/app/api/v2/products/metadata/handler.ts`
    - `src/app/api/v2/products/metadata/[type]/[id]/handler.ts`
- Validation:
  - `npx vitest run src/app/api/v2/products/metadata/handler.canonical.test.ts` passes.
  - `npm run canonical:check:sitewide` passes with new guard checks.

## Executed Item 67 (AI Paths API Client CSRF Helper Compatibility Alias Prune)

- Removed legacy compatibility alias naming from AI Paths API client base helper:
  - `src/shared/lib/ai-paths/api/client/base.ts`
  - renamed helper:
    - `withCsrfHeadersCompat` -> `withApiCsrfHeaders`
  - `apiPost` / `apiPatch` / `apiDelete` now use canonical `withApiCsrfHeaders`.
- Updated AI Paths API client export surface to canonical helper name:
  - `src/shared/lib/ai-paths/api/client.ts`
  - replaced `withCsrfHeadersCompat` imports/exports with `withApiCsrfHeaders`.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` now:
    - blocks reintroduction of `withCsrfHeadersCompat` snippets in API client files.
    - requires canonical `withApiCsrfHeaders` helper snippet in API client base.
- Validation:
  - `npm run ai-paths:check:canonical` passes.
  - `npm run canonical:check:sitewide` passes.

## Executed Item 68 (AI Paths Database Update Provider Alias Metadata Compatibility Prune)

- Removed legacy provider-alias fallback from database update execution metadata parsing:
  - `src/shared/lib/ai-paths/core/runtime/handlers/integration-database-update-execution.ts`
  - `resolveProviderMeta` now resolves provider metadata from canonical `resolvedProvider` only.
  - removed deprecated `provider` field from update response metadata interface.
- Updated regression coverage:
  - `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-update-execution.test.ts`
    - verifies provider-only response metadata does not populate `resolvedProvider`.
    - verifies canonical `resolvedProvider` metadata remains preserved when provided by the response payload.
- Validated canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` (`checkDatabaseUpdateProviderAliasCompatibilityPrune`) now:
    - blocks reintroduction of `provider` alias metadata snippets in update execution handler provider parsing.
    - requires canonical `resolvedProvider` provider metadata snippets in update execution handler.
- Validation:
  - `npx vitest run src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-update-execution.test.ts src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-query-execution.guardrails.test.ts src/features/ai/ai-paths/components/ai-paths-settings/runtime/__tests__/useAiPathsLocalExecution.helpers.test.ts` passes.
  - `npm run ai-paths:check:canonical` passes.

## Executed Item 69 (AI Paths Database Query Provider-Response Alias Compatibility Prune)

- Removed legacy provider-response alias dependency from database query execution metadata parsing:
  - `src/shared/lib/ai-paths/core/runtime/handlers/integration-database-query-execution.ts`
  - query runtime now derives provider metadata from canonical response fields:
    - `requestedProvider`
    - `resolvedProvider`
  - removed deprecated `provider` field from query response metadata interface.
- Updated regression coverage:
  - `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-query-execution.guardrails.test.ts`
    - verifies canonical `resolvedProvider` response metadata is surfaced in query runtime bundle.
    - verifies provider-only response payloads do not populate `resolvedProvider`.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` (`checkDatabaseQueryProviderResponseAliasCompatibilityPrune`) now:
    - blocks reintroduction of query-response `provider` alias metadata parsing snippets in query execution handler.
    - requires canonical `resolvedProvider` response metadata parsing snippets.
- Validation:
  - `npx vitest run src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-query-execution.guardrails.test.ts src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-update-execution.test.ts src/features/ai/ai-paths/components/ai-paths-settings/runtime/__tests__/useAiPathsLocalExecution.helpers.test.ts` passes.
  - `npm run ai-paths:check:canonical` passes.

## Executed Item 70 (CSRF Legacy Header Alias Compatibility Prune)

- Removed legacy `x-xsrf-token` request-header alias acceptance from CSRF parsing:
  - `src/shared/lib/security/csrf.ts`
  - `getCsrfTokenFromHeaders` now accepts canonical `x-csrf-token` only.
- Removed dead legacy CSRF header alias constant from client helper module:
  - `src/shared/lib/security/csrf-client.ts`
  - removed `CSRF_HEADER_FALLBACK`.
- Added regression coverage:
  - `src/shared/lib/security/__tests__/csrf.test.ts`
  - verifies canonical `x-csrf-token` acceptance and legacy `x-xsrf-token` rejection.
- Extended site-wide canonical guardrails:
  - `scripts/canonical/check-sitewide.mjs`
  - now blocks runtime reintroduction of:
    - `x-xsrf-token`
    - `CSRF_HEADER_FALLBACK`
- Validation:
  - `npx vitest run src/shared/lib/security/__tests__/csrf.test.ts` passes.
  - `npm run canonical:check:sitewide` passes.

## Executed Item 71 (AI Paths DB-Command Provider Payload Alias Compatibility Prune)

- Removed legacy `provider` alias emission from DB command response payload composition:
  - `src/app/api/ai-paths/db-command/handler.ts`
  - `withProviderPayload` now returns canonical provider metadata fields only:
    - `requestedProvider`
    - `resolvedProvider`
- Updated API fallback regression coverage:
  - `src/app/api/ai-paths/__tests__/db-provider-fallback.test.ts`
    - verifies DB action/update fallback responses no longer expose `provider` alias.
    - verifies canonical `resolvedProvider` metadata remains surfaced.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` (`checkDbCommandProviderAliasCompatibilityPrune`) now:
    - blocks reintroduction of DB command response `provider` alias payload snippets.
    - requires canonical `requestedProvider` / `resolvedProvider` payload snippets.
- Validation:
  - `npx vitest run src/app/api/ai-paths/__tests__/db-provider-fallback.test.ts src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-query-execution.guardrails.test.ts src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-update-execution.test.ts` passes.
  - `npm run ai-paths:check:canonical` passes.

## Executed Item 72 (AI Paths Starter-Workflow Edge Alias Compatibility Prune)

- Removed legacy edge alias compatibility from starter-workflow canonical graph parsing:
  - `src/shared/lib/ai-paths/core/starter-workflows/registry.ts`
  - edge parsing/signature and incoming-port resolution now consume canonical edge fields only:
    - `from`
    - `to`
    - `fromPort`
    - `toPort`
  - removed fallback reads of legacy alias fields:
    - `source`
    - `target`
    - `sourceHandle`
    - `targetHandle`
- Added regression coverage:
  - `src/shared/lib/ai-paths/core/starter-workflows/__tests__/registry.test.ts`
  - verifies configs carrying alias-only edge fields are not resolved as canonical starter graphs.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` (`checkStarterWorkflowEdgeAliasCompatibilityPrune`) now:
    - blocks reintroduction of starter edge alias fallback snippets.
    - requires canonical edge parsing snippets in starter workflow registry logic.
- Validation:
  - `npx vitest run src/shared/lib/ai-paths/core/starter-workflows/__tests__/registry.test.ts` passes.
  - `npm run ai-paths:check:canonical` passes.

## Next Item

Continue opportunistic canonicalization in remaining non-critical surfaces outside the current wave plan.
