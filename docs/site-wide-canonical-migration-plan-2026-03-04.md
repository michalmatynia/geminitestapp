# Site-Wide Canonical Migration Plan (2026-03-04)

Date: 2026-03-04  
Owner: Platform + feature maintainers (Products, Integrations, AI Paths, AI Brain, Case Resolver, CMS)

## Objective

Move all runtime surfaces to the newest canonical contracts and remove remaining legacy-compatibility behavior, while preserving controlled migration tooling for persisted data.

This plan extends the completed wave log in `docs/canonical-migration-inventory-2026-03-04.md` and defines the next site-wide hardening program.

## Execution Status (2026-03-04)

Wave 0 scaffolding started and delivered:

1. Canonical matrix published:
   - `docs/canonical-contract-matrix-2026-03-04.md`
2. Exception register published:
   - `docs/legacy-compatibility-exception-register-2026-03-04.json`
   - `docs/legacy-compatibility-exception-register-2026-03-04.md`
3. Site-wide guardrail check added:
   - `scripts/canonical/check-sitewide.mjs`
   - npm script: `canonical:check:sitewide`
   - CI job: `canonical-sitewide` in `.github/workflows/test-matrix.yml`
   - `test:ci` now includes `canonical:check:sitewide`

Wave 1 execution kickoff started:

1. Dry-run verification runner added:
   - `scripts/db/prepare-wave1-dry-run-verification.mjs`
2. Wave 1 dry-run runbook + report template added:
   - `docs/migrations/wave1-dry-run-verification-2026-03-04.md`
   - `docs/migrations/wave1-report-template.json`
3. npm entrypoints added:
   - `wave1:verify:prepare`
   - `wave1:verify:dry-run`
   - `wave1:verify:write`
4. Local dry-run verification executed:
   - report: `docs/migrations/reports/wave1-dry-run-local.json`
   - result: `10` success / `0` failed (AI Paths config contract timeout fixed; command now exits cleanly)
5. Staging dry-run verification executed:
   - report: `docs/migrations/reports/wave1-dry-run-staging-2026-03-04.json`
   - result: `10` success / `0` failed
6. Wave 1 environment summary published:
   - `docs/migrations/wave1-verification-summary-2026-03-04.md`
7. Prod dry-run verification executed:
   - report: `docs/migrations/reports/wave1-dry-run-prod-2026-03-04.json`
   - result: `10` success / `0` failed
8. Local write-mode verification executed:
   - report: `docs/migrations/reports/wave1-write-local-2026-03-04.json`
   - result: `10` success / `0` failed (`aggregate updateCount=0`)
9. Staging write-mode verification executed:
   - report: `docs/migrations/reports/wave1-write-staging-2026-03-04.json`
   - result: `10` success / `0` failed (`aggregate updateCount=0`)
10. Prod write-mode verification executed:
   - report: `docs/migrations/reports/wave1-write-prod-2026-03-04.json`
   - result: `10` success / `0` failed (`aggregate updateCount=0`)
11. Wave 1 apply summary published:
   - `docs/migrations/wave1-apply-summary-2026-03-04.md`

Wave 2 hard-cut execution started:

1. AI Brain provider catalog strict mode enforced:
   - `parseBrainProviderCatalog` now rejects deprecated pool arrays and accepts canonical `entries` only.
   - updated tests:
     - `src/shared/lib/ai-brain/__tests__/settings.test.ts`
     - `src/shared/lib/ai-brain/__tests__/server-model-catalog.test.ts`
2. Integrations imports root canonical actions only:
   - removed legacy `action=import` runtime branch from:
     - `src/app/api/v2/integrations/imports/base/handler.ts`
   - validated with:
     - `src/app/api/v2/integrations/imports/base/routes-parity.test.ts`
3. Products metadata canonical response contract hard-cut:
   - removed `groupType` compatibility response alias from price-group metadata handlers:
     - `src/app/api/v2/products/metadata/handler.ts`
     - `src/app/api/v2/products/metadata/[type]/[id]/handler.ts`
   - canonical contract test now covers the route:
     - `src/app/api/v2/products/metadata/handler.canonical.test.ts`
4. Products legacy API deprecation gateway retired:
   - removed `/api/products` proxy-level `410` compatibility responder from:
     - `src/proxy.ts`
   - regression coverage now verifies standard API pass-through behavior:
     - `src/proxy.test.ts`
5. Repo hygiene leftovers removed + guarded:
   - removed empty legacy route namespaces:
     - `src/app/api/import`
     - `src/app/api/catalogs/assign`
     - `src/app/api/ai-paths/legacy-compat/counters`
   - `scripts/canonical/check-sitewide.mjs` now fails when those namespaces are reintroduced.
6. Exception register reconciled with completed hard-cuts:
   - removed stale temporary exceptions from:
     - `docs/legacy-compatibility-exception-register-2026-03-04.json`
   - removed IDs:
     - `products-api-legacy-gateway`
     - `integrations-base-import-action-import-rejection`
     - `ai-brain-provider-catalog-legacy-pools`
7. Migration-only helper relocation completed:
   - moved migration helpers from runtime source tree (`src/features/**`) to script-only tree (`scripts/db/lib/**`):
     - `src/features/integrations/services/imports/parameter-import/link-map-preference-migration.ts`
       -> `scripts/db/lib/integrations/link-map-preference-migration.ts`
     - `src/features/integrations/services/export-warehouse-preference-migration.ts`
       -> `scripts/db/lib/integrations/export-warehouse-preference-migration.ts`
     - `src/features/case-resolver/workspace-detached-contract-migration.ts`
       -> `scripts/db/lib/case-resolver/workspace-detached-contract-migration.ts`
   - migration scripts now import from `scripts/db/lib/**`:
     - `scripts/db/migrate-base-import-parameter-link-map-v2.ts`
     - `scripts/db/migrate-base-export-warehouse-preferences-v2.ts`
     - `scripts/db/migrate-case-resolver-workspace-detached-contract-v2.ts`
8. Exception register now contains no active temporary exceptions:
   - `docs/legacy-compatibility-exception-register-2026-03-04.json` now has `"exceptions": []`.
9. Dead parallel products API utility layer pruned:
   - removed unused runtime artifacts:
     - `src/features/products/api/versioning.ts`
     - `src/features/products/api/routes/v2-products-route.ts`
   - removed their isolated tests:
     - `src/features/products/api/versioning.test.ts`
     - `src/features/products/api/routes/v2-products-route.test.ts`
   - removed stale exports from:
     - `src/features/products/api/server.ts`
     - `src/features/products/server.ts`
10. Wave 4 guardrails extended in site-wide canonical check:
   - `scripts/canonical/check-sitewide.mjs` now blocks reintroduction of:
     - products legacy gateway token (`LEGACY_PRODUCTS_PREFIX = '/api/products'`)
     - integrations legacy imports action rejection token (`Legacy imports/base action "import" is no longer supported.`)
     - AI Brain legacy provider-catalog merge helper token (`resolveLegacyProviderCatalogEntries`)
