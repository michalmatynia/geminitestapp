import { z } from 'zod';
import { dtoBaseSchema } from '../base';
import { playwrightSettingsSchema } from '../playwright';
import { aiNodeTypeSchema } from './base';

export const triggerConfigSchema = z.object({
  event: z.string(),
  contextMode: z.enum(['simulation_required', 'simulation_preferred', 'trigger_only']).optional(),
});

export type TriggerConfigDto = z.infer<typeof triggerConfigSchema>;
export type TriggerConfig = TriggerConfigDto;
export type TriggerContextMode = NonNullable<TriggerConfig['contextMode']>;

export const simulationConfigSchema = z.object({
  productId: z.string(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  runBehavior: z.enum(['before_connected_trigger', 'manual_only']).optional(),
});

export type SimulationConfigDto = z.infer<typeof simulationConfigSchema>;
export type SimulationConfig = SimulationConfigDto;
export type SimulationRunBehavior = NonNullable<SimulationConfig['runBehavior']>;

export const fetcherConfigSchema = z.object({
  sourceMode: z.enum(['live_context', 'simulation_id', 'live_then_simulation']).optional(),
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
});

export type ContextConfigDto = z.infer<typeof contextConfigSchema>;
export type ContextConfig = ContextConfigDto;

export const audioOscillatorConfigSchema = z.object({
  frequency: z.number(),
  type: z.enum(['sine', 'square', 'sawtooth', 'triangle']),
});

export type AudioOscillatorConfigDto = z.infer<typeof audioOscillatorConfigSchema>;
export type AudioOscillatorConfig = AudioOscillatorConfigDto;

export const audioSpeakerConfigSchema = z.object({
  volume: z.number(),
});

export type AudioSpeakerConfigDto = z.infer<typeof audioSpeakerConfigSchema>;
export type AudioSpeakerConfig = AudioSpeakerConfigDto;

export const mapperConfigSchema = z.object({
  mappings: z.record(z.string(), z.string()),
});

export type MapperConfigDto = z.infer<typeof mapperConfigSchema>;
export type MapperConfig = MapperConfigDto;

export const boundsNormalizerFormatSchema = z.enum([
  'pixels',
  'gemini_millirelative',
  'yolo_relative',
  'percentage',
]);

export type BoundsNormalizerFormat = z.infer<typeof boundsNormalizerFormatSchema>;

export const boundsNormalizerConfigSchema = z.object({
  format: boundsNormalizerFormatSchema,
  rootPath: z.string().optional(),
  fieldOverrides: z
    .object({
      left: z.string().optional(),
      top: z.string().optional(),
      width: z.string().optional(),
      height: z.string().optional(),
    })
    .optional(),
  confidencePath: z.string().optional(),
  labelPath: z.string().optional(),
});

export type BoundsNormalizerConfigDto = z.infer<typeof boundsNormalizerConfigSchema>;
export type BoundsNormalizerConfig = BoundsNormalizerConfigDto;

export const canvasOutputConfigSchema = z.object({
  rootPath: z.string().optional(),
  leftField: z.string().optional(),
  topField: z.string().optional(),
  widthField: z.string().optional(),
  heightField: z.string().optional(),
  confidencePath: z.string().optional(),
  labelPath: z.string().optional(),
});

export type CanvasOutputConfigDto = z.infer<typeof canvasOutputConfigSchema>;
export type CanvasOutputConfig = CanvasOutputConfigDto;

export const mutatorConfigSchema = z.object({
  path: z.string(),
  value: z.string(),
});

export type MutatorConfigDto = z.infer<typeof mutatorConfigSchema>;
export type MutatorConfig = MutatorConfigDto;

export const stringMutatorConfigSchema = z.object({
  operation: z.enum(['append', 'prepend', 'replace', 'trim', 'lowercase', 'uppercase']),
  value: z.string().optional(),
});

export type StringMutatorConfigDto = z.infer<typeof stringMutatorConfigSchema>;
export type StringMutatorConfig = StringMutatorConfigDto;

export const validatorConfigSchema = z.object({
  rule: z.string(),
});

export type ValidatorConfigDto = z.infer<typeof validatorConfigSchema>;
export type ValidatorConfig = ValidatorConfigDto;

export const validationPatternConfigSchema = z.object({
  pattern: z.string(),
});

export type ValidationPatternConfigDto = z.infer<typeof validationPatternConfigSchema>;
export type ValidationPatternConfig = ValidationPatternConfigDto;

export const constantConfigSchema = z.object({
  value: z.string(),
});

export type ConstantConfigDto = z.infer<typeof constantConfigSchema>;
export type ConstantConfig = ConstantConfigDto;

export const mathConfigSchema = z.object({
  operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
  value: z.number(),
});

export type MathConfigDto = z.infer<typeof mathConfigSchema>;
export type MathConfig = MathConfigDto;

export const templateConfigSchema = z.object({
  template: z.string(),
});

export type TemplateConfigDto = z.infer<typeof templateConfigSchema>;
export type TemplateConfig = TemplateConfigDto;

export const bundleConfigSchema = z.object({
  keys: z.array(z.string()),
});

export type BundleConfigDto = z.infer<typeof bundleConfigSchema>;
export type BundleConfig = BundleConfigDto;

export const gateConfigSchema = z.object({
  condition: z.string(),
});

export type GateConfigDto = z.infer<typeof gateConfigSchema>;
export type GateConfig = GateConfigDto;

export const compareConfigSchema = z.object({
  operation: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'regex']),
  value: z.string(),
});

