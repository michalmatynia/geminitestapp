
import type { 
  AiPathDto, 
  AiNodeDto, 
  AiEdgeDto, 
  AiPathRunDto, 
  AiPathRunNodeDto,
  AiNodeTypeDto,
  AiPathRunStatusDto,
  AiPathNodeStatusDto
} from '../../dtos/ai-paths';

export type { 
  AiPathDto, 
  AiNodeDto, 
  AiEdgeDto, 
  AiPathRunDto, 
  AiPathRunNodeDto,
  AiNodeTypeDto,
  AiPathRunStatusDto,
  AiPathNodeStatusDto
};

export type NodeType = AiNodeTypeDto;

export type AiPathRunStatus = AiPathRunStatusDto;

export type AiPathNodeStatus = AiPathNodeStatusDto;

export type AiPathRunRecord = AiPathRunDto & {
  recordingPath?: string | null | undefined;
  planState?: Record<string, unknown> | null | undefined;
  activeStepId?: string | null | undefined;
  checkpointedAt?: Date | string | null | undefined;
  graph?: { nodes: AiNode[]; edges: Edge[] } | null | undefined;
  runtimeState?: RuntimeState | null | undefined;
  _count?: { browserSnapshots?: number; browserLogs?: number } | null | undefined;
};

export type AiPathRunNodeRecord = AiPathRunNodeDto;

export interface AiPathRunDetail {
  run: AiPathRunRecord;
  nodes: AiPathRunNodeRecord[];
  events: AiPathRuntimeEvent[];
}

export type ParserConfig = {
  mappings: Record<string, string>;
  outputMode?: 'individual' | 'bundle';
  presetId?: string;
};

export type ParserSampleState = {
  entityType: string;
  entityId: string;
  simulationId?: string;
  json: string;
  mappingMode: 'top' | 'flatten';
  depth: number;
  keyStyle: 'path' | 'leaf';
  includeContainers: boolean;
};

export type PromptConfig = {
  template: string;
};

export type ModelConfig = {
  modelId: string;
  temperature: number;
  maxTokens: number;
  vision: boolean;
  waitForResult?: boolean;
};

export type AgentConfig = {
  personaId?: string;
  promptTemplate?: string;
  waitForResult?: boolean;
};

export type LearnerAgentConfig = {
  agentId: string;
  promptTemplate?: string;
  includeSources?: boolean;
};

export type UpdaterMapping = {
  targetPath: string;
  sourcePort: string;
  sourcePath?: string;
};

export type DatabaseOperation = 'query' | 'update' | 'insert' | 'delete';
export type DatabaseActionCategory =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'aggregate';
export type DatabaseAction =
  | 'insertOne'
  | 'insertMany'
  | 'find'
  | 'findOne'
  | 'countDocuments'
  | 'distinct'
  | 'aggregate'
  | 'updateOne'
  | 'updateMany'
  | 'replaceOne'
  | 'findOneAndUpdate'
  | 'deleteOne'
  | 'deleteMany'
  | 'findOneAndDelete';

export type DbSchemaSnapshot = {
  provider: 'mongodb' | 'prisma' | 'multi';
  collections: Array<{
    name: string;
    fields: Array<{ name: string; type: string }>;
    relations?: string[];
    provider?: 'mongodb' | 'prisma';
  }>;
  sources?: Partial<Record<'mongodb' | 'prisma', { provider: 'mongodb' | 'prisma'; collections: Array<{ name: string; fields: Array<{ name: string; type: string }>; relations?: string[] }> }>>;
  syncedAt?: string;
};