11. Products legacy API utility reintroduction guard added:
   - `scripts/canonical/check-sitewide.mjs` now fails if these removed files reappear:
     - `src/features/products/api/versioning.ts`
     - `src/features/products/api/routes/v2-products-route.ts`
12. Products metadata request-alias hard-cut:
   - removed `groupType` request alias handling from:
     - `src/app/api/v2/products/metadata/handler.ts`
     - `src/app/api/v2/products/metadata/[type]/[id]/handler.ts`
   - canonical request/behavior coverage:
     - `src/app/api/v2/products/metadata/handler.canonical.test.ts`
   - site-wide guardrail now blocks `groupType` request-alias snippets in those handlers.
13. CSRF request-header alias hard-cut:
   - removed runtime CSRF request-header fallback alias support:
     - removed `x-xsrf-token` acceptance from `src/shared/lib/security/csrf.ts`
   - removed dead legacy header-alias constant:
     - `src/shared/lib/security/csrf-client.ts` (`CSRF_HEADER_FALLBACK`)
   - added canonical regression coverage:
     - `src/shared/lib/security/__tests__/csrf.test.ts`
   - site-wide guardrail now blocks CSRF legacy alias snippets:
     - `x-xsrf-token`
     - `CSRF_HEADER_FALLBACK`
14. Metadata canonical contract test naming finalized:
   - renamed metadata test surface from compatibility naming to canonical naming:
     - `src/app/api/v2/metadata/handler.compat.test.ts` -> `src/app/api/v2/metadata/handler.canonical.test.ts`
   - aligned test suite naming to canonical-contract language in:
     - `src/app/api/v2/metadata/handler.canonical.test.ts`
15. AI Paths settings edge-shape alias hard-cut:
   - removed edge-source fallback alias reads from settings sanitization:
     - `src/features/ai/ai-paths/components/AiPathsSettingsUtils.ts`
     - removed `source` / `sourceHandle` fallback reads in trigger-edge compatibility checks.
   - added canonical regression coverage:
     - `src/features/ai/ai-paths/components/__tests__/AiPathsSettingsUtils.sanitize-path-config.test.ts`
     - verifies alias-only edge payload shape is rejected as non-canonical.
   - AI-path canonical guardrail now blocks reintroduction of settings edge alias snippets:
     - `scripts/ai-paths/check-canonical.mjs`
16. Compatibility test filename guard + remaining runtime compat filename cleanup:
   - renamed remaining test files with compatibility naming:
     - `src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.on-halt-compat.test.ts`
       -> `src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.on-halt-canonical.test.ts`
     - `__tests__/shared/lib/query-factories-compat.test.tsx`
       -> `__tests__/shared/lib/query-factories-v2-behavior.test.tsx`
   - extended site-wide guardrail to block reintroduction of compatibility test filenames under `src/**` and `__tests__/**`:
     - `scripts/canonical/check-sitewide.mjs` now fails on `*.compat.test.ts(x)` files in both trees.
17. CMS theme color-scheme alias hard-cut:
   - removed legacy color-scheme alias payload parsing from runtime theme AI parsing:
     - `src/features/cms/components/page-builder/theme/theme-utils.ts`
     - removed alias support for `schemeName`, `title`, `palette`, `scheme`, and color aliases (`bg`, `layer`, `card`, `foreground`, `primary`, `outline`).
   - removed text parsing alias labels for theme AI preview parsing:
     - `src/features/cms/components/page-builder/theme/ThemeColorsContext.tsx`
     - `parseSchemeFromText` now accepts canonical labels only (`name`, `background`, `surface`, `text`, `accent`, `border`).
   - added canonical regression coverage:
     - `src/features/cms/components/page-builder/theme/__tests__/theme-utils.test.ts`
   - extended CMS page-builder runtime prune guard:
     - `src/features/cms/migrations/__tests__/page-builder-runtime-prune.test.ts`
     - now blocks theme color-scheme alias snippet reintroduction.
18. CMS theme AI text-fallback parsing hard-cut:
   - removed regex/key-value text fallback parser from runtime theme AI output handling:
     - `src/features/cms/components/page-builder/theme/ThemeColorsContext.tsx`
     - theme AI parsing now delegates only to canonical utility parser.
   - introduced canonical text parser utility flow:
     - `src/features/cms/components/page-builder/theme/theme-utils.ts`
     - `parseColorSchemeFromText` now accepts JSON payload extraction + canonical payload validation only.
   - extended canonical regression coverage:
     - `src/features/cms/components/page-builder/theme/__tests__/theme-utils.test.ts`
     - verifies non-JSON text fallback parsing is rejected.
   - extended CMS page-builder runtime prune guard:
     - `src/features/cms/migrations/__tests__/page-builder-runtime-prune.test.ts`
     - blocks regex fallback parser snippet reintroduction.
19. Mongo product shape-guard canonical naming alignment:
   - renamed remaining legacy-named integration guard test:
     - `__tests__/features/products/services/mongo-product-legacy-shape-guard.test.ts`
       -> `__tests__/features/products/services/mongo-product-canonical-shape-guard.test.ts`
   - renamed integration command to canonical naming:
     - `test:integration:mongo:legacy-shape-guard`
       -> `test:integration:mongo:canonical-shape-guard`
   - renamed runtime toggle env to canonical naming:
     - `RUN_MONGO_PRODUCT_LEGACY_SHAPE_GUARD`
       -> `RUN_MONGO_PRODUCT_CANONICAL_SHAPE_GUARD`
   - extended site-wide guardrail to block reintroduction of the removed legacy test filename:
     - `scripts/canonical/check-sitewide.mjs`
20. AI Paths DB-action request-alias hard-cut:
   - removed legacy DB-action request alias acceptance from canonical contract:
     - `src/app/api/ai-paths/db-action/handler.ts`
     - schema now rejects legacy alias keys (`query`, `updates`) and runtime reads canonical keys only (`filter`, `update`).
   - aligned canonical DB-action client request mapping:
     - `src/shared/lib/ai-paths/api/client/database.ts`
     - `databaseQuery` now sends `filter: payload.query`.
   - updated canonical route contract coverage:
     - `src/shared/lib/ai-paths/api/__tests__/database-client.canonical.test.ts`
     - `__tests__/features/ai/ai-paths/api/db-query.test.ts`
   - extended AI-path canonical guardrail:
     - `scripts/ai-paths/check-canonical.mjs`
     - blocks alias fallback snippet reintroduction and requires canonical `filter`/`update` contract snippets.
21. CMS theme AI strict JSON-only text parser hard-cut:
   - removed embedded/fenced JSON extraction compatibility from runtime theme text parsing:
     - `src/features/cms/components/page-builder/theme/theme-utils.ts`
     - `parseColorSchemeFromText` now accepts strict JSON only (`JSON.parse(trimmed)`), then canonical payload validation.
   - updated canonical regression coverage:
     - `src/features/cms/components/page-builder/theme/__tests__/theme-utils.test.ts`
     - now rejects markdown-fenced JSON text as non-canonical input.
   - extended CMS runtime prune guard:
     - `src/features/cms/migrations/__tests__/page-builder-runtime-prune.test.ts`
     - blocks reintroduction of fenced/embedded JSON extraction snippets.
