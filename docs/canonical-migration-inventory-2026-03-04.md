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
  - `src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.on-halt-canonical.test.ts`
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

## Executed Item 73 (AI Paths Settings Edge-Shape Alias Compatibility Prune)

- Removed legacy edge-shape alias fallback reads from AI Paths settings sanitization:
  - `src/features/ai/ai-paths/components/AiPathsSettingsUtils.ts`
  - `assertNoLegacyTriggerDataGraph` edge-source extraction now reads canonical edge fields only:
    - `from`
    - `fromPort`
  - removed fallback reads of legacy alias fields:
    - `source`
    - `sourceHandle`
- Added regression coverage:
  - `src/features/ai/ai-paths/components/__tests__/AiPathsSettingsUtils.sanitize-path-config.test.ts`
  - verifies alias-only edge payloads (`source`/`target`/`sourceHandle`/`targetHandle`) are rejected as non-canonical.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` (`checkSettingsEdgeAliasCompatibilityPrune`) now:
    - blocks reintroduction of settings edge alias fallback snippets.
    - requires canonical `from` / `fromPort` edge parsing snippets in settings sanitization.
- Validation:
  - `npx vitest run src/features/ai/ai-paths/components/__tests__/AiPathsSettingsUtils.sanitize-path-config.test.ts` passes.
  - `npm run ai-paths:check:canonical` passes.

## Executed Item 74 (AI Paths Database Client Legacy Route Compatibility Prune)

- Removed legacy DB query/update route usage from AI Paths API database client:
  - `src/shared/lib/ai-paths/api/client/database.ts`
  - `databaseQuery` now maps payloads directly to canonical `/api/ai-paths/db-action` with:
    - `action: 'find' | 'findOne'`
  - `databaseUpdate` now maps payloads directly to canonical `/api/ai-paths/db-action` with:
    - `action: 'updateOne' | 'updateMany'`
  - retained provider normalization to canonical enum-only payload forwarding (`auto`/`mongodb`/`prisma`).
- Added regression coverage:
  - `src/shared/lib/ai-paths/api/__tests__/database-client.canonical.test.ts`
  - verifies:
    - query mapping to canonical db-action payload shape.
    - update mapping to canonical db-action payload shape.
    - invalid provider values are dropped from outgoing payload.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` (`checkDatabaseClientLegacyRouteCompatibilityPrune`) now:
    - blocks reintroduction of `/api/ai-paths/db-query` and `/api/ai-paths/db-update` usage in runtime database client.
    - requires canonical db-action routing snippets for query/update mapping.
- Validation:
  - `npx vitest run src/shared/lib/ai-paths/api/__tests__/database-client.canonical.test.ts src/app/api/ai-paths/__tests__/db-provider-fallback.test.ts src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-query-execution.guardrails.test.ts src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-update-execution.test.ts` passes.
  - `npm run ai-paths:check:canonical` passes.

## Executed Item 75 (Site-Wide Compatibility Test Filename Prune + Guardrail)

- Completed canonical naming migration for remaining compatibility-named runtime tests:
  - `src/app/api/v2/metadata/handler.compat.test.ts`
    -> `src/app/api/v2/metadata/handler.canonical.test.ts`
  - `src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.on-halt-compat.test.ts`
    -> `src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.on-halt-canonical.test.ts`
- Aligned canonical contract wording in renamed tests:
  - `src/app/api/v2/metadata/handler.canonical.test.ts`
    - suite title updated to canonical-contract naming.
    - legacy envelope rejection case wording updated to deprecated-wrapper naming.
  - `src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.on-halt-canonical.test.ts`
    - deprecated callback case wording updated after filename migration.
- Updated migration docs references to canonical test filenames:
  - `docs/ai-paths/ai-paths-modernization-playbook-2026-03-04.md`
  - `docs/canonical-migration-inventory-2026-03-04.md`
- Extended site-wide canonical guardrail:
  - `scripts/canonical/check-sitewide.mjs`
  - new check blocks reintroduction of `*.compat.test.ts(x)` files under `src/**`.
- Validation:
  - `npx vitest run src/app/api/v2/metadata/handler.canonical.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.on-halt-canonical.test.ts` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npm run typecheck` passes.

## Executed Item 76 (AI Paths DB Query/Update Shim Route Retirement)

- Removed legacy DB query/update shim endpoints that only proxied into DB action command handling:
  - deleted `src/app/api/ai-paths/db-query/handler.ts`
  - deleted `src/app/api/ai-paths/db-query/route.ts`
  - deleted `src/app/api/ai-paths/db-update/handler.ts`
  - deleted `src/app/api/ai-paths/db-update/route.ts`
- Migrated fallback API coverage to canonical DB action handler payloads:
  - `src/app/api/ai-paths/__tests__/db-provider-fallback.test.ts`
  - fallback/update-path tests now execute through canonical `/api/ai-paths/db-action` request payloads (`action`, `filter`, `update`) instead of shim payload fields (`query`, `updates`, `single`).
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs` (`checkDbQueryUpdateShimRetirement`) now:
    - blocks reintroduction of DB query/update shim route files.
    - requires canonical DB action route files to remain present.
- Validation:
  - `npx vitest run src/app/api/ai-paths/__tests__/db-provider-fallback.test.ts src/shared/lib/ai-paths/api/__tests__/database-client.canonical.test.ts src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-query-execution.guardrails.test.ts src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-update-execution.test.ts` passes.
  - `npm run ai-paths:check:canonical` passes.

## Executed Item 77 (CMS Theme Color-Scheme Alias Compatibility Prune)

- Removed legacy alias payload acceptance from page-builder theme scheme parsing:
  - `src/features/cms/components/page-builder/theme/theme-utils.ts`
  - `parseColorSchemePayload` now accepts canonical scheme payload shape only:
    - `name`
    - `colors.background`
    - `colors.surface`
    - `colors.text`
    - `colors.accent`
    - `colors.border`
  - removed legacy alias support:
    - top-level aliases: `schemeName`, `title`
    - container aliases: `palette`, `scheme`
    - color-key aliases: `bg`, `layer`, `card`, `foreground`, `primary`, `outline`
- Removed text-fallback alias label parsing in theme AI preview parsing:
  - `src/features/cms/components/page-builder/theme/ThemeColorsContext.tsx`
  - `parseSchemeFromText` now reads canonical labels only:
    - `name`, `background`, `surface`, `text`, `accent`, `border`
  - removed legacy label aliases:
    - `scheme`, `title`, `bg`, `card`, `layer`, `foreground`, `primary`, `outline`
- Added regression coverage:
  - `src/features/cms/components/page-builder/theme/__tests__/theme-utils.test.ts`
  - verifies canonical payload parsing and rejection of legacy alias payload shape.
- Extended CMS runtime prune guardrails:
  - `src/features/cms/migrations/__tests__/page-builder-runtime-prune.test.ts`
  - blocks reintroduction of theme color-scheme alias parsing snippets in runtime source.
