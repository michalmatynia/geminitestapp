import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';
import {
  promptValidationRuleSchema,
  promptValidationScopeSchema,
} from './prompt-engine';

/**
 * AI Path Node Types
 */
export const aiNodeTypeSchema = z.enum([
  'trigger',
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

/**
 * AI Path Node Config DTOs - Basic & Audio
 */

export const triggerConfigSchema = z.object({
  event: z.string(),
});

export type TriggerConfigDto = z.infer<typeof triggerConfigSchema>;

export const simulationConfigSchema = z.object({
  productId: z.string(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
});

export type SimulationConfigDto = z.infer<typeof simulationConfigSchema>;

export const viewerConfigSchema = z.object({
  outputs: z.record(z.string(), z.string()),
  showImagesAsJson: z.boolean().optional(),
});

export type ViewerConfigDto = z.infer<typeof viewerConfigSchema>;

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

export const delayConfigSchema = z.object({
  ms: z.number(),
});

export type DelayConfigDto = z.infer<typeof delayConfigSchema>;

export const audioWaveformSchema = z.enum(['sine', 'square', 'sawtooth', 'triangle']);
export type AudioWaveformDto = z.infer<typeof audioWaveformSchema>;

export const audioOscillatorConfigSchema = z.object({
  waveform: audioWaveformSchema,
  frequencyHz: z.number(),
  gain: z.number(),
  durationMs: z.number(),
});

export type AudioOscillatorConfigDto = z.infer<typeof audioOscillatorConfigSchema>;

export const audioSpeakerConfigSchema = z.object({
  enabled: z.boolean(),
  autoPlay: z.boolean(),
  gain: z.number(),
  stopPrevious: z.boolean(),
});

export type AudioSpeakerConfigDto = z.infer<typeof audioSpeakerConfigSchema>;

export const descriptionConfigSchema = z.object({
  visionOutputEnabled: z.boolean().optional(),
  generationOutputEnabled: z.boolean().optional(),
});

export type DescriptionConfigDto = z.infer<typeof descriptionConfigSchema>;

/**
 * AI Path Node Config DTOs - Utilities
 */

export const mapperConfigSchema = z.object({
  outputs: z.array(z.string()),
  mappings: z.record(z.string(), z.string()),
});

export type MapperConfigDto = z.infer<typeof mapperConfigSchema>;

export const mutatorConfigSchema = z.object({
  path: z.string(),
  valueTemplate: z.string(),
  targetType: z.enum(['string', 'number', 'boolean', 'json']).optional(),
});

export type MutatorConfigDto = z.infer<typeof mutatorConfigSchema>;

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

export const stringMutatorConfigSchema = z.object({
  operations: z.array(stringMutatorOperationSchema),
});

export type StringMutatorConfigDto = z.infer<typeof stringMutatorConfigSchema>;

export const validatorConfigSchema = z.object({
  requiredPaths: z.array(z.string()),
  mode: z.enum(['all', 'any']),
});

export type ValidatorConfigDto = z.infer<typeof validatorConfigSchema>;

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

export const constantConfigSchema = z.object({
  valueType: z.enum(['string', 'number', 'boolean', 'json']),
  value: z.string(),
});

export type ConstantConfigDto = z.infer<typeof constantConfigSchema>;

export const mathConfigSchema = z.object({
  operation: z.enum(['add', 'subtract', 'multiply', 'divide', 'round', 'ceil', 'floor']),
  operand: z.number(),
});

export type MathConfigDto = z.infer<typeof mathConfigSchema>;

export const templateConfigSchema = z.object({
  template: z.string(),
});

export type TemplateConfigDto = z.infer<typeof templateConfigSchema>;

export const bundleConfigSchema = z.object({
  includePorts: z.array(z.string()).optional(),
});

export type BundleConfigDto = z.infer<typeof bundleConfigSchema>;

export const gateConfigSchema = z.object({
  mode: z.enum(['block', 'pass']),
  failMessage: z.string().optional(),
});

export type GateConfigDto = z.infer<typeof gateConfigSchema>;

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

export const routerConfigSchema = z.object({
  mode: z.enum(['valid', 'value']),
  matchMode: z.enum(['truthy', 'falsy', 'equals', 'contains']),
  compareTo: z.string(),
});

export type RouterConfigDto = z.infer<typeof routerConfigSchema>;

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

export const iteratorConfigSchema = z.object({
  autoContinue: z.boolean().optional(),
  maxSteps: z.number().optional(),
});

export type IteratorConfigDto = z.infer<typeof iteratorConfigSchema>;

export const httpConfigSchema = z.object({
  url: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  headers: z.string(),
  bodyTemplate: z.string(),
  responseMode: z.enum(['json', 'text', 'status']),
  responsePath: z.string(),
});

export type HttpConfigDto = z.infer<typeof httpConfigSchema>;

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

export const dbSchemaConfigSchema = z.object({
  provider: z.enum(['auto', 'mongodb', 'prisma', 'all']).optional(),
  mode: z.enum(['all', 'selected']),
  collections: z.array(z.string()),
  includeFields: z.boolean(),
  includeRelations: z.boolean(),
  formatAs: z.enum(['json', 'text']),
});

export type DbSchemaConfigDto = z.infer<typeof dbSchemaConfigSchema>;

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

export const parserConfigSchema = z.object({
  mappings: z.record(z.string(), z.string()),
  outputMode: z.enum(['individual', 'bundle']).optional(),
  presetId: z.string().optional(),
});

export type ParserConfigDto = z.infer<typeof parserConfigSchema>;

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

export const updaterSampleStateSchema = parserSampleStateSchema.extend({
  targetPath: z.string().optional(),
});

export type UpdaterSampleStateDto = z.infer<typeof updaterSampleStateSchema>;

export const promptConfigSchema = z.object({
  template: z.string(),
});

export type PromptConfigDto = z.infer<typeof promptConfigSchema>;

export const modelConfigSchema = z.object({
  modelId: z.string(),
  temperature: z.number(),
  maxTokens: z.number(),
  vision: z.boolean(),
  waitForResult: z.boolean().optional(),
});

export type ModelConfigDto = z.infer<typeof modelConfigSchema>;

export const agentConfigSchema = z.object({
  personaId: z.string().optional(),
  promptTemplate: z.string().optional(),
  waitForResult: z.boolean().optional(),
});

export type AgentConfigDto = z.infer<typeof agentConfigSchema>;

export const learnerAgentConfigSchema = z.object({
  agentId: z.string(),
  promptTemplate: z.string().optional(),
  includeSources: z.boolean().optional(),
});

export type LearnerAgentConfigDto = z.infer<typeof learnerAgentConfigSchema>;

/**
 * AI Path Node Config DTOs - Runtime & Wrapper
 */

export const nodeCacheModeSchema = z.enum(['auto', 'force', 'disabled']);
export type NodeCacheModeDto = z.infer<typeof nodeCacheModeSchema>;

export const nodeRuntimeConfigSchema = z.object({
  cache: z.object({
    mode: nodeCacheModeSchema.optional(),
    ttlMs: z.number().optional(),
  }).optional(),
  waitForInputs: z.boolean().optional(),
  timeoutMs: z.number().optional(),
  retry: z.object({
    attempts: z.number().optional(),
    backoffMs: z.number().optional(),
  }).optional(),
});

export type NodeRuntimeConfigDto = z.infer<typeof nodeRuntimeConfigSchema>;

export const nodeConfigSchema = z.object({
  trigger: triggerConfigSchema.optional(),
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

/**
 * AI Path Node Contract
 */
export const aiNodeSchema = dtoBaseSchema.extend({
  type: aiNodeTypeSchema,
  title: z.string(),
  description: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.string(), z.unknown()),
  config: nodeConfigSchema.optional(),
  inputs: z.array(z.string()),
  outputs: z.array(z.string()),
});

export type AiNodeDto = z.infer<typeof aiNodeSchema>;

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
  runtimeState: z.any().nullable().optional(), // Avoid circular dependency with ai-paths-runtime
  _count: z.object({
    browserSnapshots: z.number().optional(),
    browserLogs: z.number().optional(),
  }).optional(),
});

export type AiPathRunRecordDto = z.infer<typeof aiPathRunRecordSchema>;

export const aiPathRunDetailSchema = z.object({
  run: aiPathRunRecordSchema,
  nodes: z.array(z.any()), // aiPathRunNodeSchema - can't use it yet because it is defined below
  events: z.array(z.any()), // aiPathRunEventSchema - defined below
});

export type AiPathRunDetailDto = z.infer<typeof aiPathRunDetailSchema>;

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
export type AiPathRunCreateInput = CreateAiPathRunDto;
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
  'failed',
  'canceled',
  'skipped',
  'blocked',
  'pending',
]);