22. Category-mapper select-cell compatibility prop hard-cut:
   - removed dead `datalistId` compatibility prop from runtime category-mapper select cell:
     - `src/features/integrations/components/marketplaces/category-mapper/category-table/CategoryMapperSelectCell.tsx`
   - updated component regression tests to canonical prop surface only:
     - `src/features/integrations/components/marketplaces/category-mapper/category-table/__tests__/CategoryMapperSelectCell.test.tsx`
   - extended site-wide guardrail to block reintroduction of removed compatibility prop token:
     - `scripts/canonical/check-sitewide.mjs`
     - token: `datalistId?: string;`
23. AI Brain provider-catalog runtime migration fallback hard-cut:
   - removed runtime provider-catalog auto-migration path that accepted legacy pool-array payloads and rewrote them to canonical entries:
     - `src/shared/lib/ai-brain/server-model-catalog.ts`
   - provider catalog handling now keeps strict runtime behavior:
     - parse canonical `entries` payloads only via `parseBrainProviderCatalog`.
     - on invalid payload (including legacy pool-array keys), reset to canonical defaults only.
   - updated canonical regression coverage:
     - `src/shared/lib/ai-brain/__tests__/server-model-catalog.test.ts`
     - now verifies legacy pool-array payloads trigger reset behavior (`PROVIDER_CATALOG_RESET`) rather than migration.
   - extended site-wide guardrail to block reintroduction of runtime provider-catalog migration messaging:
     - `scripts/canonical/check-sitewide.mjs`
   - tokens:
     - `PROVIDER_CATALOG_MIGRATED`
     - `contained legacy payload fields and was migrated to canonical entries[]`
24. AI Paths DB client query/update payload contract canonicalization:
   - canonicalized DB client payload contracts to canonical keys only:
     - `src/shared/lib/ai-paths/api/client/database.ts`
     - `DbQueryPayload` now uses `filter` (legacy `query` removed).
     - `DbUpdatePayload` now uses `filter` + `update` (legacy `query` / `updates` removed).
   - propagated canonical payload key usage through runtime call sites:
     - `src/shared/lib/ai-paths/core/runtime/utils.ts`
     - `src/features/ai/ai-paths/components/AiPathsSettingsUtils.ts`
     - `src/shared/lib/ai-paths/core/runtime/handlers/integration-database-query-execution.ts`
     - `src/shared/lib/ai-paths/core/runtime/handlers/integration-database-update-execution.ts`
     - `src/shared/lib/ai-paths/core/runtime/handlers/integration-database-update-operation.ts`
     - `src/shared/lib/ai-paths/core/runtime/handlers/integration-database-mongo-actions.ts`
     - `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsSettingsSamples.ts`
     - `src/app/api/v2/products/validator-runtime/evaluate/handler.ts`
   - updated canonical regression coverage:
     - `src/shared/lib/ai-paths/api/__tests__/database-client.canonical.test.ts`
     - `__tests__/features/ai/ai-paths/runtime/handlers/integration.test.ts`
   - extended AI-path canonical guardrail:
     - `scripts/ai-paths/check-canonical.mjs`
     - blocks reintroduction of legacy `DbQueryPayload.query` / `DbUpdatePayload.query|updates` snippets and legacy payload forwarding.
25. Shared base-contract legacy marker cleanup:
   - removed stale legacy marker text from shared base contracts:
     - `src/shared/contracts/base.ts`
     - removed `(legacy support)` marker from:
       - `BaseEntity` doc comment
       - `NamedEntity` doc comment
   - extended site-wide guardrail to block reintroduction of that legacy marker:
     - `scripts/canonical/check-sitewide.mjs`
     - token: `(legacy support)`
26. Products paged route handler-import canonical guardrail:
   - hardened site-wide canonical guard against stale alias handler imports for products paged route:
     - `scripts/canonical/check-sitewide.mjs`
   - guard now blocks reintroduction of alias handler import snippet in:
     - `src/app/api/v2/products/paged/route.ts`
     - forbidden snippet: `@/app/api/products/paged/handler`
   - guard requires canonical local handler import snippet:
     - `import { GET_handler } from './handler';`
   - ensures regression protection for module-resolution failures after products route canonicalization.
27. Prompt Exploder settings deprecated-ai-keys compatibility channel hard-cut:
   - removed Prompt Exploder runtime parser’s legacy-specific error channel and deprecated-key payload field:
     - `src/features/prompt-exploder/settings.ts`
     - removed `deprecated_ai_keys` code / `deprecatedKeys` field / `deprecatedAiKeysError` branch.
   - canonical parser behavior now rejects non-canonical AI keys through generic invalid-shape contract:
     - message detail: `ai contains unsupported keys: ...`
   - updated Prompt Exploder settings coverage:
     - `src/features/prompt-exploder/__tests__/settings.test.ts`
     - `__tests__/features/prompt-exploder/settings.test.ts`
     - `__tests__/features/prompt-exploder/AdminPromptExploderSettingsPage.test.tsx`
   - extended site-wide canonical guardrail:
     - `scripts/canonical/check-sitewide.mjs`
     - blocks reintroduction of deprecated-ai-keys parser snippets in Prompt Exploder settings parser and requires unsupported-key invalid-shape snippet.
28. Mongo product write legacy cleanup branch hard-cut:
   - removed runtime legacy field cleanup branch from Mongo product update writes:
     - `src/shared/lib/products/services/product-repository/mongo/write.ts`
     - removed `legacyUnset` branch that attempted to unset legacy fields (`name`, `description`, `categories`) during canonical updates.
   - runtime update writes now persist canonical fields only without legacy-shape cleanup side-effects.
   - extended site-wide canonical guardrail:
     - `scripts/canonical/check-sitewide.mjs`
     - blocks reintroduction of legacy unset cleanup snippet:
       - `legacyUnset['name'] = ''`
29. Case Resolver edge validation legacy-specific error-channel hard-cut:
   - removed legacy-specific error-branch messaging from canonical edge validation:
     - `src/features/case-resolver/settings.edge-validation.ts`
     - unsupported edge keys now always fail under canonical unsupported-field error semantics.
     - legacy port-name rejection now uses canonical unsupported-handle error semantics.
   - updated canonical regression assertions for node-file snapshot/workspace edge parsing:
     - `src/features/case-resolver/__tests__/nodefile-persistence.test.ts`
     - `src/features/case-resolver/__tests__/workspace.test.ts`
   - extended site-wide canonical guardrail:
     - `scripts/canonical/check-sitewide.mjs`
     - blocks reintroduction of removed legacy-specific error messages:
       - `Legacy Case Resolver edge fields are no longer supported.`
       - `Legacy Case Resolver edge port names are no longer supported.`
