import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');
const ROOT_TESTS_DIR = path.join(ROOT, '__tests__');

const CANONICAL_ARTIFACTS_MANIFEST_PATH = 'docs/canonical-artifacts-latest.json';
const DEFAULT_REQUIRED_DOCS = [
  'docs/site-wide-canonical-migration-plan-2026-03-05.md',
  'docs/canonical-contract-matrix-2026-03-05.md',
  'docs/legacy-compatibility-exception-register-2026-03-05.md',
  'docs/legacy-compatibility-exception-register-2026-03-05.json',
];

const DEFAULT_EXCEPTION_REGISTER_PATH = 'docs/legacy-compatibility-exception-register-2026-03-05.json';
let requiredDocs = [...DEFAULT_REQUIRED_DOCS];
let exceptionRegisterPath = DEFAULT_EXCEPTION_REGISTER_PATH;
const FORBIDDEN_LEGACY_ROUTE_DIRS = [
  'src/app/api/import',
  'src/app/api/catalogs/assign',
  'src/app/api/ai-paths/legacy-compat/counters',
];
const FORBIDDEN_MIGRATION_HELPER_RUNTIME_FILES = [
  'src/features/integrations/services/imports/parameter-import/link-map-preference-migration.ts',
  'src/features/integrations/services/imports/base-import-run-connection-migration.ts',
  'src/features/integrations/services/export-warehouse-preference-migration.ts',
  'src/features/integrations/services/base-token-storage-migration.ts',
  'src/features/integrations/services/base-token-encryption-migration.ts',
  'src/features/integrations/services/tradera-api-credential-storage-migration.ts',
  'src/features/integrations/services/tradera-api-user-id-storage-migration.ts',
  'src/features/case-resolver/workspace-detached-contract-migration.ts',
  'src/features/products/api/versioning.ts',
  'src/features/products/api/routes/v2-products-route.ts',
  'src/app/api/v2/products/migrate/handler.ts',
  'src/app/api/v2/products/migrate/route.ts',
];
const FORBIDDEN_COMPAT_WRAPPER_RUNTIME_FILES = [
  'src/features/products/hooks/useMetadata.ts',
  'src/features/products/hooks/useCatalogQueries.ts',
  'src/features/integrations/hooks/integrationCache.ts',
  'src/features/integrations/hooks/listingCache.ts',
];
const FORBIDDEN_RUNTIME_GUARD_TOKENS = [
  {
    token: "LEGACY_PRODUCTS_PREFIX = '/api/products'",
    reason: 'products legacy gateway token reintroduced',
  },
  {
    token: 'Legacy imports/base action "import" is no longer supported.',
    reason: 'integrations legacy action compatibility token reintroduced',
  },
  {
    token: 'resolveLegacyProviderCatalogEntries',
    reason: 'ai-brain legacy provider-catalog merge helper reintroduced',
  },
  {
    token: 'PROVIDER_CATALOG_MIGRATED',
    reason: 'ai-brain provider-catalog runtime migration warning reintroduced',
  },
  {
    token: 'contained legacy payload fields and was migrated to canonical entries[]',
    reason: 'ai-brain provider-catalog runtime migration message reintroduced',
  },
  {
    token: 'datalistId?: string;',
    reason: 'category mapper select-cell datalistId compatibility prop reintroduced',
  },
  {
    token: '(legacy support)',
    reason: 'shared base-contract legacy support marker reintroduced',
  },
  {
    token: 'legacy_pool_keys_not_supported',
    reason: 'ai-brain legacy provider-catalog pool-array error channel reintroduced',
  },
  {
    token: 'Legacy pool arrays are no longer supported. Re-save AI Brain provider catalog using canonical entries[].',
    reason: 'ai-brain legacy provider-catalog pool-array migration message reintroduced',
  },
  {
    token: "legacyUnset['name'] = ''",
    reason: 'mongo product write legacy unset cleanup branch reintroduced',
  },
  {
    token: 'Legacy Case Resolver edge fields are no longer supported.',
    reason: 'case-resolver edge legacy-specific error channel reintroduced',
  },
  {
    token: 'Legacy Case Resolver edge port names are no longer supported.',
    reason: 'case-resolver edge legacy port-name error channel reintroduced',
  },
  {
    token: 'Legacy Case Resolver node-file snapshot fields are no longer supported.',
    reason: 'case-resolver node-file snapshot legacy-specific error channel reintroduced',
  },
  {
    token: 'Legacy inline Case Resolver node-file snapshots are no longer supported.',
    reason: 'case-resolver inline node-file snapshot legacy-specific error channel reintroduced',
  },
  {
    token: 'legacy_inline_node_file_snapshot',
    reason: 'case-resolver inline node-file snapshot legacy reason code reintroduced',
  },
  {
    token: 'Legacy product ${field} document shape is no longer supported.',
    reason: 'product localized-field legacy-specific error channel reintroduced',
  },
  {
    token: 'Legacy product category document shape is no longer supported.',
    reason: 'product category legacy-specific error channel reintroduced',
  },
  {
    token: 'Legacy product producer relation shape is no longer supported.',
    reason: 'product producer relation legacy-specific error channel reintroduced',
  },
  {
    token: 'Legacy product tag relation shape is no longer supported.',
    reason: 'product tag relation legacy-specific error channel reintroduced',
  },
  {
    token: 'Legacy Filemaker database payloads are no longer supported.',
    reason: 'filemaker database legacy-specific version error channel reintroduced',
  },
  {
    token: 'Legacy Filemaker fullAddress payloads are no longer supported.',
    reason: 'filemaker fullAddress legacy-specific error channel reintroduced',
  },
  {
    token: 'Legacy Filemaker inline address payloads are no longer supported.',
    reason: 'filemaker inline-address legacy-specific error channel reintroduced',
  },
  {
    token: 'Legacy Filemaker inline person phoneNumbers payloads are no longer supported.',
    reason: 'filemaker inline-person-phone legacy-specific error channel reintroduced',
  },
  {
    token: 'Legacy Filemaker inline organization phoneNumbers payloads are no longer supported.',
    reason: 'filemaker inline-organization-phone legacy-specific error channel reintroduced',
  },
  {
    token: 'Legacy Filemaker inline person email payloads are no longer supported.',
    reason: 'filemaker inline-person-email legacy-specific error channel reintroduced',
  },
  {
    token: 'Legacy Filemaker inline organization email payloads are no longer supported.',
    reason: 'filemaker inline-organization-email legacy-specific error channel reintroduced',
  },
  {
    token: 'parseFilemakerDatabaseForCaseResolver',
    reason: 'filemaker case-resolver parser compatibility surface reintroduced',
  },
  {
    token: 'deprecated ai snapshot keys',
    reason: 'shared error-classifier deprecated snapshot-key compatibility channel reintroduced',
  },
  {
    token: 'Legacy AI Paths runtime identity fields are no longer supported.',
    reason: 'ai-paths runtime identity legacy-specific error channel reintroduced',
  },
  {
    token: 'legacy ai paths runtime identity fields are no longer supported.',
    reason: 'ai-paths runtime identity legacy-specific error channel reintroduced',
  },
  {
    token: 'Legacy AI Paths trigger data outputs are no longer supported.',
    reason: 'ai-paths trigger-output legacy-specific error channel reintroduced',
  },
  {
    token: 'legacy ai paths trigger output ports are no longer supported.',
    reason: 'ai-paths trigger-output legacy-specific error channel reintroduced',
  },
  {
    token: 'Legacy AI Paths trigger data edges are no longer supported.',
    reason: 'ai-paths trigger-edge legacy-specific error channel reintroduced',
  },
  {
    token: 'legacy ai paths trigger data edges are no longer supported.',
    reason: 'ai-paths trigger-edge legacy-specific error channel reintroduced',
  },
  {
    token: 'contains legacy parameter source mappings. Run "npm run migrate:base-export-template-parameter-sources:v2 -- --write" and retry.',
    reason: 'integrations export-template legacy parameter-source error channel reintroduced',
  },
  {
    token: 'Legacy export source mapping "parameter:<id>" is no longer supported. Use canonical text_fields.features.<name> source fields.',
    reason: 'import-export template legacy parameter-source save error channel reintroduced',
  },
  {
    token: 'AI Path config contains legacy node identities.',
    reason: 'ai-paths path-config legacy node-identity error channel reintroduced',
  },
  {
    token: 'AI Paths run graph contains legacy node identities.',
    reason: 'ai-paths run-graph legacy node-identity error channel reintroduced',
  },
  {
    token: 'legacy_path_config_upgraded',
    reason: 'ai-paths portable-engine legacy path-config migration warning code reintroduced',
  },
  {
    token: 'Legacy path config payload upgraded to portable package v1.',
    reason: 'ai-paths portable-engine legacy path-config migration warning message reintroduced',
  },
  {
    token: 'assertNoDeprecatedTriggerDatabaseConfig',
    reason: 'ai-paths trigger database-guard deprecated naming channel reintroduced',
  },
  {
    token: 'ai-path-product-run-queued',
    reason: 'ai-paths legacy product-run queued browser event channel reintroduced',
  },
  {
    token: "asTrimmedString(edge.from) ?? asTrimmedString(edge.source)",
    reason: 'ai-paths portable-engine path_config edge source alias-upgrade fallback reintroduced',
  },
  {
    token: "asTrimmedString(edge.to) ?? asTrimmedString(edge.target)",
    reason: 'ai-paths portable-engine path_config edge target alias-upgrade fallback reintroduced',
  },
  {
    token: "resolveEdgePort(edge, 'fromPort', 'sourceHandle')",
    reason: 'ai-paths portable-engine path_config sourceHandle alias-upgrade fallback reintroduced',
  },
  {
    token: "resolveEdgePort(edge, 'toPort', 'targetHandle')",
    reason: 'ai-paths portable-engine path_config targetHandle alias-upgrade fallback reintroduced',
  },
  {
    token: '[chatbot][chat] Ignored legacy requested model in favor of Brain',
    reason: 'chatbot legacy model-override compatibility channel reintroduced',
  },
  {
    token: 'requestedModel: requestedModel || null',
    reason: 'chatbot jobs legacy requested-model compatibility channel reintroduced',
  },
  {
    token: '...(requestedModel ? { requestedModel } : {}),',
    reason: 'chatbot jobs legacy requested-model payload compatibility channel reintroduced',
  },
  {
    token: 'unknown_legacy',
    reason: 'database sync legacy unknown-type compatibility token reintroduced',
  },
  {
    token: 'without legacy model snapshot fields.',
    reason: 'error-classifier legacy snapshot wording reintroduced',
  },
  {
    token: 'legacyMappingCount:',
    reason: 'integrations legacy parameter-source count metadata key reintroduced',
  },
  {
    token: 'legacyKeys,',
    reason: 'product relation legacy-key metadata channel reintroduced',
  },
  {
    token: 'LEGACY_TRIGGER_DATA_PORTS',
    reason: 'ai-paths legacy trigger-port compatibility naming channel reintroduced',
  },
  {
    token: 'assertNoLegacyTriggerDataGraph',
    reason: 'ai-paths legacy trigger-data guard naming channel reintroduced',
  },
  {
    token: 'assertNoLegacyParameterSourceMappings',
    reason: 'integrations legacy parameter-source guard naming channel reintroduced',
  },
  {
    token: 'const legacyMappings =',
    reason: 'integrations legacy parameter-source local compatibility naming reintroduced',
  },
  {
    token: 'const legacyPorts =',
    reason: 'ai-paths legacy trigger-port local compatibility naming reintroduced',
  },
  {
    token: 'LEGACY_PARAMETER_SOURCE_PREFIX',
    reason: 'integrations legacy parameter-source prefix naming channel reintroduced',
  },
  {
    token: 'LEGACY_EXPORT_PARAMETER_SOURCE_PREFIX',
    reason: 'data-import-export legacy parameter-source prefix naming channel reintroduced',
  },
  {
    token: 'hasLegacyExportParameterSourceMapping',
    reason: 'data-import-export legacy parameter-source guard naming channel reintroduced',
  },
  {
    token: 'LEGACY_FALLBACK_MANIFEST',
    reason: 'ai-paths validation docs legacy fallback-manifest naming channel reintroduced',
  },
  {
    token: "version: 'fallback.v1'",
    reason: 'ai-paths validation docs fallback-manifest legacy version channel reintroduced',
  },
  {
    token: 'AI_PATHS_LEGACY_PREFIX',
    reason: 'database-collection-copy legacy ai-paths store-prefix naming channel reintroduced',
  },
  {
    token: 'AI_PATHS_LEGACY_KEY_PREFIX',
    reason: 'database-collection-copy legacy ai-paths store-key-prefix naming channel reintroduced',
  },
  {
    token: 'LEGACY_INSIGHT_SCHEDULE_KEYS',
    reason: 'ai-insights legacy schedule-key fallback map reintroduced',
  },
  {
    token: 'readSettingWithFallback(',
    reason: 'ai-insights legacy multi-key schedule fallback helper reintroduced',
  },
  {
    token: 'ai_analytics_schedule_enabled',
    reason: 'ai-insights legacy analytics schedule key fallback reintroduced',
  },
  {
    token: 'ai_analytics_schedule_minutes',
    reason: 'ai-insights legacy analytics interval key fallback reintroduced',
  },
  {
    token: 'ai_runtime_analytics_schedule_enabled',
    reason: 'ai-insights legacy runtime analytics schedule key fallback reintroduced',
  },
  {
    token: 'ai_runtime_analytics_schedule_minutes',
    reason: 'ai-insights legacy runtime analytics interval key fallback reintroduced',
  },
  {
    token: 'ai_logs_schedule_enabled',
    reason: 'ai-insights legacy logs schedule key fallback reintroduced',
  },
  {
    token: 'ai_logs_schedule_minutes',
    reason: 'ai-insights legacy logs interval key fallback reintroduced',
  },
  {
    token: 'ai_logs_auto_on_error',
    reason: 'ai-insights legacy logs auto-on-error key fallback reintroduced',
  },
  {
    token: 'legacy payload variants fallback to defaults.',
    reason: 'validator docs catalog legacy payload wording channel reintroduced',
  },
  {
    token: 'legacyNodeId?: string;',
    reason: 'ai-paths node-identity legacy warning field naming channel reintroduced',
  },
  {
    token: 'createNodeInstanceIdFromLegacy',
    reason: 'ai-paths node-identity legacy instance-id helper naming channel reintroduced',
  },
  {
    token: 'firstResolvedByLegacyId',
    reason: 'ai-paths node-identity legacy id map naming channel reintroduced',
  },
  {
    token: 'legacyOccurrenceCounts = new Map<string, number>()',
    reason: 'ai-paths node-identity legacy occurrence map naming channel reintroduced',
  },
  {
    token: 'assertNoLegacyLocalizedShape',
    reason: 'product localized-field legacy shape guard naming channel reintroduced',
  },
  {
    token: 'assertNoLegacyRunIdentity',
    reason: 'ai-paths runtime-state legacy run-identity guard naming channel reintroduced',
  },
  {
    token: 'assertNoLegacyRuntimeIdentityFields',
    reason: 'ai-paths runtime-state legacy runtime-identity guard naming channel reintroduced',
  },
  {
    token: '--- Legacy Aggregator ---',
    reason: 'context-layer legacy aggregator comment channel reintroduced',
  },
  {
    token: '--- Legacy Aggregated Interface ---',
    reason: 'context-layer legacy aggregated-interface comment channel reintroduced',
  },
  {
    token: 'Legacy support / Additional types',
    reason: 'chatbot contract legacy support comment channel reintroduced',
  },
  {
    token: 'Legacy or custom header',
    reason: 'shared list-panel legacy header comment channel reintroduced',
  },
  {
    token: 'Legacy Trigger context policy:',
    reason: 'ai-paths trigger docs legacy policy wording channel reintroduced',
  },
  {
    token: 'Legacy password token fallback is disabled.',
    reason: 'integrations/base token resolver legacy password-fallback wording channel reintroduced',
  },
  {
    token: 'Legacy password fallback is disabled.',
    reason: 'integrations/tradera test-connection legacy password-fallback wording channel reintroduced',
  },
  {
    token: 'const deprecatedKeys: string[] = [];',
    reason: 'image-studio settings deprecated-keys naming channel reintroduced',
  },
  {
    token: 'return deprecatedKeys;',
    reason: 'image-studio settings deprecated-keys return naming channel reintroduced',
  },
  {
    token: 'deletedLegacySettingsKeys',
    reason: 'image-studio project settings migration legacy stats-key naming channel reintroduced',
  },
  {
    token: 'deletedLegacyKeys',
    reason: 'image-studio project settings migration legacy deleted-keys naming channel reintroduced',
  },
  {
    token: "const deprecatedKeys = ['runId', 'runStartedAt'].filter(",
    reason: 'ai-paths runtime-state deprecated-keys naming channel reintroduced',
  },
  {
    token: 'keys: deprecatedKeys',
    reason: 'ai-paths runtime-state deprecated-keys payload channel reintroduced',
  },
  {
    token: '@/features/prompt-exploder/persistence-contract-migration',
    reason: 'prompt exploder persistence migration helper import reintroduced in runtime tree',
  },
  {
    token: 'migratePromptExploderPersistedSettingValue',
    reason: 'prompt exploder persisted-setting migration helper usage reintroduced in runtime tree',
  },
  {
    token: 'runtime_retry_success',
    reason: 'prompt exploder runtime retry compatibility counter token reintroduced',
  },
  {
    token: "@/features/cms/migrations/page-builder-contract-migration",
    reason: 'cms page-builder contract migration helper import reintroduced in runtime tree',
  },
  {
    token: 'migrateCmsPageBuilderComponents',
    reason: 'cms page-builder component migration helper usage reintroduced in runtime tree',
  },
  {
    token: "@/features/cms/migrations/page-builder-template-contract-migration",
    reason: 'cms page-builder template migration helper import reintroduced in runtime tree',
  },
  {
    token: 'migrateCmsPageBuilderTemplateSettingValue',
    reason: 'cms page-builder template migration helper usage reintroduced in runtime tree',
  },
  {
    token: 'brainFallbackReason',
    reason: 'products AI worker model fallback metadata channel reintroduced',
  },
  {
    token: 'rejectLegacyInlinePayloads?: boolean;',
    reason: 'filemaker normalizer runtime compatibility option flag reintroduced',
  },
  {
    token: 'stripCompatibilityFields?: boolean;',
    reason: 'filemaker normalizer runtime compatibility option flag reintroduced',
  },
  {
    token: 'cms_section_templates.v1',
    reason: 'cms page-builder section template v1 runtime compatibility key reintroduced',
  },
  {
    token: 'cms_grid_templates.v1',
    reason: 'cms page-builder grid template v1 runtime compatibility key reintroduced',
  },
  {
    token: "import { aiNodeSchema, edgeSchema, type AiNode, type Edge } from '../ai-paths-core';",
    reason: 'case-resolver graph edge contract recoupled to ai-paths edge schema',
  },
  {
    token: "import { aiNodeSchema, edgeSchema } from '../ai-paths';",
    reason: 'case-resolver relation graph edge contract recoupled to ai-paths edge schema',
  },
  {
    token: "import { edgeSchema, type Edge } from '@/shared/contracts/ai-paths-core/nodes';",
    reason: 'case-resolver edge validation recoupled to ai-paths edge schema',
  },
];
const PRODUCTS_METADATA_HANDLER_FILES = [
  'src/app/api/v2/products/metadata/handler.ts',
  'src/app/api/v2/products/metadata/[type]/[id]/handler.ts',
];
const FORBIDDEN_PRODUCTS_GROUP_TYPE_ALIAS_SNIPPETS = [
  "readString(payload, 'groupType')",
  "'groupType' in data",
  "data['groupType']",
];
const FORBIDDEN_LEGACY_CSRF_HEADER_ALIAS_SNIPPETS = ['x-xsrf-token', 'CSRF_HEADER_FALLBACK'];
const FORBIDDEN_COMPAT_TEST_FILE_PATTERN = /\.compat\.test\.[tj]sx?$/;
const FORBIDDEN_LEGACY_SHAPE_GUARD_TEST_FILE_PATTERN = /mongo-product-legacy-shape-guard\.test\.[tj]sx?$/;
const PRODUCTS_PAGED_ROUTE_FILE = 'src/app/api/v2/products/paged/route.ts';
const FORBIDDEN_PRODUCTS_PAGED_HANDLER_IMPORT_SNIPPET = "@/app/api/products/paged/handler";
const REQUIRED_PRODUCTS_PAGED_HANDLER_IMPORT_SNIPPET = "import { GET_handler } from './handler';";
const PROMPT_EXPLODER_SETTINGS_FILE = 'src/features/prompt-exploder/settings.ts';
const PROMPT_EXPLODER_CONTRACT_SETTINGS_FILE = 'src/shared/contracts/prompt-exploder/settings.ts';
const CHATBOT_CONTRACT_FILE = 'src/shared/contracts/chatbot.ts';
const AGENT_PERSONAS_UTIL_FILE = 'src/features/ai/agentcreator/utils/personas.ts';
const IMAGE_STUDIO_SETTINGS_UTIL_FILE = 'src/features/ai/image-studio/utils/studio-settings.ts';
const FORBIDDEN_PROMPT_EXPLODER_DEPRECATED_AI_KEYS_SNIPPETS = [
  "'deprecated_ai_keys'",
  'contains deprecated AI snapshot keys',
  'deprecatedAiKeysError',
  'deprecatedKeys?: string[];',
];
const REQUIRED_PROMPT_EXPLODER_UNSUPPORTED_AI_KEYS_SNIPPET =
  "ai contains unsupported keys:";
