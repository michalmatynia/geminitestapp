import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';
import { playwrightSettingsSchema } from './playwright';
import {
  promptValidationRuleSchema,
  promptValidationScopeSchema,
} from './prompt-engine';

/**
 * AI Path Node Types
 */
export const aiNodeTypeSchema = z.enum([
  'trigger',
  'fetcher',
  'simulation',
  'context',
  'audio_oscillator',
  'audio_speaker',
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
]);

export type AiNodeTypeDto = z.infer<typeof aiNodeTypeSchema>;
export type NodeType = AiNodeTypeDto;

/**
 * AI Path Node Config DTOs - Basic & Audio
 */

export const triggerConfigSchema = z.object({
  event: z.string(),
  contextMode: z
    .enum(['simulation_required', 'simulation_preferred', 'trigger_only'])
    .optional(),
});

export type TriggerConfigDto = z.infer<typeof triggerConfigSchema>;
export type TriggerConfig = TriggerConfigDto;
export type TriggerContextMode = NonNullable<TriggerConfig['contextMode']>;

export const simulationConfigSchema = z.object({
  productId: z.string(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  runBehavior: z
    .enum(['before_connected_trigger', 'manual_only'])
    .optional(),
});

export type SimulationConfigDto = z.infer<typeof simulationConfigSchema>;
export type SimulationConfig = SimulationConfigDto;
export type SimulationRunBehavior = NonNullable<SimulationConfig['runBehavior']>;

export const fetcherConfigSchema = z.object({
  sourceMode: z
    .enum(['live_context', 'simulation_id', 'live_then_simulation'])
    .optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  productId: z.string().optional(),
});

export type FetcherConfigDto = z.infer<typeof fetcherConfigSchema>;
export type FetcherConfig = FetcherConfigDto;
export type FetcherSourceMode = NonNullable<FetcherConfig['sourceMode']>;

export const viewerConfigSchema = z.object({
  outputs: z.record(z.string(), z.string()),
  showImagesAsJson: z.boolean().optional(),
});

export type ViewerConfigDto = z.infer<typeof viewerConfigSchema>;
export type ViewerConfig = ViewerConfigDto;

export const contextConfigSchema = z.object({
  role: z.string(),
  entityType: z.string().optional(),
  entityIdSource: z.enum(['simulation', 'manual', 'context']).optional(),
  entityId: z.string().optional(),
  scopeMode: z.enum(['full', 'include', 'exclude']).optional(),
  scopeTarget: z.enum(['entity', 'context']).optional(),
  includePaths: z.array(z.string()).optional(),
  excludePaths: z.array(z.string()).optional(),
});

export type ContextConfigDto = z.infer<typeof contextConfigSchema>;
export type ContextConfig = ContextConfigDto;

export const delayConfigSchema = z.object({
  ms: z.number(),
});

export type DelayConfigDto = z.infer<typeof delayConfigSchema>;
export type DelayConfig = DelayConfigDto;

export const audioWaveformSchema = z.enum(['sine', 'square', 'sawtooth', 'triangle']);
export type AudioWaveformDto = z.infer<typeof audioWaveformSchema>;
export type AudioWaveform = AudioWaveformDto;

export const audioOscillatorConfigSchema = z.object({
  waveform: audioWaveformSchema,
  frequencyHz: z.number(),
  gain: z.number(),
  durationMs: z.number(),
});

export type AudioOscillatorConfigDto = z.infer<typeof audioOscillatorConfigSchema>;
export type AudioOscillatorConfig = AudioOscillatorConfigDto;

export const audioSpeakerConfigSchema = z.object({
  enabled: z.boolean(),
  autoPlay: z.boolean(),
  gain: z.number(),
  stopPrevious: z.boolean(),
});

export type AudioSpeakerConfigDto = z.infer<typeof audioSpeakerConfigSchema>;
export type AudioSpeakerConfig = AudioSpeakerConfigDto;

export const descriptionConfigSchema = z.object({
  visionOutputEnabled: z.boolean().optional(),
  generationOutputEnabled: z.boolean().optional(),
});

export type DescriptionConfigDto = z.infer<typeof descriptionConfigSchema>;
export type DescriptionConfig = DescriptionConfigDto;

/**
 * AI Path Node Config DTOs - Utilities
 */

export const mapperConfigSchema = z.object({
  outputs: z.array(z.string()),
  mappings: z.record(z.string(), z.string()),
});

export type MapperConfigDto = z.infer<typeof mapperConfigSchema>;
export type MapperConfig = MapperConfigDto;

export const mutatorConfigSchema = z.object({
  path: z.string(),
  valueTemplate: z.string(),
  targetType: z.enum(['string', 'number', 'boolean', 'json']).optional(),
});

export type MutatorConfigDto = z.infer<typeof mutatorConfigSchema>;
export type MutatorConfig = MutatorConfigDto;

export const stringMutatorOperationSchema = z.discriminatedUnion('type', [
  z.object({ id: z.string().optional(), type: z.literal('trim'), mode: z.enum(['both', 'start', 'end']).optional() }),
  z.object({
    id: z.string().optional(),
    type: z.literal('replace'),
    search: z.string(),
    replace: z.string(),
    matchMode: z.enum(['first', 'all']).optional(),
    useRegex: z.boolean().optional(),
    flags: z.string().optional(),
  }),
  z.object({
    id: z.string().optional(),
    type: z.literal('remove'),
    search: z.string(),
    matchMode: z.enum(['first', 'all']).optional(),
    useRegex: z.boolean().optional(),
    flags: z.string().optional(),
  }),
  z.object({ id: z.string().optional(), type: z.literal('case'), mode: z.enum(['upper', 'lower', 'title']) }),
  z.object({ id: z.string().optional(), type: z.literal('append'), value: z.string(), position: z.enum(['prefix', 'suffix']).optional() }),
  z.object({ id: z.string().optional(), type: z.literal('slice'), start: z.number().optional(), end: z.number().optional() }),
]);

export type StringMutatorOperationDto = z.infer<typeof stringMutatorOperationSchema>;
export type StringMutatorOperation = StringMutatorOperationDto;

export const stringMutatorConfigSchema = z.object({
  operations: z.array(stringMutatorOperationSchema),
});

export type StringMutatorConfigDto = z.infer<typeof stringMutatorConfigSchema>;
export type StringMutatorConfig = StringMutatorConfigDto;

export const validatorConfigSchema = z.object({
  requiredPaths: z.array(z.string()),
  mode: z.enum(['all', 'any']),
});

export type ValidatorConfigDto = z.infer<typeof validatorConfigSchema>;
export type ValidatorConfig = ValidatorConfigDto;

export const validationPatternSourceSchema = z.enum([
  'global_stack',
  'path_local',
]);
export type ValidationPatternSourceDto = z.infer<
  typeof validationPatternSourceSchema
>;

export const validationPatternRuntimeModeSchema = z.enum([
  'validate_only',
  'validate_and_autofix',
]);
export type ValidationPatternRuntimeModeDto = z.infer<
  typeof validationPatternRuntimeModeSchema
>;

export const validationPatternFailPolicySchema = z.enum([
  'block_on_error',
  'report_only',
]);
export type ValidationPatternFailPolicyDto = z.infer<
  typeof validationPatternFailPolicySchema
>;

export const validationPatternInputPortSchema = z.enum([
  'auto',
  'value',
  'prompt',
  'result',
  'context',
]);
export type ValidationPatternInputPortDto = z.infer<
  typeof validationPatternInputPortSchema
>;

export const validationPatternOutputPortSchema = z.enum([
  'value',
  'result',
]);
export type ValidationPatternOutputPortDto = z.infer<
  typeof validationPatternOutputPortSchema
>;

export const validationPatternConfigSchema = z.object({
  source: validationPatternSourceSchema,
  stackId: z.string().optional(),
  scope: promptValidationScopeSchema.optional(),
  includeLearnedRules: z.boolean().optional(),
  runtimeMode: validationPatternRuntimeModeSchema,
  failPolicy: validationPatternFailPolicySchema,
  inputPort: validationPatternInputPortSchema,
  outputPort: validationPatternOutputPortSchema,
  maxAutofixPasses: z.number().optional(),
  includeRuleIds: z.array(z.string()).optional(),
  localListName: z.string().optional(),
  localListDescription: z.string().optional(),
  rules: z.array(promptValidationRuleSchema).optional(),
  learnedRules: z.array(promptValidationRuleSchema).optional(),
});

export type ValidationPatternConfigDto = z.infer<
  typeof validationPatternConfigSchema
>;
export type ValidationPatternConfig = ValidationPatternConfigDto;

export const constantConfigSchema = z.object({
  valueType: z.enum(['string', 'number', 'boolean', 'json']),
  value: z.string(),
});

export type ConstantConfigDto = z.infer<typeof constantConfigSchema>;
export type ConstantConfig = ConstantConfigDto;

export const mathConfigSchema = z.object({
  operation: z.enum(['add', 'subtract', 'multiply', 'divide', 'round', 'ceil', 'floor']),
  operand: z.number(),
});

export type MathConfigDto = z.infer<typeof mathConfigSchema>;
export type MathConfig = MathConfigDto;

export const templateConfigSchema = z.object({
  template: z.string(),
});

export type templateConfigDto = z.infer<typeof templateConfigSchema>;
export type TemplateConfig = templateConfigDto;

export const bundleConfigSchema = z.object({
  includePorts: z.array(z.string()).optional(),
});

export type BundleConfigDto = z.infer<typeof bundleConfigSchema>;
export type BundleConfig = BundleConfigDto;

export const gateConfigSchema = z.object({
  mode: z.enum(['block', 'pass']),
  failMessage: z.string().optional(),
});

export type GateConfigDto = z.infer<typeof gateConfigSchema>;
export type GateConfig = GateConfigDto;

export const compareConfigSchema = z.object({
  operator: z.enum([
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'contains',
    'startsWith',
    'endsWith',
    'isEmpty',
    'notEmpty',
  ]),
  compareTo: z.string(),
  caseSensitive: z.boolean().optional(),
  message: z.string().optional(),
});

export type CompareConfigDto = z.infer<typeof compareConfigSchema>;
export type CompareConfig = CompareConfigDto;

export const routerConfigSchema = z.object({
  mode: z.enum(['valid', 'value']),
  matchMode: z.enum(['truthy', 'falsy', 'equals', 'contains']),
  compareTo: z.string(),
});

export type RouterConfigDto = z.infer<typeof routerConfigSchema>;
export type RouterConfig = RouterConfigDto;

/**
 * AI Path Node Config DTOs - Complex
 */

export const regexModeSchema = z.enum(['group', 'extract', 'extract_json']);
export const regexMatchModeSchema = z.enum(['first', 'first_overall', 'all']);
export const regexGroupOutputModeSchema = z.enum(['object', 'array']);

export const regexTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  pattern: z.string(),
  flags: z.string().optional(),
  mode: regexModeSchema.optional(),
  matchMode: regexMatchModeSchema.optional(),
  groupBy: z.string().optional(),
  outputMode: regexGroupOutputModeSchema.optional(),
  includeUnmatched: z.boolean().optional(),
  unmatchedKey: z.string().optional(),
  splitLines: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type RegexTemplateDto = z.infer<typeof regexTemplateSchema>;
export type RegexTemplate = RegexTemplateDto;

export const regexConfigSchema = z.object({
  pattern: z.string(),
  flags: z.string().optional(),
  mode: regexModeSchema.optional(),
  matchMode: regexMatchModeSchema.optional(),
  groupBy: z.string().optional(),
  outputMode: regexGroupOutputModeSchema.optional(),
  includeUnmatched: z.boolean().optional(),
  unmatchedKey: z.string().optional(),
  splitLines: z.boolean().optional(),
  sampleText: z.string().optional(),
  aiPrompt: z.string().optional(),
  aiAutoRun: z.boolean().optional(),
  activeVariant: z.enum(['manual', 'ai']).optional(),
  manual: z.object({ pattern: z.string(), flags: z.string().optional(), groupBy: z.string().optional() }).optional(),
  aiProposal: z.object({ pattern: z.string(), flags: z.string().optional(), groupBy: z.string().optional() }).optional(),
  aiProposals: z.array(z.object({ pattern: z.string(), flags: z.string().optional(), groupBy: z.string().optional(), createdAt: z.string() })).optional(),
  templates: z.array(regexTemplateSchema).optional(),
});

export type RegexConfigDto = z.infer<typeof regexConfigSchema>;
export type RegexConfig = RegexConfigDto;

export const iteratorConfigSchema = z.object({
  autoContinue: z.boolean().optional(),
  maxSteps: z.number().optional(),
});

export type IteratorConfigDto = z.infer<typeof iteratorConfigSchema>;
export type IteratorConfig = IteratorConfigDto;

export const httpConfigSchema = z.object({
  url: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  headers: z.string(),
  bodyTemplate: z.string(),
  responseMode: z.enum(['json', 'text', 'status']),
  responsePath: z.string(),
});

export type HttpConfigDto = z.infer<typeof httpConfigSchema>;
export type HttpConfig = HttpConfigDto;

export const advancedApiMethodSchema = z.enum([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
]);

export type AdvancedApiMethodDto = z.infer<typeof advancedApiMethodSchema>;

export const advancedApiBodyModeSchema = z.enum(['none', 'json', 'text']);
export type AdvancedApiBodyModeDto = z.infer<typeof advancedApiBodyModeSchema>;

export const advancedApiResponseModeSchema = z.enum(['json', 'text', 'status']);
export type AdvancedApiResponseModeDto = z.infer<typeof advancedApiResponseModeSchema>;

export const advancedApiAuthModeSchema = z.enum([
  'none',
  'api_key',
  'bearer',
  'basic',
  'oauth2_client_credentials',
  'connection',
]);
export type AdvancedApiAuthModeDto = z.infer<typeof advancedApiAuthModeSchema>;

export const advancedApiApiKeyPlacementSchema = z.enum(['header', 'query']);
export type AdvancedApiApiKeyPlacementDto = z.infer<
  typeof advancedApiApiKeyPlacementSchema
>;

export const advancedApiBackoffStrategySchema = z.enum([
  'fixed',
  'exponential',
]);
export type AdvancedApiBackoffStrategyDto = z.infer<
  typeof advancedApiBackoffStrategySchema
>;

export const advancedApiPaginationModeSchema = z.enum([
  'none',
  'page',
  'cursor',
  'link',
]);
export type AdvancedApiPaginationModeDto = z.infer<
  typeof advancedApiPaginationModeSchema
>;

export const advancedApiPaginationAggregateModeSchema = z.enum([
  'first_page',
  'concat_items',
]);
export type AdvancedApiPaginationAggregateModeDto = z.infer<
  typeof advancedApiPaginationAggregateModeSchema
>;

export const advancedApiRateLimitOnLimitSchema = z.enum(['wait', 'fail']);
export type AdvancedApiRateLimitOnLimitDto = z.infer<
  typeof advancedApiRateLimitOnLimitSchema
>;

export const advancedApiConfigSchema = z.object({
  url: z.string(),
  method: advancedApiMethodSchema,
  pathParamsJson: z.string().optional(),
  queryParamsJson: z.string().optional(),
  headersJson: z.string().optional(),
  bodyTemplate: z.string().optional(),
  bodyMode: advancedApiBodyModeSchema.optional(),
  timeoutMs: z.number().optional(),
  authMode: advancedApiAuthModeSchema.optional(),
  apiKeyName: z.string().optional(),
  apiKeyValueTemplate: z.string().optional(),
  apiKeyPlacement: advancedApiApiKeyPlacementSchema.optional(),
  bearerTokenTemplate: z.string().optional(),
  basicUsernameTemplate: z.string().optional(),
  basicPasswordTemplate: z.string().optional(),
  oauthTokenUrl: z.string().optional(),
  oauthClientIdTemplate: z.string().optional(),
  oauthClientSecretTemplate: z.string().optional(),
  oauthScopeTemplate: z.string().optional(),
  connectionIdTemplate: z.string().optional(),
  connectionHeaderName: z.string().optional(),
  responseMode: advancedApiResponseModeSchema.optional(),
  responsePath: z.string().optional(),
  outputMappingsJson: z.string().optional(),
  retryEnabled: z.boolean().optional(),
  retryAttempts: z.number().optional(),
  retryBackoff: advancedApiBackoffStrategySchema.optional(),
  retryBackoffMs: z.number().optional(),
  retryMaxBackoffMs: z.number().optional(),
  retryJitterRatio: z.number().optional(),
  retryOnStatusJson: z.string().optional(),
  retryOnNetworkError: z.boolean().optional(),
  paginationMode: advancedApiPaginationModeSchema.optional(),
  pageParam: z.string().optional(),
  limitParam: z.string().optional(),
  startPage: z.number().optional(),
  pageSize: z.number().optional(),
  cursorParam: z.string().optional(),
  cursorPath: z.string().optional(),
  itemsPath: z.string().optional(),
  maxPages: z.number().optional(),
  paginationAggregateMode: advancedApiPaginationAggregateModeSchema.optional(),
  rateLimitEnabled: z.boolean().optional(),
  rateLimitRequests: z.number().optional(),
  rateLimitIntervalMs: z.number().optional(),
  rateLimitConcurrency: z.number().optional(),
  rateLimitOnLimit: advancedApiRateLimitOnLimitSchema.optional(),
  idempotencyEnabled: z.boolean().optional(),
  idempotencyHeaderName: z.string().optional(),
  idempotencyKeyTemplate: z.string().optional(),
  errorRoutesJson: z.string().optional(),
});

export type AdvancedApiConfigDto = z.infer<typeof advancedApiConfigSchema>;
export type AdvancedApiConfig = AdvancedApiConfigDto;

export const playwrightBrowserEngineSchema = z.enum([
  'chromium',
  'firefox',
  'webkit',
]);
export type PlaywrightBrowserEngineDto = z.infer<
  typeof playwrightBrowserEngineSchema
>;
export type PlaywrightBrowserEngine = PlaywrightBrowserEngineDto;

export const playwrightCaptureConfigSchema = z.object({
  screenshot: z.boolean().optional(),
  html: z.boolean().optional(),
  video: z.boolean().optional(),
  trace: z.boolean().optional(),
});
export type PlaywrightCaptureConfigDto = z.infer<
  typeof playwrightCaptureConfigSchema
>;
export type PlaywrightCaptureConfig = PlaywrightCaptureConfigDto;

export const playwrightConfigSchema = z.object({
  personaId: z.string().optional(),
  script: z.string(),
  waitForResult: z.boolean().optional(),
  timeoutMs: z.number().optional(),
  browserEngine: playwrightBrowserEngineSchema.optional(),
  startUrlTemplate: z.string().optional(),
  launchOptionsJson: z.string().optional(),
  contextOptionsJson: z.string().optional(),
  settingsOverrides: playwrightSettingsSchema.partial().optional(),
  capture: playwrightCaptureConfigSchema.optional(),
});
export type PlaywrightConfigDto = z.infer<typeof playwrightConfigSchema>;
export type PlaywrightConfig = PlaywrightConfigDto;

export const dbQueryConfigSchema = z.object({
  provider: z.enum(['auto', 'mongodb', 'prisma']),
  collection: z.string(),
  mode: z.enum(['preset', 'custom']),
  preset: z.enum(['by_id', 'by_productId', 'by_entityId', 'by_field']),
  field: z.string(),
  idType: z.enum(['string', 'objectId']),
  queryTemplate: z.string(),
  limit: z.number(),
  sort: z.string(),
  sortPresetId: z.string().optional(),
  projection: z.string(),
  projectionPresetId: z.string().optional(),
  single: z.boolean(),
});

export type DbQueryConfigDto = z.infer<typeof dbQueryConfigSchema>;
export type DbQueryConfig = DbQueryConfigDto;

export const pollConfigSchema = z.object({
  intervalMs: z.number(),
  maxAttempts: z.number(),
  mode: z.enum(['job', 'database']).optional(),
  dbQuery: dbQueryConfigSchema.optional(),
  successPath: z.string().optional(),
  successOperator: z.enum(['truthy', 'equals', 'contains', 'notEquals']).optional(),
  successValue: z.string().optional(),
  resultPath: z.string().optional(),
});

export type PollConfigDto = z.infer<typeof pollConfigSchema>;
export type PollConfig = PollConfigDto;

export const dbSchemaConfigSchema = z.object({
  provider: z.enum(['auto', 'mongodb', 'prisma', 'all']).optional(),
  mode: z.enum(['all', 'selected']),
  collections: z.array(z.string()),
  includeFields: z.boolean(),
  includeRelations: z.boolean(),
  formatAs: z.enum(['json', 'text']),
});

export type DbSchemaConfigDto = z.infer<typeof dbSchemaConfigSchema>;
export type DbSchemaConfig = DbSchemaConfigDto;

export const dbSchemaSnapshotSchema = z.object({
  provider: z.enum(['mongodb', 'prisma', 'multi']),
  collections: z.array(z.object({
    name: z.string(),
    fields: z.array(z.object({ name: z.string(), type: z.string() })),
    relations: z.array(z.string()).optional(),
    provider: z.enum(['mongodb', 'prisma']).optional(),
  })),
  sources: z.record(z.enum(['mongodb', 'prisma']), z.object({
    provider: z.enum(['mongodb', 'prisma']),
    collections: z.array(z.object({
      name: z.string(),
      fields: z.array(z.object({ name: z.string(), type: z.string() })),
      relations: z.array(z.string()).optional(),
    })),
  })).optional(),
  syncedAt: z.string().optional(),
});

export type DbSchemaSnapshotDto = z.infer<typeof dbSchemaSnapshotSchema>;
export type DbSchemaSnapshot = DbSchemaSnapshotDto;

export const databaseConfigSchema = z.object({
  operation: z.enum(['query', 'update', 'insert', 'delete']),
  entityType: z.string().optional(),
  idField: z.string().optional(),
  mode: z.enum(['replace', 'append']).optional(),
  updateStrategy: z.enum(['one', 'many']).optional(),
  updatePayloadMode: z.enum(['mapping', 'custom']).optional(),
  useMongoActions: z.boolean().optional(),
  actionCategory: z.enum(['create', 'read', 'update', 'delete', 'aggregate']).optional(),
  action: z.enum([
    'insertOne',
    'insertMany',
    'find',
    'findOne',
    'countDocuments',
    'distinct',
    'aggregate',
    'updateOne',
    'updateMany',
    'replaceOne',
    'findOneAndUpdate',
    'deleteOne',
    'deleteMany',
    'findOneAndDelete',
  ]).optional(),
  distinctField: z.string().optional(),
  updateTemplate: z.string().optional(),
  mappings: z.array(z.object({ targetPath: z.string(), sourcePort: z.string(), sourcePath: z.string().optional() })).optional(),
  query: dbQueryConfigSchema.optional(),
  writeSource: z.string().optional(),
  writeSourcePath: z.string().optional(),
  dryRun: z.boolean().optional(),
  presetId: z.string().optional(),
  skipEmpty: z.boolean().optional(),
  trimStrings: z.boolean().optional(),
  aiPrompt: z.string().optional(),
  validationRuleIds: z.array(z.string()).optional(),
  parameterInferenceGuard: z.object({
    enabled: z.boolean().optional(),
    targetPath: z.string().optional(),
    definitionsPort: z.string().optional(),
    definitionsPath: z.string().optional(),
    enforceOptionLabels: z.boolean().optional(),
    allowUnknownParameterIds: z.boolean().optional(),
  }).optional(),
  schemaSnapshot: dbSchemaSnapshotSchema.optional(),
});

export type DatabaseConfigDto = z.infer<typeof databaseConfigSchema>;
export type DatabaseConfig = DatabaseConfigDto;

export type DatabaseActionCategory = NonNullable<DatabaseConfigDto['actionCategory']>;
export type DatabaseAction = NonNullable<DatabaseConfigDto['action']>;
export type UpdaterMapping = NonNullable<DatabaseConfigDto['mappings']>[number];
export type DatabaseOperation = DatabaseConfigDto['operation'];

export const parserConfigSchema = z.object({
  mappings: z.record(z.string(), z.string()),
  outputMode: z.enum(['individual', 'bundle']).optional(),
  presetId: z.string().optional(),
});

export type ParserConfigDto = z.infer<typeof parserConfigSchema>;
export type ParserConfig = ParserConfigDto;

export const parserSampleStateSchema = z.object({
  entityType: z.string(),
  entityId: z.string(),
  simulationId: z.string().optional(),
  json: z.string(),
  mappingMode: z.enum(['top', 'flatten']),
  depth: z.number(),
  keyStyle: z.enum(['path', 'leaf']),
  includeContainers: z.boolean(),
});

export type ParserSampleStateDto = z.infer<typeof parserSampleStateSchema>;
export type ParserSampleState = ParserSampleStateDto;

export const updaterSampleStateSchema = parserSampleStateSchema.extend({
  targetPath: z.string().optional(),
});

export type UpdaterSampleStateDto = z.infer<typeof updaterSampleStateSchema>;
export type UpdaterSampleState = UpdaterSampleStateDto;

export const promptConfigSchema = z.object({
  template: z.string(),
});

export type PromptConfigDto = z.infer<typeof promptConfigSchema>;
export type PromptConfig = PromptConfigDto;

export const modelConfigSchema = z.object({
  modelId: z.string(),
  temperature: z.number(),
  maxTokens: z.number(),
  vision: z.boolean(),
  waitForResult: z.boolean().optional(),
});

export type ModelConfigDto = z.infer<typeof modelConfigSchema>;
export type ModelConfig = ModelConfigDto;

export const agentConfigSchema = z.object({
  personaId: z.string().optional(),
  promptTemplate: z.string().optional(),
  waitForResult: z.boolean().optional(),
});

export type AgentConfigDto = z.infer<typeof agentConfigSchema>;
export type AgentConfig = AgentConfigDto;

export const learnerAgentConfigSchema = z.object({
  agentId: z.string(),
  promptTemplate: z.string().optional(),
  includeSources: z.boolean().optional(),
});

export type LearnerAgentConfigDto = z.infer<typeof learnerAgentConfigSchema>;
export type LearnerAgentConfig = LearnerAgentConfigDto;

/**
 * AI Path Node Config DTOs - Runtime & Wrapper
 */

export const nodeCacheModeSchema = z.enum(['auto', 'force', 'disabled']);
export type NodeCacheModeDto = z.infer<typeof nodeCacheModeSchema>;
export type NodeCacheMode = NodeCacheModeDto;

export const nodeCacheScopeSchema = z.enum(['run', 'activation', 'session']);
export type NodeCacheScopeDto = z.infer<typeof nodeCacheScopeSchema>;
export type NodeCacheScope = NodeCacheScopeDto;

export const nodeSideEffectPolicySchema = z.enum(['per_run', 'per_activation']);
export type NodeSideEffectPolicyDto = z.infer<typeof nodeSideEffectPolicySchema>;
export type NodeSideEffectPolicy = NodeSideEffectPolicyDto;

export const nodePortCardinalitySchema = z.enum(['single', 'many']);
export type NodePortCardinalityDto = z.infer<typeof nodePortCardinalitySchema>;
export type NodePortCardinality = NodePortCardinalityDto;

export const nodePortContractSchema = z.object({
  required: z.boolean().optional(),
  cardinality: nodePortCardinalitySchema.optional(),
});
export type NodePortContractDto = z.infer<typeof nodePortContractSchema>;
export type NodePortContract = NodePortContractDto;

export const nodeRuntimeConfigSchema = z.object({
  cache: z.object({
    mode: nodeCacheModeSchema.optional(),
    scope: nodeCacheScopeSchema.optional(),
    ttlMs: z.number().optional(),
  }).optional(),
  inputContracts: z.record(z.string(), nodePortContractSchema).optional(),
  inputCardinality: z.record(z.string(), nodePortCardinalitySchema).optional(),
  waitForInputs: z.boolean().optional(),
  sideEffectPolicy: nodeSideEffectPolicySchema.optional(),
  timeoutMs: z.number().optional(),
  retry: z.object({
    attempts: z.number().optional(),
    backoffMs: z.number().optional(),
  }).optional(),
});

export type NodeRuntimeConfigDto = z.infer<typeof nodeRuntimeConfigSchema>;

export const nodeConfigSchema = z.object({
  trigger: triggerConfigSchema.optional(),
  fetcher: fetcherConfigSchema.optional(),
  simulation: simulationConfigSchema.optional(),
  audioOscillator: audioOscillatorConfigSchema.optional(),
  audioSpeaker: audioSpeakerConfigSchema.optional(),
  viewer: viewerConfigSchema.optional(),
  context: contextConfigSchema.optional(),
  regex: regexConfigSchema.optional(),
  iterator: iteratorConfigSchema.optional(),
  mapper: mapperConfigSchema.optional(),
  mutator: mutatorConfigSchema.optional(),
  stringMutator: stringMutatorConfigSchema.optional(),
  validator: validatorConfigSchema.optional(),
  validationPattern: validationPatternConfigSchema.optional(),
  constant: constantConfigSchema.optional(),
  math: mathConfigSchema.optional(),
  template: templateConfigSchema.optional(),
  bundle: bundleConfigSchema.optional(),
  gate: gateConfigSchema.optional(),
  compare: compareConfigSchema.optional(),
  router: routerConfigSchema.optional(),
  delay: delayConfigSchema.optional(),
  poll: pollConfigSchema.optional(),
  http: httpConfigSchema.optional(),
  apiAdvanced: advancedApiConfigSchema.optional(),
  playwright: playwrightConfigSchema.optional(),
  db_schema: dbSchemaConfigSchema.optional(),
  description: descriptionConfigSchema.optional(),
  parser: parserConfigSchema.optional(),
  prompt: promptConfigSchema.optional(),
  model: modelConfigSchema.optional(),
  agent: agentConfigSchema.optional(),
  learnerAgent: learnerAgentConfigSchema.optional(),
  database: databaseConfigSchema.optional(),
  runtime: nodeRuntimeConfigSchema.optional(),
  notes: z.object({
    text: z.string().optional(),
    color: z.string().optional(),
    showOnCanvas: z.boolean().optional(),
  }).optional(),
});

export type NodeConfigDto = z.infer<typeof nodeConfigSchema>;
export type NodeConfig = NodeConfigDto;

/**
 * AI Path Node Contract
 */
export const aiNodeSchema = dtoBaseSchema.extend({
  type: aiNodeTypeSchema,
  title: z.string(),
  description: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.string(), z.unknown()).optional(),
  config: nodeConfigSchema.optional(),
  inputs: z.array(z.string()),
  outputs: z.array(z.string()),
  inputContracts: z.record(z.string(), nodePortContractSchema).optional(),
  outputContracts: z.record(z.string(), nodePortContractSchema).optional(),
});

