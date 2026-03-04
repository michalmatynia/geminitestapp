import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  DEFAULT_LEGACY_PRUNE_MANIFEST_RELATIVE_PATH,
  evaluateLegacyPruneManifest,
  loadLegacyPruneManifest,
} from './legacy-prune-manifest-utils.mjs';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');

const LEGACY_INDEX_KEY = 'ai_paths_index_v1';
const LEGACY_VALIDATION_KEY = 'ai_paths_validation_v1';

const FORBIDDEN_LEGACY_ACTION_IDS = [
  'upgrade_translation_en_pl',
  'ensure_parameter_inference_defaults',
  'upgrade_runtime_input_contracts',
  'migrate_legacy_starter_workflows',
];

const EXPECTED_MAINTENANCE_ACTION_IDS = [
  'compact_oversized_configs',
  'repair_path_index',
  'ensure_starter_workflow_defaults',
];

const SETTINGS_HANDLER_FILE = 'src/app/api/ai-paths/settings/handler.ts';
const MAINTENANCE_HANDLER_FILE = 'src/app/api/ai-paths/settings/maintenance/handler.ts';
const DB_COMMAND_HANDLER_FILE = 'src/app/api/ai-paths/db-command/handler.ts';
const DB_COMMAND_ROUTE_FILE = 'src/app/api/ai-paths/db-command/route.ts';
const DB_ACTION_HANDLER_FILE = 'src/app/api/ai-paths/db-action/handler.ts';
const DB_ACTION_ROUTE_FILE = 'src/app/api/ai-paths/db-action/route.ts';
const DB_QUERY_HANDLER_FILE = 'src/app/api/ai-paths/db-query/handler.ts';
const DB_QUERY_ROUTE_FILE = 'src/app/api/ai-paths/db-query/route.ts';
const DB_UPDATE_HANDLER_FILE = 'src/app/api/ai-paths/db-update/handler.ts';
const DB_UPDATE_ROUTE_FILE = 'src/app/api/ai-paths/db-update/route.ts';
const MAINTENANCE_CONSTANTS_FILE = 'src/features/ai/ai-paths/server/settings-store.constants.ts';
const API_CLIENT_FILE = 'src/shared/lib/ai-paths/api/client.ts';
const API_CLIENT_BASE_FILE = 'src/shared/lib/ai-paths/api/client/base.ts';
const DATABASE_NORMALIZATION_FILE = 'src/shared/lib/ai-paths/core/normalization/nodes/database.ts';
const VALIDATION_DEFAULTS_FILE = 'src/shared/lib/ai-paths/core/validation-engine/defaults.ts';
const COLLECTION_NAMES_FILE = 'src/shared/lib/ai-paths/core/utils/collection-names.ts';
const ENGINE_CORE_FILE = 'src/shared/lib/ai-paths/core/runtime/engine-core.ts';
const GRAPH_PORTS_FILE = 'src/shared/lib/ai-paths/core/utils/graph.ports.ts';
const PATH_PERSISTENCE_HELPERS_FILE =
  'src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsPersistence.helpers.ts';
const SETTINGS_PERSISTENCE_FILE =
  'src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsPersistence.ts';
const SETTINGS_PATH_ACTIONS_FILE =
  'src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsSettingsPathActions.ts';
const SETTINGS_STORE_CLIENT_FILE = 'src/shared/lib/ai-paths/settings-store-client.ts';
const ADMIN_VALIDATION_UTILS_FILE = 'src/features/ai/ai-paths/pages/AdminAiPathsValidationUtils.ts';
const AI_PATHS_SETTINGS_UTILS_FILE = 'src/features/ai/ai-paths/components/AiPathsSettingsUtils.ts';
const DATABASE_TEMPLATE_CONTEXT_FILE =
  'src/shared/lib/ai-paths/core/runtime/handlers/integration-database-template-context.ts';
const DATABASE_INPUT_RESOLUTION_FILE =
  'src/shared/lib/ai-paths/core/runtime/handlers/integration-database-input-resolution.ts';
const DATABASE_QUERY_EXECUTION_FILE =
  'src/shared/lib/ai-paths/core/runtime/handlers/integration-database-query-execution.ts';
const DATABASE_UPDATE_EXECUTION_FILE =
  'src/shared/lib/ai-paths/core/runtime/handlers/integration-database-update-execution.ts';
const LOCAL_EXECUTION_HELPERS_FILE =
  'src/features/ai/ai-paths/components/ai-paths-settings/runtime/useAiPathsLocalExecution.helpers.ts';
const DATABASE_CLIENT_FILE = 'src/shared/lib/ai-paths/api/client/database.ts';
const JOB_QUEUE_PANEL_UTILS_FILE = 'src/features/ai/ai-paths/components/job-queue-panel-utils.ts';
const RUNS_ENQUEUE_HANDLER_FILE = 'src/app/api/ai-paths/runs/enqueue/handler.ts';
const PATH_RUN_SERVICE_FILE = 'src/features/ai/ai-paths/services/path-run-service.ts';
const PATH_RUN_EXECUTOR_LOGIC_FILE = 'src/features/ai/ai-paths/services/path-run-executor.logic.ts';
const PATH_RUN_EXECUTOR_HELPERS_FILE =
  'src/features/ai/ai-paths/services/path-run-executor.helpers.ts';
const SETTINGS_RUNTIME_UTILS_FILE =
  'src/features/ai/ai-paths/components/ai-paths-settings/runtime/utils.ts';
const AI_PATHS_SIMULATION_FILE =
  'src/features/ai/ai-paths/components/ai-paths-settings/runtime/useAiPathsSimulation.ts';
const PRISMA_RUN_REPOSITORY_FILE =
  'src/features/ai/ai-paths/services/path-run-repository/prisma-path-run-repository.ts';
const MONGO_RUN_REPOSITORY_FILE =
  'src/features/ai/ai-paths/services/path-run-repository/mongo-path-run-repository.ts';
const QUERY_INVALIDATION_FILE = 'src/shared/lib/query-invalidation.ts';
const SHARED_RUN_SOURCES_FILE = 'src/shared/lib/ai-paths/run-sources.ts';
const FEATURE_RUN_SOURCES_FILE = 'src/features/ai/ai-paths/lib/run-sources.ts';
const PRESETS_CONTEXT_FILE = 'src/features/ai/ai-paths/context/PresetsContext.tsx';
const TRIGGER_FETCHER_MIGRATION_FILE =
  'src/shared/lib/ai-paths/core/normalization/normalization.edges.ts';
const STARTER_WORKFLOW_REGISTRY_FILE = 'src/shared/lib/ai-paths/core/starter-workflows/registry.ts';
const DB_SCHEMA_NODE_CONFIG_SECTION_FILE =
  'src/features/ai/ai-paths/components/node-config/DbSchemaNodeConfigSection.tsx';
const DATABASE_NODE_CONFIG_STATE_FILE = 'src/features/ai/ai-paths/hooks/useDatabaseNodeConfigState.ts';
const TRIGGER_NORMALIZATION_FILE =
  'src/shared/lib/ai-paths/core/normalization/trigger-normalization.ts';
const ENTITY_UPDATE_HANDLER_FILE = 'src/app/api/ai-paths/update/handler.ts';
const DATABASE_PARAMETER_INFERENCE_FILE =
  'src/shared/lib/ai-paths/core/runtime/handlers/database-parameter-inference.ts';
const DATABASE_SETTINGS_TAB_FILE =
  'src/features/ai/ai-paths/components/node-config/database/DatabaseSettingsTab.tsx';
const PRODUCTS_AI_PATH_SETTINGS_FILE = 'src/features/products/hooks/useAiPathSettings.ts';
const SEMANTIC_GRAMMAR_SERIALIZE_FILE = 'src/shared/lib/ai-paths/core/semantic-grammar/serialize.ts';
const SEMANTIC_GRAMMAR_DESERIALIZE_FILE =
  'src/shared/lib/ai-paths/core/semantic-grammar/deserialize.ts';
const SEMANTIC_GRAMMAR_SUBGRAPH_FILE = 'src/shared/lib/ai-paths/core/semantic-grammar/subgraph.ts';
const AI_PATHS_FACTORY_FILE = 'src/shared/lib/ai-paths/core/utils/factory.ts';
const AI_PATHS_NODE_IDENTITY_FILE = 'src/shared/lib/ai-paths/core/utils/node-identity.ts';

const toRelative = (absolutePath) => path.relative(ROOT, absolutePath).split(path.sep).join('/');

const isSourceCodeFile = (file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file);