const FORBIDDEN_PROMPT_EXPLODER_CAPTURE_MODE_SCHEMA_SNIPPETS = [
  'promptExploderCaseResolverCaptureModeSchema',
  "'fully-auto'",
];
const FORBIDDEN_PROMPT_EXPLODER_CAPTURE_MODE_KEY_SNIPPET = 'caseResolverCaptureMode';
const REQUIRED_PROMPT_EXPLODER_EXTRACTION_MODE_KEY_SNIPPET = 'caseResolverExtractionMode';
const FORBIDDEN_CHATBOT_DEPRECATED_AGENT_KEYS_SNIPPETS = [
  "'deprecated_agent_model_keys'",
  'deprecated agent model snapshot keys',
];
const REQUIRED_CHATBOT_UNSUPPORTED_KEYS_SNIPPET =
  'Chatbot settings payload includes unsupported keys:';
const FORBIDDEN_AGENT_PERSONAS_DEPRECATED_SNAPSHOT_SNIPPETS = [
  'deprecated AI snapshot keys',
  "reason: 'deprecated_snapshot_keys'",
  'stripDeprecatedSnapshotKeys',
];
const REQUIRED_AGENT_PERSONAS_UNSUPPORTED_KEYS_SNIPPET =
  'Agent persona settings payload includes unsupported keys:';