export type CompareConfigDto = z.infer<typeof compareConfigSchema>;
export type CompareConfig = CompareConfigDto;

export const logicalConditionConfigSchema = z.object({
  operation: z.enum(['and', 'or', 'not']),
});

export type LogicalConditionConfigDto = z.infer<typeof logicalConditionConfigSchema>;
export type LogicalConditionConfig = LogicalConditionConfigDto;

export const routerConfigSchema = z.object({
  routes: z.record(z.string(), z.string()),
});

export type RouterConfigDto = z.infer<typeof routerConfigSchema>;
export type RouterConfig = RouterConfigDto;

export const delayConfigSchema = z.object({
  ms: z.number(),
});

export type DelayConfigDto = z.infer<typeof delayConfigSchema>;
export type DelayConfig = DelayConfigDto;

export const descriptionConfigSchema = z.object({
  prompt: z.string().optional(),
});

export type DescriptionConfigDto = z.infer<typeof descriptionConfigSchema>;
export type DescriptionConfig = DescriptionConfigDto;

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
  manual: z
    .object({ pattern: z.string(), flags: z.string().optional(), groupBy: z.string().optional() })
    .optional(),
  aiProposal: z
    .object({ pattern: z.string(), flags: z.string().optional(), groupBy: z.string().optional() })
    .optional(),
  aiProposals: z
    .array(
      z.object({
        pattern: z.string(),
        flags: z.string().optional(),
        groupBy: z.string().optional(),
        createdAt: z.string(),
      })
    )
    .optional(),
  templates: z.array(regexTemplateSchema).optional(),
  jsonIntegrityPolicy: z.enum(['strict', 'repair']).optional(),
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
export type AdvancedApiApiKeyPlacementDto = z.infer<typeof advancedApiApiKeyPlacementSchema>;

export const advancedApiBackoffStrategySchema = z.enum(['fixed', 'exponential']);
export type AdvancedApiBackoffStrategyDto = z.infer<typeof advancedApiBackoffStrategySchema>;

export const advancedApiPaginationModeSchema = z.enum(['none', 'page', 'cursor', 'link']);
export type AdvancedApiPaginationModeDto = z.infer<typeof advancedApiPaginationModeSchema>;

