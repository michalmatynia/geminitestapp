export const PATH_INDEX_KEY = 'ai_paths_index';
export const AI_PATHS_LAST_ERROR_KEY = 'ai_paths_last_error';
export const PATH_CONFIG_PREFIX = 'ai_paths_config_';
export const PATH_DEBUG_PREFIX = 'ai_paths_debug_';
export const CLUSTER_PRESETS_KEY = 'ai_paths_cluster_presets';
export const DB_QUERY_PRESETS_KEY = 'ai_paths_db_query_presets';
export const DB_NODE_PRESETS_KEY = 'ai_paths_db_node_presets';
export const AI_PATHS_UI_STATE_KEY = 'ai_paths_ui_state';
export const AI_PATHS_LOCAL_RUNS_KEY = 'ai_paths_local_runs';
export const AI_PATHS_VALIDATION_PROFILES_KEY = 'ai_paths_validation_profiles';
export const AI_PATHS_VALIDATION_DOCS_SOURCES_KEY = 'ai_paths_validation_docs_sources';
export const AI_PATHS_VALIDATION_ENTITY_COLLECTION_MAP_KEY =
  'ai_paths_validation_entity_collection_map';
export const AI_PATHS_HISTORY_RETENTION_KEY = 'ai_paths_history_retention_passes';
export const AI_PATHS_HISTORY_RETENTION_OPTIONS_MAX_KEY = 'ai_paths_history_retention_options_max';
export const AI_PATHS_RUNTIME_KERNEL_MODE_KEY = 'ai_paths_runtime_kernel_mode';
export const AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY = 'ai_paths_runtime_kernel_node_types';
// Deprecated compatibility alias for persisted runtime-kernel node type overrides.
export const AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES_KEY =
  'ai_paths_runtime_kernel_pilot_node_types';
export const AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY =
  'ai_paths_runtime_kernel_code_object_resolver_ids';
export const AI_PATHS_RUNTIME_KERNEL_STRICT_NATIVE_REGISTRY_KEY =
  'ai_paths_runtime_kernel_strict_native_registry';
export const AI_PATHS_HISTORY_RETENTION_MIN = 1;
export const AI_PATHS_HISTORY_RETENTION_MAX = 50;
export const AI_PATHS_HISTORY_RETENTION_DEFAULT = 3;

const rawHistoryRetentionOptionsMax = Number.parseInt(
  process.env['NEXT_PUBLIC_AI_PATHS_HISTORY_RETENTION_OPTIONS_MAX'] ?? '',
  10
);

export const AI_PATHS_HISTORY_RETENTION_OPTIONS_MAX_DEFAULT =
  Number.isFinite(rawHistoryRetentionOptionsMax) &&
  rawHistoryRetentionOptionsMax >= AI_PATHS_HISTORY_RETENTION_MIN
    ? Math.min(
        AI_PATHS_HISTORY_RETENTION_MAX,
        Math.max(AI_PATHS_HISTORY_RETENTION_MIN, Math.trunc(rawHistoryRetentionOptionsMax))
      )
    : AI_PATHS_HISTORY_RETENTION_MAX;

export const STORAGE_VERSION = 1;
export const TRIGGER_EVENTS = [
  { id: 'manual', label: 'Manual / UI Trigger' },
  { id: 'scheduled_run', label: 'Scheduled Run (Server)' },
];

export const PORT_COMPATIBILITY: Record<string, string[]> = {
  entityJson: ['entityJson', 'context', 'value', 'result', 'bundle'],
  productId: ['productId', 'entityId', 'value', 'result'],
  entityId: ['entityId', 'productId', 'value', 'result'],
  entityType: ['entityType', 'value', 'result'],
  trigger: ['trigger', 'value', 'result'],
  triggerName: ['triggerName', 'value', 'result'],
  prompt: ['prompt', 'textfield', 'content'],
  result: [
    'result',
    'value',
    'meta',
    'context',
    'entityJson',
    'url',
    'body',
    'params',
    'queryCallback',
    'aiQuery',
    'callback',
    'regexCallback',
    'content',
    'textfield',
  ],
  sources: ['sources', 'value', 'result', 'bundle'],
  images: ['images', 'value', 'result'],
  title: ['title', 'value', 'result', 'prompt', 'aiPrompt'],
  content_en: ['content_en', 'value', 'result', 'description_en', 'prompt', 'aiPrompt'],
  content: ['content', 'textfield', 'prompt', 'value', 'result'],
  textfield: ['textfield', 'content', 'prompt', 'value', 'result'],
  context: ['context', 'entityJson', 'value', 'result', 'bundle', 'images'],
  simulation: ['context', 'simulation'],
  meta: ['meta', 'value', 'result'],
  bundle: ['bundle', 'context', 'value', 'result', 'callback'],
  value: [
    'value',
    'result',
    'bundle',
    'context',
    'entityJson',
    'url',
    'body',
    'params',
    'query',
    'jobId',
    'status',
    'prompt',
    'aiPrompt',
    'queryCallback',
    'callback',
    'regexCallback',
    'content',
    'textfield',
  ],
  audioSignal: ['audioSignal', 'value', 'result', 'bundle'],
  frequency: ['frequency', 'value', 'result'],
  waveform: ['waveform', 'value', 'result'],
  gain: ['gain', 'value', 'result'],
  durationMs: ['durationMs', 'value', 'result'],
  query: ['query', 'value', 'result'],
  jobId: ['jobId', 'value', 'result', 'callback'],
  status: ['status', 'value', 'result', 'callback'],
  headers: ['headers', 'bundle', 'context', 'value', 'result'],
  items: ['items', 'bundle', 'context', 'value', 'result'],
  route: ['route', 'status', 'value', 'result'],
  error: ['error', 'errors', 'value', 'result'],
  success: ['success', 'valid', 'value', 'result'],
  description_en: ['description_en', 'content_en', 'value', 'result', 'text'],
  parameters: ['parameters', 'value', 'result', 'text'],
  valid: ['valid', 'value', 'result'],
  errors: ['errors', 'value', 'result'],
  queryCallback: ['queryCallback', 'aiPrompt', 'value', 'result', 'callback'],
  aiPrompt: ['prompt'],
  schema: ['schema'],
  aiQuery: ['aiQuery', 'query', 'queryCallback', 'value', 'callback'],
  grouped: ['grouped', 'result', 'value', 'bundle', 'query', 'aiQuery', 'queryCallback'],
  matches: ['matches', 'result', 'value', 'bundle'],
  callback: ['callback'],
  index: ['index', 'value', 'result'],
  total: ['total', 'value', 'result'],
  done: ['done', 'valid', 'value', 'result'],
};