const REQUIRED_AGENT_PERSONAS_FETCH_NORMALIZATION_SNIPPET =
  'return normalizeAgentPersonas(stored);';
const FORBIDDEN_IMAGE_STUDIO_DEPRECATED_SNAPSHOT_SNIPPETS = [
  'Image Studio settings contain deprecated AI snapshot keys.',
  "reason: 'deprecated_snapshot_keys'",
  'stripDeprecatedSnapshotKeys',
];
const REQUIRED_IMAGE_STUDIO_UNSUPPORTED_KEYS_SNIPPET =
  'Image Studio settings payload includes unsupported keys:';
const REQUIRED_IMAGE_STUDIO_PERSISTED_PARSE_SNIPPET = 'return parseImageStudioSettings(raw);';

const violations = [];

const reportViolation = (message) => {
  violations.push(message);
};

const loadCanonicalArtifactsManifest = () => {
  const absolute = path.join(ROOT, CANONICAL_ARTIFACTS_MANIFEST_PATH);
  if (!fs.existsSync(absolute)) {
    reportViolation(`missing canonical artifacts manifest: ${CANONICAL_ARTIFACTS_MANIFEST_PATH}`);
    return;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(absolute, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      reportViolation(
        `invalid canonical artifacts manifest payload shape: ${CANONICAL_ARTIFACTS_MANIFEST_PATH}`
      );
      return;
    }

    const docsValue = (parsed)['requiredDocs'];
    if (!Array.isArray(docsValue)) {
      reportViolation(
        `invalid canonical artifacts manifest requiredDocs field: ${CANONICAL_ARTIFACTS_MANIFEST_PATH}`
      );
      return;
    }

    const normalizedDocs = docsValue
      .filter((entry) => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);

    if (normalizedDocs.length === 0) {
      reportViolation(
        `canonical artifacts manifest requiredDocs must include at least one artifact: ${CANONICAL_ARTIFACTS_MANIFEST_PATH}`
      );
      return;
    }

    const uniqueDocs = Array.from(new Set(normalizedDocs));
    if (uniqueDocs.length !== normalizedDocs.length) {
      reportViolation(
        `canonical artifacts manifest requiredDocs contains duplicates: ${CANONICAL_ARTIFACTS_MANIFEST_PATH}`
      );
      return;
    }

    const exceptionPathValue = (parsed)['exceptionRegisterPath'];
    if (typeof exceptionPathValue !== 'string' || exceptionPathValue.trim().length === 0) {
      reportViolation(
        `invalid canonical artifacts manifest exceptionRegisterPath field: ${CANONICAL_ARTIFACTS_MANIFEST_PATH}`
      );
      return;
    }
    const normalizedExceptionPath = exceptionPathValue.trim();

    if (!uniqueDocs.includes(normalizedExceptionPath)) {
      reportViolation(
        `canonical artifacts manifest must include exception register path in requiredDocs: ${CANONICAL_ARTIFACTS_MANIFEST_PATH}`
      );
      return;
    }

    requiredDocs = uniqueDocs;
    exceptionRegisterPath = normalizedExceptionPath;
  } catch (error) {
    reportViolation(
      `failed to parse canonical artifacts manifest JSON: ${CANONICAL_ARTIFACTS_MANIFEST_PATH} (${error instanceof Error ? error.message : 'unknown_error'})`
    );
  }
};