export type AiPathNodeStatusDto = z.infer<typeof aiPathNodeStatusSchema>;

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

/**
 * AI Path Run Event Contract
 */
export const aiPathRunEventLevelSchema = z.enum(['debug', 'info', 'warn', 'error', 'fatal']);
export type AiPathRunEventLevelDto = z.infer<typeof aiPathRunEventLevelSchema>;

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

export type EdgeDto = z.infer<typeof edgeSchema>;

export const nodeDefinitionSchema = z.object({
  type: aiNodeTypeSchema,
  title: z.string(),
  description: z.string(),
  inputs: z.array(z.string()),
  outputs: z.array(z.string()),
  config: nodeConfigSchema.optional(),
});

export type NodeDefinitionDto = z.infer<typeof nodeDefinitionSchema>;

export const runtimeHistoryLinkSchema = z.object({
  nodeId: z.string(),
  nodeType: z.string().nullable(),
  nodeTitle: z.string().nullable(),
  fromPort: z.string().nullable(),
  toPort: z.string().nullable(),
});

export type RuntimeHistoryLinkDto = z.infer<typeof runtimeHistoryLinkSchema>;

export const runtimeHistoryEntrySchema = z.object({
  timestamp: z.string(),
  runId: z.string().nullable().optional(),
  runStartedAt: z.string().nullable().optional(),
  pathId: z.string().nullable(),
  pathName: z.string().nullable(),
  nodeId: z.string(),
  nodeType: z.string(),
  nodeTitle: z.string().nullable(),
  status: z.string(),
  iteration: z.number(),
  inputs: z.record(z.string(), z.unknown()),
  outputs: z.record(z.string(), z.unknown()),
  inputHash: z.string().nullable(),
  skipReason: z.string().optional(),
  error: z.string().optional(),
  inputsFrom: z.array(runtimeHistoryLinkSchema),
  outputsTo: z.array(runtimeHistoryLinkSchema),
  delayMs: z.number().nullable(),
  durationMs: z.number().nullable(),
});