export type AiNodeDto = z.infer<typeof aiNodeSchema>;
export type AiNode = AiNodeDto;

export const createAiNodeSchema = aiNodeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAiNodeDto = z.infer<typeof createAiNodeSchema>;
export type UpdateAiNodeDto = Partial<CreateAiNodeDto>;

/**
 * AI Path Edge Contract
 */
export const aiEdgeSchema = dtoBaseSchema.extend({
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  type: z.string(),
  data: z.record(z.string(), z.unknown()),
});

export type AiEdgeDto = z.infer<typeof aiEdgeSchema>;

export const createAiEdgeSchema = aiEdgeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAiEdgeDto = z.infer<typeof createAiEdgeSchema>;
export type UpdateAiEdgeDto = Partial<CreateAiEdgeDto>;

/**
 * AI Path Contract
 */
export const aiPathSchema = namedDtoSchema.extend({
  nodes: z.array(aiNodeSchema),
  edges: z.array(aiEdgeSchema),
  config: z.record(z.string(), z.unknown()),
  enabled: z.boolean(),
  version: z.number(),
});

export type AiPathDto = z.infer<typeof aiPathSchema>;

export const createAiPathSchema = aiPathSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAiPathDto = z.infer<typeof createAiPathSchema>;
export type AiPathCreateInput = CreateAiPathDto;
export type UpdateAiPathDto = Partial<CreateAiPathDto>;
export type AiPathUpdateInput = UpdateAiPathDto;