const toRelative = (absolutePath) => path.relative(ROOT, absolutePath).split(path.sep).join('/');

const isSourceCodeFile = (fileName) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(fileName);

const isRuntimeTestFile = (relativePath) => {
  if (relativePath.includes('/__tests__/')) return true;
  return /\.(test|spec)\.[tj]sx?$/.test(relativePath);
};

const collectSourceFiles = (dir) => {
  if (!fs.existsSync(dir)) return [];
  const stack = [dir];
  const files = [];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') {
        continue;
      }
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolute);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!isSourceCodeFile(entry.name)) continue;
      files.push(absolute);
    }
  }

  return files;
};

const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const readExceptionRegister = () => {
  const absolute = path.join(ROOT, exceptionRegisterPath);
  if (!fs.existsSync(absolute)) {
    reportViolation(`missing exception register: ${exceptionRegisterPath}`);
    return null;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(absolute, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      reportViolation(`invalid exception register payload shape: ${exceptionRegisterPath}`);
      return null;
    }
    return parsed;
  } catch (error) {
    reportViolation(
      `failed to parse exception register JSON: ${exceptionRegisterPath} (${error instanceof Error ? error.message : 'unknown_error'})`
    );
    return null;
  }
};

const requireNonEmptyString = (value, fieldPath) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    reportViolation(`missing or invalid string field: ${fieldPath}`);
    return null;
  }
  return value.trim();
};