export type RuntimeHistoryEntryDto = z.infer<typeof runtimeHistoryEntrySchema>;

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
  generatedAt: z.string(),
});

export type AiPathRuntimeAnalyticsSummaryDto = z.infer<typeof aiPathRuntimeAnalyticsSummarySchema>;

export const pathMetaSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PathMetaDto = z.infer<typeof pathMetaSchema>;

export const pathUiStateSchema = z.object({
  selectedNodeId: z.string().nullable().optional(),
  configOpen: z.boolean().optional(),
});

export type PathUiStateDto = z.infer<typeof pathUiStateSchema>;

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
  uiState: pathUiStateSchema.optional(),
});

export type PathConfigDto = z.infer<typeof pathConfigSchema>;

export const pathDebugEntrySchema = z.object({
  nodeId: z.string(),
  title: z.string().optional(),
  debug: z.unknown(),
});

export type PathDebugEntryDto = z.infer<typeof pathDebugEntrySchema>;

export const pathDebugSnapshotSchema = z.object({
  pathId: z.string(),
  runAt: z.string(),
  entries: z.array(pathDebugEntrySchema),
});

export type PathDebugSnapshotDto = z.infer<typeof pathDebugSnapshotSchema>;

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

export const dbQueryPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  queryTemplate: z.string(),
  updateTemplate: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type DbQueryPresetDto = z.infer<typeof dbQueryPresetSchema>;

export const dbNodePresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  config: databaseConfigSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type DbNodePresetDto = z.infer<typeof dbNodePresetSchema>;

export const jsonPathEntrySchema = z.object({
  path: z.string(),
  type: z.enum(['object', 'array', 'value']),
});

export type JsonPathEntryDto = z.infer<typeof jsonPathEntrySchema>;

export const connectionValidationSchema = z.object({
  valid: z.boolean(),
  message: z.string().optional(),
});

export type ConnectionValidationDto = z.infer<typeof connectionValidationSchema>;

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

export const aiPathRunListOptionsSchema = z.object({
  userId: z.string().nullable().optional(),
  pathId: z.string().optional(),
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
});

export type AiPathRunListOptionsDto = z.infer<typeof aiPathRunListOptionsSchema>;

export const aiPathRunListResultSchema = z.object({
  runs: z.array(aiPathRunSchema),
  total: z.number(),
});

export type AiPathRunListResultDto = z.infer<typeof aiPathRunListResultSchema>;

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
