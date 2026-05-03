export const TRIGGER_INPUT_PORTS: string[] = [];
export const TRIGGER_OUTPUT_PORTS = ['trigger', 'triggerName'];
export const FETCHER_INPUT_PORTS = ['trigger', 'context', 'meta', 'entityId', 'entityType'];
export const FETCHER_OUTPUT_PORTS = ['context', 'meta', 'entityId', 'entityType'];
export const CONTEXT_INPUT_PORTS = ['context'];
export const CONTEXT_OUTPUT_PORTS = ['entityId', 'entityType', 'entityJson', 'meta'];
export const SIMULATION_INPUT_PORTS = ['trigger'];
export const SIMULATION_OUTPUT_PORTS = ['context', 'entityId', 'entityType', 'productId'];
export const AUDIO_OSCILLATOR_INPUT_PORTS = [
  'frequency',
  'waveform',
  'gain',
  'durationMs',
  'trigger',
];
export const AUDIO_OSCILLATOR_OUTPUT_PORTS = [
  'audioSignal',
  'frequency',
  'waveform',
  'gain',
  'durationMs',
];
export const AUDIO_SPEAKER_INPUT_PORTS = [
  'audioSignal',
  'frequency',
  'waveform',
  'gain',
  'durationMs',
  'trigger',
];
export const AUDIO_SPEAKER_OUTPUT_PORTS = ['status', 'audioSignal'];
export const PARSER_INPUT_PORTS = ['entityJson'];
export const PARSER_OUTPUT_PORTS = ['productId', 'content_en', 'images', 'title', 'bundle'];
export const MUTATOR_INPUT_PORTS = ['value', 'productId', 'content_en', 'bundle'];
export const MUTATOR_OUTPUT_PORTS = ['value', 'bundle'];
export const MAPPER_INPUT_PORTS = ['value', 'bundle'];
export const MAPPER_OUTPUT_PORTS = ['value', 'bundle'];
export const VALIDATOR_INPUT_PORTS = ['value', 'bundle'];
export const VALIDATOR_OUTPUT_PORTS = ['valid', 'errors', 'bundle'];
export const CONSTANT_INPUT_PORTS: string[] = [];
export const CONSTANT_OUTPUT_PORTS = ['value'];
export const MATH_INPUT_PORTS = ['value', 'bundle'];
export const MATH_OUTPUT_PORTS = ['value', 'bundle'];
export const TEMPLATE_INPUT_PORTS = ['bundle', 'value', 'productId'];
export const TEMPLATE_OUTPUT_PORTS = ['value'];
export const BUNDLE_INPUT_PORTS = ['value', 'productId', 'content_en', 'images', 'title'];
export const BUNDLE_OUTPUT_PORTS = ['bundle'];
export const GATE_INPUT_PORTS = ['value', 'bundle'];
export const GATE_OUTPUT_PORTS = ['value', 'bundle'];
export const COMPARE_INPUT_PORTS = ['value', 'bundle'];
export const COMPARE_OUTPUT_PORTS = ['valid', 'bundle'];
export const LOGICAL_CONDITION_INPUT_PORTS = ['bundle'];
export const LOGICAL_CONDITION_OUTPUT_PORTS = ['valid', 'bundle'];
export const ROUTER_INPUT_PORTS = ['value', 'bundle'];
export const ROUTER_OUTPUT_PORTS = ['value', 'bundle'];
export const DELAY_INPUT_PORTS = ['value', 'bundle'];
export const DELAY_OUTPUT_PORTS = ['value', 'bundle'];
export const NOTIFICATION_INPUT_PORTS = ['value', 'bundle', 'title'];
export const NOTIFICATION_OUTPUT_PORTS = ['value', 'bundle'];
export const DESCRIPTION_UPDATER_INPUT_PORTS = ['productId', 'description', 'bundle'];
export const DESCRIPTION_UPDATER_OUTPUT_PORTS = ['result', 'bundle'];
export const BOUNDS_NORMALIZER_INPUT_PORTS = ['value', 'bundle'];
export const BOUNDS_NORMALIZER_OUTPUT_PORTS = ['value', 'bundle', 'analysis'];
export const CANVAS_OUTPUT_INPUT_PORTS = ['analysis', 'bundle'];
export const CANVAS_OUTPUT_OUTPUT_PORTS: string[] = [];
export const DATABASE_INPUT_PORTS = [
  'entityId',
  'entityType',
  'productId',
  'context',
  'query',
  'value',
  'bundle',
  'result',
  'content_en',
  'queryCallback',
  'schema',
  'aiQuery',
];
export const REGEX_INPUT_PORTS = ['value', 'prompt', 'regexCallback'];
export const REGEX_OUTPUT_PORTS = ['grouped', 'matches', 'value', 'aiPrompt'];
export const STRING_MUTATOR_INPUT_PORTS = ['value', 'prompt', 'result'];
export const STRING_MUTATOR_OUTPUT_PORTS = ['value'];
export const VALIDATION_PATTERN_INPUT_PORTS = ['value', 'prompt', 'result', 'context'];
export const VALIDATION_PATTERN_OUTPUT_PORTS = [
  'value',
  'result',
  'context',
  'valid',
  'errors',
  'bundle',
];
export const ITERATOR_INPUT_PORTS = ['value', 'callback'];
export const ITERATOR_OUTPUT_PORTS = ['value', 'index', 'total', 'done', 'status'];