const checkRequiredDocs = () => {
  for (const relative of requiredDocs) {
    if (!fs.existsSync(path.join(ROOT, relative))) {
      reportViolation(`required canonicalization artifact missing: ${relative}`);
    }
  }
};

const checkForbiddenLegacyRouteDirs = () => {
  for (const relative of FORBIDDEN_LEGACY_ROUTE_DIRS) {
    const absolute = path.join(ROOT, relative);
    if (!fs.existsSync(absolute)) continue;
    const stat = fs.statSync(absolute);
    if (!stat.isDirectory()) continue;
    reportViolation(`forbidden legacy route namespace present: ${relative}`);
  }
};

const checkForbiddenRuntimeMigrationHelpers = () => {
  for (const relative of FORBIDDEN_MIGRATION_HELPER_RUNTIME_FILES) {
    if (fs.existsSync(path.join(ROOT, relative))) {
      reportViolation(`forbidden migration helper remains in runtime tree: ${relative}`);
    }
  }
};

const checkForbiddenCompatWrapperRuntimeFiles = () => {
  for (const relative of FORBIDDEN_COMPAT_WRAPPER_RUNTIME_FILES) {
    if (fs.existsSync(path.join(ROOT, relative))) {
      reportViolation(`forbidden compatibility wrapper remains in runtime tree: ${relative}`);
    }
  }
};

