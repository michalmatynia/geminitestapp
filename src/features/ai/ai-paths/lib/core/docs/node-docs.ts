import type { NodeType } from '@/shared/contracts/ai-paths';

import { palette as NODE_DEFINITIONS } from '../definitions';

export type NodeConfigDocField = {
  /** Dot-path under `node.config` */
  path: string;
  description: string;
  /** Optional typical default shown by UI */
  defaultValue?: string;
};

export type AiPathsNodeDoc = {
  type: NodeType;
  title: string;
  purpose: string;
  inputs: string[];
  outputs: string[];
  config: NodeConfigDocField[];
  defaultConfig?: Record<string, unknown>;
  notes?: string[];
};

const COMMON_RUNTIME_FIELDS: NodeConfigDocField[] = [
  {
    path: 'runtime.cache.mode',
    description:
      'Node output caching. auto = reuse when safe, force = always reuse, disabled = recompute each run.',
    defaultValue: 'auto',
  },
  {
    path: 'runtime.cache.scope',
    description:
      'Cache key scope. run = isolate each run, activation = isolate by trigger/entity context, session = reuse across session.',
    defaultValue: 'run',
  },
  {
    path: 'runtime.waitForInputs',
    description:
      'If true, wait until all connected input ports have values before executing the node.',
    defaultValue: 'false',
  },
];

const dbQueryFields = (prefix: string): NodeConfigDocField[] => [
  { path: `${prefix}.provider`, description: 'Database provider (mongodb|prisma).', defaultValue: 'mongodb' },
  { path: `${prefix}.collection`, description: 'Collection to query (example: products).', defaultValue: '"products"' },
  { path: `${prefix}.mode`, description: 'preset uses a predefined query; custom uses queryTemplate.', defaultValue: 'preset' },
  { path: `${prefix}.preset`, description: 'Preset query shape (by_id/by_productId/by_entityId/by_field).', defaultValue: 'by_id' },
  { path: `${prefix}.field`, description: 'Field used by preset queries (example: _id, productId).', defaultValue: '"_id"' },
  { path: `${prefix}.idType`, description: 'How to treat IDs: string vs objectId.', defaultValue: 'string' },
  { path: `${prefix}.queryTemplate`, description: 'JSON query template (string) with {{placeholders}}.', defaultValue: '"{...}"' },
  { path: `${prefix}.limit`, description: 'Limit for multi-result queries.', defaultValue: '20' },
  { path: `${prefix}.sort`, description: 'Sort JSON (string).', defaultValue: '""' },
  { path: `${prefix}.projection`, description: 'Projection JSON (string).', defaultValue: '""' },
  { path: `${prefix}.single`, description: 'If true, treat result as a single document.', defaultValue: 'false' },
];