export type DatabaseConfig = {
  operation: DatabaseOperation;
  entityType?: string | undefined;
  idField?: string | undefined;
  mode?: 'replace' | 'append' | undefined;
  updateStrategy?: 'one' | 'many' | undefined;
  useMongoActions?: boolean | undefined;
  actionCategory?: DatabaseActionCategory | undefined;
  action?: DatabaseAction | undefined;
  distinctField?: string | undefined;
  updateTemplate?: string | undefined;
  mappings?: UpdaterMapping[] | undefined;
  query?: DbQueryConfig | undefined;
  writeSource?: string | undefined;
  writeSourcePath?: string | undefined;
  dryRun?: boolean | undefined;
  presetId?: string | undefined;
  skipEmpty?: boolean | undefined;
  trimStrings?: boolean | undefined;
  aiPrompt?: string | undefined;
  validationRuleIds?: string[] | undefined;
  schemaSnapshot?: DbSchemaSnapshot | undefined;
};

export type UpdaterSampleState = {
  entityType: string;
  entityId: string;
  json: string;
  depth: number;
  includeContainers: boolean;
};

export type TriggerConfig = {
  event: string;
};

export type SimulationConfig = {
  productId: string;
  entityType?: string | undefined;
  entityId?: string | undefined;
};

export type ViewerConfig = {
  outputs: Record<string, string>;
  showImagesAsJson?: boolean | undefined;
};

export type ContextConfig = {
  role: string;
  entityType?: string | undefined;
  entityIdSource?: 'simulation' | 'manual' | 'context' | undefined;
  entityId?: string;
  scopeMode?: 'full' | 'include' | 'exclude';
  scopeTarget?: 'entity' | 'context';
  includePaths?: string[];
  excludePaths?: string[];
};

export type AudioWaveform = 'sine' | 'square' | 'sawtooth' | 'triangle';

export type AudioOscillatorConfig = {
  waveform: AudioWaveform;
  frequencyHz: number;
  gain: number;
  durationMs: number;
};

export type AudioSpeakerConfig = {
  enabled: boolean;
  autoPlay: boolean;
  gain: number;
  stopPrevious: boolean;
};

export type DescriptionConfig = {
  visionOutputEnabled?: boolean;
  generationOutputEnabled?: boolean;
};

export type MapperConfig = {
  outputs: string[];
  mappings: Record<string, string>;
};

export type MutatorConfig = {
  path: string;
  valueTemplate: string;
  targetType?: 'string' | 'number' | 'boolean' | 'json';
};

export type StringMutatorOperation =
  | {
      id?: string;
      type: 'trim';
      mode?: 'both' | 'start' | 'end';
    }
  | {
      id?: string;
      type: 'replace';
      search: string;
      replace: string;
      matchMode?: 'first' | 'all';
      useRegex?: boolean;
      flags?: string;
    }
  | {
      id?: string;
      type: 'remove';
      search: string;
      matchMode?: 'first' | 'all';
      useRegex?: boolean;
      flags?: string;
    }
  | {
      id?: string;
      type: 'case';
      mode: 'upper' | 'lower' | 'title';
    }
  | {
      id?: string;
      type: 'append';
      value: string;
      position?: 'prefix' | 'suffix';
    }
  | {
      id?: string;
      type: 'slice';
      start?: number;
      end?: number;
    };

export type StringMutatorConfig = {
  operations: StringMutatorOperation[];
};

export type ValidatorConfig = {
  requiredPaths: string[];
  mode: 'all' | 'any';
};

export type ConstantConfig = {
  valueType: 'string' | 'number' | 'boolean' | 'json';
  value: string;
};

export type MathConfig = {
  operation: 'add' | 'subtract' | 'multiply' | 'divide' | 'round' | 'ceil' | 'floor';
  operand: number;
};

export type TemplateConfig = {
  template: string;
};

export type RegexMatchMode = 'first' | 'first_overall' | 'all';
export type RegexGroupOutputMode = 'object' | 'array';
export type RegexMode = 'group' | 'extract' | 'extract_json';