const checkForbiddenRuntimeGuardTokens = (sourceFileMap) => {
  for (const [relativeFile, content] of sourceFileMap.entries()) {
    for (const entry of FORBIDDEN_RUNTIME_GUARD_TOKENS) {
      if (content.includes(entry.token)) {
        reportViolation(
          `${entry.reason}: token="${entry.token}" file="${relativeFile}"`
        );
      }
    }
  }
};

const checkProductsMetadataGroupTypeAliasPrune = () => {
  for (const relative of PRODUCTS_METADATA_HANDLER_FILES) {
    const absolute = path.join(ROOT, relative);
    if (!fs.existsSync(absolute)) {
      reportViolation(`products metadata handler missing for canonical guard: ${relative}`);
      continue;
    }
    const content = fs.readFileSync(absolute, 'utf8');
    for (const snippet of FORBIDDEN_PRODUCTS_GROUP_TYPE_ALIAS_SNIPPETS) {
      if (content.includes(snippet)) {
        reportViolation(
          `forbidden products metadata groupType request alias snippet detected: ${relative} -> ${snippet}`
        );
      }
    }
  }
};

const checkLegacyCsrfHeaderAliasPrune = (sourceFileMap) => {
  for (const [relativeFile, content] of sourceFileMap.entries()) {
    for (const snippet of FORBIDDEN_LEGACY_CSRF_HEADER_ALIAS_SNIPPETS) {
      if (content.includes(snippet)) {
        reportViolation(
          `forbidden legacy csrf header alias snippet detected: ${relativeFile} -> ${snippet}`
        );
      }
    }
  }
};

const checkProductsPagedRouteHandlerImport = () => {
  const absolute = path.join(ROOT, PRODUCTS_PAGED_ROUTE_FILE);
  if (!fs.existsSync(absolute)) {
    reportViolation(`products paged route missing for canonical guard: ${PRODUCTS_PAGED_ROUTE_FILE}`);
    return;
  }

  const content = fs.readFileSync(absolute, 'utf8');
  if (content.includes(FORBIDDEN_PRODUCTS_PAGED_HANDLER_IMPORT_SNIPPET)) {
    reportViolation(
      `forbidden products paged handler import alias detected: ${PRODUCTS_PAGED_ROUTE_FILE} -> ${FORBIDDEN_PRODUCTS_PAGED_HANDLER_IMPORT_SNIPPET}`
    );
  }
  if (!content.includes(REQUIRED_PRODUCTS_PAGED_HANDLER_IMPORT_SNIPPET)) {
    reportViolation(
      `missing canonical products paged handler import snippet: ${PRODUCTS_PAGED_ROUTE_FILE} -> ${REQUIRED_PRODUCTS_PAGED_HANDLER_IMPORT_SNIPPET}`
    );
  }
};

const checkPromptExploderSettingsCanonicalAiShapeError = () => {
  const absolute = path.join(ROOT, PROMPT_EXPLODER_SETTINGS_FILE);
  if (!fs.existsSync(absolute)) {
    reportViolation(
      `prompt exploder settings parser missing for canonical guard: ${PROMPT_EXPLODER_SETTINGS_FILE}`
    );
    return;
  }

  const content = fs.readFileSync(absolute, 'utf8');
  for (const snippet of FORBIDDEN_PROMPT_EXPLODER_DEPRECATED_AI_KEYS_SNIPPETS) {
    if (content.includes(snippet)) {
      reportViolation(
        `forbidden prompt exploder deprecated-ai-keys snippet detected: ${PROMPT_EXPLODER_SETTINGS_FILE} -> ${snippet}`
      );
    }
  }
  if (!content.includes(REQUIRED_PROMPT_EXPLODER_UNSUPPORTED_AI_KEYS_SNIPPET)) {
    reportViolation(
      `missing canonical prompt exploder unsupported-ai-keys snippet: ${PROMPT_EXPLODER_SETTINGS_FILE} -> ${REQUIRED_PROMPT_EXPLODER_UNSUPPORTED_AI_KEYS_SNIPPET}`
    );
  }
};

const checkPromptExploderLegacyCaptureModeSchemaPrune = () => {
  const absolute = path.join(ROOT, PROMPT_EXPLODER_SETTINGS_FILE);
  if (!fs.existsSync(absolute)) {
    reportViolation(
      `prompt exploder settings parser missing for canonical guard: ${PROMPT_EXPLODER_SETTINGS_FILE}`
    );
    return;
  }

  const content = fs.readFileSync(absolute, 'utf8');
  for (const snippet of FORBIDDEN_PROMPT_EXPLODER_CAPTURE_MODE_SCHEMA_SNIPPETS) {
    if (content.includes(snippet)) {
      reportViolation(
        `forbidden prompt exploder legacy capture-mode schema snippet detected: ${PROMPT_EXPLODER_SETTINGS_FILE} -> ${snippet}`
      );
    }
  }
};