30. Prompt Exploder legacy capture-mode contract surface hard-cut:
   - removed unused legacy Prompt Exploder capture-mode schema/type contract surface:
     - `src/shared/contracts/prompt-exploder/settings.ts`
     - removed `promptExploderCaseResolverCaptureModeSchema` and `PromptExploderCaseResolverCaptureMode`.
   - pruned stale re-export/import edges:
     - `src/shared/contracts/prompt-exploder/case-resolver.ts`
     - `src/features/prompt-exploder/types.ts`
   - extended site-wide canonical guardrail:
     - `scripts/canonical/check-sitewide.mjs`
     - blocks reintroduction of Prompt Exploder legacy capture-mode schema tokens:
       - `promptExploderCaseResolverCaptureModeSchema`
       - `'fully-auto'`
31. Prompt Exploder runtime extraction-mode key naming canonicalization:
   - renamed Prompt Exploder runtime Case Resolver mode key to canonical extraction-mode naming:
     - `src/shared/contracts/prompt-exploder/settings.ts`
     - `caseResolverCaptureMode` -> `caseResolverExtractionMode`
   - propagated canonical key usage through runtime/UI surfaces:
     - `src/features/prompt-exploder/pages/AdminPromptExploderSettingsPage.tsx`
     - `src/features/prompt-exploder/components/SourcePromptPanel.tsx`
     - `src/features/prompt-exploder/components/PatternRuntimePanel.tsx`
     - `src/features/prompt-exploder/context/DocumentContext.tsx`
   - extended site-wide canonical guardrail:
     - `scripts/canonical/check-sitewide.mjs`
     - requires canonical extraction-mode key snippet in Prompt Exploder contract settings and blocks legacy key snippet reintroduction in Prompt Exploder runtime/contract sources.
32. Case Resolver node-file snapshot legacy-specific error-channel hard-cut:
   - removed legacy-specific node-file snapshot parser error messaging:
     - `src/features/case-resolver/node-file-snapshots.ts`
     - unexpected snapshot fields now fail under canonical unsupported-field semantics:
       - `Case Resolver node-file snapshot payload includes unsupported fields.`
   - updated canonical regression assertions across parser consumers:
     - `src/features/case-resolver/__tests__/nodefile-persistence.test.ts`
     - `src/features/case-resolver/__tests__/workspace.test.ts`
     - `src/features/case-resolver/__tests__/case-resolver-node-file-workspace.test.tsx`
   - extended site-wide canonical guardrail:
     - `scripts/canonical/check-sitewide.mjs`
     - blocks reintroduction of removed legacy-specific snapshot error message:
       - `Legacy Case Resolver node-file snapshot fields are no longer supported.`
33. AI Brain provider-catalog legacy pool-array error-channel hard-cut:
   - removed legacy-specific provider-catalog pool-array parser error branch:
     - `src/shared/lib/ai-brain/settings.ts`
     - removed `legacy_pool_keys_not_supported` reason channel and legacy migration message branch.
   - canonical parser now rejects legacy pool-array keys through existing unsupported-key path (`reason: 'unknown_keys'`).
   - resolved residual TS6133 from previous wave execution item by removing now-unused import in the same module.
   - extended site-wide canonical guardrail:
     - `scripts/canonical/check-sitewide.mjs`
     - blocks reintroduction of removed legacy pool-array error-channel snippets in AI Brain settings parser.
34. Case Resolver inline node-file snapshot legacy-specific error-channel hard-cut:
   - removed legacy-specific inline snapshot persistence error message and reason code:
     - `src/features/case-resolver/workspace-persistence-save.ts`
     - message now uses canonical unsupported semantics:
       - `Case Resolver inline node-file snapshots are unsupported.`
     - reason now uses canonical identifier:
       - `inline_node_file_snapshot_not_supported`
   - updated canonical regression assertions:
     - `src/features/case-resolver/__tests__/workspace-persistence.test.ts`
     - `src/features/case-resolver/__tests__/nodefile-persistence.test.ts`
   - extended site-wide canonical guardrail:
     - `scripts/canonical/check-sitewide.mjs`
     - blocks reintroduction of removed legacy-specific message and reason code:
       - `Legacy inline Case Resolver node-file snapshots are no longer supported.`
       - `legacy_inline_node_file_snapshot`
35. Chatbot settings deprecated-agent-keys error-channel hard-cut:
   - removed legacy-specific chatbot settings validation error channel:
     - `src/shared/contracts/chatbot.ts`
     - removed `deprecated_agent_model_keys` code path and `deprecatedKeys` field from runtime error type.
   - canonical parser behavior now rejects unsupported agent-model snapshot keys via generic invalid-shape contract:
     - `Chatbot settings payload includes unsupported keys: ...`
   - updated chatbot settings parse regression:
     - `__tests__/features/chatbot/api/chatbot-settings-parse.test.ts`
   - extended site-wide canonical guardrail:
     - `scripts/canonical/check-sitewide.mjs`
     - blocks reintroduction of deprecated-agent-keys chatbot contract snippets and requires canonical unsupported-keys snippet.
36. Product repository mapper legacy-specific error-channel hard-cut:
   - removed legacy-specific error messages from Mongo product repository mapper canonicalization guards:
     - `src/shared/lib/products/services/product-repository/mongo-product-repository-mappers.ts`
   - canonical unsupported-shape semantics now surface:
     - `Product <field> payload includes unsupported object shape.`
     - `Product categories payload includes unsupported fields.`
     - `Product producer relation payload includes unsupported fields.`
     - `Product tag relation payload includes unsupported fields.`
   - updated mapper regression assertions:
     - `src/shared/lib/products/services/product-repository/__tests__/mongo-product-repository-mappers.test.ts`
   - extended site-wide canonical guardrail:
     - `scripts/canonical/check-sitewide.mjs`
     - blocks reintroduction of removed legacy-specific product-mapper error messages.
37. Filemaker settings parser legacy-specific error-channel hard-cut:
   - removed legacy-specific Filemaker settings parser rejection messages:
     - `src/features/filemaker/filemaker-settings.database.ts`
   - canonical unsupported-shape semantics now surface for:
     - unsupported database version
     - deprecated `fullAddress` payloads
     - inline address field payloads
     - inline person/organization phoneNumbers payloads
     - inline person/organization email payloads
   - updated Filemaker settings parse regression assertions:
     - `src/features/filemaker/__tests__/settings.test.ts`
   - extended site-wide canonical guardrail:
     - `scripts/canonical/check-sitewide.mjs`
     - blocks reintroduction of removed legacy-specific Filemaker parser error-message snippets.
38. Agent Personas runtime snapshot-key compatibility hard-cut:
   - removed runtime snapshot-key stripping compatibility from Agent Personas parser:
     - `src/features/ai/agentcreator/utils/personas.ts`
     - `normalizeAgentPersonas` now rejects unsupported snapshot keys unconditionally.
     - `fetchAgentPersonas` now runs strict canonical normalization only (no runtime strip mode).
   - moved snapshot-key strip migration behavior to script-only path:
     - `scripts/db/migrate-agent-personas-snapshot-keys-v2.ts`
     - script now strips unsupported snapshot keys locally before strict canonical normalization.
   - updated canonical parser regression coverage:
     - `src/features/ai/agentcreator/__tests__/personas.test.ts`
   - extended site-wide canonical guardrail:
     - `scripts/canonical/check-sitewide.mjs`
     - blocks `stripDeprecatedSnapshotKeys` reintroduction in runtime Agent Personas utils and requires strict fetch-normalization snippet.