/**
 * AI Path Run Status
 */
export const aiPathRunStatusSchema = z.enum([
  'queued',
  'running',
  'paused',
  'completed',
  'failed',
  'canceled',
  'dead_lettered',
]);

export type AiPathRunStatusDto = z.infer<typeof aiPathRunStatusSchema>;
export type AiPathRunStatus = AiPathRunStatusDto;

/**
 * AI Path Run Contract
 */
export const aiPathRunSchema = dtoBaseSchema.extend({
  pathId: z.string().nullable().optional(),
  pathName: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  status: aiPathRunStatusSchema,
  triggerNodeId: z.string().nullable().optional(),
  triggerEvent: z.string().nullable().optional(),
  triggerContext: z.record(z.string(), z.unknown()).nullable().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  result: z.record(z.string(), z.unknown()).nullable().optional(),
  error: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  prompt: z.string().nullable().optional(),
  tools: z.array(z.string()).optional(),
  searchProvider: z.string().nullable().optional(),
  agentBrowser: z.string().nullable().optional(),
  runHeadless: z.boolean().optional(),
  logLines: z.array(z.string()).optional(),
  requiresHumanIntervention: z.boolean().optional(),
  memoryKey: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  finishedAt: z.string().nullable().optional(),
  deadLetteredAt: z.string().nullable().optional(),
  retryCount: z.number().nullable().optional(),
  maxAttempts: z.number().nullable().optional(),
  nextRetryAt: z.string().nullable().optional(),
  meta: z.record(z.string(), z.unknown()).nullable().optional(),
  entityId: z.string().nullable().optional(),
  entityType: z.string().nullable().optional(),
});