const checkPromptExploderExtractionModeKeyCanonicalization = (sourceFileMap) => {
  const settingsContent = sourceFileMap.get(PROMPT_EXPLODER_CONTRACT_SETTINGS_FILE);
  if (!settingsContent) {
    reportViolation(
      `prompt exploder settings contract missing for canonical guard: ${PROMPT_EXPLODER_CONTRACT_SETTINGS_FILE}`
    );
    return;
  }

  if (!settingsContent.includes(REQUIRED_PROMPT_EXPLODER_EXTRACTION_MODE_KEY_SNIPPET)) {
    reportViolation(
      `missing prompt exploder canonical extraction-mode key snippet: ${PROMPT_EXPLODER_CONTRACT_SETTINGS_FILE} -> ${REQUIRED_PROMPT_EXPLODER_EXTRACTION_MODE_KEY_SNIPPET}`
    );
  }

  for (const [relativeFile, content] of sourceFileMap.entries()) {
    if (!relativeFile.startsWith('src/features/prompt-exploder/') &&
        relativeFile !== PROMPT_EXPLODER_SETTINGS_FILE &&
        relativeFile !== PROMPT_EXPLODER_CONTRACT_SETTINGS_FILE) {
      continue;
    }
    if (content.includes(FORBIDDEN_PROMPT_EXPLODER_CAPTURE_MODE_KEY_SNIPPET)) {
      reportViolation(
        `forbidden prompt exploder capture-mode key snippet detected: ${relativeFile} -> ${FORBIDDEN_PROMPT_EXPLODER_CAPTURE_MODE_KEY_SNIPPET}`
      );
    }
  }
};

const checkChatbotSettingsUnsupportedKeysCanonicalization = () => {
  const absolute = path.join(ROOT, CHATBOT_CONTRACT_FILE);
  if (!fs.existsSync(absolute)) {
    reportViolation(`chatbot contract missing for canonical guard: ${CHATBOT_CONTRACT_FILE}`);
    return;
  }

  const content = fs.readFileSync(absolute, 'utf8');
  for (const snippet of FORBIDDEN_CHATBOT_DEPRECATED_AGENT_KEYS_SNIPPETS) {
    if (content.includes(snippet)) {
      reportViolation(
        `forbidden chatbot deprecated-agent-keys snippet detected: ${CHATBOT_CONTRACT_FILE} -> ${snippet}`
      );
    }
  }
  if (!content.includes(REQUIRED_CHATBOT_UNSUPPORTED_KEYS_SNIPPET)) {
    reportViolation(
      `missing chatbot unsupported-keys canonical snippet: ${CHATBOT_CONTRACT_FILE} -> ${REQUIRED_CHATBOT_UNSUPPORTED_KEYS_SNIPPET}`
    );
  }
};

const checkAgentPersonasUnsupportedKeysCanonicalization = () => {
  const absolute = path.join(ROOT, AGENT_PERSONAS_UTIL_FILE);
  if (!fs.existsSync(absolute)) {
    reportViolation(`agent personas utils missing for canonical guard: ${AGENT_PERSONAS_UTIL_FILE}`);
    return;
  }

  const content = fs.readFileSync(absolute, 'utf8');
  for (const snippet of FORBIDDEN_AGENT_PERSONAS_DEPRECATED_SNAPSHOT_SNIPPETS) {
    if (content.includes(snippet)) {
      reportViolation(
        `forbidden agent-personas deprecated-snapshot snippet detected: ${AGENT_PERSONAS_UTIL_FILE} -> ${snippet}`
      );
    }
  }
  if (!content.includes(REQUIRED_AGENT_PERSONAS_UNSUPPORTED_KEYS_SNIPPET)) {
    reportViolation(
      `missing agent-personas unsupported-keys canonical snippet: ${AGENT_PERSONAS_UTIL_FILE} -> ${REQUIRED_AGENT_PERSONAS_UNSUPPORTED_KEYS_SNIPPET}`
    );
  }
  if (!content.includes(REQUIRED_AGENT_PERSONAS_FETCH_NORMALIZATION_SNIPPET)) {
    reportViolation(
      `missing canonical agent-personas fetch normalization snippet: ${AGENT_PERSONAS_UTIL_FILE} -> ${REQUIRED_AGENT_PERSONAS_FETCH_NORMALIZATION_SNIPPET}`
    );
  }
};

const checkImageStudioSettingsUnsupportedKeysCanonicalization = () => {
  const absolute = path.join(ROOT, IMAGE_STUDIO_SETTINGS_UTIL_FILE);
  if (!fs.existsSync(absolute)) {
    reportViolation(
      `image studio settings util missing for canonical guard: ${IMAGE_STUDIO_SETTINGS_UTIL_FILE}`
    );
    return;
  }

  const content = fs.readFileSync(absolute, 'utf8');
  for (const snippet of FORBIDDEN_IMAGE_STUDIO_DEPRECATED_SNAPSHOT_SNIPPETS) {
    if (content.includes(snippet)) {
      reportViolation(
        `forbidden image-studio deprecated-snapshot snippet detected: ${IMAGE_STUDIO_SETTINGS_UTIL_FILE} -> ${snippet}`
      );
    }
  }
  if (!content.includes(REQUIRED_IMAGE_STUDIO_UNSUPPORTED_KEYS_SNIPPET)) {
    reportViolation(
      `missing image-studio unsupported-keys canonical snippet: ${IMAGE_STUDIO_SETTINGS_UTIL_FILE} -> ${REQUIRED_IMAGE_STUDIO_UNSUPPORTED_KEYS_SNIPPET}`
    );
  }
  if (!content.includes(REQUIRED_IMAGE_STUDIO_PERSISTED_PARSE_SNIPPET)) {
    reportViolation(
      `missing canonical image-studio persisted parse snippet: ${IMAGE_STUDIO_SETTINGS_UTIL_FILE} -> ${REQUIRED_IMAGE_STUDIO_PERSISTED_PARSE_SNIPPET}`
    );
  }
};

const checkForbiddenCompatTestFilenames = (sourceFiles) => {
  for (const absolute of sourceFiles) {
    const relative = toRelative(absolute);
    if (FORBIDDEN_COMPAT_TEST_FILE_PATTERN.test(relative)) {
      reportViolation(`forbidden compatibility test filename detected: ${relative}`);
    }
    if (FORBIDDEN_LEGACY_SHAPE_GUARD_TEST_FILE_PATTERN.test(relative)) {
      reportViolation(`forbidden legacy-shape guard test filename detected: ${relative}`);
    }
  }
};