export type RegexTemplate = {
  id: string;
  name: string;
  pattern: string;
  flags?: string | undefined;
  mode?: RegexMode | undefined;
  matchMode?: RegexMatchMode | undefined;
  groupBy?: string | undefined;
  outputMode?: RegexGroupOutputMode | undefined;
  includeUnmatched?: boolean | undefined;
  unmatchedKey?: string | undefined;
  splitLines?: boolean | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
};

export type RegexConfig = {
  pattern: string;
  flags?: string | undefined;
  mode?: RegexMode | undefined;
  matchMode?: RegexMatchMode | undefined;
  groupBy?: string | undefined;
  outputMode?: RegexGroupOutputMode | undefined;
  includeUnmatched?: boolean | undefined;
  unmatchedKey?: string | undefined;
  splitLines?: boolean | undefined;
  sampleText?: string | undefined;
  aiPrompt?: string | undefined;
  aiAutoRun?: boolean | undefined;
  activeVariant?: ('manual' | 'ai') | undefined;
  manual?: { pattern: string; flags?: string | undefined; groupBy?: string | undefined } | undefined;
  aiProposal?: { pattern: string; flags?: string | undefined; groupBy?: string | undefined } | undefined;
  aiProposals?: Array<{ pattern: string; flags?: string | undefined; groupBy?: string | undefined; createdAt: string }> | undefined;
  templates?: RegexTemplate[] | undefined;
};

export type IteratorConfig = {
  autoContinue?: boolean;
  maxSteps?: number;
};

export type BundleConfig = {
  includePorts?: string[];
};

export type GateConfig = {
  mode: 'block' | 'pass';
  failMessage?: string;
};

export type CompareConfig = {
  operator:
    | 'eq'
    | 'neq'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'contains'
    | 'startsWith'
    | 'endsWith'
    | 'isEmpty'
    | 'notEmpty';
  compareTo: string;
  caseSensitive?: boolean;
  message?: string;
};

export type RouterConfig = {
  mode: 'valid' | 'value';
  matchMode: 'truthy' | 'falsy' | 'equals' | 'contains';
  compareTo: string;
};

export type DelayConfig = {
  ms: number;
};

export type HttpConfig = {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers: string;
  bodyTemplate: string;
  responseMode: 'json' | 'text' | 'status';
  responsePath: string;
};

export type DbQueryConfig = {
  provider: 'auto' | 'mongodb' | 'prisma';
  collection: string;
  mode: 'preset' | 'custom';
  preset: 'by_id' | 'by_productId' | 'by_entityId' | 'by_field';
  field: string;
  idType: 'string' | 'objectId';
  queryTemplate: string;
  limit: number;
  sort: string;
  sortPresetId?: string;
  projection: string;
  projectionPresetId?: string;
  single: boolean;
};

export type PollConfig = {
  intervalMs: number;
  maxAttempts: number;
  mode?: 'job' | 'database';
  dbQuery?: DbQueryConfig;
  successPath?: string;
  successOperator?: 'truthy' | 'equals' | 'contains' | 'notEquals';
  successValue?: string;
  resultPath?: string;
};

export type DbSchemaConfig = {
  provider?: 'auto' | 'mongodb' | 'prisma' | 'all';
  mode: 'all' | 'selected';
  collections: string[];
  includeFields: boolean;
  includeRelations: boolean;
  formatAs: 'json' | 'text';
};

export type NodeCacheMode = 'auto' | 'force' | 'disabled';

export type NodeRuntimeConfig = {
  cache?: {
    mode?: NodeCacheMode;
    ttlMs?: number;
  };
  waitForInputs?: boolean;
  timeoutMs?: number;
  retry?: {
    attempts?: number;
    backoffMs?: number;
  };
};