const isTestFile = (relativeFile) => {
  if (relativeFile.includes('/__tests__/')) return true;
  return /\.(test|spec)\.[tj]sx?$/.test(relativeFile);
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

const readFile = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

const violations = [];

const reportViolation = (file, message) => {
  violations.push({ file, message });
};

const checkLegacyValidationKeyUsage = (sourceFiles) => {
  for (const absolute of sourceFiles) {
    const relative = toRelative(absolute);
    if (isTestFile(relative)) continue;
    const text = fs.readFileSync(absolute, 'utf8');
    if (text.includes(LEGACY_VALIDATION_KEY)) {
      reportViolation(
        relative,
        `forbidden legacy key "${LEGACY_VALIDATION_KEY}" detected in runtime source`
      );
    }
  }
};

const checkLegacyIndexKeyUsage = (sourceFiles) => {
  for (const absolute of sourceFiles) {
    const relative = toRelative(absolute);
    if (isTestFile(relative)) continue;
    const text = fs.readFileSync(absolute, 'utf8');
    if (!text.includes(LEGACY_INDEX_KEY)) continue;
    reportViolation(relative, `forbidden legacy key "${LEGACY_INDEX_KEY}" detected in runtime source`);
  }
};

const checkForbiddenMaintenanceActionIds = (sourceFiles) => {
  for (const absolute of sourceFiles) {
    const relative = toRelative(absolute);
    if (isTestFile(relative)) continue;
    const text = fs.readFileSync(absolute, 'utf8');
    for (const actionId of FORBIDDEN_LEGACY_ACTION_IDS) {
      if (text.includes(actionId)) {
        reportViolation(relative, `forbidden legacy maintenance action id "${actionId}" detected`);
      }
    }
  }
};

const parseMaintenanceActionIds = (text) => {
  const arrayMatch = text.match(/AI_PATHS_MAINTENANCE_ACTION_IDS\s*=\s*\[([\s\S]*?)\]\s*as\s+const/);
  if (!arrayMatch) return null;
  const body = arrayMatch[1] ?? '';
  const ids = Array.from(body.matchAll(/'([^']+)'/g)).map((match) => match[1]);
  return ids;
};

const checkMaintenanceConstants = () => {
  const text = readFile(MAINTENANCE_CONSTANTS_FILE);
  const ids = parseMaintenanceActionIds(text);
  if (!ids) {
    reportViolation(MAINTENANCE_CONSTANTS_FILE, 'failed to parse AI_PATHS_MAINTENANCE_ACTION_IDS');
    return;
  }

  const expected = JSON.stringify(EXPECTED_MAINTENANCE_ACTION_IDS);
  const actual = JSON.stringify(ids);
  if (actual !== expected) {
    reportViolation(
      MAINTENANCE_CONSTANTS_FILE,
      `unexpected maintenance action ids; expected ${expected}, received ${actual}`
    );
  }
};

const checkSettingsHandlerVersionedKeyGuards = () => {
  const text = readFile(SETTINGS_HANDLER_FILE);
  const requiredSnippets = [
    'const VERSIONED_AI_PATHS_KEY_PATTERN = /^ai_paths_.*_v\\d+$/;',
    'assertCanonicalAiPathsKey(key);',
    'parsedBulk.data.items.forEach((item) => assertCanonicalAiPathsKey(item.key));',
    'assertCanonicalAiPathsKey(parsedSingle.data.key);',
  ];
  const forbiddenSnippets = [
    'LEGACY_PATH_INDEX_KEY',
    'ai_paths_index_v1',
    '.filter((item) => item.key !==',
  ];

  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      reportViolation(
        SETTINGS_HANDLER_FILE,
        `missing canonical versioned-key guard snippet: ${snippet}`
      );
    }
  }

  for (const snippet of forbiddenSnippets) {
    if (text.includes(snippet)) {
      reportViolation(
        SETTINGS_HANDLER_FILE,
        `legacy/special-case key guard snippet must remain removed: ${snippet}`
      );
    }
  }
};

const checkMaintenanceHandlerEnum = () => {
  const text = readFile(MAINTENANCE_HANDLER_FILE);
  if (!text.includes('z.enum(AI_PATHS_MAINTENANCE_ACTION_IDS)')) {
    reportViolation(
      MAINTENANCE_HANDLER_FILE,
      'maintenance payload schema must derive enum from AI_PATHS_MAINTENANCE_ACTION_IDS'
    );
  }
};