const checkExceptionRegister = (register, sourceFileMap) => {
  const schemaVersion = register['schemaVersion'];
  if (typeof schemaVersion !== 'number') {
    reportViolation('exception register schemaVersion must be a number');
  }

  const generatedOn = requireNonEmptyString(register['generatedOn'], 'generatedOn');
  if (generatedOn && !isIsoDate(generatedOn)) {
    reportViolation(`generatedOn must use YYYY-MM-DD: ${generatedOn}`);
  }

  const owner = requireNonEmptyString(register['owner'], 'owner');
  if (!owner) {
    reportViolation('exception register owner is required');
  }

  const exceptions = register['exceptions'];
  if (!Array.isArray(exceptions)) {
    reportViolation('exception register exceptions must be an array');
    return;
  }
  if (exceptions.length === 0) {
    return;
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const ids = new Set();

  for (let index = 0; index < exceptions.length; index += 1) {
    const entry = exceptions[index];
    const prefix = `exceptions[${index}]`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      reportViolation(`${prefix} must be an object`);
      continue;
    }

    const id = requireNonEmptyString(entry['id'], `${prefix}.id`);
    if (id) {
      if (ids.has(id)) {
        reportViolation(`${prefix}.id is duplicated: ${id}`);
      }
      ids.add(id);
    }

    requireNonEmptyString(entry['status'], `${prefix}.status`);
    requireNonEmptyString(entry['category'], `${prefix}.category`);
    requireNonEmptyString(entry['owner'], `${prefix}.owner`);
    requireNonEmptyString(entry['description'], `${prefix}.description`);

    const sunsetDate = requireNonEmptyString(entry['sunsetDate'], `${prefix}.sunsetDate`);
    if (sunsetDate) {
      if (!isIsoDate(sunsetDate)) {
        reportViolation(`${prefix}.sunsetDate must use YYYY-MM-DD: ${sunsetDate}`);
      } else if (sunsetDate < todayIso) {
        reportViolation(`${prefix}.sunsetDate is expired: ${sunsetDate}`);
      }
    }

    const guardToken = requireNonEmptyString(entry['guardToken'], `${prefix}.guardToken`);

    const files = entry['files'];
    if (!Array.isArray(files) || files.length === 0) {
      reportViolation(`${prefix}.files must be a non-empty string array`);
      continue;
    }

    const normalizedFiles = [];
    for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
      const rawFile = files[fileIndex];
      if (typeof rawFile !== 'string' || rawFile.trim().length === 0) {
        reportViolation(`${prefix}.files[${fileIndex}] must be a non-empty string`);
        continue;
      }
      const relativeFile = rawFile.trim();
      normalizedFiles.push(relativeFile);
      const absolute = path.join(ROOT, relativeFile);
      if (!fs.existsSync(absolute)) {
        reportViolation(`${prefix}.files[${fileIndex}] does not exist: ${relativeFile}`);
      }
      if (!relativeFile.startsWith('src/')) {
        reportViolation(`${prefix}.files[${fileIndex}] must target runtime source under src/: ${relativeFile}`);
      }
    }

    if (!guardToken) continue;

    const mustExist = entry['mustExist'] !== false;
    const allowedFiles = new Set(normalizedFiles);
    const tokenMatches = [];

    for (const [relativeFile, content] of sourceFileMap.entries()) {
      if (content.includes(guardToken)) {
        tokenMatches.push(relativeFile);
      }
    }

    if (mustExist && tokenMatches.length === 0) {
      reportViolation(`${prefix}.guardToken not found in runtime source: ${guardToken}`);
    }

    for (const matchFile of tokenMatches) {
      if (!allowedFiles.has(matchFile)) {
        reportViolation(
          `${prefix}.guardToken found outside allowlisted files: token="${guardToken}" file="${matchFile}"`
        );
      }
    }
  }
};

const main = () => {
  loadCanonicalArtifactsManifest();
  checkRequiredDocs();
  checkForbiddenLegacyRouteDirs();
  checkForbiddenRuntimeMigrationHelpers();
  checkForbiddenCompatWrapperRuntimeFiles();
  checkProductsMetadataGroupTypeAliasPrune();
  checkProductsPagedRouteHandlerImport();
  checkPromptExploderSettingsCanonicalAiShapeError();
  checkPromptExploderLegacyCaptureModeSchemaPrune();
  checkChatbotSettingsUnsupportedKeysCanonicalization();
  checkAgentPersonasUnsupportedKeysCanonicalization();
  checkImageStudioSettingsUnsupportedKeysCanonicalization();

  const compatScanFiles = [...collectSourceFiles(SRC_DIR), ...collectSourceFiles(ROOT_TESTS_DIR)];
  checkForbiddenCompatTestFilenames(compatScanFiles);

  const sourceFiles = collectSourceFiles(SRC_DIR);
  const runtimeFiles = sourceFiles
    .map((absolute) => toRelative(absolute))
    .filter((relative) => !isRuntimeTestFile(relative));

  const sourceFileMap = new Map(
    runtimeFiles.map((relative) => [relative, fs.readFileSync(path.join(ROOT, relative), 'utf8')])
  );

  checkForbiddenRuntimeGuardTokens(sourceFileMap);
  checkLegacyCsrfHeaderAliasPrune(sourceFileMap);
  checkPromptExploderExtractionModeKeyCanonicalization(sourceFileMap);

  const register = readExceptionRegister();
  if (register) {
    checkExceptionRegister(register, sourceFileMap);
  }

  if (violations.length > 0) {
    console.error('[canonical:check:sitewide] failed with violations:');
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('[canonical:check:sitewide] passed');
  console.log(
    `[canonical:check:sitewide] validated ${runtimeFiles.length} runtime source file(s) and ${requiredDocs.length} docs artifact(s)`
  );
};

main();