export type AiPathRunDto = z.infer<typeof aiPathRunSchema>;

/**
 * AI Path Run Record Contract
 */
export const aiPathRunRecordSchema = aiPathRunSchema.extend({
  recordingPath: z.string().nullable().optional(),
  planState: z.record(z.string(), z.unknown()).nullable().optional(),
  activeStepId: z.string().nullable().optional(),
  checkpointedAt: z.string().nullable().optional(),
  graph: z.object({
    nodes: z.array(aiNodeSchema),
    edges: z.array(aiEdgeSchema),
  }).nullable().optional(),
  runtimeState: z.unknown().nullable().optional(), // Avoid circular dependency with ai-paths-runtime
  _count: z.object({
    browserSnapshots: z.number().optional(),
    browserLogs: z.number().optional(),
  }).optional(),
});

export type AiPathRunRecordDto = z.infer<typeof aiPathRunRecordSchema>;
export type AiPathRunRecord = AiPathRunRecordDto;

export const aiPathRunDetailSchema = z.object({
  run: aiPathRunRecordSchema,
  nodes: z.array(z.any()), // aiPathRunNodeSchema - can't use it yet because it is defined below
  events: z.array(z.any()), // aiPathRunEventSchema - defined below
});

export type AiPathRunDetailDto = z.infer<typeof aiPathRunDetailSchema>;
export type AiPathRunDetail = AiPathRunDetailDto;