- Validation:
  - `npx vitest run src/features/cms/components/page-builder/theme/__tests__/theme-utils.test.ts` passes.
  - `npx vitest run src/features/cms/migrations/__tests__/page-builder-runtime-prune.test.ts` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npm run ai-paths:check:canonical` passes.
  - `npx tsc -p tsconfig.json --noEmit --incremental false --pretty false` passes.

## Executed Item 78 (Root Test-Suite Compat Filename Prune + Guardrail Expansion)

- Removed remaining compatibility filename from root test suite:
  - `__tests__/shared/lib/query-factories-compat.test.tsx`
    -> `__tests__/shared/lib/query-factories-v2-behavior.test.tsx`
  - suite remains focused on canonical `query-factories-v2` behavior coverage.
- Expanded site-wide compatibility test filename guard:
  - `scripts/canonical/check-sitewide.mjs`
  - guard now scans both:
    - `src/**`
    - `__tests__/**`
  - and blocks reintroduction of `*.compat.test.ts(x)` in either tree.
- Validation:
  - `npx vitest run __tests__/shared/lib/query-factories-v2.test.tsx __tests__/shared/lib/query-factories-v2-behavior.test.tsx` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npm run typecheck` passes.

## Executed Item 79 (AI Paths DB-Command Handler Path Retirement)

- Retired legacy DB-command implementation module path in favor of canonical DB-action handler path:
  - moved implementation from:
    - `src/app/api/ai-paths/db-command/handler.ts`
  - to:
    - `src/app/api/ai-paths/db-action/handler.ts`
  - deleted legacy module file:
    - `src/app/api/ai-paths/db-command/handler.ts`
- Preserved route contract in canonical handler module:
  - `src/app/api/ai-paths/db-action/handler.ts`
  - added `POST_handler` export delegating to `postAiPathsDbActionHandler` so route wiring remains stable.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs`
  - provider-metadata contract check now targets canonical `db-action/handler.ts`.
  - shim-retirement guard now also blocks reintroduction of `src/app/api/ai-paths/db-command/handler.ts`.
- Validation:
  - `npx vitest run src/app/api/ai-paths/__tests__/db-provider-fallback.test.ts src/shared/lib/ai-paths/api/__tests__/database-client.canonical.test.ts src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-query-execution.guardrails.test.ts src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-update-execution.test.ts` passes.
  - `npm run ai-paths:check:canonical` passes.

## Executed Item 80 (CMS Theme AI Text Fallback Parsing Compatibility Prune)

- Removed runtime regex/text fallback parsing from theme AI output handling:
  - `src/features/cms/components/page-builder/theme/ThemeColorsContext.tsx`
  - removed inline `parseSchemeFromText` fallback parser branch.
  - theme AI preview/apply parsing now uses canonical utility parsing only.
- Added canonical text-parser utility for theme AI outputs:
  - `src/features/cms/components/page-builder/theme/theme-utils.ts`
  - `parseColorSchemeFromText` now:
    - extracts JSON content with `extractJsonBlock`,
    - parses JSON payload,
    - validates payload via canonical `parseColorSchemePayload`.
  - non-JSON free-text key/value payloads are now rejected (no runtime regex fallback).
- Extended regression coverage:
  - `src/features/cms/components/page-builder/theme/__tests__/theme-utils.test.ts`
  - now verifies canonical JSON text parsing and rejection of non-JSON text fallback parsing.
- Extended CMS runtime prune guardrails:
  - `src/features/cms/migrations/__tests__/page-builder-runtime-prune.test.ts`
  - blocks reintroduction of regex text-fallback parser snippets (`pickFromText`, regex-fallback comment marker).
- Validation:
  - `npx vitest run src/features/cms/components/page-builder/theme/__tests__/theme-utils.test.ts` passes.
  - `npx vitest run src/features/cms/migrations/__tests__/page-builder-runtime-prune.test.ts` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npm run ai-paths:check:canonical` passes.
  - `npx tsc -p tsconfig.json --noEmit --incremental false --pretty false` passes.

## Executed Item 81 (Mongo Product Shape Guard Canonical Naming Alignment)

- Renamed remaining legacy-named integration shape guard test:
  - `__tests__/features/products/services/mongo-product-legacy-shape-guard.test.ts`
    -> `__tests__/features/products/services/mongo-product-canonical-shape-guard.test.ts`
- Renamed shape-guard test toggle to canonical naming:
  - `RUN_MONGO_PRODUCT_LEGACY_SHAPE_GUARD`
    -> `RUN_MONGO_PRODUCT_CANONICAL_SHAPE_GUARD`
- Renamed package integration command to canonical naming:
  - `package.json`
  - `test:integration:mongo:legacy-shape-guard`
    -> `test:integration:mongo:canonical-shape-guard`
- Extended site-wide canonical guardrails:
  - `scripts/canonical/check-sitewide.mjs`
  - guard now also blocks reintroduction of the removed legacy test filename pattern:
    - `mongo-product-legacy-shape-guard.test.ts(x)`
- Validation:
  - `npx vitest run --project integration-mongo __tests__/features/products/services/mongo-product-canonical-shape-guard.test.ts` passes (guard test remains env-gated when toggle is unset).
  - `npm run canonical:check:sitewide` passes.
  - `npm run typecheck` passes.

## Executed Item 82 (AI Paths DB-Action Request Alias Compatibility Prune)

- Removed legacy DB-action request alias acceptance from canonical handler contract:
  - `src/app/api/ai-paths/db-action/handler.ts`
  - schema now rejects legacy alias keys:
    - `query`
    - `updates`
  - handler runtime now reads canonical payload fields only:
    - `filter` for query predicates
    - `update` for write payloads
  - removed alias fallbacks (`filter || query`, `update || updates`) across Prisma and MongoDB execution branches.
- Updated canonical DB-action client mapping:
  - `src/shared/lib/ai-paths/api/client/database.ts`
  - `databaseQuery` now maps canonical `DbQueryPayload.query` input to DB-action request key `filter`.
- Updated regression coverage to canonical request key shape:
  - `src/shared/lib/ai-paths/api/__tests__/database-client.canonical.test.ts`
  - `__tests__/features/ai/ai-paths/api/db-query.test.ts`
  - DB-action route tests now post to canonical route URL and canonical request key `filter`.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs`
  - added DB-action request contract check to:
    - block reintroduction of alias schema/runtime fallback snippets (`query`/`updates` compatibility).
    - require canonical `z.never()` alias rejection + canonical `filter`/`update` runtime snippets.
  - strengthened database-client route guard to:
    - block reintroduction of `query: payload.query` in outgoing DB-action payloads.
    - require canonical `filter: payload.query` mapping.
- Validation:
  - `npx vitest run src/shared/lib/ai-paths/api/__tests__/database-client.canonical.test.ts src/app/api/ai-paths/__tests__/db-provider-fallback.test.ts __tests__/features/ai/ai-paths/api/db-query.test.ts src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-query-execution.guardrails.test.ts src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-update-execution.test.ts` passes.
  - `npm run ai-paths:check:canonical` passes.

## Executed Item 83 (CMS Theme AI Strict JSON-Only Text Parsing Hard-Cut)

- Removed embedded/fenced JSON extraction compatibility from theme AI text parser:
  - `src/features/cms/components/page-builder/theme/theme-utils.ts`
  - removed `extractJsonBlock` helper path from runtime parsing flow.
  - `parseColorSchemeFromText` now accepts only strict JSON text (`JSON.parse(trimmed)`), then validates with canonical `parseColorSchemePayload`.
- Updated canonical regression coverage:
  - `src/features/cms/components/page-builder/theme/__tests__/theme-utils.test.ts`
  - canonical text parsing test now uses strict JSON input.
  - added rejection test for markdown-fenced JSON payload text.
- Extended CMS runtime prune guardrails:
  - `src/features/cms/migrations/__tests__/page-builder-runtime-prune.test.ts`
  - now blocks reintroduction of embedded/fenced JSON extraction snippets:
    - fenced regex matcher
    - brace-slice extraction (`indexOf('{')` / `lastIndexOf('}')`)
    - `extractJsonBlock(trimmed)`
- Validation:
  - `npx vitest run src/features/cms/components/page-builder/theme/__tests__/theme-utils.test.ts` passes.
  - `npx vitest run src/features/cms/migrations/__tests__/page-builder-runtime-prune.test.ts` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npm run ai-paths:check:canonical` passes.
  - `npx tsc -p tsconfig.json --noEmit --incremental false --pretty false` passes.

## Executed Item 84 (Category-Mapper Select Cell Compatibility Prop Prune)

- Removed dead compatibility prop from runtime category-mapper select cell:
  - `src/features/integrations/components/marketplaces/category-mapper/category-table/CategoryMapperSelectCell.tsx`
  - deleted unused prop:
    - `datalistId?: string`
- Updated regression coverage to canonical prop surface:
  - `src/features/integrations/components/marketplaces/category-mapper/category-table/__tests__/CategoryMapperSelectCell.test.tsx`
  - removed deprecated `datalistId` prop usage from render fixtures.
- Extended site-wide canonical guardrails:
  - `scripts/canonical/check-sitewide.mjs`
  - now blocks reintroduction of the removed select-cell compatibility prop token:
    - `datalistId?: string;`
- Validation:
  - `npx vitest run src/features/integrations/components/marketplaces/category-mapper/category-table/__tests__/CategoryMapperSelectCell.test.tsx` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npm run typecheck` passes.

## Executed Item 85 (AI Paths DB Client Query/Update Payload Contract Canonicalization)

- Canonicalized AI Paths database client request payload types:
  - `src/shared/lib/ai-paths/api/client/database.ts`
  - `DbQueryPayload` now exposes canonical `filter` (removed legacy `query` field).
  - `DbUpdatePayload` now exposes canonical `filter` + `update` (removed legacy `query` / `updates` fields).
  - `databaseQuery` and `databaseUpdate` now forward canonical payload keys only.
- Propagated canonical payload shape through runtime helpers and API call sites:
  - `src/shared/lib/ai-paths/core/runtime/utils.ts`
  - `src/features/ai/ai-paths/components/AiPathsSettingsUtils.ts`
  - `src/shared/lib/ai-paths/core/runtime/handlers/integration-database-query-execution.ts`
  - `src/shared/lib/ai-paths/core/runtime/handlers/integration-database-update-execution.ts`
  - `src/shared/lib/ai-paths/core/runtime/handlers/integration-database-update-operation.ts`
  - `src/shared/lib/ai-paths/core/runtime/handlers/integration-database-mongo-actions.ts`
  - `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsSettingsSamples.ts`
  - `src/app/api/v2/products/validator-runtime/evaluate/handler.ts`
- Updated regression expectations for canonical query payload forwarding:
  - `src/shared/lib/ai-paths/api/__tests__/database-client.canonical.test.ts`
  - `__tests__/features/ai/ai-paths/runtime/handlers/integration.test.ts`
- Extended canonical guardrails:
  - `scripts/ai-paths/check-canonical.mjs`
  - database-client route compatibility guard now:
    - blocks reintroduction of legacy `DbQueryPayload.query` / `DbUpdatePayload.query|updates` contract snippets.
    - requires canonical `DbQueryPayload.filter` and `DbUpdatePayload.filter|update` snippets.
    - blocks reintroduction of legacy payload forwarding snippets (`query: payload.query`, `update: payload.updates`).
- Validation:
  - `npx vitest run src/shared/lib/ai-paths/api/__tests__/database-client.canonical.test.ts src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-query-execution.guardrails.test.ts src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-update-execution.test.ts __tests__/features/ai/ai-paths/runtime/handlers/integration.test.ts __tests__/features/ai/ai-paths/api/db-query.test.ts` passes.
  - `npm run ai-paths:check:canonical` passes.
  - `npm run typecheck` passes.

## Executed Item 86 (AI Brain Provider-Catalog Runtime Migration Fallback Prune)

- Removed runtime provider-catalog migration fallback that accepted legacy pool-array payloads:
  - `src/shared/lib/ai-brain/server-model-catalog.ts`
  - deleted runtime extraction/migration branch that rebuilt `entries` from legacy pool keys.
  - provider-catalog recovery now supports only canonical reset behavior on invalid payloads.
- Preserved strict canonical runtime handling:
  - parse path remains canonical-only via `parseBrainProviderCatalog` (`entries` contract).
  - invalid payload path (including legacy pool-array keys) now resets to canonical defaults only.
  - removed migrated-warning branch:
    - `PROVIDER_CATALOG_MIGRATED`
    - legacy migration message text.
- Updated regression coverage:
  - `src/shared/lib/ai-brain/__tests__/server-model-catalog.test.ts`
  - legacy pool-array payload case now asserts reset warning (`PROVIDER_CATALOG_RESET`) and canonical upsert payload.
- Extended site-wide canonical guardrails:
  - `scripts/canonical/check-sitewide.mjs`
  - now blocks reintroduction of provider-catalog runtime migration warning tokens:
    - `PROVIDER_CATALOG_MIGRATED`
    - `contained legacy payload fields and was migrated to canonical entries[]`
- Validation:
  - `npx vitest run src/shared/lib/ai-brain/__tests__/server-model-catalog.test.ts` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npm run typecheck` passes.

## Executed Item 87 (Products Paged Route Handler-Import Canonical Guardrail)

- Added canonical import guardrail for products paged route handler path:
  - `scripts/canonical/check-sitewide.mjs`
  - guard now enforces canonical local handler import in:
    - `src/app/api/v2/products/paged/route.ts`
  - blocks reintroduction of removed alias import path snippet:
    - `@/app/api/products/paged/handler`
  - requires canonical snippet:
    - `import { GET_handler } from './handler';`
- Guardrail motivation:
  - prevents recurrence of module-resolution regressions from stale alias import paths after canonical route cutover.
- Validation:
  - `npm run canonical:check:sitewide` passes.
  - `npx tsc -p tsconfig.json --noEmit --incremental false --pretty false` passes.

## Executed Item 88 (Shared Base-Contract Legacy Marker Cleanup)

- Removed stale legacy marker text from shared base contracts:
  - `src/shared/contracts/base.ts`
  - removed `(legacy support)` marker from:
    - `BaseEntity` doc comment
    - `NamedEntity` doc comment
- Extended site-wide canonical guardrails:
  - `scripts/canonical/check-sitewide.mjs`
  - now blocks reintroduction of the removed legacy marker token:
    - `(legacy support)`
- Validation:
  - `npm run canonical:check:sitewide` passes.
  - `npm run typecheck` passes.

## Executed Item 89 (Prompt Exploder Settings Deprecated-AI-Keys Compatibility Channel Prune)

- Removed legacy-specific Prompt Exploder settings validation error channel:
  - `src/features/prompt-exploder/settings.ts`
  - deleted `deprecated_ai_keys` error code and deprecated-key payload field surface (`deprecatedKeys`).
  - removed `deprecatedAiKeysError` branch and migrated AI payload key validation to canonical invalid-shape semantics.
- Enforced canonical AI payload-shape rejection under generic contract:
  - `src/features/prompt-exploder/settings.ts`
  - non-canonical AI keys now fail with:
    - `code: 'invalid_shape'`
    - message detail: `ai contains unsupported keys: ...`
- Updated regression coverage:
  - `src/features/prompt-exploder/__tests__/settings.test.ts`
  - `__tests__/features/prompt-exploder/settings.test.ts`
  - `__tests__/features/prompt-exploder/AdminPromptExploderSettingsPage.test.tsx`
  - updated assertions now verify canonical invalid-shape error behavior and message surface.
- Extended site-wide canonical guardrails:
  - `scripts/canonical/check-sitewide.mjs`
  - added Prompt Exploder parser guard to:
    - block reintroduction of deprecated-ai-keys compatibility snippets in `src/features/prompt-exploder/settings.ts`.
    - require canonical unsupported-AI-keys invalid-shape snippet.
- Validation:
  - `npx vitest run src/features/prompt-exploder/__tests__/settings.test.ts __tests__/features/prompt-exploder/settings.test.ts __tests__/features/prompt-exploder/AdminPromptExploderSettingsPage.test.tsx` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npx tsc -p tsconfig.json --noEmit --incremental false --pretty false` passes.

## Executed Item 90 (Mongo Product Write Legacy Cleanup Branch Prune)

- Removed runtime legacy cleanup branch from Mongo product update writes:
  - `src/shared/lib/products/services/product-repository/mongo/write.ts`
  - deleted `legacyUnset` branch that unset legacy fields during canonical updates:
    - `name`
    - `description`
    - `categories`
- Runtime write behavior is now canonical-only:
  - update pipeline writes canonical scalar/category fields without legacy-shape cleanup side effects.
- Extended site-wide canonical guardrails:
  - `scripts/canonical/check-sitewide.mjs`
  - now blocks reintroduction of Mongo write legacy cleanup snippet:
    - `legacyUnset['name'] = ''`
- Validation:
  - `npx vitest run src/shared/lib/products/services/productService.test.ts` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npm run typecheck` passes.

## Executed Item 91 (Prompt Exploder Legacy Capture-Mode Contract Surface Prune)

- Removed unused legacy Prompt Exploder capture-mode contract schema/type surface:
  - `src/shared/contracts/prompt-exploder/settings.ts`
  - deleted `promptExploderCaseResolverCaptureModeSchema` (`manual|assisted|fully-auto`) and `PromptExploderCaseResolverCaptureMode` type export.
- Pruned stale re-export/import edges for removed legacy contract type:
  - `src/shared/contracts/prompt-exploder/case-resolver.ts`
  - removed `PromptExploderCaseResolverCaptureMode` re-export from settings.
  - `src/features/prompt-exploder/types.ts`
  - removed dead import/export of `PromptExploderCaseResolverCaptureMode`.
- Extended site-wide canonical guardrails:
  - `scripts/canonical/check-sitewide.mjs`
  - added Prompt Exploder settings parser guard to:
    - block reintroduction of legacy capture-mode schema token:
      - `promptExploderCaseResolverCaptureModeSchema`
    - block reintroduction of removed legacy capture-mode enum token:
      - `'fully-auto'`
- Validation:
  - `npx vitest run src/features/prompt-exploder/__tests__/settings.test.ts __tests__/features/prompt-exploder/settings.test.ts __tests__/features/prompt-exploder/AdminPromptExploderSettingsPage.test.tsx` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npx tsc -p tsconfig.json --noEmit --incremental false --pretty false` passes.

## Executed Item 92 (Validator Runtime DB Payload Alias Prune)

- Canonicalized validator runtime DB payload schema to canonical `filter` only:
  - `src/features/products/validations/validator-runtime-config.ts`
  - removed legacy alias acceptance surface for `payload.query`.
  - schema now explicitly rejects the alias key with `query: z.never().optional()`.
- Updated validator runtime regressions and prune guard:
  - `__tests__/features/products/validations/validator-runtime-config.test.ts`
  - `src/features/products/validations/__tests__/runtime-prune.test.ts`
  - added rejection coverage for legacy `payload.query` and guard snippets blocking evaluator/schema alias fallback reintroduction.
- Updated runtime placeholder guidance to canonical payload keys:
  - `src/features/products/components/settings/validator-settings/modal/ValidatorPatternModalRuntimeSection.tsx`
  - placeholder now documents `payload.filter` and `replacementPaths`.
- Validation:
  - `npx vitest run __tests__/features/products/validations/validator-runtime-config.test.ts src/features/products/validations/__tests__/runtime-prune.test.ts` passes.
  - `npm run typecheck` passes.
  - `npm run ai-paths:check:canonical` passes.

## Executed Item 93 (AI Paths DB-Schema Provider Alias Prune)

- Removed deprecated DB-schema provider alias (`all`) from AI Paths node-config UI contract:
  - `src/features/ai/ai-paths/components/node-config/DbSchemaNodeConfigSection.tsx`
  - canonical provider contract now allows only: `auto | mongodb | prisma`.
  - removed `All Providers` selector option.
  - added canonical provider normalization helper that coerces stale non-canonical values to `auto`.
- Extended AI Paths canonical guardrails:
  - `scripts/ai-paths/check-canonical.mjs`
  - added DB-schema provider contract check that:
    - blocks reintroduction of provider type/selector alias snippets for `all`.
    - requires canonical enum-only provider contract and normalization snippets.
- Validation:
  - `npm run ai-paths:check:canonical` passes.
  - `npm run typecheck` passes.

## Executed Item 94 (Case Resolver Edge Legacy-Specific Error Channel Prune)

- Removed legacy-specific edge-validation error channels from Case Resolver canonical edge parsing:
  - `src/features/case-resolver/settings.edge-validation.ts`
  - unsupported edge fields now always fail under canonical unsupported-field semantics:
    - `Case Resolver edge payload includes unsupported fields.`
  - unsupported legacy handle names now fail under canonical unsupported-handle semantics:
    - `Case Resolver edge payload includes unsupported handle names.`
- Updated regression coverage for canonical edge parser error contract:
  - `src/features/case-resolver/__tests__/nodefile-persistence.test.ts`
  - `src/features/case-resolver/__tests__/workspace.test.ts`
  - legacy edge-key cases now assert canonical unsupported-field error message.
- Extended site-wide canonical guardrails:
  - `scripts/canonical/check-sitewide.mjs`
  - now blocks reintroduction of removed legacy-specific edge error messages:
    - `Legacy Case Resolver edge fields are no longer supported.`
    - `Legacy Case Resolver edge port names are no longer supported.`
- Validation:
  - `npx vitest run src/features/case-resolver/__tests__/nodefile-persistence.test.ts src/features/case-resolver/__tests__/workspace.test.ts` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npm run typecheck` passes.

## Executed Item 95 (Prompt Exploder Runtime Key Canonicalization: Extraction-Mode Naming Cutover)

- Canonicalized Prompt Exploder runtime Case Resolver mode key naming:
  - `src/shared/contracts/prompt-exploder/settings.ts`
  - renamed runtime settings key:
    - `caseResolverCaptureMode`
    -> `caseResolverExtractionMode`
- Updated Prompt Exploder runtime/UI call sites to canonical key:
  - `src/features/prompt-exploder/pages/AdminPromptExploderSettingsPage.tsx`
  - `src/features/prompt-exploder/components/SourcePromptPanel.tsx`
  - `src/features/prompt-exploder/components/PatternRuntimePanel.tsx`
  - `src/features/prompt-exploder/context/DocumentContext.tsx`
  - UI labels updated to canonical extraction-mode wording.
- Extended site-wide canonical guardrails:
  - `scripts/canonical/check-sitewide.mjs`
  - added Prompt Exploder extraction-mode key canonicalization guard that:
    - requires canonical key snippet in shared contract settings:
      - `caseResolverExtractionMode`
    - blocks reintroduction of legacy key snippet under Prompt Exploder runtime/contract surfaces:
      - `caseResolverCaptureMode`
- Validation:
  - `npx vitest run src/features/prompt-exploder/__tests__/settings.test.ts __tests__/features/prompt-exploder/settings.test.ts __tests__/features/prompt-exploder/AdminPromptExploderSettingsPage.test.tsx` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npx tsc -p tsconfig.json --noEmit --incremental false --pretty false` passes.

## Executed Item 96 (Case Resolver Node-File Snapshot Legacy-Specific Error Channel Prune)

- Removed legacy-specific node-file snapshot parser error channel:
  - `src/features/case-resolver/node-file-snapshots.ts`
  - unexpected snapshot fields now fail under canonical unsupported-field semantics:
    - `Case Resolver node-file snapshot payload includes unsupported fields.`
- Updated canonical regression assertions across node-file snapshot parser consumers:
  - `src/features/case-resolver/__tests__/nodefile-persistence.test.ts`
  - `src/features/case-resolver/__tests__/workspace.test.ts`
  - `src/features/case-resolver/__tests__/case-resolver-node-file-workspace.test.tsx`
  - assertions now target canonical unsupported-field message instead of legacy-specific wording.
- Extended site-wide canonical guardrails:
  - `scripts/canonical/check-sitewide.mjs`
  - now blocks reintroduction of removed legacy-specific snapshot parser message:
    - `Legacy Case Resolver node-file snapshot fields are no longer supported.`
- Validation:
  - `npx vitest run src/features/case-resolver/__tests__/nodefile-persistence.test.ts src/features/case-resolver/__tests__/workspace.test.ts src/features/case-resolver/__tests__/case-resolver-node-file-workspace.test.tsx` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npm run typecheck` passes.

## Executed Item 97 (AI Paths Database Node Query-Provider Normalization Branch Prune)

- Removed legacy query-provider migration normalization branch from database node config state:
  - `src/features/ai/ai-paths/hooks/useDatabaseNodeConfigState.ts`
  - deleted legacy helper/constants:
    - `LEGACY_MONGO_DEFAULT_QUERY_TEMPLATE`
    - `isLegacyMongoDefaultQuery`
    - `normalizeLegacyQueryProvider`
  - query config normalization is now canonical-only:
    - `normalizeQueryConfig` only normalizes escaped template newlines in `queryTemplate`.
- Extended AI Paths canonical guardrails:
  - `scripts/ai-paths/check-canonical.mjs`
  - added `checkDatabaseNodeLegacyProviderNormalizationPrune` to:
    - block reintroduction of removed legacy provider/default-query normalization snippets.
    - require canonical `normalizeQueryConfig` snippet usage in hook state derivation.
- Validation:
  - `npm run ai-paths:check:canonical` passes.
  - `npm run typecheck` passes.

## Executed Item 98 (AI Brain Provider-Catalog Legacy Pool-Array Error Channel Prune)

- Removed legacy-specific provider-catalog pool-array error channel from AI Brain settings parser:
  - `src/shared/lib/ai-brain/settings.ts`
  - deleted legacy-only branch keyed by:
    - `reason: 'legacy_pool_keys_not_supported'`
    - migration message:
      - `Legacy pool arrays are no longer supported. Re-save AI Brain provider catalog using canonical entries[].`
- Canonical parser behavior now rejects legacy pool-array payload keys via existing generic unsupported-key path:
  - `reason: 'unknown_keys'`
  - no legacy-specific compatibility messaging branch remains in runtime parser.
- Resolved residual TS6133 typecheck issue from previous execution item:
  - removed now-unused `BRAIN_CATALOG_POOL_VALUES` import in `src/shared/lib/ai-brain/settings.ts`.
- Extended site-wide canonical guardrails:
  - `scripts/canonical/check-sitewide.mjs`
  - now blocks reintroduction of removed AI Brain provider-catalog legacy pool-array error-channel snippets.
- Validation:
  - `npx vitest run src/shared/lib/ai-brain/__tests__/settings.test.ts src/shared/lib/ai-brain/__tests__/server-model-catalog.test.ts` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npx tsc -p tsconfig.json --noEmit --incremental false --pretty false` passes.

## Executed Item 99 (Case Resolver Inline Node-File Snapshot Legacy Error Channel Prune)

- Removed legacy-specific inline node-file snapshot persistence error channel:
  - `src/features/case-resolver/workspace-persistence-save.ts`
  - message now uses canonical unsupported semantics:
    - `Case Resolver inline node-file snapshots are unsupported.`
  - reason channel now uses canonical identifier:
    - `inline_node_file_snapshot_not_supported`
- Updated regression coverage for persist/compaction error surfaces:
  - `src/features/case-resolver/__tests__/workspace-persistence.test.ts`
  - `src/features/case-resolver/__tests__/nodefile-persistence.test.ts`
  - assertions now target canonical unsupported-message semantics.
- Extended site-wide canonical guardrails:
  - `scripts/canonical/check-sitewide.mjs`
  - now blocks reintroduction of removed legacy-specific inline snapshot message and reason token:
    - `Legacy inline Case Resolver node-file snapshots are no longer supported.`
    - `legacy_inline_node_file_snapshot`
- Validation:
  - `npx vitest run src/features/case-resolver/__tests__/workspace-persistence.test.ts src/features/case-resolver/__tests__/nodefile-persistence.test.ts` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npm run typecheck` passes.

## Executed Item 100 (Chatbot Settings Deprecated-Agent-Keys Error Channel Prune)

- Removed legacy-specific chatbot settings validation error channel:
  - `src/shared/contracts/chatbot.ts`
  - deleted `deprecated_agent_model_keys` code path and `deprecatedKeys` field from `ChatbotSettingsValidationError`.
- Enforced canonical unsupported-key rejection semantics under generic invalid-shape contract:
  - `src/shared/contracts/chatbot.ts`
  - unsupported chatbot agent-model snapshot keys now fail with:
    - `code: 'invalid_shape'`
    - message detail: `Chatbot settings payload includes unsupported keys: ...`
- Updated regression coverage:
  - `__tests__/features/chatbot/api/chatbot-settings-parse.test.ts`
  - assertions now target canonical unsupported-key invalid-shape messaging.
- Extended site-wide canonical guardrails:
  - `scripts/canonical/check-sitewide.mjs`
  - added chatbot settings contract guard that:
    - blocks reintroduction of deprecated-agent-keys compatibility snippets in `src/shared/contracts/chatbot.ts`.
    - requires canonical unsupported-keys snippet.
- Validation:
  - `npx vitest run __tests__/features/chatbot/api/chatbot-settings-parse.test.ts` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npx tsc -p tsconfig.json --noEmit --incremental false --pretty false` passes.

## Executed Item 101 (AI Paths Entity-Update Legacy Simple-Parameters Alias Prune)

- Removed legacy `simpleParameters` compatibility inference branch from AI Paths entity-update API:
  - `src/app/api/ai-paths/update/handler.ts`
  - deleted legacy helper/constants and merge path:
    - `LEGACY_SIMPLE_PARAMETER_PREFIX`
    - `normalizeLegacySimpleParameterUpdates`
    - `normalizeExistingParameterValues`
    - `mergeLegacySimpleParameterInferenceWithExisting`
  - canonical product-update contract now explicitly rejects legacy alias usage:
    - `updates.simpleParameters` -> bad-request with canonical guidance to use `updates.parameters`.
- Updated API regression coverage:
  - `__tests__/features/ai/ai-paths/api/update-handler.test.ts`
  - now asserts deprecated `simpleParameters` payload is rejected and no product write is attempted.
- Extended AI Paths canonical guardrails:
  - `scripts/ai-paths/check-canonical.mjs`
  - added `checkEntityUpdateSimpleParametersAliasPrune` to:
    - block reintroduction of legacy alias merge/inference snippets in entity-update handler.
    - require canonical explicit rejection snippet and guidance message.
- Validation:
  - `npx vitest run __tests__/features/ai/ai-paths/api/update-handler.test.ts` passes.
  - `npm run ai-paths:check:canonical` passes.
  - `npm run typecheck` passes.

## Executed Item 102 (Product Repository Mapper Legacy Error Channel Prune)

- Removed legacy-specific product mapper error channels from Mongo product repository response normalization:
  - `src/shared/lib/products/services/product-repository/mongo-product-repository-mappers.ts`
  - canonical unsupported-shape semantics now surface:
    - `Product <field> payload includes unsupported object shape.`
    - `Product categories payload includes unsupported fields.`
    - `Product producer relation payload includes unsupported fields.`
    - `Product tag relation payload includes unsupported fields.`
- Updated mapper regression assertions:
  - `src/shared/lib/products/services/product-repository/__tests__/mongo-product-repository-mappers.test.ts`
  - legacy-specific error-message expectations now target canonical unsupported-shape wording.
- Extended site-wide canonical guardrails:
  - `scripts/canonical/check-sitewide.mjs`
  - now blocks reintroduction of removed legacy-specific product mapper error-message snippets.
- Validation:
  - `npx vitest run src/shared/lib/products/services/product-repository/__tests__/mongo-product-repository-mappers.test.ts` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npm run typecheck` passes.

## Executed Item 103 (AI Paths Parameter-Inference Target-Path Compatibility Prune)

- Enforced canonical parameter-inference target path in runtime update guard logic:
  - `src/shared/lib/ai-paths/core/runtime/handlers/database-parameter-inference.ts`
  - `applyParameterInferenceGuard` now blocks non-canonical `parameterInferenceGuard.targetPath` values.
  - canonical allowed target path is now explicit:
    - `parameters`
  - non-canonical target-path configs are blocked with canonical runtime error channel:
    - `Parameter inference guard targetPath must use canonical "parameters" path.`
- Updated runtime regression coverage:
  - `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/database-parameter-inference.test.ts`
  - added coverage that deprecated `targetPath: 'simpleParameters'` is blocked and dropped from outgoing updates.
  - `__tests__/features/ai/ai-paths/runtime/handlers/integration.test.ts`
  - removed deprecated simple-parameters config usage in update-flow test fixture and aligned to canonical `parameters` target path.
- Extended AI Paths canonical guardrails:
  - `scripts/ai-paths/check-canonical.mjs`
  - added `checkParameterInferenceTargetPathCompatibilityPrune` to:
    - require canonical target-path rejection snippets in runtime inference guard source.
    - block legacy target-path compatibility snippet patterns from reintroduction.
- Validation:
  - `npx vitest run src/shared/lib/ai-paths/core/runtime/handlers/__tests__/database-parameter-inference.test.ts __tests__/features/ai/ai-paths/runtime/handlers/integration.test.ts` passes.
  - `npm run ai-paths:check:canonical` passes.
  - `npm run typecheck` passes.

## Executed Item 104 (AI Paths Parameter-Inference Target-Path UI/Sanitizer Canonicalization Prune)

- Enforced canonical parameter-inference target path at edit-time in DB node settings UI:
  - `src/features/ai/ai-paths/components/node-config/database/DatabaseSettingsTab.tsx`
  - introduced canonical target-path constant and normalizer:
    - `CANONICAL_PARAMETER_INFERENCE_TARGET_PATH = 'parameters'`
  - guard enable flow now writes canonical target path explicitly.
  - non-canonical loaded guard target paths are auto-corrected to canonical via edit-time effect.
  - target-path field is now read-only and pinned to canonical `parameters`.
- Enforced canonical target-path rejection in both path-config sanitizers:
  - `src/features/ai/ai-paths/components/AiPathsSettingsUtils.ts`
  - `src/features/products/hooks/useAiPathSettings.ts`
  - both now reject non-canonical `parameterInferenceGuard.targetPath` values with:
    - `AI Path config contains deprecated parameter inference target path.`
    - reason: `deprecated_parameter_inference_target_path`
- Updated regression coverage:
  - `src/features/ai/ai-paths/components/__tests__/AiPathsSettingsUtils.sanitize-path-config.test.ts`
  - `src/features/products/hooks/__tests__/useAiPathSettings.sanitize-loaded-path-config.test.ts`
  - added coverage that `targetPath: 'simpleParameters'` is rejected by both sanitizers.
- Extended AI Paths canonical guardrails:
  - `scripts/ai-paths/check-canonical.mjs`
  - added:
    - `checkDatabaseSettingsTargetPathEditTimeCanonicalizationPrune`
    - `checkParameterInferenceTargetPathSanitizationPrune`
  - guardrails now enforce canonical UI edit-time target-path behavior and sanitizer rejection snippets.
- Validation:
  - `npx vitest run src/features/ai/ai-paths/components/__tests__/AiPathsSettingsUtils.sanitize-path-config.test.ts src/features/products/hooks/__tests__/useAiPathSettings.sanitize-loaded-path-config.test.ts` passes.
  - `npm run ai-paths:check:canonical` passes.
  - `npm run typecheck` passes.

## Executed Item 105 (Filemaker Settings Parser Legacy Error Channel Prune)

- Removed legacy-specific Filemaker settings parser error channels:
  - `src/features/filemaker/filemaker-settings.database.ts`
  - canonical unsupported-shape semantics now surface for:
    - unsupported payload version
    - deprecated `fullAddress` payloads
    - inline address payloads
    - inline person/organization phoneNumbers payloads
    - inline person/organization email payloads
- Updated Filemaker parser regression assertions to canonical unsupported-shape messages:
  - `src/features/filemaker/__tests__/settings.test.ts`
- Extended site-wide canonical guardrails:
  - `scripts/canonical/check-sitewide.mjs`
  - now blocks reintroduction of removed legacy-specific Filemaker parser error-message snippets.
- Validation:
  - `npx vitest run src/features/filemaker/__tests__/settings.test.ts` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npm run typecheck` was deferred in this step due unrelated pre-existing worktree drift in:
    - `scripts/db/migrate-agent-personas-snapshot-keys-v2.ts` (`TS2554: Expected 1 arguments, but got 2`)

## Executed Item 106 (Agent Personas Runtime Snapshot-Key Compatibility Hard-Cut)

- Removed runtime snapshot-key stripping compatibility from Agent Personas parsing:
  - `src/features/ai/agentcreator/utils/personas.ts`
  - `normalizeAgentPersonas` now rejects unsupported snapshot keys unconditionally.
  - `fetchAgentPersonas` now uses strict canonical normalization (no runtime strip migration mode).
- Kept snapshot-key migration behavior in script-only surface:
  - `scripts/db/migrate-agent-personas-snapshot-keys-v2.ts`
  - added script-local payload sanitization that strips unsupported snapshot keys before strict canonical normalization.
- Updated Agent Personas parser regression coverage to canonical strict behavior:
  - `src/features/ai/agentcreator/__tests__/personas.test.ts`
  - removed migration-mode strip assertions.
- Extended site-wide canonical guardrails:
  - `scripts/canonical/check-sitewide.mjs`
  - now blocks reintroduction of `stripDeprecatedSnapshotKeys` in runtime Agent Personas utils and requires strict fetch normalization snippet.
- Validation:
  - `npx vitest run src/features/ai/agentcreator/__tests__/personas.test.ts` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npx tsc -p tsconfig.json --noEmit --incremental false --pretty false` passes.

## Executed Item 107 (Image Studio Runtime Snapshot-Key Compatibility Hard-Cut)

- Removed runtime snapshot-key stripping compatibility from Image Studio settings parser:
  - `src/features/ai/image-studio/utils/studio-settings.ts`
  - `parseImageStudioSettings` now rejects deprecated snapshot fields via canonical unsupported-keys validation:
    - `Image Studio settings payload includes unsupported keys: ...`
  - `parsePersistedImageStudioSettings` now uses strict canonical parsing (no runtime strip mode).
- Kept snapshot-key migration behavior in script-only surface:
  - `scripts/db/migrate-image-studio-settings-contract-v2.ts`
  - added script-local payload sanitization to strip deprecated snapshot fields before strict canonical parsing.
- Updated Image Studio parser + classifier coverage:
  - `src/features/ai/image-studio/utils/__tests__/studio-settings.test.ts`
  - `src/shared/errors/__tests__/error-classifier.test.ts`
- Extended site-wide canonical guardrails:
  - `scripts/canonical/check-sitewide.mjs`
  - now blocks reintroduction of deprecated Image Studio snapshot-key parser snippets and requires strict persisted parser snippet.
- Validation:
  - `npx vitest run src/features/ai/image-studio/utils/__tests__/studio-settings.test.ts src/shared/errors/__tests__/error-classifier.test.ts` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npx tsc -p tsconfig.json --noEmit --incremental false --pretty false` passes.

## Executed Item 108 (AI Paths Runtime-Identity + Trigger-Data Legacy Error Channel Prune)

- Removed legacy-specific AI Paths runtime-state identity rejection channel:
  - `src/features/ai/ai-paths/components/AiPathsSettingsUtils.ts`
  - `src/features/ai/ai-paths/services/path-run-executor.helpers.ts`
  - canonical runtime-state unsupported semantics now surface:
    - `AI Paths runtime state payload includes unsupported identity fields.`
- Removed legacy-specific AI Paths trigger-data rejection channels:
  - `src/features/ai/ai-paths/components/AiPathsSettingsUtils.ts`
  - `src/features/products/hooks/useAiPathSettings.ts`
  - canonical config unsupported semantics now surface:
    - `AI Path config contains unsupported trigger output ports.`
    - `AI Path config contains unsupported trigger data edges.`
- Updated AI Paths path-switch runtime fallback detection to canonical reason-based logic:
  - `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsSettingsPathActions.ts`
  - fallback now detects runtime-identity incompatibility via `meta.reason === 'deprecated_runtime_identity_fields'` instead of legacy-specific message text.
- Updated regression coverage:
  - `src/features/ai/ai-paths/services/__tests__/path-run-executor.helpers.test.ts`
  - `src/features/ai/ai-paths/components/__tests__/AiPathsSettingsUtils.sanitize-path-config.test.ts`
  - `src/features/products/hooks/__tests__/useAiPathSettings.sanitize-loaded-path-config.test.ts`
  - `src/features/ai/ai-paths/components/ai-paths-settings/__tests__/useAiPathsSettingsPathActions.switch-path.test.tsx`
- Extended site-wide canonical guardrails:
  - `scripts/canonical/check-sitewide.mjs`
  - now blocks reintroduction of removed legacy-specific AI Paths runtime-identity/trigger-data error-message snippets.
- Validation:
  - `npx vitest run src/features/ai/ai-paths/services/__tests__/path-run-executor.helpers.test.ts src/features/ai/ai-paths/components/__tests__/AiPathsSettingsUtils.sanitize-path-config.test.ts src/features/products/hooks/__tests__/useAiPathSettings.sanitize-loaded-path-config.test.ts src/features/ai/ai-paths/components/ai-paths-settings/__tests__/useAiPathsSettingsPathActions.switch-path.test.tsx` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npm run typecheck` passes.

## Executed Item 109 (AI Paths Loaded-Config Edge Alias Compatibility Prune)

- Removed loaded-config edge alias fallback in product-path sanitizer:
  - `src/features/products/hooks/useAiPathSettings.ts`
  - `resolveEdgeSourceNodeId` now reads canonical `edge.from` only.
  - `resolveEdgeSourcePort` now reads canonical `edge.fromPort` only.
- Updated regression coverage:
  - `src/features/products/hooks/__tests__/useAiPathSettings.sanitize-loaded-path-config.test.ts`
  - added alias-only edge shape rejection coverage (`source` / `target` / `sourceHandle` / `targetHandle`) to enforce canonical edge contract.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs`
  - added `checkLoadedPathSettingsEdgeAliasCompatibilityPrune`:
    - blocks reintroduction of `source` / `sourceHandle` fallback snippets in `useAiPathSettings.ts`.
    - requires canonical `from` / `fromPort` parsing snippets.
- Validation:
  - `npx vitest run src/features/products/hooks/__tests__/useAiPathSettings.sanitize-loaded-path-config.test.ts` passes.
  - `npm run ai-paths:check:canonical` passes.
  - `npm run typecheck` passes.

## Executed Item 110 (AI Paths DB SchemaSnapshot + Query-Provider Error Channel Canonicalization)

- Replaced legacy-specific deprecated error channels for database schema/provider guards with canonical unsupported semantics:
  - `src/shared/lib/ai-paths/core/normalization/trigger-normalization.ts`
  - `src/features/ai/ai-paths/components/AiPathsSettingsUtils.ts`
  - `src/features/products/hooks/useAiPathSettings.ts`
  - canonical messages now surface:
    - `AI Path trigger payload contains unsupported database schemaSnapshot.`
    - `AI Path trigger payload contains unsupported database query provider "all".`
    - `AI Path config contains unsupported database schemaSnapshot.`
    - `AI Path config contains unsupported database query provider "all".`
  - canonical reasons now surface:
    - `unsupported_database_schema_snapshot`
    - `unsupported_database_query_provider`
- Updated regression coverage:
  - `src/features/ai/ai-paths/components/__tests__/AiPathsSettingsUtils.sanitize-path-config.test.ts`
  - `src/features/products/hooks/__tests__/useAiPathSettings.sanitize-loaded-path-config.test.ts`
  - `src/features/ai/ai-paths/hooks/__tests__/useAiPathTriggerEvent.sanitize.test.ts`
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs`
  - added `checkDatabaseSchemaSnapshotProviderErrorChannelPrune`:
    - blocks reintroduction of deprecated schema/provider error-channel snippets.
    - requires canonical unsupported schema/provider message/reason snippets across trigger/path sanitizers.
- Validation:
  - `npx vitest run src/features/ai/ai-paths/components/__tests__/AiPathsSettingsUtils.sanitize-path-config.test.ts src/features/products/hooks/__tests__/useAiPathSettings.sanitize-loaded-path-config.test.ts src/features/ai/ai-paths/hooks/__tests__/useAiPathTriggerEvent.sanitize.test.ts` passes.
  - `npm run ai-paths:check:canonical` passes.
  - `npx tsc -p tsconfig.json --noEmit --incremental false --pretty false` passes.

## Executed Item 111 (Integrations Export-Template Parameter-Source Error Channel Canonicalization)

- Replaced legacy-specific export-template parameter-source rejection channels with canonical unsupported semantics:
  - `src/features/integrations/services/export-template-repository.ts`
  - `src/app/api/v2/integrations/products/[id]/export-to-base/segments/preparation.ts`
  - canonical message now surfaces:
    - `contains unsupported parameter source mappings ...`
- Replaced legacy-specific import/export-template editor toast messaging for parameter-source guards:
  - `src/features/data-import-export/context/import-export/useImportExportTemplates.ts`
  - duplicate/create/save template guards now surface canonical unsupported parameter-source messaging.
- Updated regression coverage:
  - `__tests__/features/integrations/services/export-template-repository.test.ts`
  - `__tests__/app/api/integrations/products/export-to-base/helpers.test.ts`
- Extended site-wide canonical guardrails:
  - `scripts/canonical/check-sitewide.mjs`
  - now blocks reintroduction of removed legacy-specific export-template parameter-source error-message snippets.
- Validation:
  - `npx vitest run __tests__/features/integrations/services/export-template-repository.test.ts __tests__/app/api/integrations/products/export-to-base/helpers.test.ts` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npm run typecheck` passes.

## Executed Item 112 (AI Paths Trigger-Data + Collection-Alias Reason Channel Canonicalization)

- Replaced legacy-specific trigger-data reason channels with canonical unsupported reason identifiers:
  - `src/features/ai/ai-paths/components/AiPathsSettingsUtils.ts`
  - `src/features/products/hooks/useAiPathSettings.ts`
  - reason channels now surface:
    - `unsupported_trigger_outputs`
    - `unsupported_trigger_data_edge`
- Replaced legacy-specific collection-alias message/reason channel with canonical unsupported semantics:
  - `src/features/ai/ai-paths/components/AiPathsSettingsUtils.ts`
  - `src/features/products/hooks/useAiPathSettings.ts`
  - canonical message now surfaces:
    - `AI Path config contains unsupported collection aliases.`
  - canonical reason now surfaces:
    - `unsupported_collection_aliases`
- Updated regression coverage:
  - `src/features/products/hooks/__tests__/useAiPathSettings.sanitize-loaded-path-config.test.ts`
  - collection-alias rejection assertion now targets canonical unsupported message.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs`
  - added `checkTriggerDataAndCollectionAliasErrorChannelPrune`:
    - blocks reintroduction of `deprecated_trigger_outputs`, `deprecated_trigger_data_edge`, `deprecated_collection_aliases`, and deprecated collection-alias message snippets.
    - requires canonical unsupported reason/message snippets across path config and loaded-path sanitizers.
- Validation:
  - `npx vitest run src/features/products/hooks/__tests__/useAiPathSettings.sanitize-loaded-path-config.test.ts src/features/ai/ai-paths/components/__tests__/AiPathsSettingsUtils.sanitize-path-config.test.ts` passes.
  - `npm run ai-paths:check:canonical` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npx tsc -p tsconfig.json --noEmit --incremental false --pretty false` currently fails due unrelated pre-existing worktree drift in:
    - `src/shared/ui/templates/SettingsPanelBuilder.tsx` (`TS2536` index typing errors)

## Executed Item 113 (AI Paths Runtime/Node-Identity + Parameter-Inference Reason Channel Canonicalization)

- Replaced legacy-specific runtime-identity reason channel with canonical unsupported identifier:
  - `src/features/ai/ai-paths/components/AiPathsSettingsUtils.ts`
  - `src/features/ai/ai-paths/services/path-run-executor.helpers.ts`
  - `deprecated_runtime_identity_fields` -> `unsupported_runtime_identity_fields`
- Replaced legacy-specific node-identity reason channel with canonical unsupported identifier:
  - `src/features/ai/ai-paths/components/AiPathsSettingsUtils.ts`
  - `src/features/products/hooks/useAiPathSettings.ts`
  - `src/features/ai/ai-paths/services/path-run-service.ts`
  - `deprecated_node_identities` -> `unsupported_node_identities`
- Replaced legacy-specific parameter-inference target-path reason/message channel with canonical unsupported semantics:
  - `src/features/ai/ai-paths/components/AiPathsSettingsUtils.ts`
  - `src/features/products/hooks/useAiPathSettings.ts`
  - `deprecated_parameter_inference_target_path` -> `unsupported_parameter_inference_target_path`
  - `AI Path config contains deprecated parameter inference target path.` -> `AI Path config contains unsupported parameter inference target path.`
- Updated runtime-state fallback recovery reason matching to canonical identifier:
  - `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsSettingsPathActions.ts`
  - `errorReason === 'unsupported_runtime_identity_fields'`
- Updated regression coverage:
  - `src/features/ai/ai-paths/components/__tests__/AiPathsSettingsUtils.sanitize-path-config.test.ts`
  - `src/features/products/hooks/__tests__/useAiPathSettings.sanitize-loaded-path-config.test.ts`
  - `src/features/ai/ai-paths/services/__tests__/path-run-executor.helpers.test.ts`
  - `src/features/ai/ai-paths/services/__tests__/path-run-service.test.ts`
  - `src/features/ai/ai-paths/components/ai-paths-settings/__tests__/useAiPathsSettingsPathActions.switch-path.test.tsx`
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs`
  - strengthened `checkParameterInferenceTargetPathSanitizationPrune` to forbid legacy deprecated snippets.
  - added `checkRuntimeAndNodeIdentityReasonChannelPrune` to:
    - block reintroduction of deprecated runtime/node-identity reason channels and fallback-reason checks.
    - require canonical unsupported runtime/node-identity reason snippets across runtime/path sanitizers and path-switch fallback.
- Validation:
  - `npx vitest run src/features/ai/ai-paths/services/__tests__/path-run-executor.helpers.test.ts src/features/ai/ai-paths/services/__tests__/path-run-service.test.ts src/features/ai/ai-paths/components/__tests__/AiPathsSettingsUtils.sanitize-path-config.test.ts src/features/products/hooks/__tests__/useAiPathSettings.sanitize-loaded-path-config.test.ts src/features/ai/ai-paths/components/ai-paths-settings/__tests__/useAiPathsSettingsPathActions.switch-path.test.tsx` passes.
  - `npm run ai-paths:check:canonical` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npx tsc -p tsconfig.json --noEmit --incremental false --pretty false` passes.

## Next Item

Continue opportunistic canonicalization in remaining non-critical surfaces outside the current wave plan.

## Executed Item 114 (AI Paths Semantic-Grammar Edge Alias Compatibility Prune)

- Promoted semantic-grammar edge conversion to canonical edge fields only:
  - `src/shared/lib/ai-paths/core/semantic-grammar/serialize.ts`
  - removed serialization fallback reads from legacy edge aliases:
    - `source` / `target`
    - `sourceHandle` / `targetHandle`
  - semantic edge serialization now reads canonical `from` / `to` / `fromPort` / `toPort` only.
- Removed semantic-canvas deserialize alias rewrites:
  - `src/shared/lib/ai-paths/core/semantic-grammar/deserialize.ts`
  - `toAiEdge` now emits canonical edge shape only (`from`, `to`, `fromPort`, `toPort`) and no longer writes:
    - `source`
    - `target`
    - `sourceHandle`
    - `targetHandle`
- Updated regression coverage:
  - `src/shared/lib/ai-paths/core/semantic-grammar/__tests__/semantic-grammar.test.ts`
  - added coverage that alias-only edge fields are not upgraded during semantic serialization.
  - added coverage that semantic deserialization returns canonical edge keys only.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs`
  - added `checkSemanticGrammarEdgeAliasCompatibilityPrune` for serialize/deserialize modules.
  - refreshed `checkParameterInferenceTargetPathSanitizationPrune` expected snippets to current canonical unsupported semantics:
    - `AI Path config contains unsupported parameter inference target path.`
    - `reason: 'unsupported_parameter_inference_target_path'`
- Validation:
  - `npx vitest run src/shared/lib/ai-paths/core/semantic-grammar/__tests__/semantic-grammar.test.ts` passes.
  - `npm run ai-paths:check:canonical` passes.
  - `npm run typecheck` passes.

## Executed Item 115 (AI Paths Node-Identity Error Channel Canonicalization)

- Replaced legacy-specific node-identity rejection messages with canonical unsupported semantics across config/run guards:
  - `src/features/ai/ai-paths/components/AiPathsSettingsUtils.ts`
  - `src/features/products/hooks/useAiPathSettings.ts`
  - `src/features/ai/ai-paths/services/path-run-service.ts`
  - `src/app/api/ai-paths/runs/enqueue/handler.ts`
  - canonical messages now surface:
    - `AI Path config contains unsupported node identities.`
    - `AI Paths run graph contains unsupported node identities.`
- Updated regression coverage:
  - `src/features/ai/ai-paths/components/__tests__/AiPathsSettingsUtils.sanitize-path-config.test.ts`
  - `src/features/products/hooks/__tests__/useAiPathSettings.sanitize-loaded-path-config.test.ts`
  - `src/features/ai/ai-paths/services/__tests__/path-run-service.test.ts`
  - `src/app/api/ai-paths/runs/enqueue/handler.test.ts`
  - all legacy-message assertions now target canonical unsupported node-identity wording.
- Extended site-wide canonical guardrails:
  - `scripts/canonical/check-sitewide.mjs`
  - now blocks reintroduction of removed legacy-specific node-identity message snippets.
- Validation:
  - `npx vitest run src/features/ai/ai-paths/components/__tests__/AiPathsSettingsUtils.sanitize-path-config.test.ts src/features/products/hooks/__tests__/useAiPathSettings.sanitize-loaded-path-config.test.ts src/features/ai/ai-paths/services/__tests__/path-run-service.test.ts src/app/api/ai-paths/runs/enqueue/handler.test.ts` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npm run typecheck` passes.

## Executed Item 116 (Shared validationError Legacy AI Paths Canonicalizer Prune)

- Removed legacy AI Paths validation-message canonicalization shim from shared error constructor path:
  - `src/shared/errors/app-error.ts`
  - deleted legacy-message rewrite helper so `validationError` preserves caller-provided messages verbatim.
- Added regression coverage for non-rewrite behavior:
  - `src/shared/errors/__tests__/app-error.validation-error.test.ts`
  - verifies legacy AI Paths message variants are preserved as-is (no canonical rewrite).
  - confirmed classifier behavior remains stable in:
    - `src/shared/errors/__tests__/error-classifier.test.ts`
- Extended site-wide canonical guardrails:
  - `scripts/canonical/check-sitewide.mjs`
  - now blocks reintroduction of lowercase legacy AI Paths validation-message variants removed with this shim.
- Validation:
  - `npx vitest run src/shared/errors/__tests__/app-error.validation-error.test.ts src/shared/errors/__tests__/error-classifier.test.ts` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npm run typecheck` passes.

## Executed Item 117 (AI Paths Entity-Update simpleParameters Error Channel Canonicalization)

- Replaced legacy-specific simpleParameters rejection message with canonical unsupported semantics in entity-update handler:
  - `src/app/api/ai-paths/update/handler.ts`
  - message now surfaces:
    - `AI Paths product update payload contains unsupported "simpleParameters" alias. Use "parameters".`
- Updated regression coverage:
  - `__tests__/features/ai/ai-paths/api/update-handler.test.ts`
  - assertion now targets canonical unsupported simpleParameters message.
- Extended canonical AI-path guardrail:
  - `scripts/ai-paths/check-canonical.mjs`
  - `checkEntityUpdateSimpleParametersAliasPrune` now:
    - blocks reintroduction of deprecated simpleParameters rejection message.
    - requires canonical unsupported simpleParameters rejection message.
- Validation:
  - `npx vitest run __tests__/features/ai/ai-paths/api/update-handler.test.ts` passes.
  - `npm run ai-paths:check:canonical` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npx tsc -p tsconfig.json --noEmit --incremental false --pretty false` passes.

## Executed Item 118 (AI Paths Semantic-Subgraph Edge Alias Compatibility Prune)

- Removed semantic-subgraph edge alias writes from canonical path apply flow:
  - `src/shared/lib/ai-paths/core/semantic-grammar/subgraph.ts`
  - removed appended-edge alias fields:
    - `source`
    - `target`
    - `sourceHandle`
    - `targetHandle`
  - subgraph apply now emits canonical edge fields only:
    - `from`
    - `to`
    - `fromPort`
    - `toPort`
- Tightened semantic-grammar regression coverage:
  - `src/shared/lib/ai-paths/core/semantic-grammar/__tests__/semantic-grammar.test.ts`
  - alias-only edge serialization now asserts strict no-upgrade behavior (`fromNodeId` / `toNodeId` remain empty when only alias fields exist).
  - canvas semantic deserialization now asserts canonical edge keys only (no alias keys).
  - subgraph apply now asserts appended edges are canonical-only (no alias keys).
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs`
  - `checkSemanticGrammarEdgeAliasCompatibilityPrune` now also validates canonical edge shape in:
    - `src/shared/lib/ai-paths/core/semantic-grammar/subgraph.ts`
- Validation:
  - `npx vitest run src/shared/lib/ai-paths/core/semantic-grammar/__tests__/semantic-grammar.test.ts` passes.
  - `npm run ai-paths:check:canonical` passes.
  - `npm run typecheck` passes.

## Executed Item 119 (Chatbot Legacy Model-Override Payload Compatibility Hard-Cut)

- Removed legacy model-override compatibility from chatbot chat-send handler:
  - `src/app/api/chatbot/handler.ts`
  - `/api/chatbot` now rejects payloads that include `model` with:
    - `Chatbot payload contains unsupported model override.`
  - removed legacy model-override ignore channel (no more silent compatibility path).
- Removed frontend chat-send legacy `model` override emission:
  - `src/features/ai/chatbot/api/chat.ts`
  - `src/features/ai/chatbot/hooks/useChatbotLogic.ts`
  - `src/features/ai/chatbot/hooks/useChatbotMessagesState.ts`
  - `src/features/ai/chatbot/hooks/useChatbotMutations.ts`
- Updated API regression coverage:
  - `src/app/api/chatbot/handler.test.ts`
  - canonical payload path remains green.
  - legacy `model` override payload now rejects with unsupported model-override error.
- Extended site-wide canonical guardrails:
  - `scripts/canonical/check-sitewide.mjs`
  - now blocks reintroduction of legacy chatbot model-override compatibility channel:
    - `[chatbot][chat] Ignored legacy requested model in favor of Brain`
- Validation:
  - `npx vitest run src/app/api/chatbot/handler.test.ts` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npm run typecheck` passes.

## Executed Item 120 (AI Paths Semantic-Subgraph Dangling-Edge Alias Compatibility Prune)

- Removed semantic-subgraph dangling-edge endpoint fallback to legacy edge aliases:
  - `src/shared/lib/ai-paths/core/semantic-grammar/subgraph.ts`
  - `findSubgraphDanglingEdges` now resolves endpoints from canonical fields only:
    - `edge.from`
    - `edge.to`
  - removed fallback reads from:
    - `edge.source`
    - `edge.target`
- Updated regression coverage:
  - `src/shared/lib/ai-paths/core/semantic-grammar/__tests__/semantic-grammar.test.ts`
  - added subgraph dangling-edge canonicalization assertions:
    - alias-only edge shape is treated as dangling.
    - canonical edge shape remains non-dangling.
- Extended canonical AI-path guardrails:
  - `scripts/ai-paths/check-canonical.mjs`
  - `checkSemanticGrammarEdgeAliasCompatibilityPrune` now also:
    - blocks reintroduction of `edge.source` / `edge.target` fallback snippets in `semantic-grammar/subgraph.ts`.
    - requires canonical endpoint parsing snippets (`edge.from` / `edge.to`) in `semantic-grammar/subgraph.ts`.
- Validation:
  - `npx vitest run src/shared/lib/ai-paths/core/semantic-grammar/__tests__/semantic-grammar.test.ts` passes.
  - `npm run ai-paths:check:canonical` passes.
  - `npm run typecheck` passes.

## Executed Item 121 (Chatbot Jobs Legacy Requested-Model Compatibility Hard-Cut)

- Removed legacy requested-model compatibility from chatbot jobs enqueue handler:
  - `src/app/api/chatbot/jobs/handler.ts`
  - `/api/chatbot/jobs` now rejects payloads that include `model` with:
    - `Chatbot job payload contains unsupported model override.`
- Removed requested-model compatibility propagation from chatbot job payload options:
  - `src/app/api/chatbot/jobs/handler.ts`
  - `src/features/ai/chatbot/workers/chatbot-job-processor.ts`
  - canonical job payload options now persist Brain-applied metadata only.
- Removed enqueue contract alias field:
  - `src/shared/contracts/chatbot.ts`
  - `enqueueChatbotJobRequestSchema` no longer defines `model`.
- Updated API regression coverage:
  - `src/app/api/chatbot/jobs/handler.test.ts`
  - canonical enqueue path remains green.
  - legacy `model` override payload now rejects with unsupported model-override error.
- Extended site-wide canonical guardrails:
  - `scripts/canonical/check-sitewide.mjs`
  - now blocks reintroduction of chatbot-jobs requested-model compatibility snippets in runtime sources.
- Validation:
  - `npx vitest run src/app/api/chatbot/jobs/handler.test.ts` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npm run typecheck` passes.

## Executed Item 122 (AI Paths Bulk-Prune Phase 1 Foundation)

- Added centralized AI Paths legacy-prune manifest:
  - `scripts/ai-paths/legacy-prune-manifest.json`
  - seed manifest rules now cover canonical edge-shape and parameter-inference target-path channel invariants.
- Added shared manifest load/evaluation utility for scanner+guardrail reuse:
  - `scripts/ai-paths/legacy-prune-manifest-utils.mjs`
  - validates manifest schema and evaluates rule targets (`requiredSnippets` / `forbiddenSnippets`).
- Added bulk-prune scanner scaffold:
  - `scripts/ai-paths/bulk-prune.mjs`
  - Phase 1 supports:
    - `--mode scan` (evaluate manifest rules)
    - `--write-report <path>` (persist JSON report)
    - explicit `--mode apply` placeholder (not implemented in Phase 1)
- Added npm entrypoints for bulk workflow:
  - `package.json`
  - `ai-paths:bulk-prune:scan`
  - `ai-paths:bulk-prune:report`
- Wired canonical guardrail to consume manifest checks:
  - `scripts/ai-paths/check-canonical.mjs`
  - added `checkManifestLegacyPruneRules` that loads/evaluates manifest and reports violations.
- Validation:
  - `npm run ai-paths:bulk-prune:scan` passes.
  - `npm run ai-paths:check:canonical` passes.
  - `npm run typecheck` passes.

## Executed Item 123 (Filemaker Case-Resolver Parser Compatibility Surface Prune)

- Removed compatibility parser export dedicated to case-resolver consumers:
  - `src/features/filemaker/settings/database-getters.ts`
  - removed `parseFilemakerDatabaseForCaseResolver(...)`.
  - canonical parser path remains:
    - `parseFilemakerDatabase(...)`
- Updated Filemaker regression coverage imports/calls to canonical parser path:
  - `src/features/filemaker/__tests__/settings.test.ts`
  - `src/features/filemaker/__tests__/relations.test.ts`
- Extended site-wide canonical guardrails:
  - `scripts/canonical/check-sitewide.mjs`
  - now blocks reintroduction of:
    - `parseFilemakerDatabaseForCaseResolver`
- Validation:
  - `npx vitest run src/features/filemaker/__tests__/settings.test.ts src/features/filemaker/__tests__/relations.test.ts` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npx tsc -p tsconfig.json --noEmit --incremental false --pretty false` passes.

## Executed Item 124 (Shared Error Classifier Deprecated Snapshot-Key Compatibility Prune)

- Removed legacy deprecated-snapshot-key message compatibility matching from shared error classification:
  - `src/shared/errors/error-classifier.ts`
  - `classifyError` now treats unsupported settings payloads via canonical pattern only:
    - `includes unsupported keys`
  - removed deprecated compatibility pattern matching:
    - `deprecated ai snapshot keys`
- Removed deprecated-snapshot-key compatibility branches from validation suggested-action routing:
  - `src/shared/errors/error-classifier.ts`
  - persona/image-studio settings suggestions now key off canonical unsupported-key message channels only.
- Extended site-wide canonical guardrails:
  - `scripts/canonical/check-sitewide.mjs`
  - now blocks reintroduction of:
    - `deprecated ai snapshot keys`
- Validation:
  - `npx vitest run src/shared/errors/__tests__/error-classifier.test.ts` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npx tsc -p tsconfig.json --noEmit --incremental false --pretty false` passes.

## Executed Item 125 (DB Sync Unknown-Type + Error-Guidance Legacy Wording Canonicalization)

- Replaced legacy-labelled product AI job type fallback in DB sync with canonical token:
  - `src/shared/lib/db/services/sync/ai-sync.ts`
  - `unknown_legacy` -> `unknown`
- Added DB sync regression coverage:
  - `src/shared/lib/db/services/sync/__tests__/ai-sync.test.ts`
  - verifies canonical unknown-type fallback is used when Mongo source `type` is missing/blank.
- Replaced legacy-specific snapshot wording in shared validation guidance:
  - `src/shared/errors/error-classifier.ts`
  - `without legacy model snapshot fields` -> `without unsupported model snapshot fields`
- Updated error-classifier regression coverage:
  - `src/shared/errors/__tests__/error-classifier.test.ts`
  - now asserts canonical unsupported snapshot wording and blocks legacy phrasing.
- Extended site-wide canonical guardrails:
  - `scripts/canonical/check-sitewide.mjs`
  - now blocks reintroduction of:
    - `unknown_legacy`
    - `without legacy model snapshot fields.`
- Validation:
  - `npx vitest run src/shared/lib/db/services/sync/__tests__/ai-sync.test.ts src/shared/errors/__tests__/error-classifier.test.ts` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npm run typecheck` passes.

## Executed Item 126 (Product/Integrations Legacy Metadata-Channel Key Canonicalization)

- Replaced legacy metadata key in export-template unsupported-mapping rejection channels:
  - `src/features/integrations/services/export-template-repository.ts`
  - `src/app/api/v2/integrations/products/[id]/export-to-base/segments/preparation.ts`
  - `legacyMappingCount` -> `unsupportedMappingCount`
- Replaced legacy metadata key in product relation unsupported-field rejection channels:
  - `src/shared/lib/products/services/product-repository/mongo-product-repository-mappers.ts`
  - `legacyKeys` -> `unsupportedKeys`
- Extended site-wide canonical guardrails:
  - `scripts/canonical/check-sitewide.mjs`
  - now blocks reintroduction of:
    - `legacyMappingCount:`
    - `legacyKeys,`
- Validation:
  - `npx vitest run __tests__/features/integrations/services/export-template-repository.test.ts __tests__/app/api/integrations/products/export-to-base/helpers.test.ts __tests__/features/products/services/mongo-product-canonical-shape-guard.test.ts` passes (product guard suite remains skipped in this environment).
  - `npm run canonical:check:sitewide` passes.
  - `npm run typecheck` passes.

## Executed Item 127 (AI Paths Bulk-Prune Phase 2 Apply Engine + Manifest Replacements)

- Extended AI Paths bulk-prune manifest schema with deterministic replacement directives:
  - `scripts/ai-paths/legacy-prune-manifest.json`
  - added `replacements[]` mappings for:
    - AI Paths settings edge alias snippets.
    - loaded-path edge alias snippets.
    - semantic-grammar deserialize/subgraph alias-write snippets.
    - parameter-inference deprecated reason/message snippets.
  - manifest version bumped to `phase2-2026-03-05`.
- Extended shared manifest utility module:
  - `scripts/ai-paths/legacy-prune-manifest-utils.mjs`
  - added replacement schema validation (`from`, `to`, `replaceAll`).
  - added `applyLegacyPruneManifest(...)` with:
    - write mode + dry-run mode.
    - per-target replacement telemetry.
    - changed-file + replaced-snippet summary counters.
- Implemented bulk-prune apply workflow:
  - `scripts/ai-paths/bulk-prune.mjs`
  - `--mode apply` now executes manifest replacements and re-runs manifest findings check post-apply.
  - added `--dry-run` flag.
  - report output now includes:
    - apply summary (`changedFileCount`, `replacedSnippetCount`).
    - per-target replacement execution details.
- Added npm entrypoints for apply workflow:
  - `package.json`
  - `ai-paths:bulk-prune:apply:dry-run`
  - `ai-paths:bulk-prune:apply`
- Validation:
  - `npm run ai-paths:bulk-prune:scan` passes.
  - `npm run ai-paths:bulk-prune:apply:dry-run -- --write-report docs/metrics/ai-paths-bulk-prune-apply-dry-run-latest.json` passes.
  - `npm run ai-paths:bulk-prune:apply` passes.
  - `npm run ai-paths:check:canonical` passes (`4237` files scanned).
  - `npm run typecheck` fails due pre-existing unrelated edge-shape migration compile errors (`source` / `target` property usage across Case Resolver and AI Paths simulation modules).

## Executed Item 128 (AI Paths Factory/Node-Identity Edge Alias Cleanup Prune)

- Removed legacy edge-alias cleanup branches from AI Paths factory canonicalization:
  - `src/shared/lib/ai-paths/core/utils/factory.ts`
  - `canonicalizePathNodes` no longer strips edge `source`/`target` alias keys as part of remap flow.
- Removed legacy edge-alias cleanup branches from AI Paths node-identity repair:
  - `src/shared/lib/ai-paths/core/utils/node-identity.ts`
  - `repairPathNodeIdentities` no longer treats `source`/`target` key presence as a compatibility-mutation trigger.
- Extended AI Paths canonical guardrails:
  - `scripts/ai-paths/check-canonical.mjs`
  - added `checkEdgeAliasCleanupCompatibilityPrune` guard to block reintroduction of legacy edge-alias cleanup snippets in:
    - `src/shared/lib/ai-paths/core/utils/factory.ts`
    - `src/shared/lib/ai-paths/core/utils/node-identity.ts`
- Validation:
  - `npx vitest run src/shared/lib/ai-paths/core/normalization/__tests__/node-identity-repair.test.ts src/shared/lib/ai-paths/core/semantic-grammar/__tests__/semantic-grammar.test.ts src/shared/lib/ai-paths/core/normalization/__tests__/validation-pattern-defaults.test.ts` passes.
  - `npm run ai-paths:check:canonical` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npx tsc -p tsconfig.json --noEmit --incremental false --pretty false` passes.

## Executed Item 129 (AI Paths/Integrations Legacy Guard Naming-Channel Canonicalization)

- Renamed AI Paths trigger-data guard naming to canonical unsupported semantics:
  - `src/features/ai/ai-paths/components/AiPathsSettingsUtils.ts`
  - `src/features/products/hooks/useAiPathSettings.ts`
  - `LEGACY_TRIGGER_DATA_PORTS` -> `UNSUPPORTED_TRIGGER_DATA_PORTS`
  - `assertNoLegacyTriggerDataGraph` -> `assertNoUnsupportedTriggerDataGraph`
  - `legacyPorts` -> `unsupportedPorts`
- Renamed integrations export-template guard naming to canonical unsupported semantics:
  - `src/features/integrations/services/export-template-repository.ts`
  - `src/app/api/v2/integrations/products/[id]/export-to-base/segments/preparation.ts`
  - `assertNoLegacyParameterSourceMappings` -> `assertNoUnsupportedParameterSourceMappings`
  - `legacyMappings` -> `unsupportedMappings`
- Extended site-wide canonical guardrails:
  - `scripts/canonical/check-sitewide.mjs`
  - now blocks reintroduction of legacy guard/channel naming snippets:
    - `LEGACY_TRIGGER_DATA_PORTS`
    - `assertNoLegacyTriggerDataGraph`
    - `assertNoLegacyParameterSourceMappings`
    - `const legacyMappings =`
    - `const legacyPorts =`
- Validation:
  - `npx vitest run src/features/ai/ai-paths/components/__tests__/AiPathsSettingsUtils.sanitize-path-config.test.ts src/features/products/hooks/__tests__/useAiPathSettings.sanitize-loaded-path-config.test.ts __tests__/features/integrations/services/export-template-repository.test.ts __tests__/app/api/integrations/products/export-to-base/helpers.test.ts` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npm run typecheck` currently fails due unrelated pre-existing Case Resolver edge-shape drift (outside this slice), e.g.:
    - `src/features/case-resolver/composer.ts`
    - `src/features/case-resolver/settings.edge-validation.ts`
    - `src/features/case-resolver/settings-relation-graph.ts`

## Executed Item 130 (Integrations Parameter-Source Prefix Naming-Channel Canonicalization)

- Renamed integrations runtime parameter-source prefix constants to canonical unsupported naming:
  - `src/features/integrations/services/export-template-repository.ts`
  - `src/app/api/v2/integrations/products/[id]/export-to-base/segments/preparation.ts`
  - `LEGACY_PARAMETER_SOURCE_PREFIX` -> `UNSUPPORTED_PARAMETER_SOURCE_PREFIX`
- Renamed import/export template editor parameter-source guard naming to canonical unsupported semantics:
  - `src/features/data-import-export/context/import-export/useImportExportTemplates.ts`
  - `LEGACY_EXPORT_PARAMETER_SOURCE_PREFIX` -> `UNSUPPORTED_EXPORT_PARAMETER_SOURCE_PREFIX`
  - `hasLegacyExportParameterSourceMapping` -> `hasUnsupportedExportParameterSourceMapping`
- Extended site-wide canonical guardrails:
  - `scripts/canonical/check-sitewide.mjs`
  - now blocks reintroduction of:
    - `LEGACY_PARAMETER_SOURCE_PREFIX`
    - `LEGACY_EXPORT_PARAMETER_SOURCE_PREFIX`
    - `hasLegacyExportParameterSourceMapping`
- Validation:
  - `npx vitest run __tests__/features/integrations/services/export-template-repository.test.ts __tests__/app/api/integrations/products/export-to-base/helpers.test.ts` passes.
  - `npm run canonical:check:sitewide` passes.
  - `npm run typecheck` currently fails due unrelated pre-existing Case Resolver edge-shape drift (outside this slice), e.g.:
    - `src/features/case-resolver/components/CaseResolverNodeFileWorkspace.tsx`
    - `src/features/case-resolver/hooks/useNodeFileWorkspaceState.ts`

## Executed Item 131 (AI Paths Bulk-Prune Phase 2 Coverage Expansion + Phase 3 Manifest-First Consolidation Start)

- Expanded AI Paths bulk-prune manifest coverage beyond seed rules:
  - `scripts/ai-paths/legacy-prune-manifest.json`
  - rule/target scope now:
    - `15` rules
    - `20` targets
  - added new rule families for:
    - database template/input catalog alias compatibility prune.
    - db-action provider/request alias prune.
    - database client legacy-route/payload alias prune.
    - API client CSRF helper alias prune.
    - db-schema provider `all` alias prune.
    - entity-update `simpleParameters` alias prune.
    - database-settings target-path edit-time canonicalization.
    - starter-workflow edge alias prune.
    - core edge-alias cleanup prune (`factory` / `node-identity`).
- Started Phase 3 guardrail consolidation (manifest-first):
  - `scripts/ai-paths/check-canonical.mjs`
  - removed direct execution of migrated bespoke checks from `main` so those surfaces are now enforced by:
    - `checkManifestLegacyPruneRules`
  - retained bespoke checks for non-manifested logic only (cross-file scans, file presence checks, and dynamic validations).
- Validation:
  - `npm run ai-paths:bulk-prune:scan` passes (`15` rules across `20` targets).
  - `npm run ai-paths:bulk-prune:apply:dry-run -- --write-report docs/metrics/ai-paths-bulk-prune-apply-dry-run-latest.json` passes.
  - `npm run ai-paths:check:canonical` passes (`4237` files scanned).
  - `npm run typecheck` fails due pre-existing unrelated Case Resolver edge-shape contract drift:
    - `src/features/case-resolver/hooks/useNodeFileWorkspaceState.ts`
    - `src/features/case-resolver/node-file-snapshots.ts`
    - `src/features/case-resolver/settings-graph.ts`

## Executed Item 132 (AI Paths Phase 3 Provider-Fallback/Alias Manifest Consolidation)

- Expanded manifest coverage for database provider fallback/alias compatibility surfaces:
  - `scripts/ai-paths/legacy-prune-manifest.json`
  - added rule:
    - `database_provider_fallback_alias_metadata`
  - new targets:
    - `src/shared/lib/ai-paths/core/runtime/handlers/integration-database-query-execution.ts`
    - `src/shared/lib/ai-paths/core/runtime/handlers/integration-database-update-execution.ts`
    - `src/features/ai/ai-paths/components/ai-paths-settings/runtime/useAiPathsLocalExecution.helpers.ts`
  - rule enforces canonical metadata channels (`requestedProvider` / `resolvedProvider`) and blocks fallback/provider alias snippet reintroduction.
- Consolidated check-canonical execution path for provider fallback/alias checks:
  - `scripts/ai-paths/check-canonical.mjs`
  - removed direct `main` execution of:
    - `checkDatabaseProviderFallbackCompatibilityPrune`
    - `checkDatabaseProviderAliasCompatibilityPrune`
    - `checkDatabaseUpdateProviderAliasCompatibilityPrune`
    - `checkDatabaseQueryProviderResponseAliasCompatibilityPrune`
  - these surfaces are now enforced via:
    - `checkManifestLegacyPruneRules`
- Validation:
  - `npm run ai-paths:bulk-prune:scan` passes (`16` rules across `23` targets).
  - `npm run ai-paths:bulk-prune:apply:dry-run -- --write-report docs/metrics/ai-paths-bulk-prune-apply-dry-run-latest.json` passes.
  - `npm run ai-paths:bulk-prune:apply` passes.
  - `npm run ai-paths:check:canonical` passes (`4237` files scanned).
  - `npm run typecheck` fails due pre-existing unrelated runtime typing drift:
    - `src/shared/lib/ai-paths/core/runtime/engine-modules/engine-state-manager.ts`