export type NodeConfig = {
  trigger?: TriggerConfig;
  simulation?: SimulationConfig;
  audioOscillator?: AudioOscillatorConfig;
  audioSpeaker?: AudioSpeakerConfig;
  viewer?: ViewerConfig;
  context?: ContextConfig;
  regex?: RegexConfig;
  iterator?: IteratorConfig;
  mapper?: MapperConfig;
  mutator?: MutatorConfig;
  stringMutator?: StringMutatorConfig;
  validator?: ValidatorConfig;
  constant?: ConstantConfig;
  math?: MathConfig;
  template?: TemplateConfig;
  bundle?: BundleConfig;
  gate?: GateConfig;
  compare?: CompareConfig;
  router?: RouterConfig;
  delay?: DelayConfig;
  poll?: PollConfig;
  http?: HttpConfig;
  dbQuery?: DbQueryConfig;
  db_schema?: DbSchemaConfig;
  description?: DescriptionConfig;
  parser?: ParserConfig;
  prompt?: PromptConfig;
  model?: ModelConfig;
  agent?: AgentConfig;
  learnerAgent?: LearnerAgentConfig;
  database?: DatabaseConfig;
  runtime?: NodeRuntimeConfig;
  notes?: {
    text?: string;
    color?: string;
    showOnCanvas?: boolean;
  };
};

export type NodeDefinition = {
  type: NodeType;
  title: string;
  description: string;
  inputs: string[];
  outputs: string[];
  config?: NodeConfig | undefined;
};

export type AiNode = NodeDefinition & {
  id: string;
  position: { x: number; y: number };
  config?: NodeConfig | undefined;
};

export type Edge = {
  id: string;
  from: string;
  to: string;
  label?: string | undefined;
  fromPort?: string | undefined;
  toPort?: string | undefined;
};

export type RuntimePortValues = Record<string, unknown>;
export type RuntimeHistoryStatus = 'completed' | 'failed' | 'delayed' | 'cached' | 'skipped';

export type RuntimeHistoryLink = {
  nodeId: string;
  nodeType?: string | null | undefined;
  nodeTitle?: string | null | undefined;
  fromPort?: string | null | undefined;
  toPort?: string | null | undefined;
};

export type RuntimeHistoryEntry = {
  timestamp: string;
  runId?: string | null | undefined;
  runStartedAt?: string | null | undefined;
  pathId?: string | null | undefined;
  pathName?: string | null | undefined;
  nodeId: string;
  nodeType: string;
  nodeTitle?: string | null | undefined;
  status: RuntimeHistoryStatus;
  iteration?: number | undefined;
  inputs?: RuntimePortValues | null | undefined;
  outputs?: RuntimePortValues | null | undefined;
  inputHash?: string | null | undefined;
  skipReason?: string | null | undefined;
  error?: string | null | undefined;
  delayMs?: number | null | undefined;
  durationMs?: number | null | undefined;
  inputsFrom?: RuntimeHistoryLink[] | undefined;
  outputsTo?: RuntimeHistoryLink[] | undefined;
};

export type RuntimeState = {
  runId?: string | null | undefined;
  runStartedAt?: string | null | undefined;
  inputs: Record<string, RuntimePortValues>;
  outputs: Record<string, RuntimePortValues>;
  hashes?: Record<string, string> | undefined;
  hashTimestamps?: Record<string, number> | undefined;
  history?: Record<string, RuntimeHistoryEntry[]> | undefined;
};

export type AiPathRunEventLevel = 'info' | 'warning' | 'error';

export type AiPathRunEventRecord = {
  id: string;
  runId: string;
  level: AiPathRunEventLevel;
  message: string;
  metadata?: Record<string, unknown> | null | undefined;
  createdAt: Date | string;
};

export type AiPathRuntimeEventSource = 'local' | 'server';
export type AiPathRuntimeEventLevel = 'info' | 'warning' | 'error';
export type AiPathRuntimeEventKind =
  | 'run_started'
  | 'run_paused'
  | 'run_completed'
  | 'run_canceled'
  | 'run_failed'
  | 'node_started'
  | 'node_finished'
  | 'node_failed'
  | 'node_status'
  | 'log';