39. Image Studio runtime snapshot-key compatibility hard-cut:
   - removed runtime snapshot-key stripping compatibility from Image Studio settings parser:
     - `src/features/ai/image-studio/utils/studio-settings.ts`
     - `parseImageStudioSettings` now rejects deprecated snapshot fields via canonical unsupported-keys validation.
     - `parsePersistedImageStudioSettings` now runs strict canonical parsing only (no runtime strip mode).
   - moved snapshot-key strip migration behavior to script-only path:
     - `scripts/db/migrate-image-studio-settings-contract-v2.ts`
     - script now strips deprecated snapshot fields locally before strict canonical parsing.
   - updated canonical parser/classifier regression coverage:
     - `src/features/ai/image-studio/utils/__tests__/studio-settings.test.ts`
     - `src/shared/errors/__tests__/error-classifier.test.ts`
   - extended site-wide canonical guardrail:
     - `scripts/canonical/check-sitewide.mjs`
     - blocks Image Studio deprecated snapshot-key parser snippets and requires strict persisted-parse snippet.
40. AI Paths runtime-identity + trigger-data legacy-specific error-channel hard-cut:
   - removed legacy-specific AI Paths runtime-state identity rejection message:
     - `src/features/ai/ai-paths/components/AiPathsSettingsUtils.ts`
     - `src/features/ai/ai-paths/services/path-run-executor.helpers.ts`
     - canonical runtime-state unsupported semantics now surface:
       - `AI Paths runtime state payload includes unsupported identity fields.`
   - removed legacy-specific AI Paths trigger-data rejection messages:
     - `src/features/ai/ai-paths/components/AiPathsSettingsUtils.ts`
     - `src/features/products/hooks/useAiPathSettings.ts`
     - canonical config unsupported semantics now surface:
       - `AI Path config contains unsupported trigger output ports.`
       - `AI Path config contains unsupported trigger data edges.`
   - updated AI Paths settings path-switch runtime fallback to reason-based detection:
     - `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsSettingsPathActions.ts`
     - fallback recovery now keys on canonical validation reason (`deprecated_runtime_identity_fields`) plus invalid-runtime payload message channel, not legacy-specific message text.
   - updated regression assertions:
     - `src/features/ai/ai-paths/services/__tests__/path-run-executor.helpers.test.ts`
     - `src/features/ai/ai-paths/components/__tests__/AiPathsSettingsUtils.sanitize-path-config.test.ts`
     - `src/features/products/hooks/__tests__/useAiPathSettings.sanitize-loaded-path-config.test.ts`
     - `src/features/ai/ai-paths/components/ai-paths-settings/__tests__/useAiPathsSettingsPathActions.switch-path.test.tsx`
   - extended site-wide canonical guardrail:
     - `scripts/canonical/check-sitewide.mjs`
     - blocks reintroduction of removed legacy-specific AI Paths runtime-identity/trigger-data error-message snippets.
41. AI Paths DB schemaSnapshot + query-provider legacy-specific error-channel hard-cut:
   - replaced legacy-specific deprecated schema/provider error channels with canonical unsupported semantics across trigger/path sanitizers:
     - `src/shared/lib/ai-paths/core/normalization/trigger-normalization.ts`
     - `src/features/ai/ai-paths/components/AiPathsSettingsUtils.ts`
     - `src/features/products/hooks/useAiPathSettings.ts`
   - canonical messages now surface:
     - `AI Path trigger payload contains unsupported database schemaSnapshot.`
     - `AI Path trigger payload contains unsupported database query provider "all".`
     - `AI Path config contains unsupported database schemaSnapshot.`
     - `AI Path config contains unsupported database query provider "all".`
   - canonical reason channels now surface:
     - `unsupported_database_schema_snapshot`
     - `unsupported_database_query_provider`
   - updated regression assertions:
     - `src/features/ai/ai-paths/components/__tests__/AiPathsSettingsUtils.sanitize-path-config.test.ts`
     - `src/features/products/hooks/__tests__/useAiPathSettings.sanitize-loaded-path-config.test.ts`
     - `src/features/ai/ai-paths/hooks/__tests__/useAiPathTriggerEvent.sanitize.test.ts`
   - extended AI-path canonical guardrail:
     - `scripts/ai-paths/check-canonical.mjs`
     - added `checkDatabaseSchemaSnapshotProviderErrorChannelPrune` to block deprecated schema/provider snippets and require canonical unsupported snippets.
42. Integrations export-template parameter-source legacy-specific error-channel hard-cut:
   - removed legacy-specific parameter-source rejection messaging from export-template/runtime preparation paths:
     - `src/features/integrations/services/export-template-repository.ts`
     - `src/app/api/v2/integrations/products/[id]/export-to-base/segments/preparation.ts`
     - canonical unsupported semantics now surface:
       - `contains unsupported parameter source mappings ...`
   - removed legacy-specific export-template parameter-source toast messaging in import/export template editor flows:
     - `src/features/data-import-export/context/import-export/useImportExportTemplates.ts`
     - canonical unsupported semantics now surface for duplicate/create/save guards.
   - updated regression assertions:
     - `__tests__/features/integrations/services/export-template-repository.test.ts`
     - `__tests__/app/api/integrations/products/export-to-base/helpers.test.ts`
   - extended site-wide canonical guardrail:
     - `scripts/canonical/check-sitewide.mjs`
     - blocks reintroduction of removed legacy-specific export-template parameter-source error-message snippets.
43. AI Paths trigger-data + collection-alias reason-channel canonicalization:
   - replaced legacy trigger-data reason channels with canonical unsupported identifiers:
     - `src/features/ai/ai-paths/components/AiPathsSettingsUtils.ts`
     - `src/features/products/hooks/useAiPathSettings.ts`
     - `deprecated_trigger_outputs` -> `unsupported_trigger_outputs`
     - `deprecated_trigger_data_edge` -> `unsupported_trigger_data_edge`
   - replaced legacy collection-alias reason/message channel with canonical unsupported semantics:
     - `src/features/ai/ai-paths/components/AiPathsSettingsUtils.ts`
     - `src/features/products/hooks/useAiPathSettings.ts`
     - `deprecated_collection_aliases` -> `unsupported_collection_aliases`
     - `AI Path config contains deprecated collection aliases.` -> `AI Path config contains unsupported collection aliases.`
   - updated regression assertion:
     - `src/features/products/hooks/__tests__/useAiPathSettings.sanitize-loaded-path-config.test.ts`
   - extended AI-path canonical guardrail:
     - `scripts/ai-paths/check-canonical.mjs`
     - added `checkTriggerDataAndCollectionAliasErrorChannelPrune` to block deprecated reason/message snippets and require canonical unsupported snippets.