export const advancedApiPaginationAggregateModeSchema = z.enum(['first_page', 'concat_items']);
export type AdvancedApiPaginationAggregateModeDto = z.infer<
  typeof advancedApiPaginationAggregateModeSchema
>;

export const advancedApiRateLimitOnLimitSchema = z.enum(['wait', 'fail']);
export type AdvancedApiRateLimitOnLimitDto = z.infer<typeof advancedApiRateLimitOnLimitSchema>;

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

export const playwrightBrowserEngineSchema = z.enum(['chromium', 'firefox', 'webkit']);
export type PlaywrightBrowserEngineDto = z.infer<typeof playwrightBrowserEngineSchema>;
export type PlaywrightBrowserEngine = PlaywrightBrowserEngineDto;

export const playwrightCaptureConfigSchema = z.object({
  screenshot: z.boolean().optional(),
  html: z.boolean().optional(),
  video: z.boolean().optional(),
  trace: z.boolean().optional(),
});
export type PlaywrightCaptureConfigDto = z.infer<typeof playwrightCaptureConfigSchema>;
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
  collections: z.array(
    z.object({
      name: z.string(),
      fields: z.array(z.object({ name: z.string(), type: z.string() })),
      relations: z.array(z.string()).optional(),
      provider: z.enum(['mongodb', 'prisma']).optional(),
    })
  ),
  sources: z
    .record(
      z.enum(['mongodb', 'prisma']),
      z.object({
        provider: z.enum(['mongodb', 'prisma']),
        collections: z.array(
          z.object({
            name: z.string(),
            fields: z.array(z.object({ name: z.string(), type: z.string() })),
            relations: z.array(z.string()).optional(),
          })
        ),
      })
    )
    .optional(),
  syncedAt: z.string().optional(),
});

export type DbSchemaSnapshotDto = z.infer<typeof dbSchemaSnapshotSchema>;
export type DbSchemaSnapshot = DbSchemaSnapshotDto;

export const databaseWriteZeroAffectedPolicySchema = z.enum(['fail', 'warn']);
export type DatabaseWriteZeroAffectedPolicyDto = z.infer<
  typeof databaseWriteZeroAffectedPolicySchema
>;
export type DatabaseWriteZeroAffectedPolicy = DatabaseWriteZeroAffectedPolicyDto;

export const databaseWriteOutcomePolicySchema = z.object({
  onZeroAffected: databaseWriteZeroAffectedPolicySchema.optional(),
});
export type DatabaseWriteOutcomePolicyDto = z.infer<typeof databaseWriteOutcomePolicySchema>;
export type DatabaseWriteOutcomePolicy = DatabaseWriteOutcomePolicyDto;

export const databaseWriteOutcomeSchema = z
  .object({
    status: z.enum(['success', 'warning', 'failed']),
    code: z.string().optional(),
    message: z.string().optional(),
    policyOnZeroAffected: databaseWriteZeroAffectedPolicySchema.optional(),
    zeroAffected: z.boolean().optional(),
    operation: z.string().optional(),
    action: z.string().optional(),
    affectedCount: z.number().nullable().optional(),
    matchedCount: z.number().nullable().optional(),
    modifiedCount: z.number().nullable().optional(),
    deletedCount: z.number().nullable().optional(),
    insertedCount: z.number().nullable().optional(),
  })
  .passthrough();
export type DatabaseWriteOutcomeDto = z.infer<typeof databaseWriteOutcomeSchema>;
export type DatabaseWriteOutcome = DatabaseWriteOutcomeDto;