export const VIEWER_INPUT_PORTS = [
  'result',
  'sources',
  'grouped',
  'matches',
  'index',
  'total',
  'done',
  'analysis',
  'description',
  'description_en',
  'prompt',
  'images',
  'title',
  'productId',
  'content_en',
  'context',
  'meta',
  'trigger',
  'triggerName',
  'jobId',
  'status',
  'entityId',
  'entityType',
  'entityJson',
  'bundle',
  'valid',
  'errors',
  'value',
  'audioSignal',
  'frequency',
  'waveform',
  'gain',
  'durationMs',
  'queryCallback',
  'aiPrompt',
];
export const PROMPT_INPUT_PORTS = ['bundle', 'title', 'images', 'result', 'entityId'];
export const PROMPT_OUTPUT_PORTS = ['prompt', 'images'];
export const POLL_INPUT_PORTS = ['jobId', 'query', 'value', 'entityId', 'productId', 'bundle'];
export const POLL_OUTPUT_PORTS = ['result', 'status', 'jobId', 'bundle'];
export const MODEL_OUTPUT_PORTS = ['result', 'jobId'];
export const AGENT_INPUT_PORTS = ['prompt', 'bundle', 'context', 'entityJson'];
export const AGENT_OUTPUT_PORTS = ['result', 'jobId'];
export const LEARNER_AGENT_INPUT_PORTS = ['prompt', 'bundle'];
export const LEARNER_AGENT_OUTPUT_PORTS = ['result', 'jobId', 'sources'];
export const PLAYWRIGHT_INPUT_PORTS = ['url', 'bundle', 'context'];
export const PLAYWRIGHT_OUTPUT_PORTS = ['result', 'jobId', 'screenshot', 'html'];
/** Pre-configured capture variant — routes + appearanceMode fed in, capture artifacts returned. */
export const PLAYWRIGHT_CAPTURE_INPUT_PORTS = ['captures', 'appearanceMode', 'bundle', 'context'];
export const PLAYWRIGHT_CAPTURE_OUTPUT_PORTS = ['result', 'jobId', 'bundle'];
export const HTTP_INPUT_PORTS = ['url', 'body', 'headers', 'bundle'];
export const HTTP_OUTPUT_PORTS = ['result', 'status', 'headers'];
export const API_ADVANCED_INPUT_PORTS = ['url', 'body', 'headers', 'params', 'bundle'];
export const API_ADVANCED_OUTPUT_PORTS = ['result', 'status', 'headers', 'cursor'];
export const DB_SCHEMA_INPUT_PORTS = ['context', 'schema'];
export const DB_SCHEMA_OUTPUT_PORTS = ['schema', 'context'];