44. AI Paths node-identity legacy-specific error-channel hard-cut:
   - removed legacy-specific node-identity rejection messaging across path/run guards:
     - `src/features/ai/ai-paths/components/AiPathsSettingsUtils.ts`
     - `src/features/products/hooks/useAiPathSettings.ts`
     - `src/features/ai/ai-paths/services/path-run-service.ts`
     - `src/app/api/ai-paths/runs/enqueue/handler.ts`
   - canonical unsupported semantics now surface:
     - `AI Path config contains unsupported node identities.`
     - `AI Paths run graph contains unsupported node identities.`
   - updated regression assertions:
     - `src/features/ai/ai-paths/components/__tests__/AiPathsSettingsUtils.sanitize-path-config.test.ts`
     - `src/features/products/hooks/__tests__/useAiPathSettings.sanitize-loaded-path-config.test.ts`
     - `src/features/ai/ai-paths/services/__tests__/path-run-service.test.ts`
     - `src/app/api/ai-paths/runs/enqueue/handler.test.ts`
   - extended site-wide canonical guardrail:
     - `scripts/canonical/check-sitewide.mjs`
     - blocks reintroduction of removed legacy-specific node-identity error-message snippets.
45. Shared validationError legacy AI-Paths message canonicalizer prune:
   - removed legacy validation-message canonicalizer shim:
     - `src/shared/errors/app-error.ts`
     - `validationError` now preserves caller-provided messages verbatim instead of rewriting legacy AI Paths strings.
   - added regression coverage for verbatim validation-message behavior:
     - `src/shared/errors/__tests__/app-error.validation-error.test.ts`
     - locks three former legacy AI Paths message variants as pass-through (no rewrite).
   - extended site-wide canonical guardrail:
     - `scripts/canonical/check-sitewide.mjs`
     - now blocks lowercase legacy AI Paths validation message variants used by removed compatibility shim.
46. AI Paths runtime/node-identity + parameter-inference reason-channel canonicalization:
   - replaced legacy runtime-identity reason channel with canonical unsupported identifier:
     - `src/features/ai/ai-paths/components/AiPathsSettingsUtils.ts`
     - `src/features/ai/ai-paths/services/path-run-executor.helpers.ts`
     - `deprecated_runtime_identity_fields` -> `unsupported_runtime_identity_fields`
   - replaced legacy node-identity reason channel with canonical unsupported identifier:
     - `src/features/ai/ai-paths/components/AiPathsSettingsUtils.ts`
     - `src/features/products/hooks/useAiPathSettings.ts`
     - `src/features/ai/ai-paths/services/path-run-service.ts`
     - `deprecated_node_identities` -> `unsupported_node_identities`
   - replaced legacy parameter-inference target-path reason/message with canonical unsupported semantics:
     - `src/features/ai/ai-paths/components/AiPathsSettingsUtils.ts`
     - `src/features/products/hooks/useAiPathSettings.ts`
     - `deprecated_parameter_inference_target_path` -> `unsupported_parameter_inference_target_path`
     - `AI Path config contains deprecated parameter inference target path.` -> `AI Path config contains unsupported parameter inference target path.`
   - updated path-switch runtime fallback reason matching:
     - `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsSettingsPathActions.ts`
     - now keys on `errorReason === 'unsupported_runtime_identity_fields'`.
   - updated regression assertions:
     - `src/features/ai/ai-paths/components/__tests__/AiPathsSettingsUtils.sanitize-path-config.test.ts`
     - `src/features/products/hooks/__tests__/useAiPathSettings.sanitize-loaded-path-config.test.ts`
     - `src/features/ai/ai-paths/services/__tests__/path-run-executor.helpers.test.ts`
     - `src/features/ai/ai-paths/services/__tests__/path-run-service.test.ts`
     - `src/features/ai/ai-paths/components/ai-paths-settings/__tests__/useAiPathsSettingsPathActions.switch-path.test.tsx`
   - extended AI-path canonical guardrail:
     - `scripts/ai-paths/check-canonical.mjs`
     - strengthened `checkParameterInferenceTargetPathSanitizationPrune` to forbid legacy deprecated snippets.
     - added `checkRuntimeAndNodeIdentityReasonChannelPrune` to block deprecated runtime/node-identity reason channels and require canonical unsupported snippets.
47. AI Paths entity-update simpleParameters error-channel canonicalization:
   - replaced legacy-specific simpleParameters rejection message with canonical unsupported semantics:
     - `src/app/api/ai-paths/update/handler.ts`
     - `AI Paths product update payload contains deprecated "simpleParameters". Use "parameters".`
       -> `AI Paths product update payload contains unsupported "simpleParameters" alias. Use "parameters".`
   - updated regression assertion:
     - `__tests__/features/ai/ai-paths/api/update-handler.test.ts`
   - extended AI-path canonical guardrail:
     - `scripts/ai-paths/check-canonical.mjs`
     - `checkEntityUpdateSimpleParametersAliasPrune` now blocks deprecated message snippet and requires canonical unsupported message snippet.
48. Chatbot legacy model-override payload compatibility hard-cut:
   - removed legacy model-override compatibility from chat send handler:
     - `src/app/api/chatbot/handler.ts`
     - `/api/chatbot` now rejects payloads that include `model` with:
       - `Chatbot payload contains unsupported model override.`
   - removed frontend chat-send payload emission of legacy `model` override:
     - `src/features/ai/chatbot/api/chat.ts`
     - `src/features/ai/chatbot/hooks/useChatbotLogic.ts`
     - `src/features/ai/chatbot/hooks/useChatbotMessagesState.ts`
     - `src/features/ai/chatbot/hooks/useChatbotMutations.ts`
   - updated API regression coverage:
     - `src/app/api/chatbot/handler.test.ts`
     - canonical payload path remains green and legacy `model` override now rejects.
   - extended site-wide canonical guardrail:
     - `scripts/canonical/check-sitewide.mjs`
     - blocks reintroduction of legacy model-override ignore channel:
       - `[chatbot][chat] Ignored legacy requested model in favor of Brain`
49. Chatbot jobs legacy requested-model compatibility hard-cut:
   - removed legacy requested-model compatibility from chatbot jobs enqueue surface:
     - `src/app/api/chatbot/jobs/handler.ts`
     - `/api/chatbot/jobs` now rejects payloads that include `model` with:
       - `Chatbot job payload contains unsupported model override.`
   - removed legacy requested-model propagation from enqueue/worker payload options:
     - `src/app/api/chatbot/jobs/handler.ts`
     - `src/features/ai/chatbot/workers/chatbot-job-processor.ts`
     - canonical payload options now persist Brain-applied metadata only.
   - removed enqueue contract alias field:
     - `src/shared/contracts/chatbot.ts`
     - `enqueueChatbotJobRequestSchema` no longer defines `model`.
   - updated API regression coverage:
     - `src/app/api/chatbot/jobs/handler.test.ts`
     - canonical enqueue path remains green and legacy `model` override now rejects.
   - extended site-wide canonical guardrail:
     - `scripts/canonical/check-sitewide.mjs`
     - blocks reintroduction of chatbot-jobs requested-model compatibility snippets in runtime sources.