export const createAiPathRunSchema = aiPathRunSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    status: true,
  })
  .extend({
    status: aiPathRunStatusSchema.optional(),
  });

export type CreateAiPathRunDto = z.infer<typeof createAiPathRunSchema>;
export type UpdateAiPathRunDto = Partial<CreateAiPathRunDto>;
export type AiPathRunUpdateInput = UpdateAiPathRunDto;

export const aiPathRunUpdateSchema = aiPathRunRecordSchema.partial().omit({
  id: true,
  userId: true,
  pathId: true,
  createdAt: true,
});

export type AiPathRunUpdateDto = z.infer<typeof aiPathRunUpdateSchema>;

/**
 * AI Path Node Status
 */
export const aiPathNodeStatusSchema = z.enum([
  'idle',
  'queued',
  'running',
  'completed',
  'cached',
  'failed',
  'canceled',
  'skipped',
  'blocked',
  'pending',
]);

export type AiPathNodeStatusDto = z.infer<typeof aiPathNodeStatusSchema>;
export type AiPathNodeStatus = AiPathNodeStatusDto;

/**
 * AI Path Run Node Contract
 */
export const aiPathRunNodeSchema = dtoBaseSchema.extend({
  runId: z.string(),
  nodeId: z.string(),
  nodeType: z.string(),
  nodeTitle: z.string().nullable().optional(),
  status: aiPathNodeStatusSchema,
  attempt: z.number(),
  inputs: z.record(z.string(), z.unknown()).optional(),
  outputs: z.record(z.string(), z.unknown()).optional(),
  error: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  finishedAt: z.string().nullable().optional(),
});