const CONFIG_DOCS_BY_TYPE: Partial<Record<NodeType, NodeConfigDocField[]>> = {
  trigger: [
    {
      path: 'trigger.event',
      description:
        'What event fires this Trigger node. Use manual for UI-driven runs; scheduled_run for server/cron runs.',
      defaultValue: 'manual',
    },
    {
      path: 'trigger.contextMode',
      description:
        'Legacy Trigger context policy: simulation_required, simulation_preferred, or trigger_only. For forward flow, prefer Trigger only + Fetcher node.',
      defaultValue: 'trigger_only',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  fetcher: [
    {
      path: 'fetcher.sourceMode',
      description:
        'How to resolve context: live_context, simulation_id, or live_then_simulation.',
      defaultValue: 'live_context',
    },
    {
      path: 'fetcher.entityType',
      description: 'Entity type used by simulation fetch modes.',
      defaultValue: 'product',
    },
    {
      path: 'fetcher.entityId',
      description:
        'Entity ID used by simulation fetch modes (preferred over productId alias).',
    },
    {
      path: 'fetcher.productId',
      description: 'Product ID alias for entityId.',
      defaultValue: '""',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  simulation: [
    {
      path: 'simulation.entityType',
      description: 'Entity type to load (product, note, ...).',
      defaultValue: 'product',
    },
    {
      path: 'simulation.entityId',
      description: 'Entity ID to load (preferred).',
    },
    {
      path: 'simulation.productId',
      description:
        'Product ID alias for entity identifier. Prefer entityId + entityType.',
      defaultValue: '""',
    },
    {
      path: 'simulation.runBehavior',
      description:
        'Execution policy for connected triggers: before_connected_trigger or manual_only.',
      defaultValue: 'before_connected_trigger',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  audio_oscillator: [
    {
      path: 'audioOscillator.waveform',
      description: 'Wave shape for generated signal: sine/square/triangle/sawtooth.',
      defaultValue: 'sine',
    },
    {
      path: 'audioOscillator.frequencyHz',
      description: 'Signal frequency in Hz.',
      defaultValue: '440',
    },
    {
      path: 'audioOscillator.gain',
      description: 'Signal amplitude in 0..1 range.',
      defaultValue: '0.25',
    },
    {
      path: 'audioOscillator.durationMs',
      description: 'Playback duration in milliseconds.',
      defaultValue: '400',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  audio_speaker: [
    {
      path: 'audioSpeaker.enabled',
      description: 'If false, speaker stays muted and reports disabled status.',
      defaultValue: 'true',
    },
    {
      path: 'audioSpeaker.autoPlay',
      description: 'If true, plays incoming audio signal immediately.',
      defaultValue: 'true',
    },
    {
      path: 'audioSpeaker.gain',
      description: 'Speaker output gain multiplier in 0..1 range.',
      defaultValue: '1',
    },
    {
      path: 'audioSpeaker.stopPrevious',
      description: 'Stop existing tone before playing the next signal.',
      defaultValue: 'true',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  context: [
    {
      path: 'context.role',
      description:
        'Context role for downstream nodes (used as a hint for prompts and filtering).',
    },
    {
      path: 'context.entityType',
      description:
        'Forced entity type (auto/product/note/etc). If auto, it uses incoming trigger context.',
      defaultValue: 'auto',
    },
    {
      path: 'context.entityIdSource',
      description:
        'Where to read entityId from when loading context. simulation/manual/context.',
      defaultValue: 'simulation',
    },
    {
      path: 'context.entityId',
      description:
        'Entity ID to fetch when entityIdSource is manual (or as a fallback when missing).',
      defaultValue: '""',
    },
    {
      path: 'context.scopeMode',
      description:
        'How to scope the payload: full (no filter), include (only includePaths), exclude (drop excludePaths).',
      defaultValue: 'full',
    },
    {
      path: 'context.scopeTarget',
      description:
        'What is being scoped: entity (only entity object) or context (full context payload).',
      defaultValue: 'entity',
    },
    {
      path: 'context.includePaths',
      description:
        'List of JSON paths to keep when scopeMode is include (example: [\'title\',\'images\']).',
      defaultValue: '[]',
    },
    {
      path: 'context.excludePaths',
      description:
        'List of JSON paths to remove when scopeMode is exclude (example: [\'internal.notes\']).',
      defaultValue: '[]',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  parser: [
    {
      path: 'parser.outputMode',
      description:
        'individual emits one port per mapping; bundle emits a single bundle output.',
      defaultValue: 'individual',
    },
    {
      path: 'parser.mappings',
      description:
        'Map output port name -> JSON path (relative to entityJson/context).',
      defaultValue: '{}',
    },
    {
      path: 'parser.presetId',
      description:
        'Optional preset that seeds mappings and output options (keeps your parser consistent).',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  regex: [
    {
      path: 'regex.pattern',
      description: 'JavaScript/ECMAScript regex pattern (without / delimiters).',
      defaultValue: '""',
    },
    {
      path: 'regex.flags',
      description: 'Regex flags string (example: g, i, m).',
      defaultValue: '"g"',
    },
    {
      path: 'regex.mode',
      description:
        'group = emit grouped matches; extract = emit selected capture on value output; extract_json = extract and parse JSON when possible.',
      defaultValue: 'group',
    },
    {
      path: 'regex.matchMode',
      description:
        'first = one match per input string; first_overall = stop after the first match across all inputs; all = all matches per input string.',
      defaultValue: 'first',
    },
    {
      path: 'regex.groupBy',
      description:
        'Selector used for grouping (group mode) or extraction (extract mode): match/0, capture index (1...), named group, groups, or captures.',
      defaultValue: 'match',
    },
    {
      path: 'regex.outputMode',
      description: 'Grouped output mode: object (Record) or array (list of groups).',
      defaultValue: 'object',
    },
    {
      path: 'regex.includeUnmatched',
      description: 'If true, inputs that do not match are emitted under unmatchedKey.',
      defaultValue: 'true',
    },
    {
      path: 'regex.unmatchedKey',
      description: 'Group key label for unmatched values.',
      defaultValue: '"__unmatched__"',
    },
    {
      path: 'regex.splitLines',
      description: 'If true, string inputs are split by newline into multiple items.',
      defaultValue: 'true',
    },
    {
      path: 'regex.sampleText',
      description: 'Optional sample text used for preview / AI prompt rendering.',
      defaultValue: '""',
    },
    {
      path: 'regex.aiPrompt',
      description: 'Optional AI prompt template used to propose a regex.',
      defaultValue: '""',
    },
    {
      path: 'regex.jsonIntegrityPolicy',
      description:
        'How extract_json handles malformed JSON-like strings. strict keeps malformed strings unresolved; repair attempts object-boundary repair before parsing.',
      defaultValue: 'repair',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  iterator: [
    {
      path: 'iterator.autoContinue',
      description:
        'If true, the runtime will automatically attempt to advance to the next item after a callback is received.',
      defaultValue: 'true',
    },
    {
      path: 'iterator.maxSteps',
      description:
        'Safety cap for automatic continuation steps per run/tick (prevents infinite loops).',
      defaultValue: '50',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  mapper: [
    {
      path: 'mapper.outputs',
      description:
        'Which output ports the mapper should expose (the ports must exist on the node).',
      defaultValue: '["value"]',
    },
    {
      path: 'mapper.mappings',
      description:
        'Map output port name -> JSON path (relative to context).',
      defaultValue: '{}',
    },
    {
      path: 'mapper.jsonIntegrityPolicy',
      description:
        'How mapper normalizes JSON-like string inputs before resolving mapping paths. strict keeps malformed strings unresolved; repair attempts normalization first.',
      defaultValue: 'repair',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  mutator: [
    {
      path: 'mutator.path',
      description:
        'JSON path to write to (example: \'meta.flags.needsReview\').',
    },
    {
      path: 'mutator.valueTemplate',
      description:
        'Template used to compute the value written at `path` (supports {{placeholders}}).',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  string_mutator: [
    {
      path: 'stringMutator.operations',
      description:
        'Ordered list of string operations to apply to the incoming value.',
      defaultValue: '[]',
    },
    {
      path: 'stringMutator.operations[].type',
      description:
        'Operation type: trim, replace, remove, case, append, slice.',
    },
    {
      path: 'stringMutator.operations[].search',
      description:
        'Text or regex pattern to replace/remove (replace/remove only).',
    },
    {
      path: 'stringMutator.operations[].replace',
      description:
        'Replacement text for replace operations.',
    },
    {
      path: 'stringMutator.operations[].matchMode',
      description:
        'Match mode for replace/remove (first or all).',
      defaultValue: 'all',
    },
    {
      path: 'stringMutator.operations[].useRegex',
      description:
        'If true, treat search as a regex pattern.',
      defaultValue: 'false',
    },
    {
      path: 'stringMutator.operations[].flags',
      description:
        'Regex flags when useRegex is enabled (e.g., gim).',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  validator: [
    {
      path: 'validator.requiredPaths',
      description:
        'List of JSON paths that must exist (and be non-empty) for valid=true.',
      defaultValue: '[]',
    },
    {
      path: 'validator.mode',
      description:
        'all = require all requiredPaths; any = require at least one.',
      defaultValue: 'all',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  validation_pattern: [
    {
      path: 'validationPattern.source',
      description:
        'Rule source: global_stack uses synced validator-stack rules, path_local uses node-local rules.',
      defaultValue: 'global_stack',
    },
    {
      path: 'validationPattern.stackId',
      description:
        'Selected global validation stack/list ID used when source=global_stack.',
    },
    {
      path: 'validationPattern.scope',
      description:
        'Prompt validation scope used while evaluating rules (for scope-gated rules).',
      defaultValue: 'global',
    },
    {
      path: 'validationPattern.runtimeMode',
      description:
        'validate_only runs checks; validate_and_autofix also applies rule autofix operations.',
      defaultValue: 'validate_only',
    },
    {
      path: 'validationPattern.failPolicy',
      description:
        'block_on_error sets valid=false when error issues exist; report_only always emits valid=true.',
      defaultValue: 'block_on_error',
    },
    {
      path: 'validationPattern.inputPort',
      description:
        'Preferred input source (auto/value/prompt/result/context).',
      defaultValue: 'auto',
    },
    {
      path: 'validationPattern.outputPort',
      description:
        'Primary output target for normalized text.',
      defaultValue: 'value',
    },
    {
      path: 'validationPattern.maxAutofixPasses',
      description:
        'Maximum autofix refinement passes when runtimeMode is validate_and_autofix.',
      defaultValue: '1',
    },
    {
      path: 'validationPattern.includeRuleIds',
      description:
        'Optional allowlist of rule IDs to execute.',
      defaultValue: '[]',
    },
    {
      path: 'validationPattern.rules',
      description:
        'Active rule set used during runtime (global snapshot or path-local list).',
      defaultValue: '[]',
    },
    {
      path: 'validationPattern.learnedRules',
      description:
        'Optional learned-rule list merged into runtime validation.',
      defaultValue: '[]',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  constant: [
    {
      path: 'constant.valueType',
      description:
        'How to interpret the stored value: string/number/boolean/json.',
      defaultValue: 'string',
    },
    {
      path: 'constant.value',
      description:
        'The literal value to emit (for json, this should be JSON text).',
      defaultValue: '""',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  math: [
    {
      path: 'math.operation',
      description:
        'Numeric operation to apply: add/subtract/multiply/divide/round/ceil/floor.',
      defaultValue: 'add',
    },
    {
      path: 'math.operand',
      description:
        'Number used by the operation (ignored for round/ceil/floor).',
      defaultValue: '0',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  template: [
    {
      path: 'template.template',
      description:
        'Template used to generate a prompt string from incoming ports ({{bundle}}, {{context}}, etc).',
      defaultValue: '""',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  bundle: [
    {
      path: 'bundle.includePorts',
      description:
        'Optional allowlist: only these input port names are included in the emitted bundle.',
      defaultValue: 'undefined (all inputs)',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  gate: [
    {
      path: 'gate.mode',
      description:
        'block = stop downstream when valid is false; pass = always pass but preserve valid/errors.',
      defaultValue: 'block',
    },
    {
      path: 'gate.failMessage',
      description:
        'Optional message to display/log when blocking.',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  compare: [
    {
      path: 'compare.operator',
      description:
        'Comparison operator (eq/neq/gt/gte/lt/lte/contains/startsWith/endsWith/isEmpty/notEmpty).',
      defaultValue: 'eq',
    },
    {
      path: 'compare.compareTo',
      description:
        'String to compare against (converted based on operator and input value).',
      defaultValue: '""',
    },
    {
      path: 'compare.caseSensitive',
      description:
        'When comparing strings, whether case matters.',
      defaultValue: 'false',
    },
    {
      path: 'compare.message',
      description:
        'Optional error message to emit when valid is false.',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  router: [
    {
      path: 'router.mode',
      description:
        'valid routes on valid/errors; value routes on a value input.',
      defaultValue: 'value',
    },
    {
      path: 'router.matchMode',
      description:
        'truthy/falsy/equals/contains',
      defaultValue: 'truthy',
    },
    {
      path: 'router.compareTo',
      description:
        'Used by equals/contains modes.',
      defaultValue: '""',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  delay: [
    {
      path: 'delay.ms',
      description: 'Delay duration in milliseconds.',
      defaultValue: '500',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  poll: [
    {
      path: 'poll.mode',
      description: 'job = poll AI job status; database = poll database query.',
      defaultValue: 'job',
    },
    {
      path: 'poll.intervalMs',
      description: 'Wait time between polling attempts (ms).',
      defaultValue: '1000',
    },
    {
      path: 'poll.maxAttempts',
      description: 'Maximum polling attempts before failing.',
      defaultValue: '40',
    },
    {
      path: 'poll.dbQuery',
      description:
        'Database query definition used when mode is database (provider/collection/preset/queryTemplate/etc).',
    },
    ...dbQueryFields('poll.dbQuery'),
    {
      path: 'poll.successPath',
      description:
        'Optional JSON path evaluated against the polled result to determine completion.',
    },
    {
      path: 'poll.successOperator',
      description:
        'truthy/equals/contains/notEquals used with successPath.',
      defaultValue: 'truthy',
    },
    {
      path: 'poll.successValue',
      description:
        'String value used by equals/contains/notEquals.',
    },
    {
      path: 'poll.resultPath',
      description:
        'Optional JSON path to extract the final result payload to emit.',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  http: [
    { path: 'http.url', description: 'Request URL.', defaultValue: '""' },
    {
      path: 'http.method',
      description: 'HTTP method.',
      defaultValue: 'GET',
    },
    {
      path: 'http.headers',
      description:
        'JSON string of request headers. Must be valid JSON.',
      defaultValue: '{...}',
    },
    {
      path: 'http.bodyTemplate',
      description:
        'Template for request body (JSON/text) using {{placeholders}} from incoming ports.',
      defaultValue: '""',
    },
    {
      path: 'http.responseMode',
      description: 'How to interpret the response: json/text/status.',
      defaultValue: 'json',
    },
    {
      path: 'http.responsePath',
      description:
        'Optional JSON path to extract from the response when responseMode is json.',
      defaultValue: '""',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  api_advanced: [
    { path: 'apiAdvanced.url', description: 'Request URL template.', defaultValue: '""' },
    {
      path: 'apiAdvanced.method',
      description: 'HTTP method including advanced methods (HEAD/OPTIONS).',
      defaultValue: 'GET',
    },
    {
      path: 'apiAdvanced.pathParamsJson',
      description:
        'JSON object for explicit path parameter substitution before request execution.',
      defaultValue: '{}',
    },
    {
      path: 'apiAdvanced.queryParamsJson',
      description:
        'JSON object for explicit query parameters. Values can include templates.',
      defaultValue: '{}',
    },
    {
      path: 'apiAdvanced.headersJson',
      description: 'JSON object for request headers.',
      defaultValue: '{}',
    },
    {
      path: 'apiAdvanced.authMode',
      description:
        'none/api_key/bearer/basic/oauth2_client_credentials/connection auth strategy.',
      defaultValue: 'none',
    },
    {
      path: 'apiAdvanced.responseMode',
      description: 'How to interpret response payload: json/text/status.',
      defaultValue: 'json',
    },
    {
      path: 'apiAdvanced.responsePath',
      description:
        'Optional JSON path selection from parsed response payload.',
      defaultValue: '""',
    },
    {
      path: 'apiAdvanced.outputMappingsJson',
      description:
        'JSON object mapping output port -> JSON path in response envelope.',
      defaultValue: '{}',
    },
    {
      path: 'apiAdvanced.retryEnabled',
      description: 'Enable/disable retry behavior.',
      defaultValue: 'true',
    },
    {
      path: 'apiAdvanced.retryAttempts',
      description: 'Maximum attempts including first request.',
      defaultValue: '2',
    },
    {
      path: 'apiAdvanced.retryOnStatusJson',
      description:
        'JSON array of status codes that should be retried when retries are enabled.',
      defaultValue: '[429,500,502,503,504]',
    },
    {
      path: 'apiAdvanced.paginationMode',
      description:
        'none/page/cursor/link pagination strategy.',
      defaultValue: 'none',
    },
    {
      path: 'apiAdvanced.errorRoutesJson',
      description:
        'JSON array of explicit error route matchers and target output ports.',
      defaultValue: '[]',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  playwright: [
    {
      path: 'playwright.personaId',
      description:
        'Optional Playwright Persona ID. When set, node runtime inherits persona browser fidelity settings.',
      defaultValue: '""',
    },
    {
      path: 'playwright.script',
      description:
        'User script that exports a default async function: `run({ browser, context, page, input, emit, artifacts, log, helpers })`.',
      defaultValue: '"export default async function run(...) { ... }"',
    },
    {
      path: 'playwright.waitForResult',
      description:
        'When true, waits for Playwright completion and emits final outputs. When false, emits runId/job status immediately.',
      defaultValue: 'true',
    },
    {
      path: 'playwright.timeoutMs',
      description: 'Per-run timeout budget in milliseconds.',
      defaultValue: '120000',
    },
    {
      path: 'playwright.browserEngine',
      description: 'Browser engine to launch: chromium/firefox/webkit.',
      defaultValue: 'chromium',
    },
    {
      path: 'playwright.startUrlTemplate',
      description:
        'Optional URL template rendered from incoming ports before script execution (example: https://example.com/{{entityId}}).',
      defaultValue: '""',
    },
    {
      path: 'playwright.launchOptionsJson',
      description:
        'Raw Playwright launch options JSON merged with persona-driven settings before browser launch.',
      defaultValue: '{}',
    },
    {
      path: 'playwright.contextOptionsJson',
      description:
        'Raw Playwright browser context options JSON applied when creating a context/page session.',
      defaultValue: '{}',
    },
    {
      path: 'playwright.settingsOverrides',
      description:
        'Optional partial override object for Playwright persona fields (headless, slowMo, timeouts, proxy, device emulation).',
      defaultValue: '{}',
    },
    {
      path: 'playwright.capture.screenshot',
      description: 'Capture final screenshot artifact on run completion.',
      defaultValue: 'true',
    },
    {
      path: 'playwright.capture.html',
      description: 'Capture final page HTML artifact on run completion.',
      defaultValue: 'false',
    },
    {
      path: 'playwright.capture.video',
      description: 'Enable Playwright video capture for the run context.',
      defaultValue: 'false',
    },
    {
      path: 'playwright.capture.trace',
      description: 'Enable Playwright trace collection and save trace.zip artifact.',
      defaultValue: 'false',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  prompt: [
    {
      path: 'prompt.template',
      description:
        'Template to produce final prompt text. Uses {{title}}, {{content_en}}, {{bundle}}, etc.',
      defaultValue: '""',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  model: [
    {
      path: 'model.modelId',
      description: 'Model identifier to run.',
      defaultValue: 'gpt-4o',
    },
    {
      path: 'model.temperature',
      description: 'Sampling temperature (0-2).',
      defaultValue: '0.2',
    },
    {
      path: 'model.maxTokens',
      description: 'Maximum output tokens.',
      defaultValue: '2048',
    },
    {
      path: 'model.vision',
      description:
        'When true, image URLs are included as vision inputs if connected.',
      defaultValue: 'false',
    },
    {
      path: 'model.waitForResult',
      description:
        'When true, node waits and emits result. When false, emits jobId/status immediately.',
      defaultValue: 'true',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  agent: [
    {
      path: 'agent.personaId',
      description:
        'Persona to use from Agent Creator. Empty means runtime defaults.',
      defaultValue: '""',
    },
    {
      path: 'agent.promptTemplate',
      description:
        'Optional template to build the agent prompt from incoming ports.',
      defaultValue: '""',
    },
    {
      path: 'agent.waitForResult',
      description:
        'When true, waits for completion and emits result. When false, emits jobId/status.',
      defaultValue: 'true',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  learner_agent: [
    {
      path: 'learnerAgent.agentId',
      description:
        'Learner agent identifier used to resolve embeddings source and runtime execution behavior.',
      defaultValue: '""',
    },
    {
      path: 'learnerAgent.promptTemplate',
      description:
        'Optional prompt template used to compose final query context before model execution.',
      defaultValue: '""',
    },
    {
      path: 'learnerAgent.includeSources',
      description:
        'When true, include matched source snippets in node outputs for downstream auditing.',
      defaultValue: 'true',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  database: [
    {
      path: 'database.operation',
      description:
        'Operation category: query/update/insert/delete.',
    },
    {
      path: 'database.entityType',
      description:
        'Collection/entity type to operate on (product/note/custom).',
    },
    {
      path: 'database.idField',
      description:
        'Primary key field when using preset queries (example: _id or id).',
      defaultValue: '_id',
    },
    {
      path: 'database.query',
      description:
        'Query definition (provider/collection/preset/queryTemplate/sort/projection/etc).',
    },
    ...dbQueryFields('database.query'),
    {
      path: 'database.mappings',
      description:
        'Updater mappings for write operations: targetPath <- (sourcePort + optional sourcePath).',
    },
    {
      path: 'database.updateTemplate',
      description:
        'Template JSON for updates (when using custom update templates).',
    },
    {
      path: 'database.mode',
      description:
        'Write mode: replace overwrites, append merges/extends (behavior depends on operation).',
    },
    {
      path: 'database.updateStrategy',
      description:
        'When updating: one vs many (for multi-match updates).',
    },
    {
      path: 'database.useMongoActions',
      description:
        'When true, uses provider action mode (actionCategory/action) instead of simplified operation.',
    },
    {
      path: 'database.actionCategory',
      description:
        'Provider action category: create/read/update/delete/(aggregate for MongoDB).',
    },
    {
      path: 'database.action',
      description:
        'Provider action command (MongoDB or Prisma-mapped command labels).',
    },
    {
      path: 'database.distinctField',
      description:
        'Field for distinct action.',
    },
    {
      path: 'database.writeSource',
      description:
        'Which incoming port to write from (example: result/bundle/context).',
    },
    {
      path: 'database.writeSourcePath',
      description:
        'Optional JSON path within writeSource to write (example: \'result.items[0]\').',
    },
    {
      path: 'database.writeOutcomePolicy.onZeroAffected',
      description:
        'Write outcome policy when execution affects 0 records: `fail` throws terminal node error, `warn` completes with warning metadata.',
      defaultValue: 'fail',
    },
    {
      path: 'database.writeTemplateGuardrails',
      description:
        'Runtime-enforced for writes: all query/update/insert template placeholders must resolve to connected, non-empty values (missing/empty blocks execution).',
      defaultValue: 'enabled',
    },
    {
      path: 'database.dryRun',
      description:
        'When true, does not persist changes; returns computed payload only.',
      defaultValue: 'false',
    },
    {
      path: 'database.skipEmpty',
      description:
        'When true, empty strings/nulls are skipped when building updates.',
      defaultValue: 'false',
    },
    {
      path: 'database.trimStrings',
      description:
        'When true, trims string values before writing.',
      defaultValue: 'false',
    },
    {
      path: 'database.aiPrompt',
      description:
        'Optional AI prompt string used by some presets/helpers (does not call a model by itself).',
    },
    {
      path: 'database.parameterInferenceGuard.enabled',
      description:
        'When true, sanitizes inferred `parameters` updates against parameter definitions before write.',
      defaultValue: 'false',
    },
    {
      path: 'database.parameterInferenceGuard.targetPath',
      description:
        'Update field to sanitize (default: parameters).',
      defaultValue: 'parameters',
    },
    {
      path: 'database.parameterInferenceGuard.definitionsPort',
      description:
        'Input port carrying parameter definitions used for validation (default: result).',
      defaultValue: 'result',
    },
    {
      path: 'database.parameterInferenceGuard.definitionsPath',
      description:
        'Optional JSON path inside definitionsPort payload to locate definition rows.',
      defaultValue: '""',
    },
    {
      path: 'database.parameterInferenceGuard.enforceOptionLabels',
      description:
        'When true, radio/select/dropdown values must match optionLabels from definitions.',
      defaultValue: 'true',
    },
    {
      path: 'database.parameterInferenceGuard.allowUnknownParameterIds',
      description:
        'When true, keeps inferred parameterIds missing from definitions.',
      defaultValue: 'false',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  db_schema: [
    {
      path: 'db_schema.provider',
      description: 'Which provider to load: auto (primary), mongodb, prisma, or all.',
      defaultValue: 'all',
    },
    {
      path: 'db_schema.mode',
      description: 'all = include all collections; selected = include only `collections`.',
      defaultValue: 'all',
    },
    {
      path: 'db_schema.collections',
      description: 'Collection names to include when mode is selected.',
      defaultValue: '[]',
    },
    {
      path: 'db_schema.includeFields',
      description: 'Include field lists for each collection.',
      defaultValue: 'true',
    },
    {
      path: 'db_schema.includeRelations',
      description: 'Include inferred relations/foreign key hints when available.',
      defaultValue: 'false',
    },
    {
      path: 'db_schema.formatAs',
      description: 'json emits a JSON object; text emits a compact schema text for prompting.',
      defaultValue: 'json',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  viewer: [
    {
      path: 'viewer.outputs',
      description:
        'Map of input port -> label/path. Used to display structured output inside the node config panel.',
      defaultValue: '{}',
    },
    {
      path: 'viewer.showImagesAsJson',
      description:
        'When true, image lists render as JSON instead of thumbnails.',
      defaultValue: 'false',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  notification: [
    ...COMMON_RUNTIME_FIELDS,
  ],
  ai_description: [
    {
      path: 'description.visionOutputEnabled',
      description:
        'When enabled, include image-based analysis output.',
      defaultValue: 'true',
    },
    {
      path: 'description.generationOutputEnabled',
      description:
        'When enabled, include generated text output.',
      defaultValue: 'true',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  description_updater: [
    ...COMMON_RUNTIME_FIELDS,
  ],
};

const ALL_NODE_TYPES: NodeType[] = [
  'trigger',
  'fetcher',
  'simulation',
  'audio_oscillator',
  'audio_speaker',
  'context',
  'parser',
  'regex',
  'iterator',
  'mapper',
  'mutator',
  'string_mutator',
  'validator',
  'validation_pattern',
  'constant',
  'math',
  'template',
  'bundle',
  'gate',
  'compare',
  'router',
  'delay',
  'poll',
  'http',
  'api_advanced',
  'playwright',
  'prompt',
  'model',
  'agent',
  'learner_agent',
  'database',
  'db_schema',
  'viewer',
  'notification',
  'ai_description',
  'description_updater',
];

const definitionByType = new Map(NODE_DEFINITIONS.map((def: (typeof NODE_DEFINITIONS)[number]) => [def.type, def]));

export const AI_PATHS_NODE_DOCS: AiPathsNodeDoc[] = ALL_NODE_TYPES.map((type: NodeType) => {
  const fallbackDefinition =
    type === 'description_updater'
      ? {
        type: 'description_updater' as const,
        title: 'Description Updater (Deprecated)',
        description: 'Writes description_en back to the product.',
        inputs: ['productId', 'description_en'],
        outputs: ['description_en'],
      }
      : null;
  const def = definitionByType.get(type) ?? fallbackDefinition;
  const notes =
    type === 'description_updater'
      ? [
        'Deprecated node. Prefer Database node write operations for updates.',
      ]
      : type === 'notification'
        ? ['Configuration UI is not available yet; it runs with defaults.']
        : type === 'playwright'
          ? [
            'Built-in script templates are available in the Playwright node config dialog.',
          ]
          : undefined;
  return {
    type,
    title: def?.title ?? type,
    purpose: def?.description ?? '—',
    inputs: def?.inputs ?? [],
    outputs: def?.outputs ?? [],
    config: CONFIG_DOCS_BY_TYPE[type] ?? COMMON_RUNTIME_FIELDS,
    ...((def as unknown as { config?: unknown })?.config &&
    typeof (def as unknown as { config: Record<string, unknown> }).config === 'object' &&
    !Array.isArray((def as unknown as { config: Record<string, unknown> }).config)
      ? { defaultConfig: (def as unknown as { config: Record<string, unknown> }).config }
      : {}),
    ...(notes ? { notes } : {}),
  };
});

export const buildAiPathsNodeDocJsonSnippet = (doc: AiPathsNodeDoc): string =>
  `${JSON.stringify(
    {
      type: doc.type,
      title: doc.title,
      description: doc.purpose,
      inputs: doc.inputs,
      outputs: doc.outputs,
      config: doc.defaultConfig ?? {},
      notes: doc.notes ?? [],
    },
    null,
    2,
  )}\n`;