50. Filemaker case-resolver parser compatibility surface prune:
   - removed case-resolver-specific parser export from runtime Filemaker settings getters:
     - `src/features/filemaker/settings/database-getters.ts`
     - removed `parseFilemakerDatabaseForCaseResolver(...)` in favor of canonical parser-only surface.
   - updated Filemaker regression tests to use canonical parser calls:
     - `src/features/filemaker/__tests__/settings.test.ts`
     - `src/features/filemaker/__tests__/relations.test.ts`
   - extended site-wide canonical guardrail:
     - `scripts/canonical/check-sitewide.mjs`
     - blocks reintroduction of:
       - `parseFilemakerDatabaseForCaseResolver`
51. Shared error-classifier deprecated snapshot-key compatibility prune:
   - removed legacy deprecated-snapshot-key message matching from shared classifier:
     - `src/shared/errors/error-classifier.ts`
     - removed `deprecated ai snapshot keys` compatibility patterns from validation classification and action routing.
   - canonical settings-contract matching remains:
     - `includes unsupported keys`
   - extended site-wide canonical guardrail:
     - `scripts/canonical/check-sitewide.mjs`
     - blocks reintroduction of:
       - `deprecated ai snapshot keys`
52. DB-sync unknown-type + error-guidance legacy wording canonicalization:
   - replaced legacy-labelled DB sync fallback type with canonical token:
     - `src/shared/lib/db/services/sync/ai-sync.ts`
     - `unknown_legacy` -> `unknown`
   - added DB-sync regression coverage:
     - `src/shared/lib/db/services/sync/__tests__/ai-sync.test.ts`
     - verifies canonical unknown-type fallback for missing source `type`.
   - replaced legacy-specific snapshot wording in validation guidance:
     - `src/shared/errors/error-classifier.ts`
     - `without legacy model snapshot fields` -> `without unsupported model snapshot fields`
   - updated error-classifier regression assertions:
     - `src/shared/errors/__tests__/error-classifier.test.ts`
     - locks canonical unsupported snapshot wording and blocks legacy phrasing.
   - extended site-wide canonical guardrail:
     - `scripts/canonical/check-sitewide.mjs`
     - blocks reintroduction of:
       - `unknown_legacy`
       - `without legacy model snapshot fields.`
53. Product/integrations legacy metadata-channel key canonicalization:
   - replaced legacy metadata key in export-template unsupported-mapping rejection channels:
     - `src/features/integrations/services/export-template-repository.ts`
     - `src/app/api/v2/integrations/products/[id]/export-to-base/segments/preparation.ts`
     - `legacyMappingCount` -> `unsupportedMappingCount`
   - replaced legacy metadata key in product relation unsupported-field rejection channels:
     - `src/shared/lib/products/services/product-repository/mongo-product-repository-mappers.ts`
     - `legacyKeys` -> `unsupportedKeys`
   - extended site-wide canonical guardrail:
     - `scripts/canonical/check-sitewide.mjs`
     - blocks reintroduction of:
       - `legacyMappingCount:`
       - `legacyKeys,`
54. AI-Paths/Integrations legacy guard naming-channel canonicalization:
   - renamed AI Paths trigger-data guard naming to canonical unsupported semantics:
     - `src/features/ai/ai-paths/components/AiPathsSettingsUtils.ts`
     - `src/features/products/hooks/useAiPathSettings.ts`
     - `LEGACY_TRIGGER_DATA_PORTS` -> `UNSUPPORTED_TRIGGER_DATA_PORTS`
     - `assertNoLegacyTriggerDataGraph` -> `assertNoUnsupportedTriggerDataGraph`
     - `legacyPorts` -> `unsupportedPorts`
   - renamed integrations export-template guard naming to canonical unsupported semantics:
     - `src/features/integrations/services/export-template-repository.ts`
     - `src/app/api/v2/integrations/products/[id]/export-to-base/segments/preparation.ts`
     - `assertNoLegacyParameterSourceMappings` -> `assertNoUnsupportedParameterSourceMappings`
     - `legacyMappings` -> `unsupportedMappings`
   - extended site-wide canonical guardrail:
     - `scripts/canonical/check-sitewide.mjs`
     - blocks reintroduction of legacy guard/channel naming snippets:
       - `LEGACY_TRIGGER_DATA_PORTS`
       - `assertNoLegacyTriggerDataGraph`
       - `assertNoLegacyParameterSourceMappings`
       - `const legacyMappings =`
       - `const legacyPorts =`
55. AI Paths factory/node-identity edge-alias cleanup compatibility prune:
   - removed legacy edge-alias cleanup branches from AI Paths factory remap flow:
     - `src/shared/lib/ai-paths/core/utils/factory.ts`
     - `canonicalizePathNodes` no longer strips `source`/`target` alias keys during edge remap.
   - removed legacy edge-alias cleanup branches from AI Paths node-identity repair flow:
     - `src/shared/lib/ai-paths/core/utils/node-identity.ts`
     - `repairPathNodeIdentities` no longer treats alias-key presence as a compatibility-mutation trigger.
   - extended AI Paths canonical guardrail:
     - `scripts/ai-paths/check-canonical.mjs`
     - added `checkEdgeAliasCleanupCompatibilityPrune` to block reintroduction of legacy edge-alias cleanup snippets in:
       - `src/shared/lib/ai-paths/core/utils/factory.ts`
       - `src/shared/lib/ai-paths/core/utils/node-identity.ts`
56. Integrations parameter-source prefix naming-channel canonicalization:
   - renamed integrations runtime parameter-source prefix constants to canonical unsupported naming:
     - `src/features/integrations/services/export-template-repository.ts`
     - `src/app/api/v2/integrations/products/[id]/export-to-base/segments/preparation.ts`
     - `LEGACY_PARAMETER_SOURCE_PREFIX` -> `UNSUPPORTED_PARAMETER_SOURCE_PREFIX`
   - renamed import/export template editor guard naming to canonical unsupported semantics:
     - `src/features/data-import-export/context/import-export/useImportExportTemplates.ts`
     - `LEGACY_EXPORT_PARAMETER_SOURCE_PREFIX` -> `UNSUPPORTED_EXPORT_PARAMETER_SOURCE_PREFIX`
     - `hasLegacyExportParameterSourceMapping` -> `hasUnsupportedExportParameterSourceMapping`
   - extended site-wide canonical guardrail:
     - `scripts/canonical/check-sitewide.mjs`
     - blocks reintroduction of:
       - `LEGACY_PARAMETER_SOURCE_PREFIX`
       - `LEGACY_EXPORT_PARAMETER_SOURCE_PREFIX`
       - `hasLegacyExportParameterSourceMapping`

## Baseline (Current State)

Completed: major canonicalization waves across AI Paths, Case Resolver, Observability, Validation, Folder Tree/CMS, Integrations, Prompt Exploder, and token/credential storage.