export type AiPathRunNodeDto = z.infer<typeof aiPathRunNodeSchema>;
export type AiPathRunNodeRecord = AiPathRunNodeDto;

/**
 * AI Path Run Event Contract
 */
export const aiPathRunEventLevelSchema = z.enum(['debug', 'info', 'warn', 'error', 'fatal']);
export type AiPathRunEventLevelDto = z.infer<typeof aiPathRunEventLevelSchema>;
export type AiPathRunEventLevel = AiPathRunEventLevelDto;

export const aiPathRunEventSchema = dtoBaseSchema.extend({
  runId: z.string(),
  nodeId: z.string().nullable().optional(),
  nodeType: z.string().nullable().optional(),
  nodeTitle: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  iteration: z.number().nullable().optional(),
  level: aiPathRunEventLevelSchema,
  message: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type AiPathRunEventDto = z.infer<typeof aiPathRunEventSchema>;
export type AiPathRunEventRecord = AiPathRunEventDto;

export const aiPathRunNodeUpdateSchema = aiPathRunNodeSchema.partial().omit({
  id: true,
  runId: true,
  nodeId: true,
  createdAt: true,
});

export type AiPathRunNodeUpdateDto = z.infer<typeof aiPathRunNodeUpdateSchema>;

export const aiPathRunEventCreateInputSchema = z.object({
  runId: z.string(),
  nodeId: z.string().nullable().optional(),
  nodeType: z.string().nullable().optional(),
  nodeTitle: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  iteration: z.number().nullable().optional(),
  level: aiPathRunEventLevelSchema,
  message: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type AiPathRunEventCreateInputDto = z.infer<typeof aiPathRunEventCreateInputSchema>;

/**
 * AI Paths Composite & Domain DTOs
 */

export const edgeSchema = z.object({
  id: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().nullable().optional(),
  source: z.string().optional(),
  target: z.string().optional(),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
  type: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  fromPort: z.string().nullable().optional(),
  toPort: z.string().nullable().optional(),
  label: z.string().nullable().optional(),
});

export interface EdgeDto {
  id: string;
  createdAt?: string | undefined;
  updatedAt?: string | null | undefined;
  source?: string | undefined;
  target?: string | undefined;
  sourceHandle?: string | null | undefined;
  targetHandle?: string | null | undefined;
  type?: string | undefined;
  data?: Record<string, unknown> | undefined;
  from?: string | undefined;
  to?: string | undefined;
  fromPort?: string | null | undefined;
  toPort?: string | null | undefined;
  label?: string | null | undefined;
}

export type Edge = EdgeDto;

export const nodeDefinitionSchema = z.object({
  type: aiNodeTypeSchema,
  title: z.string(),
  description: z.string(),
  inputs: z.array(z.string()),
  outputs: z.array(z.string()),
  inputContracts: z.record(z.string(), nodePortContractSchema).optional(),
  outputContracts: z.record(z.string(), nodePortContractSchema).optional(),
  config: nodeConfigSchema.optional(),
});

export type NodeDefinitionDto = z.infer<typeof nodeDefinitionSchema>;
export type NodeDefinition = NodeDefinitionDto;

export const aiPathRuntimeAnalyticsRangeSchema = z.enum(['1h', '24h', '7d', '30d']);
export type AiPathRuntimeAnalyticsRangeDto = z.infer<typeof aiPathRuntimeAnalyticsRangeSchema>;
export type AiPathRuntimeAnalyticsRange = AiPathRuntimeAnalyticsRangeDto;

export const aiPathRuntimeAnalyticsSlowestSpanSchema = z.object({
  runId: z.string(),
  spanId: z.string(),
  nodeId: z.string(),
  nodeType: z.string(),
  status: z.string(),
  durationMs: z.number(),
});

export type AiPathRuntimeAnalyticsSlowestSpanDto = z.infer<
  typeof aiPathRuntimeAnalyticsSlowestSpanSchema
>;
export type AiPathRuntimeAnalyticsSlowestSpan = AiPathRuntimeAnalyticsSlowestSpanDto;

export const aiPathRuntimeTraceSlowNodeSchema = z.object({
  nodeId: z.string(),
  nodeType: z.string(),
  spanCount: z.number(),
  avgDurationMs: z.number(),
  maxDurationMs: z.number(),
  totalDurationMs: z.number(),
});

export type AiPathRuntimeTraceSlowNodeDto = z.infer<
  typeof aiPathRuntimeTraceSlowNodeSchema
>;
export type AiPathRuntimeTraceSlowNode = AiPathRuntimeTraceSlowNodeDto;

export const aiPathRuntimeTraceFailedNodeSchema = z.object({
  nodeId: z.string(),
  nodeType: z.string(),
  failedCount: z.number(),
  spanCount: z.number(),
});

export type AiPathRuntimeTraceFailedNodeDto = z.infer<
  typeof aiPathRuntimeTraceFailedNodeSchema
>;
export type AiPathRuntimeTraceFailedNode = AiPathRuntimeTraceFailedNodeDto;

export const aiPathRuntimeTraceAnalyticsSchema = z.object({
  source: z.enum(['none', 'db_sample']),
  sampledRuns: z.number(),
  sampledSpans: z.number(),
  completedSpans: z.number(),
  failedSpans: z.number(),
  cachedSpans: z.number(),
  avgDurationMs: z.number().nullable(),
  p95DurationMs: z.number().nullable(),
  slowestSpan: aiPathRuntimeAnalyticsSlowestSpanSchema.nullable(),
  topSlowNodes: z.array(aiPathRuntimeTraceSlowNodeSchema),
  topFailedNodes: z.array(aiPathRuntimeTraceFailedNodeSchema),
  truncated: z.boolean(),
});

export type AiPathRuntimeTraceAnalyticsDto = z.infer<
  typeof aiPathRuntimeTraceAnalyticsSchema
>;
export type AiPathRuntimeTraceAnalytics = AiPathRuntimeTraceAnalyticsDto;

export const aiPathRuntimeAnalyticsSummarySchema = z.object({
  from: z.string(),
  to: z.string(),
  range: z.string(),
  storage: z.enum(['redis', 'disabled']),
  runs: z.object({
    total: z.number(),
    queued: z.number(),
    started: z.number(),
    completed: z.number(),
    failed: z.number(),
    canceled: z.number(),
    deadLettered: z.number(),
    successRate: z.number(),
    failureRate: z.number(),
    deadLetterRate: z.number(),
    avgDurationMs: z.number().nullable(),
    p95DurationMs: z.number().nullable(),
  }),
  nodes: z.object({
    started: z.number(),
    completed: z.number(),
    failed: z.number(),
    queued: z.number(),
    running: z.number(),
    polling: z.number(),
    cached: z.number(),
    waitingCallback: z.number(),
  }),
  brain: z.object({
    analyticsReports: z.number(),
    logReports: z.number(),
    totalReports: z.number(),
    warningReports: z.number(),
    errorReports: z.number(),
  }),
  traces: aiPathRuntimeTraceAnalyticsSchema,
  generatedAt: z.string(),
});

export type AiPathRuntimeAnalyticsSummaryDto = z.infer<typeof aiPathRuntimeAnalyticsSummarySchema>;
export type AiPathRuntimeAnalyticsSummary = AiPathRuntimeAnalyticsSummaryDto;

export const pathMetaSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PathMetaDto = z.infer<typeof pathMetaSchema>;
export type PathMeta = PathMetaDto;

export const pathUiStateSchema = z.object({
  selectedNodeId: z.string().nullable().optional(),
  configOpen: z.boolean().optional(),
});

export type PathUiStateDto = z.infer<typeof pathUiStateSchema>;
export type PathUiState = PathUiStateDto;

export const aiPathsValidationSeveritySchema = z.enum(['error', 'warning', 'info']);
export type AiPathsValidationSeverityDto = z.infer<
  typeof aiPathsValidationSeveritySchema
>;
export type AiPathsValidationSeverity = AiPathsValidationSeverityDto;

export const aiPathsValidationModuleSchema = z.enum([
  'graph',
  'trigger',
  'simulation',
  'context',
  'parser',
  'database',
  'model',
  'poll',
  'router',
  'gate',
  'validation_pattern',
  'custom',
]);
export type AiPathsValidationModuleDto = z.infer<
  typeof aiPathsValidationModuleSchema
>;
export type AiPathsValidationModule = AiPathsValidationModuleDto;

export const aiPathsValidationOperatorSchema = z.enum([
  'exists',
  'non_empty',
  'equals',
  'in',
  'matches_regex',
  'wired_from',
  'wired_to',
  'has_incoming_port',
  'has_outgoing_port',
  'jsonpath_exists',
  'jsonpath_equals',
  'collection_exists',
  'entity_collection_resolves',
  'edge_endpoints_resolve',
  'edge_ports_declared',
  'node_types_known',
  'node_ids_unique',
  'edge_ids_unique',
  'node_positions_finite',
]);
export type AiPathsValidationOperatorDto = z.infer<
  typeof aiPathsValidationOperatorSchema
>;
export type AiPathsValidationOperator = AiPathsValidationOperatorDto;

export const aiPathsValidationConditionSchema = z.object({
  id: z.string(),
  operator: aiPathsValidationOperatorSchema,
  field: z.string().optional(),
  valuePath: z.string().optional(),
  expected: z.unknown().optional(),
  list: z.array(z.string()).optional(),
  flags: z.string().optional(),
  port: z.string().optional(),
  fromPort: z.string().optional(),
  toPort: z.string().optional(),
  fromNodeType: z.string().optional(),
  toNodeType: z.string().optional(),
  sourceNodeId: z.string().optional(),
  targetNodeId: z.string().optional(),
  collectionMapKey: z.string().optional(),
  negate: z.boolean().optional(),
});
export type AiPathsValidationConditionDto = z.infer<
  typeof aiPathsValidationConditionSchema
>;
export type AiPathsValidationCondition = AiPathsValidationConditionDto;

export const aiPathsValidationRuleSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  enabled: z.boolean(),
  severity: aiPathsValidationSeveritySchema,
  module: aiPathsValidationModuleSchema,
  appliesToNodeTypes: z.array(z.string()).optional(),
  sequence: z.number().optional(),
  conditionMode: z.enum(['all', 'any']).optional(),
  conditions: z.array(aiPathsValidationConditionSchema).min(1),
  weight: z.number().optional(),
  forceProbabilityIfFailed: z.number().optional(),
  recommendation: z.string().optional(),
  docsBindings: z.array(z.string()).optional(),
  inference: z
    .object({
      sourceType: z.enum(['manual', 'central_docs']).optional(),
      status: z.enum(['candidate', 'approved', 'rejected', 'deprecated']).optional(),
      assertionId: z.string().optional(),
      sourcePath: z.string().optional(),
      sourceHash: z.string().optional(),
      docsSnapshotHash: z.string().optional(),
      confidence: z.number().optional(),
      compilerVersion: z.string().optional(),
      inferredAt: z.string().optional(),
      approvedAt: z.string().optional(),
      approvedBy: z.string().optional(),
      reviewNote: z.string().optional(),
      tags: z.array(z.string()).optional(),
      deprecates: z.array(z.string()).optional(),
    })
    .optional(),
});
export type AiPathsValidationRuleDto = z.infer<typeof aiPathsValidationRuleSchema>;
export type AiPathsValidationRule = AiPathsValidationRuleDto;

export const aiPathsValidationDocsSyncStateSchema = z.object({
  lastSnapshotHash: z.string().optional(),
  lastSyncedAt: z.string().optional(),
  lastSyncStatus: z.enum(['idle', 'success', 'warning', 'error']).optional(),
  lastSyncWarnings: z.array(z.string()).optional(),
  sourceCount: z.number().optional(),
  candidateCount: z.number().optional(),
});
export type AiPathsValidationDocsSyncStateDto = z.infer<
  typeof aiPathsValidationDocsSyncStateSchema
>;
export type AiPathsValidationDocsSyncState = AiPathsValidationDocsSyncStateDto;

export const aiPathsValidationPolicySchema = z.enum([
  'report_only',
  'warn_below_threshold',
  'block_below_threshold',
]);
export type AiPathsValidationPolicyDto = z.infer<
  typeof aiPathsValidationPolicySchema
>;
export type AiPathsValidationPolicy = AiPathsValidationPolicyDto;

export const aiPathsValidationConfigSchema = z.object({
  schemaVersion: z.number().int().positive().optional(),
  enabled: z.boolean().optional(),
  policy: aiPathsValidationPolicySchema.optional(),
  warnThreshold: z.number().optional(),
  blockThreshold: z.number().optional(),
  baseScore: z.number().optional(),
  lastEvaluatedAt: z.string().nullable().optional(),
  collectionMap: z.record(z.string(), z.string()).optional(),
  docsSources: z.array(z.string()).optional(),
  rules: z.array(aiPathsValidationRuleSchema).optional(),
  inferredCandidates: z.array(aiPathsValidationRuleSchema).optional(),
  docsSyncState: aiPathsValidationDocsSyncStateSchema.optional(),
});
export type AiPathsValidationConfigDto = z.infer<
  typeof aiPathsValidationConfigSchema
>;
export type AiPathsValidationConfig = AiPathsValidationConfigDto;

export const pathBlockedRunPolicySchema = z.enum([
  'fail_run',
  'complete_with_warning',
]);
export type PathBlockedRunPolicyDto = z.infer<
  typeof pathBlockedRunPolicySchema
>;
export type PathBlockedRunPolicy = PathBlockedRunPolicyDto;

export const pathConfigSchema = z.object({
  id: z.string(),
  version: z.number(),
  name: z.string(),
  description: z.string(),
  trigger: z.string(),
  executionMode: z.string().optional(),
  flowIntensity: z.string().optional(),
  runMode: z.string().optional(),
  strictFlowMode: z.boolean().optional(),
  blockedRunPolicy: pathBlockedRunPolicySchema.optional(),
  nodes: z.array(aiNodeSchema),
  edges: z.array(edgeSchema),
  updatedAt: z.string(),
  isLocked: z.boolean().optional(),
  isActive: z.boolean().optional(),
  parserSamples: z.record(z.string(), z.any()).optional(),
  updaterSamples: z.record(z.string(), z.any()).optional(),
  runtimeState: z.any().optional(),
  lastRunAt: z.string().nullable().optional(),
  runCount: z.number().optional(),
  aiPathsValidation: aiPathsValidationConfigSchema.optional(),
  uiState: pathUiStateSchema.optional(),
});

export type PathConfigDto = z.infer<typeof pathConfigSchema>;
export type PathConfig = PathConfigDto;

export const pathDebugEntrySchema = z.object({
  nodeId: z.string(),
  title: z.string().optional(),
  debug: z.unknown(),
});

export type PathDebugEntryDto = z.infer<typeof pathDebugEntrySchema>;
export type PathDebugEntry = PathDebugEntryDto;

export const pathDebugSnapshotSchema = z.object({
  pathId: z.string(),
  runAt: z.string(),
  entries: z.array(pathDebugEntrySchema),
});

export type PathDebugSnapshotDto = z.infer<typeof pathDebugSnapshotSchema>;
export type PathDebugSnapshot = PathDebugSnapshotDto;

export const clusterPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  bundlePorts: z.array(z.string()),
  template: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ClusterPresetDto = z.infer<typeof clusterPresetSchema>;
export type ClusterPreset = ClusterPresetDto;

export const dbQueryPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  queryTemplate: z.string(),
  updateTemplate: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type DbQueryPresetDto = z.infer<typeof dbQueryPresetSchema>;
export type DbQueryPreset = DbQueryPresetDto;

export const dbNodePresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  config: databaseConfigSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type DbNodePresetDto = z.infer<typeof dbNodePresetSchema>;
export type DbNodePreset = DbNodePresetDto;

export const jsonPathEntrySchema = z.object({
  path: z.string(),
  type: z.enum(['object', 'array', 'value']),
});

export type JsonPathEntryDto = z.infer<typeof jsonPathEntrySchema>;
export type JsonPathEntry = JsonPathEntryDto;

export const connectionValidationSchema = z.object({
  valid: z.boolean(),
  message: z.string().optional(),
});

export type ConnectionValidationDto = z.infer<typeof connectionValidationSchema>;
export type ConnectionValidation = ConnectionValidationDto;

/**
 * AI Path Run List Options Contract
 */
export const aiPathRunEventListOptionsSchema = z.object({
  since: z.string().nullable().optional(),
  after: z.object({
    createdAt: z.string(),
    id: z.string(),
  }).nullable().optional(),
  limit: z.number().optional(),
});

export type AiPathRunEventListOptionsDto = z.infer<typeof aiPathRunEventListOptionsSchema>;
export type AiPathRunEventListOptions = AiPathRunEventListOptionsDto;

export const aiPathRunListOptionsSchema = z.object({
  userId: z.string().nullable().optional(),
  pathId: z.string().optional(),
  nodeId: z.string().optional(),
  requestId: z.string().optional(),
  source: z.string().optional(),
  sourceMode: z.enum(['include', 'exclude']).optional(),
  status: aiPathRunStatusSchema.optional(),
  statuses: z.array(aiPathRunStatusSchema).optional(),
  query: z.string().optional(),
  createdAfter: z.string().nullable().optional(),
  createdBefore: z.string().nullable().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
  includeTotal: z.boolean().optional(),
});

export type AiPathRunListOptionsDto = z.infer<typeof aiPathRunListOptionsSchema>;
export type AiPathRunListOptions = AiPathRunListOptionsDto;

export const aiPathRunListResultSchema = z.object({
  runs: z.array(aiPathRunSchema),
  total: z.number(),
});

export type AiPathRunListResultDto = z.infer<typeof aiPathRunListResultSchema>;
export type AiPathRunListResult = AiPathRunListResultDto;

/**
 * AI Path Presets Contracts
 */
export const aiClusterPresetSchema = namedDtoSchema.extend({
  bundlePorts: z.array(z.string()),
  template: z.string(),
});

export type AiClusterPresetDto = z.infer<typeof aiClusterPresetSchema>;

export const aiDbQueryPresetSchema = namedDtoSchema.extend({
  queryTemplate: z.string(),
  updateTemplate: z.string().optional(),
});

export type AiDbQueryPresetDto = z.infer<typeof aiDbQueryPresetSchema>;

export const aiDbNodePresetSchema = namedDtoSchema.extend({
  config: databaseConfigSchema.optional(), // Simplified for now
});

export type AiDbNodePresetDto = z.infer<typeof aiDbNodePresetSchema>;

/**
 * Execution Contract
 */
export const executeAiPathSchema = z.object({
  pathId: z.string(),
  triggerNodeId: z.string().optional(),
  triggerEvent: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export type ExecuteAiPathDto = z.infer<typeof executeAiPathSchema>;

export type PathFlowIntensity = 'off' | 'low' | 'medium' | 'high';

/**
 * AI Path Repository Interfaces
 */

export type AiPathRunCreateInput = Omit<CreateAiPathRunDto, 'status'> & {
  status?: AiPathRunStatus | undefined;
  graph?: { nodes: AiNode[]; edges: Edge[] | unknown[] } | null | undefined;
  runtimeState?: Record<string, unknown> | null | undefined;
};

export type AiPathRunUpdate = AiPathRunUpdateDto & {
  status?: AiPathRunStatus;
  triggerContext?: Record<string, unknown> | null;
  graph?: { nodes: AiNode[]; edges: Edge[] | unknown[] } | null;
};

export type AiPathRunNodeUpdate = AiPathRunNodeUpdateDto & {
  status?: AiPathNodeStatus;
};

export type AiPathRunEventCreateInput = AiPathRunEventCreateInputDto;

export type AiPathRunRepository = {
  createRun(input: AiPathRunCreateInput): Promise<AiPathRunRecord>;
  updateRun(runId: string, data: AiPathRunUpdate): Promise<AiPathRunRecord>;
  updateRunIfStatus(
    runId: string,
    expectedStatuses: AiPathRunStatus[],
    data: AiPathRunUpdate
  ): Promise<AiPathRunRecord | null>;
  claimRunForProcessing(runId: string): Promise<AiPathRunRecord | null>;
  findRunById(runId: string): Promise<AiPathRunRecord | null>;
  deleteRun(runId: string): Promise<boolean>;
  listRuns(options?: AiPathRunListOptions): Promise<AiPathRunListResult>;
  deleteRuns(options?: AiPathRunListOptions): Promise<{ count: number }>;
  claimNextQueuedRun(): Promise<AiPathRunRecord | null>;
  getQueueStats(): Promise<{ queuedCount: number; oldestQueuedAt: Date | null }>;
  createRunNodes(runId: string, nodes: AiNode[]): Promise<void>;
  upsertRunNode(
    runId: string,
    nodeId: string,
    data: AiPathRunNodeUpdate & { nodeType: string; nodeTitle?: string | null }
  ): Promise<AiPathRunNodeRecord>;
  listRunNodes(runId: string): Promise<AiPathRunNodeRecord[]>;
  listRunNodesSince(
    runId: string,
    cursor: { updatedAt: Date | string; nodeId: string },
    options?: { limit?: number }
  ): Promise<AiPathRunNodeRecord[]>;
  createRunEvent(input: AiPathRunEventCreateInput): Promise<AiPathRunEventRecord>;
  listRunEvents(runId: string, options?: AiPathRunEventListOptions): Promise<AiPathRunEventRecord[]>;
  markStaleRunningRuns(maxAgeMs: number): Promise<{ count: number }>;
};

/**
 * Runtime Types (imported from ai-paths-runtime for consolidation)
 */
export type {
  RuntimeState,
  RuntimePortValues,
  RuntimeEventInputDto,
  RunStatusDto,
  SetNodeStatusInputDto,
  PathExecutionMode,
  PathRunMode,
  QueuedRunDto,
  RuntimeHistoryEntry,
  RuntimeHistoryLink,
} from './ai-paths-runtime';