export type AiPathRuntimeNodeStatus =
  | 'idle'
  | 'queued'
  | 'running'
  | 'polling'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'canceled'
  | 'cached'
  | 'blocked'
  | 'skipped'
  | 'waiting_callback'
  | 'advance_pending'
  | 'timeout'
  | 'pending'
  | (string & {});

export type AiPathRuntimeNodeStatusMap = Record<string, AiPathRuntimeNodeStatus>;

export type AiPathRuntimeEvent = {
  id: string;
  timestamp: string;
  createdAt?: string;
  source: AiPathRuntimeEventSource;
  kind: AiPathRuntimeEventKind;
  level: AiPathRuntimeEventLevel;
  message: string;
  runId?: string | null | undefined;
  runStartedAt?: string | null | undefined;
  nodeId?: string | undefined;
  nodeType?: string | null | undefined;
  nodeTitle?: string | null | undefined;
  status?: AiPathRuntimeNodeStatus | undefined;
  iteration?: number | undefined;
  metadata?: Record<string, unknown> | null | undefined;
};

export type AiPathRuntimeAnalyticsRange = '1h' | '24h' | '7d' | '30d';

export type AiPathRuntimeAnalyticsSummary = {
  from: string;
  to: string;
  range: AiPathRuntimeAnalyticsRange | 'custom';
  storage: 'redis' | 'disabled';
  runs: {
    total: number;
    queued: number;
    started: number;
    completed: number;
    failed: number;
    canceled: number;
    deadLettered: number;
    successRate: number;
    failureRate: number;
    deadLetterRate: number;
    avgDurationMs: number | null;
    p95DurationMs: number | null;
  };
  nodes: {
    started: number;
    completed: number;
    failed: number;
    queued: number;
    running: number;
    polling: number;
    cached: number;
    waitingCallback: number;
  };
  brain: {
    analyticsReports: number;
    logReports: number;
    totalReports: number;
    warningReports: number;
    errorReports: number;
  };
  generatedAt: string;
};

export type PathMeta = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type PathUiState = {
  selectedNodeId?: string | null | undefined;
  configOpen?: boolean | undefined;
};

export type PathExecutionMode = 'local' | 'server';
export type PathFlowIntensity = 'off' | 'low' | 'medium' | 'high';
export type PathRunMode = 'block' | 'queue';

export type PathConfig = {
  id: string;
  version: number;
  name: string;
  description: string;
  trigger: string;
  executionMode?: PathExecutionMode | undefined;
  flowIntensity?: PathFlowIntensity | undefined;
  runMode?: PathRunMode | undefined;
  nodes: AiNode[];
  edges: Edge[];
  updatedAt: string;
  isLocked?: boolean | undefined;
  isActive?: boolean | undefined;
  parserSamples?: Record<string, ParserSampleState> | undefined;
  updaterSamples?: Record<string, UpdaterSampleState> | undefined;
  runtimeState?: RuntimeState | string | null | undefined;
  lastRunAt?: string | null | undefined;
  uiState?: PathUiState | undefined;
};

export type PathDebugEntry = {
  nodeId: string;
  title?: string;
  debug: unknown;
};

export type PathDebugSnapshot = {
  pathId: string;
  runAt: string;
  entries: PathDebugEntry[];
};

export type ClusterPreset = {
  id: string;
  name: string;
  description: string;
  bundlePorts: string[];
  template: string;
  createdAt: string;
  updatedAt: string;
};

export type DbQueryPreset = {
  id: string;
  name: string;
  queryTemplate: string;
  updateTemplate?: string;
  createdAt: string;
  updatedAt: string;
};

export type DbNodePreset = {
  id: string;
  name: string;
  description: string;
  config: DatabaseConfig;
  createdAt: string;
  updatedAt: string;
};

export type JsonPathEntry = {
  path: string;
  type: 'object' | 'array' | 'value';
};

export type ConnectionValidation = {
  valid: boolean;
  message?: string;
};
