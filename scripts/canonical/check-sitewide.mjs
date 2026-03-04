import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');
const ROOT_TESTS_DIR = path.join(ROOT, '__tests__');

const REQUIRED_DOCS = [
  'docs/site-wide-canonical-migration-plan-2026-03-04.md',
  'docs/canonical-contract-matrix-2026-03-04.md',
  'docs/legacy-compatibility-exception-register-2026-03-04.md',
  'docs/legacy-compatibility-exception-register-2026-03-04.json',
];

const EXCEPTION_REGISTER_PATH = 'docs/legacy-compatibility-exception-register-2026-03-04.json';
const FORBIDDEN_LEGACY_ROUTE_DIRS = [
  'src/app/api/import',
  'src/app/api/catalogs/assign',
  'src/app/api/ai-paths/legacy-compat/counters',
];
const FORBIDDEN_MIGRATION_HELPER_RUNTIME_FILES = [
  'src/features/integrations/services/imports/parameter-import/link-map-preference-migration.ts',
  'src/features/integrations/services/export-warehouse-preference-migration.ts',
  'src/features/case-resolver/workspace-detached-contract-migration.ts',
  'src/features/products/api/versioning.ts',
  'src/features/products/api/routes/v2-products-route.ts',
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
  const absolute = path.join(ROOT, EXCEPTION_REGISTER_PATH);
  if (!fs.existsSync(absolute)) {
    reportViolation(`missing exception register: ${EXCEPTION_REGISTER_PATH}`);
    return null;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(absolute, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      reportViolation(`invalid exception register payload shape: ${EXCEPTION_REGISTER_PATH}`);
      return null;
    }
    return parsed;
  } catch (error) {
    reportViolation(
      `failed to parse exception register JSON: ${EXCEPTION_REGISTER_PATH} (${error instanceof Error ? error.message : 'unknown_error'})`
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
  for (const relative of REQUIRED_DOCS) {
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
  checkRequiredDocs();
  checkForbiddenLegacyRouteDirs();
  checkForbiddenRuntimeMigrationHelpers();
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
    `[canonical:check:sitewide] validated ${runtimeFiles.length} runtime source file(s) and ${REQUIRED_DOCS.length} docs artifact(s)`
  );
};

main();