const checkTriggerButtonsApiCompatibilityPrune = () => {
  const text = readFile(API_CLIENT_FILE);
  const forbiddenSnippets = [
    'remove: deleteTriggerButton',
    'if (Array.isArray(payload))',
    'payload.buttonIds',
  ];
  const requiredSnippets = ['delete: deleteTriggerButton', 'reorder: reorderTriggerButtons'];

  for (const snippet of forbiddenSnippets) {
    if (text.includes(snippet)) {
      reportViolation(
        API_CLIENT_FILE,
        `legacy trigger-buttons API client compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      reportViolation(
        API_CLIENT_FILE,
        `missing canonical trigger-buttons API client snippet: ${snippet}`
      );
    }
  }
};

const checkDatabaseNodeLegacyDbQueryPrune = () => {
  const text = readFile(DATABASE_NORMALIZATION_FILE);
  const forbiddenSnippets = ['legacyDbQuery', "['dbQuery']"];

  for (const snippet of forbiddenSnippets) {
    if (text.includes(snippet)) {
      reportViolation(
        DATABASE_NORMALIZATION_FILE,
        `legacy database-node dbQuery compatibility snippet detected: ${snippet}`
      );
    }
  }
};

const checkCollectionNamesLegacyDbQueryPrune = () => {
  const text = readFile(COLLECTION_NAMES_FILE);
  const forbiddenSnippets = [
    'legacyDbQueryCandidate',
    "nextConfigWithLegacy['dbQuery']",
    'export const migrateDatabaseConfigCollections =',
    'export const migratePathConfigCollections =',
  ];
  const requiredSnippets = [
    'export const canonicalizeAiPathsCollectionName =',
    'export const findPathConfigCollectionAliasIssues =',
  ];

  for (const snippet of forbiddenSnippets) {
    if (text.includes(snippet)) {
      reportViolation(
        COLLECTION_NAMES_FILE,
        `legacy collection migration dbQuery compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      reportViolation(
        COLLECTION_NAMES_FILE,
        `missing canonical collection alias snippet: ${snippet}`
      );
    }
  }
};

const checkRuntimeRetryLegacyEnabledPrune = () => {
  const text = readFile(ENGINE_CORE_FILE);
  const forbiddenSnippets = ['legacyEnabledValue', 'enabled?: unknown'];

  for (const snippet of forbiddenSnippets) {
    if (text.includes(snippet)) {
      reportViolation(
        ENGINE_CORE_FILE,
        `legacy runtime retry compatibility snippet detected: ${snippet}`
      );
    }
  }
};

const checkRuntimeHaltLegacyControlPrune = () => {
  const text = readFile(ENGINE_CORE_FILE);
  const forbiddenSnippets = ["(options as Record<string, unknown>)['control']", "| { onHalt?:"];

  for (const snippet of forbiddenSnippets) {
    if (text.includes(snippet)) {
      reportViolation(
        ENGINE_CORE_FILE,
        `legacy runtime halt compatibility snippet detected: ${snippet}`
      );
    }
  }
};

const checkTriggerFetcherLegacyMigrationPrune = (sourceFiles) => {
  if (fs.existsSync(path.join(ROOT, TRIGGER_FETCHER_MIGRATION_FILE))) {
    reportViolation(
      TRIGGER_FETCHER_MIGRATION_FILE,
      'legacy trigger->fetcher migration module must remain removed from runtime source'
    );
  }

  const forbiddenTokens = ['migrateTriggerToFetcherGraph', 'TriggerToFetcherMigrationResult'];
  for (const absolute of sourceFiles) {
    const relative = toRelative(absolute);
    if (isTestFile(relative)) continue;
    const text = fs.readFileSync(absolute, 'utf8');
    for (const token of forbiddenTokens) {
      if (text.includes(token)) {
        reportViolation(
          relative,
          `legacy trigger->fetcher migration token detected in runtime source: ${token}`
        );
      }
    }
  }
};

const checkLegacyDbQueryProviderMigrationPrune = (sourceFiles) => {
  const forbiddenTokens = ['migrateLegacyDbQueryProvider', 'DEFAULT_LEGACY_DB_QUERY_TEMPLATE'];
  for (const absolute of sourceFiles) {
    const relative = toRelative(absolute);
    if (isTestFile(relative)) continue;
    const text = fs.readFileSync(absolute, 'utf8');
    for (const token of forbiddenTokens) {
      if (text.includes(token)) {
        reportViolation(
          relative,
          `legacy db-query provider migration token detected in runtime source: ${token}`
        );
      }
    }
  }
};

const checkDatabaseNodeLegacyProviderNormalizationPrune = () => {
  const text = readFile(DATABASE_NODE_CONFIG_STATE_FILE);
  const forbiddenSnippets = [
    'LEGACY_MONGO_DEFAULT_QUERY_TEMPLATE',
    'const isLegacyMongoDefaultQuery = (query: DbQueryConfig): boolean =>',
    'const normalizeLegacyQueryProvider = (query: DbQueryConfig): DbQueryConfig =>',
    "query.provider !== 'auto' && query.provider !== 'mongodb' && query.provider !== 'prisma'",
    'if (isLegacyMongoDefaultQuery(query)) {',
  ];
  const requiredSnippets = [
    'const normalizeQueryConfig = (query: DbQueryConfig): DbQueryConfig => ({',
    "queryTemplate: normalizeTemplateText(query.queryTemplate ?? ''),",
    '() => normalizeQueryConfig(databaseConfig.query ?? DEFAULT_QUERY),',
  ];

  for (const snippet of forbiddenSnippets) {
    if (text.includes(snippet)) {
      reportViolation(
        DATABASE_NODE_CONFIG_STATE_FILE,
        `legacy database node query-provider normalization snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      reportViolation(
        DATABASE_NODE_CONFIG_STATE_FILE,
        `missing canonical database node query normalization snippet: ${snippet}`
      );
    }
  }
};

const checkLegacyPortAliasPrune = () => {
  const text = readFile(GRAPH_PORTS_FILE);
  const forbiddenSnippets = [
    "normalized === 'images (urls)'",
    "normalized === 'images(urls)'",
    "normalized === 'image urls'",
    "normalized === 'text'",
    "normalized === 'productjson'",
    "normalized === 'simulation'",
    "fromPort !== 'simulation'",
  ];

  for (const snippet of forbiddenSnippets) {
    if (text.includes(snippet)) {
      reportViolation(
        GRAPH_PORTS_FILE,
        `legacy port alias compatibility snippet detected: ${snippet}`
      );
    }
  }
};

const checkPathSaveRawMessageCompatibilityPrune = () => {
  const text = readFile(PATH_PERSISTENCE_HELPERS_FILE);
  const forbiddenSnippets = ['/deprecated ai snapshot keys/i', '/legacy ai paths/i'];
  const requiredSnippets = [
    '/ai path config contains/i',
    '/invalid ai paths runtime state payload/i',
    '/^invalid payload\\b/i',
  ];

  for (const snippet of forbiddenSnippets) {
    if (text.includes(snippet)) {
      reportViolation(
        PATH_PERSISTENCE_HELPERS_FILE,
        `legacy path-save raw-message compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      reportViolation(
        PATH_PERSISTENCE_HELPERS_FILE,
        `missing canonical path-save raw-message pattern: ${snippet}`
      );
    }
  }
};

const checkRunExecutionMetaCompatibilityPrune = () => {
  const text = readFile(JOB_QUEUE_PANEL_UTILS_FILE);
  const forbiddenSnippets = [
    "meta['execution_mode']",
    "meta['runMode']",
    "meta['run_mode']",
    "meta['mode']",
    "runtimeMeta?.['mode']",
    "sourceInfoMeta?.['mode']",
    "sourceInfoMeta?.['executionMode']",
  ];
  const requiredSnippets = ["meta['executionMode']", "runtimeMeta?.['executionMode']"];

  for (const snippet of forbiddenSnippets) {
    if (text.includes(snippet)) {
      reportViolation(
        JOB_QUEUE_PANEL_UTILS_FILE,
        `legacy run execution metadata compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      reportViolation(
        JOB_QUEUE_PANEL_UTILS_FILE,
        `missing canonical run execution metadata snippet: ${snippet}`
      );
    }
  }
};

const checkRunSourceMetaCompatibilityPrune = () => {
  const text = readFile(JOB_QUEUE_PANEL_UTILS_FILE);
  const forbiddenSnippets = [
    "meta['sourceInfo']",
    "sourceRaw && typeof sourceRaw === 'object'",
    "source.startsWith('tab:')",
    'infoTab=',
  ];
  const requiredSnippets = ["readStringValue(meta['source'])", 'return `src=${'];

  for (const snippet of forbiddenSnippets) {
    if (text.includes(snippet)) {
      reportViolation(
        JOB_QUEUE_PANEL_UTILS_FILE,
        `legacy run source metadata compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      reportViolation(
        JOB_QUEUE_PANEL_UTILS_FILE,
        `missing canonical run source metadata snippet: ${snippet}`
      );
    }
  }
};

const checkEnqueueMetaSourceCompatibilityPrune = () => {
  const text = readFile(RUNS_ENQUEUE_HANDLER_FILE);
  const forbiddenSnippets = [
    'sourceInfo: sourceValue',
    "triggerEventId ? 'trigger_button' : 'ai_paths_ui'",
  ];
  const requiredSnippets = ['meta.source must be a string'];

  for (const snippet of forbiddenSnippets) {
    if (text.includes(snippet)) {
      reportViolation(
        RUNS_ENQUEUE_HANDLER_FILE,
        `legacy enqueue metadata source compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      reportViolation(
        RUNS_ENQUEUE_HANDLER_FILE,
        `missing canonical enqueue metadata source guard snippet: ${snippet}`
      );
    }
  }
};

const checkRunSourceFilterCompatibilityPrune = () => {
  const prismaText = readFile(PRISMA_RUN_REPOSITORY_FILE);
  const mongoText = readFile(MONGO_RUN_REPOSITORY_FILE);

  const forbiddenPrismaSnippets = ["['source', 'tab']", "['sourceInfo', 'tab']"];
  const requiredPrismaSnippets = ["meta: { path: ['source'], equals: value }"];

  for (const snippet of forbiddenPrismaSnippets) {
    if (prismaText.includes(snippet)) {
      reportViolation(
        PRISMA_RUN_REPOSITORY_FILE,
        `legacy run source filter compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredPrismaSnippets) {
    if (!prismaText.includes(snippet)) {
      reportViolation(
        PRISMA_RUN_REPOSITORY_FILE,
        `missing canonical run source filter snippet: ${snippet}`
      );
    }
  }

  const forbiddenMongoSnippets = ["'meta.source.tab'", "'meta.sourceInfo.tab'"];
  const requiredMongoSnippets = ["'meta.source': { $in: [...AI_PATHS_RUN_SOURCE_VALUES] }"];

  for (const snippet of forbiddenMongoSnippets) {
    if (mongoText.includes(snippet)) {
      reportViolation(
        MONGO_RUN_REPOSITORY_FILE,
        `legacy run source filter compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredMongoSnippets) {
    if (!mongoText.includes(snippet)) {
      reportViolation(
        MONGO_RUN_REPOSITORY_FILE,
        `missing canonical run source filter snippet: ${snippet}`
      );
    }
  }
};

const checkQueueCacheRunSourceCompatibilityPrune = () => {
  const text = readFile(QUERY_INVALIDATION_FILE);
  const forbiddenSnippets = [
    "meta['sourceInfo']",
    "source.startsWith('tab:')",
    "sourceRaw && typeof sourceRaw === 'object'",
    'AI_PATHS_RUN_SOURCE_TABS',
  ];
  const requiredSnippets = ["normalizeString(meta['source'])", 'AI_PATHS_NODE_SOURCES.has(source)'];

  for (const snippet of forbiddenSnippets) {
    if (text.includes(snippet)) {
      reportViolation(
        QUERY_INVALIDATION_FILE,
        `legacy queue-cache run source compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      reportViolation(
        QUERY_INVALIDATION_FILE,
        `missing canonical queue-cache run source snippet: ${snippet}`
      );
    }
  }
};

const checkRunSourceHelpersCompatibilityPrune = () => {
  if (fs.existsSync(path.join(ROOT, FEATURE_RUN_SOURCES_FILE))) {
    reportViolation(
      FEATURE_RUN_SOURCES_FILE,
      'legacy duplicate run-sources helper module must remain removed'
    );
  }

  const text = readFile(SHARED_RUN_SOURCES_FILE);
  const forbiddenSnippets = ['AI_PATHS_RUN_SOURCE_TABS', 'isAiPathsRunSourceTab'];
  const requiredSnippets = ['AI_PATHS_RUN_SOURCE_VALUES', 'isAiPathsRunSourceValue'];

  for (const snippet of forbiddenSnippets) {
    if (text.includes(snippet)) {
      reportViolation(
        SHARED_RUN_SOURCES_FILE,
        `legacy run-source helper compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      reportViolation(
        SHARED_RUN_SOURCES_FILE,
        `missing canonical run-source helper snippet: ${snippet}`
      );
    }
  }
};

const checkRunModeQueueCompatibilityPrune = () => {
  const files = [SETTINGS_PERSISTENCE_FILE, SETTINGS_PATH_ACTIONS_FILE];
  for (const file of files) {
    const text = readFile(file);
    if (text.includes("runMode === 'queue'")) {
      reportViolation(file, "legacy runMode compatibility alias detected: runMode === 'queue'");
    }
  }
};

const checkRequestIdLookupCompatibilityPrune = () => {
  const text = readFile(PATH_RUN_SERVICE_FILE);
  const forbiddenSnippets = [
    'Provider-safe fallback when JSON-path filtering on meta is unavailable.',
    'existingByScan',
  ];
  const requiredSnippets = ['requestId', 'limit: 1', 'offset: 0'];

  for (const snippet of forbiddenSnippets) {
    if (text.includes(snippet)) {
      reportViolation(
        PATH_RUN_SERVICE_FILE,
        `legacy requestId lookup compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      reportViolation(
        PATH_RUN_SERVICE_FILE,
        `missing canonical requestId lookup snippet: ${snippet}`
      );
    }
  }
};

const checkRuntimeNodeStatusAliasCompatibilityPrune = () => {
  const executorLogicText = readFile(PATH_RUN_EXECUTOR_LOGIC_FILE);
  const runtimeUtilsText = readFile(SETTINGS_RUNTIME_UTILS_FILE);

  const executorForbiddenSnippets = ["case 'paused':", "case 'dead_lettered':"];
  const runtimeUtilsForbiddenSnippets = [
    "if (status === 'paused')",
    "if (status === 'dead_lettered')",
  ];

  for (const snippet of executorForbiddenSnippets) {
    if (executorLogicText.includes(snippet)) {
      reportViolation(
        PATH_RUN_EXECUTOR_LOGIC_FILE,
        `legacy runtime-node status alias snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of runtimeUtilsForbiddenSnippets) {
    if (runtimeUtilsText.includes(snippet)) {
      reportViolation(
        SETTINGS_RUNTIME_UTILS_FILE,
        `legacy runtime-node status alias snippet detected: ${snippet}`
      );
    }
  }
};

const checkPresetCollectionMigrationCompatibilityPrune = () => {
  const text = readFile(PRESETS_CONTEXT_FILE);
  const forbiddenSnippets = ['migrateDatabaseConfigCollections'];
  const requiredSnippets = ['config: normalizeDatabasePresetConfig(raw.config)'];

  for (const snippet of forbiddenSnippets) {
    if (text.includes(snippet)) {
      reportViolation(
        PRESETS_CONTEXT_FILE,
        `legacy preset collection migration compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      reportViolation(
        PRESETS_CONTEXT_FILE,
        `missing canonical preset normalization snippet: ${snippet}`
      );
    }
  }
};

const checkValidationConfigLegacySchemaCompatibilityPrune = () => {
  const text = readFile(VALIDATION_DEFAULTS_FILE);
  const forbiddenSnippets = [
    'const legacySchemaVersion =',
    'legacySchemaVersion < AI_PATHS_VALIDATION_SCHEMA_VERSION ? null : lastEvaluatedAt',
  ];
  const requiredSnippets = ['lastEvaluatedAt,'];

  for (const snippet of forbiddenSnippets) {
    if (text.includes(snippet)) {
      reportViolation(
        VALIDATION_DEFAULTS_FILE,
        `legacy validation-config schema compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      reportViolation(
        VALIDATION_DEFAULTS_FILE,
        `missing canonical validation-config normalization snippet: ${snippet}`
      );
    }
  }
};

const checkSettingsBackupPayloadCompatibilityPrune = () => {
  const text = readFile(SETTINGS_STORE_CLIENT_FILE);
  const forbiddenSnippets = ['const records = Array.isArray(parsed)', 'ai_paths_settings_backup_v1'];
  const requiredSnippets = [
    "const AI_PATHS_SETTINGS_BACKUP_KEY = 'ai_paths_settings_backup';",
    "parsed && typeof parsed === 'object' && !Array.isArray(parsed)",
    'if (!parsedRecord || !Array.isArray(parsedRecord.records)) return null;',
    "if (typeof parsedRecord.savedAt !== 'number') return null;",
  ];

  for (const snippet of forbiddenSnippets) {
    if (text.includes(snippet)) {
      reportViolation(
        SETTINGS_STORE_CLIENT_FILE,
        `legacy settings-backup payload compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      reportViolation(
        SETTINGS_STORE_CLIENT_FILE,
        `missing canonical settings-backup payload snippet: ${snippet}`
      );
    }
  }
};

const checkValidationPathIndexMetaFallbackCompatibilityPrune = () => {
  const text = readFile(ADMIN_VALIDATION_UTILS_FILE);
  const forbiddenSnippets = ['const fallbackMetas: PathMeta[]', '[...metasFromIndex, ...fallbackMetas]'];
  const requiredSnippets = [
    'const indexMetas = parsePathIndex(settingsMap.get(PATH_INDEX_KEY));',
    'const pathMetas = [...metasFromIndex].sort((left, right) =>',
  ];

  for (const snippet of forbiddenSnippets) {
    if (text.includes(snippet)) {
      reportViolation(
        ADMIN_VALIDATION_UTILS_FILE,
        `legacy validation path-meta fallback compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      reportViolation(
        ADMIN_VALIDATION_UTILS_FILE,
        `missing canonical validation path-index snippet: ${snippet}`
      );
    }
  }
};

const checkValidationCollectionMapLegacyDelimiterCompatibilityPrune = () => {
  const text = readFile(ADMIN_VALIDATION_UTILS_FILE);
  const forbiddenSnippets = ["line.indexOf('=')", "line.includes(':') ? line.indexOf(':') :"];
  const requiredSnippets = ["const separatorIndex = line.indexOf(':');"];

  for (const snippet of forbiddenSnippets) {
    if (text.includes(snippet)) {
      reportViolation(
        ADMIN_VALIDATION_UTILS_FILE,
        `legacy validation collection-map delimiter compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      reportViolation(
        ADMIN_VALIDATION_UTILS_FILE,
        `missing canonical validation collection-map snippet: ${snippet}`
      );
    }
  }
};

const checkValidationDocsSourcesLegacyDelimiterCompatibilityPrune = () => {
  const text = readFile(ADMIN_VALIDATION_UTILS_FILE);
  const forbiddenSnippets = [".split(',')"];
  const requiredSnippets = [".split('\\n')", "entry.length > 0 && !entry.includes(',')"];

  for (const snippet of forbiddenSnippets) {
    if (text.includes(snippet)) {
      reportViolation(
        ADMIN_VALIDATION_UTILS_FILE,
        `legacy validation docs-sources delimiter compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      reportViolation(
        ADMIN_VALIDATION_UTILS_FILE,
        `missing canonical validation docs-sources snippet: ${snippet}`
      );
    }
  }
};

const checkSettingsEdgeAliasCompatibilityPrune = () => {
  const text = readFile(AI_PATHS_SETTINGS_UTILS_FILE);
  const forbiddenSnippets = [
    "const source = typeof edge['source'] === 'string' ? edge['source'].trim() : '';",
    "const sourceHandle = typeof edge['sourceHandle'] === 'string' ? edge['sourceHandle'].trim() : '';",
  ];
  const requiredSnippets = [
    "const from = typeof edge['from'] === 'string' ? edge['from'].trim() : '';",
    "const fromPort = typeof edge['fromPort'] === 'string' ? edge['fromPort'].trim() : '';",
    'return from;',
    'return fromPort;',
  ];

  for (const snippet of forbiddenSnippets) {
    if (text.includes(snippet)) {
      reportViolation(
        AI_PATHS_SETTINGS_UTILS_FILE,
        `legacy ai-paths settings edge alias compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      reportViolation(
        AI_PATHS_SETTINGS_UTILS_FILE,
        `missing canonical ai-paths settings edge parsing snippet: ${snippet}`
      );
    }
  }
};

const checkLoadedPathSettingsEdgeAliasCompatibilityPrune = () => {
  const text = readFile(PRODUCTS_AI_PATH_SETTINGS_FILE);
  const forbiddenSnippets = [
    "const source = typeof edge['source'] === 'string' ? edge['source'].trim() : '';",
    "const sourceHandle = typeof edge['sourceHandle'] === 'string' ? edge['sourceHandle'].trim() : '';",
    'return from || source;',
    'return fromPort || sourceHandle;',
  ];
  const requiredSnippets = [
    "const from = typeof edge['from'] === 'string' ? edge['from'].trim() : '';",
    "const fromPort = typeof edge['fromPort'] === 'string' ? edge['fromPort'].trim() : '';",
    'return from;',
    'return fromPort;',
  ];

  for (const snippet of forbiddenSnippets) {
    if (text.includes(snippet)) {
      reportViolation(
        PRODUCTS_AI_PATH_SETTINGS_FILE,
        `legacy loaded-config edge alias compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      reportViolation(
        PRODUCTS_AI_PATH_SETTINGS_FILE,
        `missing canonical loaded-config edge parsing snippet: ${snippet}`
      );
    }
  }
};

const checkSemanticGrammarEdgeAliasCompatibilityPrune = () => {
  const serializeText = readFile(SEMANTIC_GRAMMAR_SERIALIZE_FILE);
  const deserializeText = readFile(SEMANTIC_GRAMMAR_DESERIALIZE_FILE);
  const subgraphText = readFile(SEMANTIC_GRAMMAR_SUBGRAPH_FILE);
  const serializeForbiddenSnippets = [
    ": typeof edge.source === 'string' && edge.source.trim().length > 0",
    ": typeof edge.target === 'string' && edge.target.trim().length > 0",
    ": typeof edge.sourceHandle === 'string'",
    ": typeof edge.targetHandle === 'string'",
  ];
  const serializeRequiredSnippets = [
    "const toEdgeFromNodeId = (edge: Edge): string =>",
    "typeof edge.from === 'string' ? edge.from.trim() : '';",
    "const toEdgeToNodeId = (edge: Edge): string => (typeof edge.to === 'string' ? edge.to.trim() : '');",
    "typeof edge.fromPort === 'string' ? edge.fromPort : null;",
    "typeof edge.toPort === 'string' ? edge.toPort : null;",
  ];
  const deserializeForbiddenSnippets = [
    'source: semanticEdge.fromNodeId,',
    'target: semanticEdge.toNodeId,',
    'sourceHandle: semanticEdge.fromPort,',
    'targetHandle: semanticEdge.toPort,',
  ];
  const deserializeRequiredSnippets = [
    'from: semanticEdge.fromNodeId,',
    'to: semanticEdge.toNodeId,',
    'fromPort: semanticEdge.fromPort,',
    'toPort: semanticEdge.toPort,',
  ];
  const subgraphForbiddenSnippets = [
    ": typeof edge.source === 'string' && edge.source.trim().length > 0",
    ": typeof edge.target === 'string' && edge.target.trim().length > 0",
    'source: fromNodeId,',
    'target: toNodeId,',
    'sourceHandle: edge.fromPort,',
    'targetHandle: edge.toPort,',
  ];
  const subgraphRequiredSnippets = [
    'const resolveEdgeFromNodeId = (edge: Edge): string =>',
    "typeof edge.from === 'string' ? edge.from.trim() : '';",
    'const resolveEdgeToNodeId = (edge: Edge): string =>',
    "typeof edge.to === 'string' ? edge.to.trim() : '';",
    'from: fromNodeId,',
    'to: toNodeId,',
    'fromPort: edge.fromPort,',
    'toPort: edge.toPort,',
  ];

  for (const snippet of serializeForbiddenSnippets) {
    if (serializeText.includes(snippet)) {
      reportViolation(
        SEMANTIC_GRAMMAR_SERIALIZE_FILE,
        `legacy semantic-grammar edge alias serialization snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of serializeRequiredSnippets) {
    if (!serializeText.includes(snippet)) {
      reportViolation(
        SEMANTIC_GRAMMAR_SERIALIZE_FILE,
        `missing canonical semantic-grammar edge serialization snippet: ${snippet}`
      );
    }
  }

  for (const snippet of deserializeForbiddenSnippets) {
    if (deserializeText.includes(snippet)) {
      reportViolation(
        SEMANTIC_GRAMMAR_DESERIALIZE_FILE,
        `legacy semantic-grammar edge alias deserialization snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of deserializeRequiredSnippets) {
    if (!deserializeText.includes(snippet)) {
      reportViolation(
        SEMANTIC_GRAMMAR_DESERIALIZE_FILE,
        `missing canonical semantic-grammar edge deserialization snippet: ${snippet}`
      );
    }
  }

  for (const snippet of subgraphForbiddenSnippets) {
    if (subgraphText.includes(snippet)) {
      reportViolation(
        SEMANTIC_GRAMMAR_SUBGRAPH_FILE,
        `legacy semantic-grammar subgraph edge alias snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of subgraphRequiredSnippets) {
    if (!subgraphText.includes(snippet)) {
      reportViolation(
        SEMANTIC_GRAMMAR_SUBGRAPH_FILE,
        `missing canonical semantic-grammar subgraph edge snippet: ${snippet}`
      );
    }
  }
};

const checkDatabaseTemplateCatalogAliasCompatibilityPrune = () => {
  const text = readFile(DATABASE_TEMPLATE_CONTEXT_FILE);
  const forbiddenSnippets = [
    'resolveCatalogIdFromTemplateInputs',
    'applyCatalogIdAliases',
    'syncCatalogId();',
    "templateContext['catalogId'] = catalogId;",
  ];
  const requiredSnippets = ["const templateContext: Record<string, unknown> = {", '...templateInputs,'];

  for (const snippet of forbiddenSnippets) {
    if (text.includes(snippet)) {
      reportViolation(
        DATABASE_TEMPLATE_CONTEXT_FILE,
        `legacy database template catalogId alias compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      reportViolation(
        DATABASE_TEMPLATE_CONTEXT_FILE,
        `missing canonical database template context snippet: ${snippet}`
      );
    }
  }
};

const checkDatabaseInputCatalogAliasCompatibilityPrune = () => {
  const text = readFile(DATABASE_INPUT_RESOLUTION_FILE);
  const forbiddenSnippets = [
    'pickCatalogIdFromCatalogs',
    "pickCatalogId(record['entity'] as Record<string, unknown>)",
    "pickCatalogId(record['entityJson'] as Record<string, unknown>)",
    "pickCatalogId(record['product'] as Record<string, unknown>)",
    "pickCatalogId(record['bundle'] as Record<string, unknown>)",
  ];
  const requiredSnippets = ["return pickString(record['catalogId']);"];

  for (const snippet of forbiddenSnippets) {
    if (text.includes(snippet)) {
      reportViolation(
        DATABASE_INPUT_RESOLUTION_FILE,
        `legacy database input catalogId alias compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      reportViolation(
        DATABASE_INPUT_RESOLUTION_FILE,
        `missing canonical database input catalogId snippet: ${snippet}`
      );
    }
  }
};

const checkDatabaseProviderFallbackCompatibilityPrune = () => {
  const queryExecutionText = readFile(DATABASE_QUERY_EXECUTION_FILE);
  const updateExecutionText = readFile(DATABASE_UPDATE_EXECUTION_FILE);
  const localExecutionHelpersText = readFile(LOCAL_EXECUTION_HELPERS_FILE);

  const queryForbiddenSnippets = [
    'fallback?: Record<string, unknown>;',
    "queryResultData['fallback']",
    'providerFallback',
  ];
  const updateForbiddenSnippets = [
    'fallback?: Record<string, unknown>;',
    "responseData['fallback']",
    'providerFallback',
  ];
  const localHelperForbiddenSnippets = ["bundle['providerFallback']", "databaseMeta['providerFallback']"];
  const requiredSnippets = [
    "databaseMeta['requestedProvider'] = requestedProvider;",
    "databaseMeta['resolvedProvider'] = resolvedProvider;",
  ];

  for (const snippet of queryForbiddenSnippets) {
    if (queryExecutionText.includes(snippet)) {
      reportViolation(
        DATABASE_QUERY_EXECUTION_FILE,
        `legacy database query provider-fallback compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of updateForbiddenSnippets) {
    if (updateExecutionText.includes(snippet)) {
      reportViolation(
        DATABASE_UPDATE_EXECUTION_FILE,
        `legacy database update provider-fallback compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of localHelperForbiddenSnippets) {
    if (localExecutionHelpersText.includes(snippet)) {
      reportViolation(
        LOCAL_EXECUTION_HELPERS_FILE,
        `legacy local-execution provider-fallback compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!localExecutionHelpersText.includes(snippet)) {
      reportViolation(
        LOCAL_EXECUTION_HELPERS_FILE,
        `missing canonical local-execution database metadata snippet: ${snippet}`
      );
    }
  }
};

const checkDatabaseProviderAliasCompatibilityPrune = () => {
  const queryExecutionText = readFile(DATABASE_QUERY_EXECUTION_FILE);
  const localExecutionHelpersText = readFile(LOCAL_EXECUTION_HELPERS_FILE);

  const queryForbiddenSnippets = ["...(resolvedProvider ? { provider: resolvedProvider } : {}),"];
  const localHelperForbiddenSnippets = ["typeof bundle['provider'] === 'string'"];
  const requiredSnippets = ["databaseMeta['resolvedProvider'] = resolvedProvider;"];

  for (const snippet of queryForbiddenSnippets) {
    if (queryExecutionText.includes(snippet)) {
      reportViolation(
        DATABASE_QUERY_EXECUTION_FILE,
        `legacy database provider alias compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of localHelperForbiddenSnippets) {
    if (localExecutionHelpersText.includes(snippet)) {
      reportViolation(
        LOCAL_EXECUTION_HELPERS_FILE,
        `legacy local-execution provider alias compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!localExecutionHelpersText.includes(snippet)) {
      reportViolation(
        LOCAL_EXECUTION_HELPERS_FILE,
        `missing canonical local-execution provider snippet: ${snippet}`
      );
    }
  }
};

const checkDatabaseUpdateProviderAliasCompatibilityPrune = () => {
  const updateExecutionText = readFile(DATABASE_UPDATE_EXECUTION_FILE);

  const forbiddenSnippets = [
    "provider?: 'mongodb' | 'prisma';",
    "responseData['provider'] === 'mongodb' || responseData['provider'] === 'prisma'",
  ];
  const requiredSnippets = [
    "responseData['resolvedProvider'] === 'mongodb' || responseData['resolvedProvider'] === 'prisma'",
    "...(resolvedProvider ? { resolvedProvider } : {}),",
  ];

  for (const snippet of forbiddenSnippets) {
    if (updateExecutionText.includes(snippet)) {
      reportViolation(
        DATABASE_UPDATE_EXECUTION_FILE,
        `legacy database update provider alias compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!updateExecutionText.includes(snippet)) {
      reportViolation(
        DATABASE_UPDATE_EXECUTION_FILE,
        `missing canonical database update provider metadata snippet: ${snippet}`
      );
    }
  }
};

const checkDatabaseQueryProviderResponseAliasCompatibilityPrune = () => {
  const queryExecutionText = readFile(DATABASE_QUERY_EXECUTION_FILE);

  const forbiddenSnippets = [
    "provider?: 'mongodb' | 'prisma';",
    "const responseProvider = queryResultData['provider'];",
    "responseProvider === 'mongodb' || responseProvider === 'prisma'",
  ];
  const requiredSnippets = [
    "queryResultData['resolvedProvider'] === 'mongodb' || queryResultData['resolvedProvider'] === 'prisma'",
    "...(querySource ? { querySource } : {}),",
  ];

  for (const snippet of forbiddenSnippets) {
    if (queryExecutionText.includes(snippet)) {
      reportViolation(
        DATABASE_QUERY_EXECUTION_FILE,
        `legacy database query provider-response alias compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!queryExecutionText.includes(snippet)) {
      reportViolation(
        DATABASE_QUERY_EXECUTION_FILE,
        `missing canonical database query provider metadata snippet: ${snippet}`
      );
    }
  }
};

const checkDbActionProviderAliasCompatibilityPrune = () => {
  const dbActionText = readFile(DB_ACTION_HANDLER_FILE);

  const forbiddenSnippets = [
    "  provider,\n  requestedProvider: requestedProvider ?? 'auto',\n  resolvedProvider: provider,",
  ];
  const requiredSnippets = [
    "  requestedProvider: requestedProvider ?? 'auto',",
    "  resolvedProvider: provider,",
  ];

  for (const snippet of forbiddenSnippets) {
    if (dbActionText.includes(snippet)) {
      reportViolation(
        DB_ACTION_HANDLER_FILE,
        `legacy db-action provider alias payload snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!dbActionText.includes(snippet)) {
      reportViolation(
        DB_ACTION_HANDLER_FILE,
        `missing canonical db-action provider metadata snippet: ${snippet}`
      );
    }
  }
};

const checkDbActionRequestAliasCompatibilityPrune = () => {
  const dbActionText = readFile(DB_ACTION_HANDLER_FILE);

  const forbiddenSnippets = [
    "query: z.record(z.string(), z['unknown']()).optional(),",
    "updates: z\n    .union([z.record(z.string(), z['unknown']()), z.array(z.record(z.string(), z['unknown']()))])",
    'coerceQuery(filter || query)',
    'extractFlatUpdates(update || updates)',
    'normalizeReplaceDoc(update || updates)',
    'normalizeUpdateDoc(update || updates)',
  ];
  const requiredSnippets = [
    'query: z.never().optional(),',
    'updates: z.never().optional(),',
    'const where = coerceQuery(filter);',
    'const normalizedFilter = normalizeObjectId(coerceQuery(filter), idType);',
    'const flatUpdates = extractFlatUpdates(update);',
    'const replacement = normalizeReplaceDoc(update);',
    'const updateDoc = normalizeUpdateDoc(update);',
  ];

  for (const snippet of forbiddenSnippets) {
    if (dbActionText.includes(snippet)) {
      reportViolation(
        DB_ACTION_HANDLER_FILE,
        `legacy db-action request alias compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!dbActionText.includes(snippet)) {
      reportViolation(
        DB_ACTION_HANDLER_FILE,
        `missing canonical db-action request contract snippet: ${snippet}`
      );
    }
  }
};

const checkDatabaseClientLegacyRouteCompatibilityPrune = () => {
  const databaseClientText = readFile(DATABASE_CLIENT_FILE);

  const forbiddenSnippets = [
    '/api/ai-paths/db-query',
    '/api/ai-paths/db-update',
    'query: unknown;\n  updates: unknown;',
    'query: payload.query,',
    'filter: payload.query,',
    'update: payload.updates,',
  ];
  const requiredSnippets = [
    "return apiPost<T>('/api/ai-paths/db-action', payload,",
    "return apiPost<T>('/api/ai-paths/db-action', {",
    'filter: unknown;\n  projection?: unknown;',
    'filter: unknown;\n  update: unknown;',
    "action: payload.single ? 'findOne' : 'find',",
    'filter: payload.filter,',
    "action: payload.single === false ? 'updateMany' : 'updateOne',",
    'update: payload.update,',
  ];

  for (const snippet of forbiddenSnippets) {
    if (databaseClientText.includes(snippet)) {
      reportViolation(
        DATABASE_CLIENT_FILE,
        `legacy database client route compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!databaseClientText.includes(snippet)) {
      reportViolation(
        DATABASE_CLIENT_FILE,
        `missing canonical database client routing snippet: ${snippet}`
      );
    }
  }
};

const checkDbQueryUpdateShimRetirement = () => {
  const forbiddenShimFiles = [
    DB_COMMAND_HANDLER_FILE,
    DB_COMMAND_ROUTE_FILE,
    DB_QUERY_HANDLER_FILE,
    DB_QUERY_ROUTE_FILE,
    DB_UPDATE_HANDLER_FILE,
    DB_UPDATE_ROUTE_FILE,
  ];
  const requiredCanonicalFiles = [DB_ACTION_HANDLER_FILE, DB_ACTION_ROUTE_FILE];

  for (const file of forbiddenShimFiles) {
    if (fs.existsSync(path.join(ROOT, file))) {
      reportViolation(file, 'legacy db-command/db-query/db-update shim route must remain removed');
    }
  }

  for (const file of requiredCanonicalFiles) {
    if (!fs.existsSync(path.join(ROOT, file))) {
      reportViolation(file, 'missing canonical db-action route file');
    }
  }
};

const checkApiClientCsrfCompatibilityAliasPrune = () => {
  const apiClientText = readFile(API_CLIENT_FILE);
  const apiClientBaseText = readFile(API_CLIENT_BASE_FILE);

  const forbiddenSnippets = ['withCsrfHeadersCompat'];
  const requiredSnippets = ['withApiCsrfHeaders'];

  for (const snippet of forbiddenSnippets) {
    if (apiClientText.includes(snippet)) {
      reportViolation(
        API_CLIENT_FILE,
        `legacy api-client csrf compatibility alias snippet detected: ${snippet}`
      );
    }
    if (apiClientBaseText.includes(snippet)) {
      reportViolation(
        API_CLIENT_BASE_FILE,
        `legacy api-client csrf compatibility alias snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!apiClientBaseText.includes(snippet)) {
      reportViolation(
        API_CLIENT_BASE_FILE,
        `missing canonical api-client csrf helper snippet: ${snippet}`
      );
    }
  }
};

const checkDbSchemaProviderAliasCompatibilityPrune = () => {
  const text = readFile(DB_SCHEMA_NODE_CONFIG_SECTION_FILE);

  const forbiddenSnippets = [
    "provider: 'auto' | 'mongodb' | 'prisma' | 'all';",
    "provider: selectedNode.config?.db_schema?.provider ?? 'all',",
    "updateSchemaConfig({ provider: value as 'auto' | 'mongodb' | 'prisma' | 'all' })",
    "{ value: 'all', label: 'All Providers' },",
  ];
  const requiredSnippets = [
    "provider: 'auto' | 'mongodb' | 'prisma';",
    "const normalizeSchemaProvider = (value: unknown): SchemaConfig['provider'] =>",
    "provider: normalizeSchemaProvider(selectedNode.config?.db_schema?.provider),",
    "updateSchemaConfig({ provider: value as 'auto' | 'mongodb' | 'prisma' })",
  ];

  for (const snippet of forbiddenSnippets) {
    if (text.includes(snippet)) {
      reportViolation(
        DB_SCHEMA_NODE_CONFIG_SECTION_FILE,
        `legacy db-schema provider alias compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      reportViolation(
        DB_SCHEMA_NODE_CONFIG_SECTION_FILE,
        `missing canonical db-schema provider contract snippet: ${snippet}`
      );
    }
  }
};

const checkEntityUpdateSimpleParametersAliasPrune = () => {
  const text = readFile(ENTITY_UPDATE_HANDLER_FILE);

  const forbiddenSnippets = [
    'LEGACY_SIMPLE_PARAMETER_PREFIX',
    'normalizeLegacySimpleParameterUpdates',
    'mergeLegacySimpleParameterInferenceWithExisting',
    "prepared['parameters'] === undefined && prepared['simpleParameters'] !== undefined",
    'AI Paths product update payload contains deprecated "simpleParameters". Use "parameters".',
  ];
  const requiredSnippets = [
    "Object.prototype.hasOwnProperty.call(prepared, 'simpleParameters')",
    'AI Paths product update payload contains unsupported "simpleParameters" alias. Use "parameters".',
  ];

  for (const snippet of forbiddenSnippets) {
    if (text.includes(snippet)) {
      reportViolation(
        ENTITY_UPDATE_HANDLER_FILE,
        `legacy entity-update simpleParameters compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      reportViolation(
        ENTITY_UPDATE_HANDLER_FILE,
        `missing canonical entity-update simpleParameters rejection snippet: ${snippet}`
      );
    }
  }
};

const checkParameterInferenceTargetPathCompatibilityPrune = () => {
  const text = readFile(DATABASE_PARAMETER_INFERENCE_FILE);

  const forbiddenSnippets = [
    "if (targetPath !== 'parameters') {\n    return { updates: args.updates, applied: false };",
    'mergeLegacySimpleParameterInferenceWithExisting',
  ];
  const requiredSnippets = [
    "if (targetPath !== 'parameters') {",
    'Parameter inference guard targetPath must use canonical "parameters" path.',
    "reason: 'unsupported_target_path'",
  ];

  for (const snippet of forbiddenSnippets) {
    if (text.includes(snippet)) {
      reportViolation(
        DATABASE_PARAMETER_INFERENCE_FILE,
        `legacy parameter-inference target-path compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      reportViolation(
        DATABASE_PARAMETER_INFERENCE_FILE,
        `missing canonical parameter-inference target-path snippet: ${snippet}`
      );
    }
  }
};

const checkDatabaseSettingsTargetPathEditTimeCanonicalizationPrune = () => {
  const text = readFile(DATABASE_SETTINGS_TAB_FILE);

  const forbiddenSnippets = ['updateGuard({ targetPath: e.target.value || undefined })'];
  const requiredSnippets = [
    "const CANONICAL_PARAMETER_INFERENCE_TARGET_PATH = 'parameters';",
    'const normalizeParameterInferenceTargetPath = (value: unknown): string | undefined => {',
    'const normalizedGuardTargetPath = normalizeParameterInferenceTargetPath(guard.targetPath);',
    'targetPath: CANONICAL_PARAMETER_INFERENCE_TARGET_PATH,',
    "value={normalizedGuardTargetPath ?? CANONICAL_PARAMETER_INFERENCE_TARGET_PATH}",
    'readOnly',
  ];

  for (const snippet of forbiddenSnippets) {
    if (text.includes(snippet)) {
      reportViolation(
        DATABASE_SETTINGS_TAB_FILE,
        `legacy database-settings target-path edit compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      reportViolation(
        DATABASE_SETTINGS_TAB_FILE,
        `missing canonical database-settings target-path edit snippet: ${snippet}`
      );
    }
  }
};

const checkParameterInferenceTargetPathSanitizationPrune = () => {
  const aiPathsSettingsUtilsText = readFile(AI_PATHS_SETTINGS_UTILS_FILE);
  const useAiPathSettingsText = readFile(PRODUCTS_AI_PATH_SETTINGS_FILE);

  const forbiddenSnippets = [
    'AI Path config contains deprecated parameter inference target path.',
    "reason: 'deprecated_parameter_inference_target_path'",
  ];
  const requiredAiPathsSettingsUtilsSnippets = [
    "targetPath.length > 0 && targetPath !== 'parameters'",
    'AI Path config contains unsupported parameter inference target path.',
    "reason: 'unsupported_parameter_inference_target_path'",
  ];
  const requiredUseAiPathSettingsSnippets = [
    "targetPath.length > 0 && targetPath !== 'parameters'",
    'AI Path config contains unsupported parameter inference target path.',
    "reason: 'unsupported_parameter_inference_target_path'",
  ];

  for (const snippet of forbiddenSnippets) {
    if (aiPathsSettingsUtilsText.includes(snippet)) {
      reportViolation(
        AI_PATHS_SETTINGS_UTILS_FILE,
        `legacy parameter-inference target-path sanitize snippet detected: ${snippet}`
      );
    }
    if (useAiPathSettingsText.includes(snippet)) {
      reportViolation(
        PRODUCTS_AI_PATH_SETTINGS_FILE,
        `legacy loaded-config parameter-inference target-path sanitize snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredAiPathsSettingsUtilsSnippets) {
    if (!aiPathsSettingsUtilsText.includes(snippet)) {
      reportViolation(
        AI_PATHS_SETTINGS_UTILS_FILE,
        `missing canonical parameter-inference target-path sanitize snippet: ${snippet}`
      );
    }
  }

  for (const snippet of requiredUseAiPathSettingsSnippets) {
    if (!useAiPathSettingsText.includes(snippet)) {
      reportViolation(
        PRODUCTS_AI_PATH_SETTINGS_FILE,
        `missing canonical loaded-config parameter-inference target-path sanitize snippet: ${snippet}`
      );
    }
  }
};

const checkDatabaseSchemaSnapshotProviderErrorChannelPrune = () => {
  const triggerNormalizationText = readFile(TRIGGER_NORMALIZATION_FILE);
  const aiPathsSettingsUtilsText = readFile(AI_PATHS_SETTINGS_UTILS_FILE);
  const useAiPathSettingsText = readFile(PRODUCTS_AI_PATH_SETTINGS_FILE);

  const forbiddenSnippets = [
    'contains deprecated database schemaSnapshot',
    'contains deprecated database query provider "all"',
    "reason: 'deprecated_database_schema_snapshot'",
    "reason: 'deprecated_database_query_provider'",
  ];
  const requiredTriggerNormalizationSnippets = [
    'AI Path trigger payload contains unsupported database schemaSnapshot.',
    'AI Path trigger payload contains unsupported database query provider "all".',
    "reason: 'unsupported_database_schema_snapshot'",
    "reason: 'unsupported_database_query_provider'",
  ];
  const requiredAiPathsSettingsUtilsSnippets = [
    'AI Path config contains unsupported database schemaSnapshot.',
    'AI Path config contains unsupported database query provider "all".',
    "reason: 'unsupported_database_schema_snapshot'",
    "reason: 'unsupported_database_query_provider'",
  ];
  const requiredUseAiPathSettingsSnippets = [
    'AI Path config contains unsupported database schemaSnapshot.',
    'AI Path config contains unsupported database query provider "all".',
    "reason: 'unsupported_database_schema_snapshot'",
    "reason: 'unsupported_database_query_provider'",
  ];

  for (const snippet of forbiddenSnippets) {
    if (triggerNormalizationText.includes(snippet)) {
      reportViolation(
        TRIGGER_NORMALIZATION_FILE,
        `legacy database schema/provider error-channel snippet detected: ${snippet}`
      );
    }
    if (aiPathsSettingsUtilsText.includes(snippet)) {
      reportViolation(
        AI_PATHS_SETTINGS_UTILS_FILE,
        `legacy database schema/provider error-channel snippet detected: ${snippet}`
      );
    }
    if (useAiPathSettingsText.includes(snippet)) {
      reportViolation(
        PRODUCTS_AI_PATH_SETTINGS_FILE,
        `legacy database schema/provider error-channel snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredTriggerNormalizationSnippets) {
    if (!triggerNormalizationText.includes(snippet)) {
      reportViolation(
        TRIGGER_NORMALIZATION_FILE,
        `missing canonical trigger database schema/provider snippet: ${snippet}`
      );
    }
  }

  for (const snippet of requiredAiPathsSettingsUtilsSnippets) {
    if (!aiPathsSettingsUtilsText.includes(snippet)) {
      reportViolation(
        AI_PATHS_SETTINGS_UTILS_FILE,
        `missing canonical path-config database schema/provider snippet: ${snippet}`
      );
    }
  }

  for (const snippet of requiredUseAiPathSettingsSnippets) {
    if (!useAiPathSettingsText.includes(snippet)) {
      reportViolation(
        PRODUCTS_AI_PATH_SETTINGS_FILE,
        `missing canonical loaded-path database schema/provider snippet: ${snippet}`
      );
    }
  }
};

const checkTriggerDataAndCollectionAliasErrorChannelPrune = () => {
  const aiPathsSettingsUtilsText = readFile(AI_PATHS_SETTINGS_UTILS_FILE);
  const useAiPathSettingsText = readFile(PRODUCTS_AI_PATH_SETTINGS_FILE);

  const forbiddenSnippets = [
    "reason: 'deprecated_trigger_outputs'",
    "reason: 'deprecated_trigger_data_edge'",
    "reason: 'deprecated_collection_aliases'",
    'AI Path config contains deprecated collection aliases.',
  ];
  const requiredAiPathsSettingsUtilsSnippets = [
    "reason: 'unsupported_trigger_outputs'",
    "reason: 'unsupported_trigger_data_edge'",
    "reason: 'unsupported_collection_aliases'",
    'AI Path config contains unsupported collection aliases.',
  ];
  const requiredUseAiPathSettingsSnippets = [
    "reason: 'unsupported_trigger_outputs'",
    "reason: 'unsupported_trigger_data_edge'",
    "reason: 'unsupported_collection_aliases'",
    'AI Path config contains unsupported collection aliases.',
  ];

  for (const snippet of forbiddenSnippets) {
    if (aiPathsSettingsUtilsText.includes(snippet)) {
      reportViolation(
        AI_PATHS_SETTINGS_UTILS_FILE,
        `legacy trigger-data/collection-alias error-channel snippet detected: ${snippet}`
      );
    }
    if (useAiPathSettingsText.includes(snippet)) {
      reportViolation(
        PRODUCTS_AI_PATH_SETTINGS_FILE,
        `legacy trigger-data/collection-alias error-channel snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredAiPathsSettingsUtilsSnippets) {
    if (!aiPathsSettingsUtilsText.includes(snippet)) {
      reportViolation(
        AI_PATHS_SETTINGS_UTILS_FILE,
        `missing canonical trigger-data/collection-alias error-channel snippet: ${snippet}`
      );
    }
  }

  for (const snippet of requiredUseAiPathSettingsSnippets) {
    if (!useAiPathSettingsText.includes(snippet)) {
      reportViolation(
        PRODUCTS_AI_PATH_SETTINGS_FILE,
        `missing canonical trigger-data/collection-alias error-channel snippet: ${snippet}`
      );
    }
  }
};

const checkRuntimeAndNodeIdentityReasonChannelPrune = () => {
  const aiPathsSettingsUtilsText = readFile(AI_PATHS_SETTINGS_UTILS_FILE);
  const useAiPathSettingsText = readFile(PRODUCTS_AI_PATH_SETTINGS_FILE);
  const pathRunServiceText = readFile(PATH_RUN_SERVICE_FILE);
  const pathRunExecutorHelpersText = readFile(PATH_RUN_EXECUTOR_HELPERS_FILE);
  const pathActionsText = readFile(SETTINGS_PATH_ACTIONS_FILE);

  const forbiddenRuntimeReasonSnippet = "reason: 'deprecated_runtime_identity_fields'";
  const requiredRuntimeReasonSnippet = "reason: 'unsupported_runtime_identity_fields'";
  const forbiddenRuntimeFallbackSnippet = "errorReason === 'deprecated_runtime_identity_fields'";
  const requiredRuntimeFallbackSnippet = "errorReason === 'unsupported_runtime_identity_fields'";
  const forbiddenNodeIdentitySnippets = ["reason: 'deprecated_node_identities'"];
  const requiredNodeIdentitySnippets = ["reason: 'unsupported_node_identities'"];

  if (aiPathsSettingsUtilsText.includes(forbiddenRuntimeReasonSnippet)) {
    reportViolation(
      AI_PATHS_SETTINGS_UTILS_FILE,
      `legacy runtime-identity reason snippet detected: ${forbiddenRuntimeReasonSnippet}`
    );
  }
  if (pathRunExecutorHelpersText.includes(forbiddenRuntimeReasonSnippet)) {
    reportViolation(
      PATH_RUN_EXECUTOR_HELPERS_FILE,
      `legacy runtime-identity reason snippet detected: ${forbiddenRuntimeReasonSnippet}`
    );
  }
  if (pathActionsText.includes(forbiddenRuntimeFallbackSnippet)) {
    reportViolation(
      SETTINGS_PATH_ACTIONS_FILE,
      `legacy runtime-identity fallback reason snippet detected: ${forbiddenRuntimeFallbackSnippet}`
    );
  }

  if (!aiPathsSettingsUtilsText.includes(requiredRuntimeReasonSnippet)) {
    reportViolation(
      AI_PATHS_SETTINGS_UTILS_FILE,
      `missing canonical runtime-identity reason snippet: ${requiredRuntimeReasonSnippet}`
    );
  }
  if (!pathRunExecutorHelpersText.includes(requiredRuntimeReasonSnippet)) {
    reportViolation(
      PATH_RUN_EXECUTOR_HELPERS_FILE,
      `missing canonical runtime-identity reason snippet: ${requiredRuntimeReasonSnippet}`
    );
  }
  if (!pathActionsText.includes(requiredRuntimeFallbackSnippet)) {
    reportViolation(
      SETTINGS_PATH_ACTIONS_FILE,
      `missing canonical runtime-identity fallback reason snippet: ${requiredRuntimeFallbackSnippet}`
    );
  }

  for (const snippet of forbiddenNodeIdentitySnippets) {
    if (aiPathsSettingsUtilsText.includes(snippet)) {
      reportViolation(
        AI_PATHS_SETTINGS_UTILS_FILE,
        `legacy node-identity reason snippet detected: ${snippet}`
      );
    }
    if (useAiPathSettingsText.includes(snippet)) {
      reportViolation(
        PRODUCTS_AI_PATH_SETTINGS_FILE,
        `legacy loaded-path node-identity reason snippet detected: ${snippet}`
      );
    }
    if (pathRunServiceText.includes(snippet)) {
      reportViolation(
        PATH_RUN_SERVICE_FILE,
        `legacy run-graph node-identity reason snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredNodeIdentitySnippets) {
    if (!aiPathsSettingsUtilsText.includes(snippet)) {
      reportViolation(
        AI_PATHS_SETTINGS_UTILS_FILE,
        `missing canonical node-identity reason snippet: ${snippet}`
      );
    }
    if (!useAiPathSettingsText.includes(snippet)) {
      reportViolation(
        PRODUCTS_AI_PATH_SETTINGS_FILE,
        `missing canonical loaded-path node-identity reason snippet: ${snippet}`
      );
    }
    if (!pathRunServiceText.includes(snippet)) {
      reportViolation(
        PATH_RUN_SERVICE_FILE,
        `missing canonical run-graph node-identity reason snippet: ${snippet}`
      );
    }
  }
};

const checkStarterWorkflowEdgeAliasCompatibilityPrune = () => {
  const text = readFile(STARTER_WORKFLOW_REGISTRY_FILE);

  const forbiddenSnippets = [
    "record['from'] ?? record['source']",
    "record['to'] ?? record['target']",
    "record['fromPort'] ?? record['sourceHandle']",
    "record['toPort'] ?? record['targetHandle']",
    'edge.to ?? edge.target',
    'edge.toPort ?? edge.targetHandle',
  ];
  const requiredSnippets = [
    "from: normalizeText(record['from'])",
    "to: normalizeText(record['to'])",
    "fromPort: normalizeText(record['fromPort'])",
    "toPort: normalizeText(record['toPort'])",
    'const toNodeId = normalizeText(edge.to);',
    'const port = normalizeText(edge.toPort);',
  ];

  for (const snippet of forbiddenSnippets) {
    if (text.includes(snippet)) {
      reportViolation(
        STARTER_WORKFLOW_REGISTRY_FILE,
        `legacy starter-workflow edge alias compatibility snippet detected: ${snippet}`
      );
    }
  }

  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      reportViolation(
        STARTER_WORKFLOW_REGISTRY_FILE,
        `missing canonical starter-workflow edge parsing snippet: ${snippet}`
      );
    }
  }
};

const checkEdgeAliasCleanupCompatibilityPrune = () => {
  const factoryText = readFile(AI_PATHS_FACTORY_FILE);
  const nodeIdentityText = readFile(AI_PATHS_NODE_IDENTITY_FILE);

  const forbiddenFactorySnippets = ['source: _legacySource', 'target: _legacyTarget'];
  const forbiddenNodeIdentitySnippets = [
    'source: _legacySource',
    'target: _legacyTarget',
    "Object.prototype.hasOwnProperty.call(edge, 'source')",
    "Object.prototype.hasOwnProperty.call(edge, 'target')",
  ];
  for (const snippet of forbiddenFactorySnippets) {
    if (factoryText.includes(snippet)) {
      reportViolation(
        AI_PATHS_FACTORY_FILE,
        `legacy edge alias cleanup snippet detected: ${snippet}`
      );
    }
  }
  for (const snippet of forbiddenNodeIdentitySnippets) {
    if (nodeIdentityText.includes(snippet)) {
      reportViolation(
        AI_PATHS_NODE_IDENTITY_FILE,
        `legacy edge alias repair snippet detected: ${snippet}`
      );
    }
  }
};

const checkSimulationEdgeAliasCompatibilityPrune = () => {
  const text = readFile(AI_PATHS_SIMULATION_FILE);
  const forbiddenSnippets = ['e.source === n.id', 'e.target === simulationNode.id'];
  const requiredSnippets = ['e.from === n.id', 'e.to === simulationNode.id'];

  for (const snippet of forbiddenSnippets) {
    if (text.includes(snippet)) {
      reportViolation(
        AI_PATHS_SIMULATION_FILE,
        `legacy simulation edge alias compatibility snippet detected: ${snippet}`
      );
    }
  }
  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      reportViolation(
        AI_PATHS_SIMULATION_FILE,
        `missing canonical simulation edge endpoint snippet: ${snippet}`
      );
    }
  }
};

const checkManifestLegacyPruneRules = () => {
  let manifest;
  try {
    manifest = loadLegacyPruneManifest(ROOT, DEFAULT_LEGACY_PRUNE_MANIFEST_RELATIVE_PATH);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed to load legacy prune manifest';
    reportViolation(DEFAULT_LEGACY_PRUNE_MANIFEST_RELATIVE_PATH, message);
    return;
  }

  const findings = evaluateLegacyPruneManifest(manifest, {
    root: ROOT,
    includeTargetFileMissingFindings: true,
  });

  for (const finding of findings) {
    reportViolation(finding.file, `manifest rule "${finding.ruleId}" ${finding.message}`);
  }
};

const main = () => {
  const sourceFiles = collectSourceFiles(SRC_DIR);

  checkLegacyValidationKeyUsage(sourceFiles);
  checkLegacyIndexKeyUsage(sourceFiles);
  checkForbiddenMaintenanceActionIds(sourceFiles);
  checkMaintenanceConstants();
  checkSettingsHandlerVersionedKeyGuards();
  checkMaintenanceHandlerEnum();
  checkTriggerButtonsApiCompatibilityPrune();
  checkDatabaseNodeLegacyDbQueryPrune();
  checkCollectionNamesLegacyDbQueryPrune();
  checkRuntimeRetryLegacyEnabledPrune();
  checkRuntimeHaltLegacyControlPrune();
  checkTriggerFetcherLegacyMigrationPrune(sourceFiles);
  checkLegacyDbQueryProviderMigrationPrune(sourceFiles);
  checkDatabaseNodeLegacyProviderNormalizationPrune();
  checkLegacyPortAliasPrune();
  checkPathSaveRawMessageCompatibilityPrune();
  checkRunExecutionMetaCompatibilityPrune();
  checkRunSourceMetaCompatibilityPrune();
  checkEnqueueMetaSourceCompatibilityPrune();
  checkRunSourceFilterCompatibilityPrune();
  checkQueueCacheRunSourceCompatibilityPrune();
  checkRunSourceHelpersCompatibilityPrune();
  checkRunModeQueueCompatibilityPrune();
  checkRequestIdLookupCompatibilityPrune();
  checkRuntimeNodeStatusAliasCompatibilityPrune();
  checkPresetCollectionMigrationCompatibilityPrune();
  checkValidationConfigLegacySchemaCompatibilityPrune();
  checkSettingsBackupPayloadCompatibilityPrune();
  checkValidationPathIndexMetaFallbackCompatibilityPrune();
  checkValidationCollectionMapLegacyDelimiterCompatibilityPrune();
  checkValidationDocsSourcesLegacyDelimiterCompatibilityPrune();
  checkDbQueryUpdateShimRetirement();
  // Manifest-driven rules cover catalog alias, database provider-fallback/alias,
  // db-action/db-client, CSRF helper, db-schema provider alias, simpleParameters alias,
  // runtime/sanitize target-path channels, database schema/provider channels,
  // trigger-data/collection-alias channels, runtime/node-identity reason channels,
  // simulation edge aliases, and starter-workflow/core edge alias cleanup surfaces.
  checkManifestLegacyPruneRules();

  if (violations.length > 0) {
    console.error('[ai-paths:check:canonical] failed with violations:');
    for (const violation of violations) {
      console.error(`- ${violation.file}: ${violation.message}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('[ai-paths:check:canonical] passed');
  console.log(`[ai-paths:check:canonical] scanned ${sourceFiles.length} source file(s) under src/`);
};

main();