export const databaseGuardrailMetaSchema = z
  .object({
    code: z.string(),
    severity: z.enum(['warning', 'error']),
    message: z.string(),
    templates: z.array(z.string()).optional(),
    missingTokens: z.array(z.string()).optional(),
    emptyTokens: z.array(z.string()).optional(),
    missingRoots: z.array(z.string()).optional(),
    emptyRoots: z.array(z.string()).optional(),
    unparseableTokens: z.array(z.string()).optional(),
    unparseableRoots: z.array(z.string()).optional(),
    parseDiagnostics: z
      .array(
        z.object({
          port: z.string().optional(),
          token: z.string(),
          rawType: z.string(),
          parseState: z.enum(['not_json_like', 'parsed', 'repaired', 'unparseable']),
          repairApplied: z.boolean(),
          parseError: z.string().optional(),
          truncationDetected: z.boolean().optional(),
          repairSteps: z.array(z.string()).optional(),
        })
      )
      .optional(),
  })
  .passthrough();
export type DatabaseGuardrailMetaDto = z.infer<typeof databaseGuardrailMetaSchema>;
export type DatabaseGuardrailMeta = DatabaseGuardrailMetaDto;

export const databaseConfigSchema = z.object({
  operation: z.enum(['query', 'update', 'insert', 'delete', 'action', 'distinct']),
  entityType: z.string().optional(),
  idField: z.string().optional(),
  mode: z.enum(['replace', 'append']).optional(),
  updateStrategy: z.enum(['one', 'many']).optional(),
  updatePayloadMode: z.enum(['mapping', 'custom']).optional(),
  useMongoActions: z.boolean().optional(),
  actionCategory: z.enum(['create', 'read', 'update', 'delete', 'aggregate']).optional(),
  action: z
    .enum([
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
    ])
    .optional(),
  distinctField: z.string().optional(),
  updateTemplate: z.string().optional(),
  mappings: z
    .array(
      z.object({
        targetPath: z.string(),
        sourcePort: z.string(),
        sourcePath: z.string().optional(),
      })
    )
    .optional(),
  query: dbQueryConfigSchema.optional(),
  writeSource: z.string().optional(),
  writeSourcePath: z.string().optional(),
  dryRun: z.boolean().optional(),
  presetId: z.string().optional(),
  skipEmpty: z.boolean().optional(),
  trimStrings: z.boolean().optional(),
  aiPrompt: z.string().optional(),
  writeOutcomePolicy: databaseWriteOutcomePolicySchema.optional(),
  validationRuleIds: z.array(z.string()).optional(),
  parameterInferenceGuard: z
    .object({
      enabled: z.boolean().optional(),
      targetPath: z.string().optional(),
      definitionsPort: z.string().optional(),
      definitionsPath: z.string().optional(),
      enforceOptionLabels: z.boolean().optional(),
      allowUnknownParameterIds: z.boolean().optional(),
    })
    .optional(),
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
  // Empty/undefined means inherit the AI Brain default for AI Paths.
  modelId: z.string().optional(),
  temperature: z.number(),
  maxTokens: z.number(),
  vision: z.boolean(),
  waitForResult: z.boolean().optional(),
  systemPrompt: z.string().optional(),
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
  cache: z
    .object({
      mode: nodeCacheModeSchema.optional(),
      scope: nodeCacheScopeSchema.optional(),
      ttlMs: z.number().optional(),
    })
    .optional(),
  inputContracts: z.record(z.string(), nodePortContractSchema).optional(),
  inputCardinality: z.record(z.string(), nodePortCardinalitySchema).optional(),
  waitForInputs: z.boolean().optional(),
  sideEffectPolicy: nodeSideEffectPolicySchema.optional(),
  timeoutMs: z.number().optional(),
  retry: z
    .object({
      attempts: z.number().optional(),
      backoffMs: z.number().optional(),
    })
    .optional(),
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
  boundsNormalizer: boundsNormalizerConfigSchema.optional(),
  canvasOutput: canvasOutputConfigSchema.optional(),
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
  logicalCondition: logicalConditionConfigSchema.optional(),
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
  notes: z
    .object({
      text: z.string().optional(),
      color: z.string().optional(),
      showOnCanvas: z.boolean().optional(),
    })
    .optional(),
});

export type NodeConfigDto = z.infer<typeof nodeConfigSchema>;
export type NodeConfig = NodeConfigDto;