Remaining candidate compatibility surfaces (runtime or repo hygiene):

- none currently identified from active Wave 3 scope.

## Scope Rules

In scope:
- Compatibility paths that accept, transform, or branch on legacy contract shapes.
- Compatibility API aliases/deprecation shims.
- Migration-only modules that should not live in runtime import surfaces.
- Dead compatibility artifacts (empty dirs, stale exports, stale tests).

Out of scope:
- Reliability fallbacks unrelated to legacy contracts (timeouts, retries, provider failover for availability).
- External third-party version labels that are current API requirements (for example vendor media-type versions).

## Program Structure

## Wave 0: Contract Freeze + Inventory Lock (1-2 days)

Goals:
- Freeze canonical targets per domain.
- Prevent new compatibility drift while migration proceeds.

Actions:
1. Publish canonical contract matrix (API path, payload shape, setting key, schema id) by domain.
2. Add a single “legacy compatibility exception” register with explicit expiry date.
3. Require all new fallback logic PRs to classify as either:
   - resilience fallback (allowed), or
   - legacy compatibility fallback (blocked unless exception approved).
4. Wire Wave 0 enforcement check:
   - `npm run canonical:check:sitewide`
   - validates required docs artifacts and exception-token scoping in runtime source.

Exit criteria:
- Canonical matrix approved.
- Compatibility exception register present and owned.
- Site-wide canonical scaffold check is CI-blocking.

## Wave 1: Data Canonicalization Verification (3-5 days)

Goals:
- Ensure persisted data no longer needs runtime compatibility readers.

Actions:
1. Run migration scripts in all target environments in dry-run then write mode (where needed):
   - `npm run products:normalize:v2`
   - `npm run migrate:ai-paths:config-contract:v2`
   - `npm run migrate:base-import-parameter-link-map:v2`
   - `npm run migrate:base-export-warehouse-preferences:v2`
   - `npm run migrate:base-connection-token-storage:v2`
   - `npm run migrate:base-token-encryption:v2`
   - `npm run migrate:tradera-api-credential-storage:v2`
   - `npm run migrate:tradera-api-user-id-storage:v2`
   - `npm run migrate:case-resolver:workspace-detached-contract:v2`
   - `npm run migrate:cms:page-builder-template-settings:v2`
2. Store dry-run/apply reports per environment.
3. Add a migration verification summary table to docs for each environment (scanned, changed, applied, blocked).

Exit criteria:
- No blocking legacy payload detections in active environments.
- Migration reports archived and linked.

## Wave 2: Runtime Compatibility Hard-Cut (1 sprint)

Goals:
- Remove remaining runtime compatibility adapters and keep canonical-only runtime behavior.

Actions:
1. Products API deprecation endgame:
   - retire `/api/products` compatibility gateway in `src/proxy.ts` once consumer usage is zero for agreed window.
2. Products metadata contract hard-cut:
   - remove compatibility-only response aliases/fields if clients no longer depend on them.
   - replace compatibility tests with canonical contract tests (`handler.canonical.test.ts`).
3. Integrations imports root cleanup:
   - narrow `src/app/api/v2/integrations/imports/base/handler.ts` to canonical actions only; remove legacy-branch handling once callers are clean.
4. AI Brain provider catalog strict mode:
   - stop accepting legacy pool-shaped payloads in `parseBrainProviderCatalog`.
   - accept canonical `entries` only; fail fast with migration guidance.

Exit criteria:
- Runtime no longer accepts legacy payload shapes in targeted areas.
- Compatibility tests replaced by canonical-only assertions.

## Wave 3: Source Tree Prune + Runtime Boundary Cleanup (3-5 days)

Goals:
- Remove or relocate migration-only code from runtime source tree.

Actions:
1. Move migration-only helpers from `src/features/**` to `scripts/db/lib/**`:
   - link-map preference migration helper
   - export-warehouse preference migration helper
   - case-resolver detached-contract migration helper
2. Keep runtime modules importing canonical parsers only.
3. Remove dead parallel API layer if confirmed unused:
   - `src/features/products/api/versioning.ts`
   - `src/features/products/api/routes/v2-products-route.ts`
4. Delete empty/stale legacy directories.

Exit criteria:
- No script-only migration helper remains in runtime import graph.
- Dead compatibility files/dirs removed.

## Wave 4: Guardrails and CI Enforcement (3-5 days)

Goals:
- Prevent reintroduction of compatibility paths after cutover.

Actions:
1. Extend canonical guard scripts beyond AI Paths/Observability to:
   - Products API compatibility tokens
   - Integrations legacy action tokens
   - AI Brain legacy provider-catalog keys
2. Add targeted assertions for empty legacy route namespaces.
3. Keep parity tests for migrated v2 routes and expand where missing.
4. Ensure CI runs canonical guards and parity suites on every PR:
   - `npm run ai-paths:check:canonical`
   - `npm run observability:check`
   - parity/legacy-token test suites (unit project)

Exit criteria:
- CI blocks on canonical violations in all targeted domains.
- No bypass-only local checks.

## Wave 5: Rollout, Monitoring, and Final Legacy Removal (1 release window)

Goals:
- Complete hard cutover safely and verify stability.

Actions:
1. Deploy runtime cuts behind release sequencing (non-flagged final state).
2. Monitor:
   - API error rates (`400/410` migration errors)
   - legacy payload rejection counters
   - migration script residual findings
3. After stable window, delete temporary diagnostics and migration-only compatibility counters.

Exit criteria:
- Legacy-format traffic remains at zero across release window.
- Final compatibility register entries closed.

## Verification Checklist

Required after each wave:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test:unit`
4. `npm run test:integration:prisma`
5. `npm run test:integration:mongo`
6. `npm run ai-paths:check:canonical`
7. `npm run observability:check`

Targeted migration checks:

1. `npm run products:normalize:v2` (dry-run baseline)
2. rerun with `-- --write` only when approved by environment owner
3. rerun relevant `migrate:*:v2` scripts in dry-run then write mode

## Risks and Mitigations

1. Risk: hidden clients still depend on legacy API responses.
   - Mitigation: usage telemetry + staged removal + explicit migration-error payloads.
2. Risk: strict parser cutover causes sudden settings rejection.
   - Mitigation: complete Wave 1 verification before Wave 2 hard-cut.
3. Risk: migration helpers moved out of `src/` break scripts.
   - Mitigation: add script-level tests for relocated helper modules before deleting old paths.
4. Risk: compatibility code reintroduced during feature work.
   - Mitigation: token guardrails + CI blocking checks.

## Program Acceptance Criteria

1. Runtime accepts canonical contracts only for all in-scope surfaces.
2. Migration-only compatibility logic is isolated to scripts, not runtime modules.
3. Legacy route aliases/deprecation gateways are removed after telemetry-confirmed sunset.
4. CI enforces canonical posture across AI Paths, Products, Integrations, and AI Brain.
5. Documentation reflects canonical-only runtime behavior and archived migration evidence.
