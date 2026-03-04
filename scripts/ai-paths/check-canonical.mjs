import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

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

const ALLOWED_LEGACY_INDEX_FILES = new Set(['src/app/api/ai-paths/settings/handler.ts']);

const SETTINGS_HANDLER_FILE = 'src/app/api/ai-paths/settings/handler.ts';
const MAINTENANCE_HANDLER_FILE = 'src/app/api/ai-paths/settings/maintenance/handler.ts';
const MAINTENANCE_CONSTANTS_FILE = 'src/features/ai/ai-paths/server/settings-store.constants.ts';
const API_CLIENT_FILE = 'src/shared/lib/ai-paths/api/client.ts';
const DATABASE_NORMALIZATION_FILE = 'src/shared/lib/ai-paths/core/normalization/nodes/database.ts';
const COLLECTION_NAMES_FILE = 'src/shared/lib/ai-paths/core/utils/collection-names.ts';
const ENGINE_CORE_FILE = 'src/shared/lib/ai-paths/core/runtime/engine-core.ts';
const GRAPH_PORTS_FILE = 'src/shared/lib/ai-paths/core/utils/graph.ports.ts';
const PATH_PERSISTENCE_HELPERS_FILE =
  'src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsPersistence.helpers.ts';
const SETTINGS_PERSISTENCE_FILE =
  'src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsPersistence.ts';
const SETTINGS_PATH_ACTIONS_FILE =
  'src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsSettingsPathActions.ts';
const JOB_QUEUE_PANEL_UTILS_FILE = 'src/features/ai/ai-paths/components/job-queue-panel-utils.ts';
const RUNS_ENQUEUE_HANDLER_FILE = 'src/app/api/ai-paths/runs/enqueue/handler.ts';
const PATH_RUN_SERVICE_FILE = 'src/features/ai/ai-paths/services/path-run-service.ts';
const PATH_RUN_EXECUTOR_LOGIC_FILE = 'src/features/ai/ai-paths/services/path-run-executor.logic.ts';
const SETTINGS_RUNTIME_UTILS_FILE =
  'src/features/ai/ai-paths/components/ai-paths-settings/runtime/utils.ts';
const PRISMA_RUN_REPOSITORY_FILE =
  'src/features/ai/ai-paths/services/path-run-repository/prisma-path-run-repository.ts';
const MONGO_RUN_REPOSITORY_FILE =
  'src/features/ai/ai-paths/services/path-run-repository/mongo-path-run-repository.ts';
const QUERY_INVALIDATION_FILE = 'src/shared/lib/query-invalidation.ts';
const SHARED_RUN_SOURCES_FILE = 'src/shared/lib/ai-paths/run-sources.ts';
const FEATURE_RUN_SOURCES_FILE = 'src/features/ai/ai-paths/lib/run-sources.ts';
const TRIGGER_FETCHER_MIGRATION_FILE =
  'src/shared/lib/ai-paths/core/normalization/normalization.edges.ts';

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
    if (!ALLOWED_LEGACY_INDEX_FILES.has(relative)) {
      reportViolation(
        relative,
        `legacy key "${LEGACY_INDEX_KEY}" is only allowed in ${Array.from(ALLOWED_LEGACY_INDEX_FILES).join(', ')}`
      );
    }
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

const checkSettingsHandlerGuards = () => {
  const text = readFile(SETTINGS_HANDLER_FILE);
  const requiredSnippets = [
    'requestedKeys.includes(LEGACY_PATH_INDEX_KEY)',
    '.filter((item) => item.key !== LEGACY_PATH_INDEX_KEY)',
    'parsedBulk.data.items.some((item) => item.key === LEGACY_PATH_INDEX_KEY)',
    'parsedSingle.data.key === LEGACY_PATH_INDEX_KEY',
  ];

  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      reportViolation(
        SETTINGS_HANDLER_FILE,
        `missing canonical guard snippet for legacy index key: ${snippet}`
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
  const forbiddenSnippets = ['legacyDbQueryCandidate', "nextConfigWithLegacy['dbQuery']"];

  for (const snippet of forbiddenSnippets) {
    if (text.includes(snippet)) {
      reportViolation(
        COLLECTION_NAMES_FILE,
        `legacy collection migration dbQuery compatibility snippet detected: ${snippet}`
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

const main = () => {
  const sourceFiles = collectSourceFiles(SRC_DIR);

  checkLegacyValidationKeyUsage(sourceFiles);
  checkLegacyIndexKeyUsage(sourceFiles);
  checkForbiddenMaintenanceActionIds(sourceFiles);
  checkMaintenanceConstants();
  checkSettingsHandlerGuards();
  checkMaintenanceHandlerEnum();
  checkTriggerButtonsApiCompatibilityPrune();
  checkDatabaseNodeLegacyDbQueryPrune();
  checkCollectionNamesLegacyDbQueryPrune();
  checkRuntimeRetryLegacyEnabledPrune();
  checkRuntimeHaltLegacyControlPrune();
  checkTriggerFetcherLegacyMigrationPrune(sourceFiles);
  checkLegacyDbQueryProviderMigrationPrune(sourceFiles);
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
