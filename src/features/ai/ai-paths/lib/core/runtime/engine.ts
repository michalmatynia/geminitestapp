import type {
  AiNode,
  Edge,
  NodeCacheScope,
  NodeSideEffectPolicy,
  RuntimeHistoryEntry,
  RuntimeHistoryLink,
} from '@/shared/contracts/ai-paths';
import type {
  AiPathRuntimeProfileEventDto,
  RuntimeProfileNodeStatsDto,
  RuntimeProfileSummaryDto,
  RuntimePortValues,
  RuntimeState,
} from '@/shared/contracts/ai-paths-runtime';
import type { Toast } from '@/shared/contracts/ui';

import { DEFAULT_DB_QUERY } from '../constants';
import {
  appendInputValue,
  cloneValue,
  coerceInput,
  getNodeInputPortContract,
  hashRuntimeValue,
  getPortDataTypes,
  isValueCompatibleWithTypes,
  sanitizeEdges,
} from '../utils';
import {
  DEFAULT_RETRY_BACKOFF_MS,
  isAbortError,
  nowMs,
  resolveNodeTimeoutMs,
  withRetries,
  withTimeout,
} from './execution-helpers';
import {
  NodeHandler,
  handleAiDescription,
  handleAudioOscillator,
  handleAudioSpeaker,
  handleAdvancedApi,
  handleAgent,
  handleBundle,
  handleCompare,
  handleLogicalCondition,
  handleConstant,
  handleContext,
  handleDatabase,
  handleDbSchema,
  handleDelay,
  handleDescriptionUpdater,
  handleGate,
  handleHttp,
  handleMapper,
  handleMath,
  handleModel,
  handleMutator,
  handlePlaywright,
  handleStringMutator,
  handleNotification,
  handleParser,
  handlePoll,
  handlePrompt,
  handleRegex,
  handleValidationPattern,
  handleIterator,
  handleRouter,
  handleLearnerAgent,
  handleTemplate,
  handleFetcher,
  handleTrigger,
  handleValidator,
  handleViewer,
} from './handlers';
import { buildDbQueryPayload, extractImageUrls } from './utils';

export type RuntimeProfileEvent = AiPathRuntimeProfileEventDto;

export type RuntimeProfileNodeStats = RuntimeProfileNodeStatsDto;

export type RuntimeProfileSummary = RuntimeProfileSummaryDto;

export type RuntimeProfileOptions = {
  onEvent?: (event: RuntimeProfileEvent) => void;
  onSummary?: (summary: RuntimeProfileSummary) => void;
};

export class GraphExecutionError extends Error {
  state: RuntimeState;
  nodeId?: string | null;

  constructor(message: string, state: RuntimeState, nodeId?: string | null, cause?: unknown) {
    super(message);
    this.name = 'GraphExecutionError';
    this.state = state;
    this.nodeId = nodeId ?? null;
    if (cause && typeof (this as { cause?: unknown }).cause === 'undefined') {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

export type RuntimeExecutionHaltReason = 'step_limit' | 'completed' | 'cancelled' | 'blocked';

export type RuntimeExecutionHalt = {
  reason: RuntimeExecutionHaltReason;
  stepCount: number;
  iteration: number;
};

export type RuntimeExecutionControl = {
  mode?: 'run' | 'step';
  stepLimit?: number;
  signal?: AbortSignal;
  onHalt?: (payload: RuntimeExecutionHalt) => void;
};

export class GraphExecutionCancelled extends Error {
  state: RuntimeState;
  nodeId?: string | null;

  constructor(message: string, state: RuntimeState, nodeId?: string | null, cause?: unknown) {
    super(message);
    this.name = 'GraphExecutionCancelled';
    this.state = state;
    this.nodeId = nodeId ?? null;
    if (cause && typeof (this as { cause?: unknown }).cause === 'undefined') {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

export type EvaluateGraphOptions = {
  nodes: AiNode[];
  edges: Edge[];
  activePathId: string | null;
  activePathName?: string | null | undefined;
  runId?: string | undefined;
  runStartedAt?: string | undefined;
  runMeta?: Record<string, unknown> | null | undefined;
  seedRunId?: string | undefined;
  seedRunStartedAt?: string | undefined;
  triggerNodeId?: string | undefined;
  triggerEvent?: string | undefined;
  triggerContext?: Record<string, unknown> | null | undefined;
  strictFlowMode?: boolean | undefined;
  deferPoll?: boolean | undefined;
  skipAiJobs?: boolean | undefined;
  seedOutputs?: Record<string, RuntimePortValues> | undefined;
  seedHashes?: Record<string, string> | undefined;
  seedHashTimestamps?: Record<string, number> | undefined;
  seedHistory?: Record<string, RuntimeHistoryEntry[]> | undefined;
  recordHistory?: boolean | undefined;
  historyLimit?: number | undefined;
  skipNodeIds?: Set<string> | string[] | undefined;
  onNodeStart?: (payload: {
    runId: string;
    runStartedAt: string;
    node: AiNode;
    nodeInputs: RuntimePortValues;
    prevOutputs: RuntimePortValues;
    iteration: number;
  }) => void | Promise<void>;
  onNodeFinish?: (payload: {
    runId: string;
    runStartedAt: string;
    node: AiNode;
    nodeInputs: RuntimePortValues;
    prevOutputs: RuntimePortValues;
    nextOutputs: RuntimePortValues;
    changed: boolean;
    iteration: number;
    cached?: boolean;
  }) => void | Promise<void>;
  onNodeError?: (payload: {
    runId: string;
    runStartedAt: string;
    node: AiNode;
    nodeInputs: RuntimePortValues;
    prevOutputs: RuntimePortValues;
    error: unknown;
    iteration: number;
  }) => void | Promise<void>;
  onIterationEnd?: (payload: {
    runId: string;
    runStartedAt: string;
    iteration: number;
    inputs: Record<string, RuntimePortValues>;
    outputs: Record<string, RuntimePortValues>;
    hashes?: Record<string, string> | undefined;
    hashTimestamps?: Record<string, number> | undefined;
    history?: Record<string, RuntimeHistoryEntry[]> | undefined;
  }) => void | Promise<void>;
  control?: RuntimeExecutionControl | undefined;
  profile?: RuntimeProfileOptions | undefined;
  fetchEntityByType: (
    entityType: string,
    entityId: string
  ) => Promise<Record<string, unknown> | null>;
  reportAiPathsError: (
    error: unknown,
    meta: Record<string, unknown>,
    summary?: string
  ) => void;
  toast: Toast;
};

const CACHE_VERSION = 2;

type SideEffectDecision =
  | 'executed'
  | 'skipped_duplicate'
  | 'skipped_policy'
  | 'skipped_missing_idempotency'
  | 'failed';

type SideEffectChannel =
  | 'notification'
  | 'updater'
  | 'http'
  | 'delay'
  | 'poll'
  | 'ai'
  | 'schema';

const SIDE_EFFECT_CHANNEL_BY_NODE_TYPE: Partial<Record<AiNode['type'], SideEffectChannel>> = {
  model: 'ai',
  agent: 'ai',
  learner_agent: 'ai',
  playwright: 'ai',
  ai_description: 'ai',
  description_updater: 'updater',
  database: 'updater',
  http: 'http',
  api_advanced: 'http',
  notification: 'notification',
  delay: 'delay',
  poll: 'poll',
  db_schema: 'schema',
};

const DEFAULT_NODE_CACHE_SCOPE: NodeCacheScope = 'run';
const CONTEXT_BOUND_CACHE_NODE_TYPES = new Set<AiNode['type']>([
  'trigger',
  'fetcher',
  'simulation',
  'context',
]);

const IDEMPOTENCY_NODE_TYPES = new Set<AiNode['type']>([
  'model',
  'agent',
  'learner_agent',
  'playwright',
  'http',
  'api_advanced',
  'database',
]);

const buildNodeInputHash = (
  node: AiNode,
  nodeInputs: RuntimePortValues,
  cacheScopeFingerprint?: Record<string, unknown>
): string =>
  hashRuntimeValue({
    v: CACHE_VERSION,
    id: node.id,
    type: node.type,
    title: node.title ?? null,
    config: node.config ?? null,
    inputs: nodeInputs,
    inputPorts: node.inputs ?? [],
    outputPorts: node.outputs ?? [],
    ...(cacheScopeFingerprint ? { cacheScope: cacheScopeFingerprint } : {}),
  });

const buildDatabaseInputHash = (
  node: AiNode,
  nodeInputs: RuntimePortValues,
  cacheScopeFingerprint?: Record<string, unknown>
): string => {
  const dbConfig = node.config?.database ?? { operation: 'query' };
  const operation = dbConfig.operation ?? 'query';
  const queryConfig = {
    ...DEFAULT_DB_QUERY,
    ...(dbConfig.query ?? {}),
  };
  const mappings = Array.isArray(dbConfig.mappings)
    ? dbConfig.mappings.map((mapping) => ({
      sourcePort: mapping?.sourcePort ?? null,
      sourcePath: mapping?.sourcePath ?? null,
      targetPath: mapping?.targetPath ?? null,
    }))
    : [];
  const baseConfig = {
    operation,
    entityType: dbConfig.entityType ?? 'product',
    idField: dbConfig.idField ?? 'entityId',
    mode: dbConfig.mode ?? 'replace',
    updateStrategy: dbConfig.updateStrategy ?? 'one',
    useMongoActions: dbConfig.useMongoActions ?? false,
    actionCategory: dbConfig.actionCategory ?? null,
    action: dbConfig.action ?? null,
    distinctField: dbConfig.distinctField ?? '',
    updateTemplate: dbConfig.updateTemplate ?? '',
    writeSource: dbConfig.writeSource ?? 'bundle',
    writeSourcePath: dbConfig.writeSourcePath ?? '',
    dryRun: dbConfig.dryRun ?? false,
    query: {
      provider: queryConfig.provider,
      collection: queryConfig.collection,
      mode: queryConfig.mode,
      preset: queryConfig.preset,
      field: queryConfig.field,
      idType: queryConfig.idType,
      queryTemplate: queryConfig.queryTemplate,
      limit: queryConfig.limit,
      sort: queryConfig.sort,
      projection: queryConfig.projection,
      single: queryConfig.single,
    },
    ...(mappings.length ? { mappings } : {}),
  };
  const inputs: Record<string, unknown> = {};
  const includeInput = (key: string): void => {
    if (nodeInputs[key] === undefined) return;
    inputs[key] = coerceInput(nodeInputs[key]);
  };
  if (operation === 'query') {
    const payload = buildDbQueryPayload(nodeInputs, queryConfig);
    return hashRuntimeValue({
      v: CACHE_VERSION,
      id: node.id,
      type: node.type,
      config: baseConfig,
      query: payload,
      ...(cacheScopeFingerprint ? { cacheScope: cacheScopeFingerprint } : {}),
    });
  }
  if (operation === 'update') {
    const sourcePorts = mappings.length
      ? mappings
        .map((mapping) => mapping.sourcePort)
        .filter((port): port is string => typeof port === 'string' && port.trim().length > 0)
      : [];
    sourcePorts.forEach(includeInput);
    includeInput('entityId');
    includeInput('productId');
    includeInput('entityType');
    includeInput('value');
    includeInput('query');
    includeInput('queryCallback');
    includeInput('aiQuery');
    includeInput('jobId');
    if ((dbConfig.updateStrategy ?? 'one') === 'many') {
      const payload = buildDbQueryPayload(nodeInputs, queryConfig);
      inputs['queryPayload'] = payload;
    }
    return hashRuntimeValue({
      v: CACHE_VERSION,
      id: node.id,
      type: node.type,
      config: baseConfig,
      inputs,
      ...(cacheScopeFingerprint ? { cacheScope: cacheScopeFingerprint } : {}),
    });
  }
  if (operation === 'insert') {
    const writeSource = dbConfig.writeSource ?? 'bundle';
    includeInput(writeSource);
    includeInput('queryCallback');
    includeInput('entityType');
    return hashRuntimeValue({
      v: CACHE_VERSION,
      id: node.id,
      type: node.type,
      config: baseConfig,
      inputs,
      ...(cacheScopeFingerprint ? { cacheScope: cacheScopeFingerprint } : {}),
    });
  }
  if (operation === 'delete') {
    includeInput('entityId');
    includeInput('productId');
    includeInput('entityType');
    includeInput('value');
    includeInput('query');
    includeInput('queryCallback');
    includeInput('aiQuery');
    return hashRuntimeValue({
      v: CACHE_VERSION,
      id: node.id,
      type: node.type,
      config: baseConfig,
      inputs,
      ...(cacheScopeFingerprint ? { cacheScope: cacheScopeFingerprint } : {}),
    });
  }
  return hashRuntimeValue({
    v: CACHE_VERSION,
    id: node.id,
    type: node.type,
    config: baseConfig,
    inputs,
    ...(cacheScopeFingerprint ? { cacheScope: cacheScopeFingerprint } : {}),
  });
};

const isDatabaseWriteNode = (node: AiNode): boolean => {
  if (node.type !== 'database') return false;
  const dbConfig = node.config?.database ?? { operation: 'query' };
  const operation = dbConfig.operation ?? 'query';
  if (operation === 'insert' || operation === 'update' || operation === 'delete') {
    return true;
  }
  const actionCategory = dbConfig.actionCategory ?? null;
  if (
    dbConfig.useMongoActions &&
    (actionCategory === 'create' || actionCategory === 'update' || actionCategory === 'delete')
  ) {
    return true;
  }
  const action = (dbConfig.action ?? '').toLowerCase();
  return (
    action.startsWith('insert') ||
    action.startsWith('update') ||
    action.startsWith('delete') ||
    action.startsWith('replace')
  );
};

const resolveSideEffectChannel = (node: AiNode): SideEffectChannel | null => {
  return SIDE_EFFECT_CHANNEL_BY_NODE_TYPE[node.type] ?? null;
};

const resolveNodeSideEffectPolicy = (
  node: AiNode,
  channel: SideEffectChannel | null
): NodeSideEffectPolicy | null => {
  if (!channel) return null;
  return node.config?.runtime?.sideEffectPolicy ?? 'per_run';
};

const resolveNodeCacheScope = (node: AiNode): NodeCacheScope => {
  const scope = node.config?.runtime?.cache?.scope;
  if (scope === 'run' || scope === 'activation' || scope === 'session') {
    return scope;
  }
  return DEFAULT_NODE_CACHE_SCOPE;
};

type TriggerContextMode = 'simulation_required' | 'simulation_preferred' | 'trigger_only';
type SimulationRunBehavior = 'before_connected_trigger' | 'manual_only';
type FetcherSourceMode = 'live_context' | 'simulation_id' | 'live_then_simulation';

const DEFAULT_TRIGGER_CONTEXT_MODE: TriggerContextMode = 'trigger_only';
const DEFAULT_SIMULATION_RUN_BEHAVIOR: SimulationRunBehavior =
  'before_connected_trigger';
const DEFAULT_FETCHER_SOURCE_MODE: FetcherSourceMode = 'live_context';

const resolveTriggerContextMode = (node: AiNode | null): TriggerContextMode => {
  const mode = node?.config?.trigger?.contextMode;
  if (
    mode === 'simulation_required' ||
    mode === 'simulation_preferred' ||
    mode === 'trigger_only'
  ) {
    return mode;
  }
  return DEFAULT_TRIGGER_CONTEXT_MODE;
};

const resolveSimulationRunBehavior = (node: AiNode): SimulationRunBehavior => {
  const behavior = node.config?.simulation?.runBehavior;
  if (behavior === 'before_connected_trigger' || behavior === 'manual_only') {
    return behavior;
  }
  return DEFAULT_SIMULATION_RUN_BEHAVIOR;
};

const resolveFetcherSourceMode = (node: AiNode): FetcherSourceMode => {
  const mode = node.config?.fetcher?.sourceMode;
  if (
    mode === 'live_context' ||
    mode === 'simulation_id' ||
    mode === 'live_then_simulation'
  ) {
    return mode;
  }
  return DEFAULT_FETCHER_SOURCE_MODE;
};

const isSimulationCapableFetcher = (node: AiNode): boolean => {
  const mode = resolveFetcherSourceMode(node);
  return mode === 'simulation_id' || mode === 'live_then_simulation';
};

const readEntityIdFromContext = (
  context: Record<string, unknown> | null | undefined
): string | null => {
  if (!context) return null;
  const entityId = context['entityId'];
  if (typeof entityId === 'string' && entityId.trim().length > 0) return entityId;
  const productId = context['productId'];
  if (typeof productId === 'string' && productId.trim().length > 0) return productId;
  return null;
};

const readEntityTypeFromContext = (
  context: Record<string, unknown> | null | undefined
): string | null => {
  if (!context) return null;
  const entityType = context['entityType'];
  if (typeof entityType !== 'string') return null;
  const normalized = entityType.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'products') return 'product';
  if (normalized === 'notes') return 'note';
  return normalized;
};

const readEntityIdFromPorts = (
  output: RuntimePortValues | null | undefined
): string | null => {
  if (!output) return null;
  const directEntityId = output['entityId'];
  if (typeof directEntityId === 'string' && directEntityId.trim().length > 0) {
    return directEntityId;
  }
  const directProductId = output['productId'];
  if (typeof directProductId === 'string' && directProductId.trim().length > 0) {
    return directProductId;
  }
  const context = output['context'];
  if (!context || typeof context !== 'object') return null;
  return readEntityIdFromContext(context as Record<string, unknown>);
};

const readEntityTypeFromPorts = (
  output: RuntimePortValues | null | undefined
): string | null => {
  if (!output) return null;
  const directEntityType = output['entityType'];
  if (typeof directEntityType === 'string' && directEntityType.trim().length > 0) {
    const normalized = directEntityType.trim().toLowerCase();
    if (!normalized) return null;
    if (normalized === 'products') return 'product';
    if (normalized === 'notes') return 'note';
    return normalized;
  }
  const context = output['context'];
  if (!context || typeof context !== 'object') return null;
  return readEntityTypeFromContext(context as Record<string, unknown>);
};

const readEntityIdFromNodeInputs = (
  nodeInputs: RuntimePortValues
): string | null => {
  const directEntityId = nodeInputs['entityId'];
  if (typeof directEntityId === 'string' && directEntityId.trim().length > 0) {
    return directEntityId.trim();
  }
  if (typeof directEntityId === 'number' && Number.isFinite(directEntityId)) {
    return String(directEntityId);
  }
  const directProductId = nodeInputs['productId'];
  if (typeof directProductId === 'string' && directProductId.trim().length > 0) {
    return directProductId.trim();
  }
  if (typeof directProductId === 'number' && Number.isFinite(directProductId)) {
    return String(directProductId);
  }
  const context = nodeInputs['context'];
  if (context && typeof context === 'object' && !Array.isArray(context)) {
    const contextEntityId = readEntityIdFromContext(context as Record<string, unknown>);
    if (contextEntityId) return contextEntityId;
  }
  const bundle = nodeInputs['bundle'];
  if (bundle && typeof bundle === 'object' && !Array.isArray(bundle)) {
    const bundleEntityId = readEntityIdFromContext(bundle as Record<string, unknown>);
    if (bundleEntityId) return bundleEntityId;
  }
  return null;
};

const readEntityTypeFromNodeInputs = (
  nodeInputs: RuntimePortValues
): string | null => {
  const directEntityType = nodeInputs['entityType'];
  if (typeof directEntityType === 'string' && directEntityType.trim().length > 0) {
    const normalized = directEntityType.trim().toLowerCase();
    if (normalized === 'products') return 'product';
    if (normalized === 'notes') return 'note';
    return normalized;
  }
  const context = nodeInputs['context'];
  if (context && typeof context === 'object' && !Array.isArray(context)) {
    const contextEntityType = readEntityTypeFromContext(
      context as Record<string, unknown>
    );
    if (contextEntityType) return contextEntityType;
  }
  const bundle = nodeInputs['bundle'];
  if (bundle && typeof bundle === 'object' && !Array.isArray(bundle)) {
    const bundleEntityType = readEntityTypeFromContext(
      bundle as Record<string, unknown>
    );
    if (bundleEntityType) return bundleEntityType;
  }
  return null;
};

const resolveNodeActivationContext = (args: {
  node: AiNode;
  nodeInputs: RuntimePortValues;
  triggerContext: Record<string, unknown> | null;
  triggerEvent?: string | null;
  simulationEntityId?: string | null;
  simulationEntityType?: string | null;
}): {
  entityId: string | null;
  entityType: string | null;
  triggerEvent: string | null;
  fetcherSourceMode: FetcherSourceMode | null;
} => {
  const inputEntityId = readEntityIdFromNodeInputs(args.nodeInputs);
  const inputEntityType = readEntityTypeFromNodeInputs(args.nodeInputs);
  const triggerContextEntityId = readEntityIdFromContext(args.triggerContext);
  const triggerContextEntityType = readEntityTypeFromContext(args.triggerContext);
  const normalizedSimulationEntityType =
    typeof args.simulationEntityType === 'string' &&
    args.simulationEntityType.trim().length > 0
      ? args.simulationEntityType.trim().toLowerCase()
      : null;
  const entityId =
    inputEntityId ?? triggerContextEntityId ?? args.simulationEntityId ?? null;
  const entityType =
    inputEntityType ??
    triggerContextEntityType ??
    normalizedSimulationEntityType;
  const triggerEvent =
    typeof args.triggerEvent === 'string' && args.triggerEvent.trim().length > 0
      ? args.triggerEvent.trim()
      : null;
  return {
    entityId,
    entityType,
    triggerEvent,
    fetcherSourceMode:
      args.node.type === 'fetcher' ? resolveFetcherSourceMode(args.node) : null,
  };
};

const buildNodeCacheScopeFingerprint = (args: {
  node: AiNode;
  nodeInputs: RuntimePortValues;
  scope: NodeCacheScope;
  runId: string;
  activePathId: string | null;
  triggerContext: Record<string, unknown> | null;
  triggerEvent?: string | null;
  simulationEntityId?: string | null;
  simulationEntityType?: string | null;
}): Record<string, unknown> => {
  const activation = resolveNodeActivationContext({
    node: args.node,
    nodeInputs: args.nodeInputs,
    triggerContext: args.triggerContext,
    triggerEvent: args.triggerEvent,
    simulationEntityId: args.simulationEntityId,
    simulationEntityType: args.simulationEntityType,
  });
  if (args.scope === 'session') {
    return {
      scope: 'session',
    };
  }
  if (args.scope === 'activation') {
    return {
      scope: 'activation',
      pathId: args.activePathId,
      triggerEvent: activation.triggerEvent,
      entityId: activation.entityId,
      entityType: activation.entityType,
      ...(activation.fetcherSourceMode
        ? { fetcherSourceMode: activation.fetcherSourceMode }
        : {}),
    };
  }
  return {
    scope: 'run',
    runId: args.runId,
    triggerEvent: activation.triggerEvent,
    entityId: activation.entityId,
    entityType: activation.entityType,
    ...(activation.fetcherSourceMode
      ? { fetcherSourceMode: activation.fetcherSourceMode }
      : {}),
  };
};

const hasContextBoundCacheMismatch = (args: {
  node: AiNode;
  nodeInputs: RuntimePortValues;
  prevOutputs: RuntimePortValues | undefined;
  triggerContext: Record<string, unknown> | null;
  triggerEvent?: string | null;
  simulationEntityId?: string | null;
  simulationEntityType?: string | null;
}): boolean => {
  if (!CONTEXT_BOUND_CACHE_NODE_TYPES.has(args.node.type)) {
    return false;
  }
  const expected = resolveNodeActivationContext({
    node: args.node,
    nodeInputs: args.nodeInputs,
    triggerContext: args.triggerContext,
    triggerEvent: args.triggerEvent,
    simulationEntityId: args.simulationEntityId,
    simulationEntityType: args.simulationEntityType,
  });
  const cachedEntityId = readEntityIdFromPorts(args.prevOutputs);
  const cachedEntityType = readEntityTypeFromPorts(args.prevOutputs);
  if (expected.entityId) {
    if (!cachedEntityId) return true;
    if (cachedEntityId !== expected.entityId) return true;
  }
  if (
    expected.entityType &&
    cachedEntityType &&
    cachedEntityType !== expected.entityType
  ) {
    return true;
  }
  return false;
};

const hasSimulationContextProvenance = (
  context: Record<string, unknown> | null | undefined
): boolean => {
  if (!context) return false;
  const contextSource = context['contextSource'];
  if (typeof contextSource === 'string' && contextSource.trim().toLowerCase().startsWith('simulation')) {
    return true;
  }
  const source = context['source'];
  if (typeof source === 'string' && source.trim().toLowerCase() === 'simulation') {
    return true;
  }
  const simulationNodeId = context['simulationNodeId'];
  return typeof simulationNodeId === 'string' && simulationNodeId.trim().length > 0;
};

const NON_REUSABLE_CACHE_STATUSES = new Set<string>([
  'running',
  'queued',
  'polling',
  'waiting_callback',
  'advance_pending',
  'pending',
]);

const TERMINAL_STATUS_ONLY_CACHE_STATUSES = new Set<string>([
  'blocked',
  'skipped',
  'failed',
  'timeout',
  'canceled',
  'cancelled',
]);

const hasReusableNodeOutputsForCache = (
  node: AiNode,
  nodeOutputs: RuntimePortValues | undefined
): boolean => {
  if (!nodeOutputs || typeof nodeOutputs !== 'object' || Array.isArray(nodeOutputs)) {
    return false;
  }
  const rawStatus = nodeOutputs['status'];
  const normalizedStatus =
    typeof rawStatus === 'string' ? rawStatus.trim().toLowerCase() : '';
  if (normalizedStatus && NON_REUSABLE_CACHE_STATUSES.has(normalizedStatus)) {
    return false;
  }
  const declaredOutputPorts = Array.isArray(node.outputs)
    ? node.outputs.filter((port: string): boolean => typeof port === 'string' && port.trim().length > 0)
    : [];
  if (declaredOutputPorts.length === 0) {
    return true;
  }
  const hasDeclaredOutputValue = declaredOutputPorts.some(
    (port: string): boolean => (nodeOutputs)[port] !== undefined
  );
  if (hasDeclaredOutputValue) {
    return true;
  }
  return Boolean(
    normalizedStatus && TERMINAL_STATUS_ONLY_CACHE_STATUSES.has(normalizedStatus)
  );
};

const HANDLERS: Record<string, NodeHandler> = {
  trigger: handleTrigger,
  fetcher: handleFetcher,
  notification: handleNotification,
  context: handleContext,
  audio_oscillator: handleAudioOscillator,
  audio_speaker: handleAudioSpeaker,
  parser: handleParser,
  regex: handleRegex,
  iterator: handleIterator,
  mapper: handleMapper,
  mutator: handleMutator,
  string_mutator: handleStringMutator,
  validator: handleValidator,
  validation_pattern: handleValidationPattern,
  constant: handleConstant,
  math: handleMath,
  compare: handleCompare,
  logical_condition: handleLogicalCondition,
  router: handleRouter,
  delay: handleDelay,
  poll: handlePoll,
  http: handleHttp,
  api_advanced: handleAdvancedApi,
  playwright: handlePlaywright,
  database: handleDatabase,
  db_schema: handleDbSchema,
  gate: handleGate,
  bundle: handleBundle,
  template: handleTemplate,
  prompt: handlePrompt,
  model: handleModel,
  agent: handleAgent,
  learner_agent: handleLearnerAgent,
  ai_description: handleAiDescription,
  description_updater: handleDescriptionUpdater,
  viewer: handleViewer,
  // simulation handled separately or via no-op if loop reaches it
};

export async function evaluateGraph({
  nodes,
  edges,
  activePathId,
  activePathName,
  runId,
  runStartedAt,
  runMeta,
  seedRunId,
  seedRunStartedAt,
  triggerNodeId,
  triggerEvent,
  triggerContext,
  strictFlowMode = true,
  deferPoll,
  skipAiJobs,
  seedOutputs,
  seedHashes,
  seedHashTimestamps,
  seedHistory,
  recordHistory,
  historyLimit,
  skipNodeIds,
  onNodeStart,
  onNodeFinish,
  onNodeError,
  onIterationEnd,
  control,
  profile,
  fetchEntityByType,
  reportAiPathsError,
  toast,
}: EvaluateGraphOptions): Promise<RuntimeState> {
  const profileEnabled = Boolean(profile?.onEvent || profile?.onSummary);
  const profileRunStartMs = profileEnabled ? nowMs() : 0;
  const nodeProfile = profileEnabled ? new Map<string, RuntimeProfileNodeStats>() : null;
  const emitProfileEvent = (event: RuntimeProfileEvent): void => {
    if (!profile?.onEvent) return;
    try {
      profile.onEvent(event);
    } catch {
      // Profiling should never break runtime execution.
    }
  };
  const getNodeProfile = (node: AiNode): RuntimeProfileNodeStats => {
    if (!nodeProfile) {
      return {
        nodeId: node.id,
        nodeType: node.type,
        count: 0,
        totalMs: 0,
        maxMs: 0,
        cachedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        hashCount: 0,
        hashTotalMs: 0,
        hashMaxMs: 0,
      };
    }
    const existing = nodeProfile.get(node.id);
    if (existing) return existing;
    const created: RuntimeProfileNodeStats = {
      nodeId: node.id,
      nodeType: node.type,
      count: 0,
      totalMs: 0,
      maxMs: 0,
      cachedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      hashCount: 0,
      hashTotalMs: 0,
      hashMaxMs: 0,
    };
    nodeProfile.set(node.id, created);
    return created;
  };
  const recordHashProfile = (node: AiNode, hashMs: number): void => {
    if (!nodeProfile) return;
    const stats = getNodeProfile(node);
    stats.hashCount += 1;
    stats.hashTotalMs += hashMs;
    stats.hashMaxMs = Math.max(stats.hashMaxMs, hashMs);
  };
  const recordNodeProfile = (
    node: AiNode,
    payload: {
      durationMs: number;
      status: 'executed' | 'cached' | 'skipped' | 'error';
    }
  ): void => {
    if (!nodeProfile) return;
    const stats = getNodeProfile(node);
    if (payload.status === 'executed') {
      stats.count += 1;
      stats.totalMs += payload.durationMs;
      stats.maxMs = Math.max(stats.maxMs, payload.durationMs);
      return;
    }
    if (payload.status === 'cached') {
      stats.cachedCount += 1;
      return;
    }
    if (payload.status === 'skipped') {
      stats.skippedCount += 1;
      return;
    }
    if (payload.status === 'error') {
      stats.errorCount += 1;
    }
  };
  const controlMode = control?.mode ?? 'run';
  const resolvedStepLimit =
    typeof control?.stepLimit === 'number' && Number.isFinite(control.stepLimit) && control.stepLimit > 0
      ? control.stepLimit
      : controlMode === 'step'
        ? 1
        : null;
  const shouldLimitSteps = typeof resolvedStepLimit === 'number' && resolvedStepLimit > 0;
  let stepCount = 0;
  let haltReason: RuntimeExecutionHaltReason | null = null;
  let haltIteration = 0;
  let currentIteration = 0;
  const emitHalt = (reason: RuntimeExecutionHaltReason, iteration: number): void => {
    if (!control?.onHalt) return;
    try {
      control.onHalt({ reason, stepCount, iteration });
    } catch {
      // Halt callbacks should never break runtime execution.
    }
  };
  const sanitizedEdges = sanitizeEdges(nodes, edges);
  const buildRunId = (): string =>
    `run_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
  const resolvedRunId = runId ?? seedRunId ?? buildRunId();
  const resolvedRunStartedAt =
    runStartedAt ??
    (seedRunId && seedRunId === resolvedRunId ? seedRunStartedAt : undefined) ??
    new Date().toISOString();
  emitProfileEvent({
    type: 'run',
    phase: 'start',
    runId: resolvedRunId,
    runStartedAt: resolvedRunStartedAt,
    nodeCount: nodes.length,
    edgeCount: sanitizedEdges.length,
  });
  const outputs: Record<string, RuntimePortValues> = seedOutputs
    ? Object.fromEntries(
      Object.entries(seedOutputs).map(([key, value]: [string, RuntimePortValues]) => [key, cloneValue(value)])
    )
    : {};
  let inputs: Record<string, RuntimePortValues> = {};
  const inputHashes = new Map<string, string>(
    seedHashes ? Object.entries(seedHashes) : []
  );
  const hashTimestamps = new Map<string, number>(
    seedHashTimestamps
      ? Object.entries(seedHashTimestamps).map(([k, v]: [string, number]) => [k, v])
      : []
  );
  const historyMax = Math.max(1, historyLimit ?? 50);
  const history = new Map<string, RuntimeHistoryEntry[]>(
    seedHistory
      ? Object.entries(seedHistory).map(([key, value]: [string, RuntimeHistoryEntry[]]) => [
        key,
        Array.isArray(value) ? value.slice() : [],
      ])
      : []
  );
  const runFencesByNode = new Map<string, Set<string>>();
  const sideEffectActivationsByNode = new Map<string, Set<string>>();
  const getSideEffectActivations = (nodeId: string): Set<string> => {
    const existing = sideEffectActivationsByNode.get(nodeId);
    if (existing) return existing;
    const created = new Set<string>();
    sideEffectActivationsByNode.set(nodeId, created);
    return created;
  };
  if (seedHistory) {
    Object.entries(seedHistory).forEach(([nodeId, entries]: [string, RuntimeHistoryEntry[]]) => {
      if (!Array.isArray(entries)) return;
      entries.forEach((entry: RuntimeHistoryEntry) => {
        if (entry?.runId !== resolvedRunId) return;
        if (entry.runStartedAt !== resolvedRunStartedAt) return;
        const hash = entry.inputHash;
        if (!hash) return;
        const set = runFencesByNode.get(nodeId) ?? new Set<string>();
        set.add(hash);
        runFencesByNode.set(nodeId, set);
        if (
          entry.sideEffectDecision === 'executed' &&
          typeof entry.activationHash === 'string' &&
          entry.activationHash.trim().length > 0
        ) {
          getSideEffectActivations(nodeId).add(entry.activationHash);
        }
      });
    });
  }
  const buildHistorySnapshot = (): Record<string, RuntimeHistoryEntry[]> | undefined =>
    recordHistory && history.size
      ? (cloneValue(Object.fromEntries(history)) as Record<string, RuntimeHistoryEntry[]>)
      : undefined;
  const buildRuntimeStateSnapshot = (
    inputsSnapshot: Record<string, RuntimePortValues>
  ): RuntimeState => ({
    status: 'running',
    nodeStatuses: {},
    nodeOutputs: cloneValue(outputs),
    variables: {},
    events: [],
    runId: resolvedRunId,
    runStartedAt: resolvedRunStartedAt,
    inputs: cloneValue(inputsSnapshot),
    outputs: cloneValue(outputs),
    hashes: inputHashes.size ? Object.fromEntries(inputHashes) : undefined,
    hashTimestamps: hashTimestamps.size ? Object.fromEntries(hashTimestamps) : undefined,
    history: buildHistorySnapshot(),
  });
  const throwCancelled = (
    inputsSnapshot: Record<string, RuntimePortValues>,
    nodeId?: string | null,
    cause?: unknown
  ): never => {
    emitHalt('cancelled', currentIteration);
    throw new GraphExecutionCancelled('Run cancelled.', buildRuntimeStateSnapshot(inputsSnapshot), nodeId, cause);
  };
  const ensureNotCancelled = (
    inputsSnapshot?: Record<string, RuntimePortValues>,
    nodeId?: string | null
  ): void => {
    if (!control?.signal?.aborted) return;
    throwCancelled(inputsSnapshot ?? inputs, nodeId);
  };
  const now = resolvedRunStartedAt;
  const entityCache = new Map<string, Record<string, unknown> | null>();

  const activeNodeIds = new Set<string>();
  const nodeById = new Map(nodes.map((node: AiNode): [string, AiNode] => [node.id, node]));
  const incomingEdgesByNode = new Map<string, Edge[]>();
  const outgoingEdgesByNode = new Map<string, Edge[]>();
  sanitizedEdges.forEach((edge: Edge) => {
    if (!edge.from || !edge.to) return;
    const incoming = incomingEdgesByNode.get(edge.to) ?? [];
    incoming.push(edge);
    incomingEdgesByNode.set(edge.to, incoming);
    const outgoing = outgoingEdgesByNode.get(edge.from) ?? [];
    outgoing.push(edge);
    outgoingEdgesByNode.set(edge.from, outgoing);
  });
  const hasValidTriggerRoot = Boolean(triggerNodeId && nodeById.has(triggerNodeId));
  if (hasValidTriggerRoot && triggerNodeId) {
    const queue: string[] = [triggerNodeId];
    activeNodeIds.add(triggerNodeId);
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      const outgoing = outgoingEdgesByNode.get(current) ?? [];
      outgoing.forEach((edge: Edge): void => {
        const targetId = edge.to;
        if (!targetId || activeNodeIds.has(targetId)) return;
        activeNodeIds.add(targetId);
        queue.push(targetId);
      });
    }
  }
  const isNodeActiveById = (nodeId: string): boolean =>
    !triggerNodeId || !hasValidTriggerRoot || activeNodeIds.has(nodeId);
  if (triggerNodeId && hasValidTriggerRoot) {
    Object.keys(outputs).forEach((nodeId: string): void => {
      if (!isNodeActiveById(nodeId)) {
        delete outputs[nodeId];
      }
    });
    Array.from(inputHashes.keys()).forEach((nodeId: string): void => {
      if (!isNodeActiveById(nodeId)) {
        inputHashes.delete(nodeId);
      }
    });
    Array.from(hashTimestamps.keys()).forEach((nodeId: string): void => {
      if (!isNodeActiveById(nodeId)) {
        hashTimestamps.delete(nodeId);
      }
    });
    Array.from(history.keys()).forEach((nodeId: string): void => {
      if (!isNodeActiveById(nodeId)) {
        history.delete(nodeId);
      }
    });
  }
  const orderNodesByDependencies = (): AiNode[] => {
    if (nodes.length <= 1) return nodes;
    const indegree = new Map<string, number>();
    nodes.forEach((node: AiNode) => {
      indegree.set(node.id, 0);
    });
    const adjacency = new Map<string, Set<string>>();
    sanitizedEdges.forEach((edge: Edge) => {
      if (!edge.from || !edge.to) return;
      if (!indegree.has(edge.from) || !indegree.has(edge.to)) return;
      const neighbors = adjacency.get(edge.from) ?? new Set<string>();
      if (!neighbors.has(edge.to)) {
        neighbors.add(edge.to);
        adjacency.set(edge.from, neighbors);
        indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
      }
    });
    const queue: AiNode[] = [];
    nodes.forEach((node: AiNode) => {
      if ((indegree.get(node.id) ?? 0) === 0) {
        queue.push(node);
      }
    });
    const ordered: AiNode[] = [];
    const processed = new Set<string>();
    while (queue.length) {
      const current = queue.shift();
      if (!current || processed.has(current.id)) continue;
      processed.add(current.id);
      ordered.push(current);
      const neighbors = adjacency.get(current.id);
      if (!neighbors) continue;
      neighbors.forEach((neighborId: string) => {
        const nextIndegree = (indegree.get(neighborId) ?? 0) - 1;
        indegree.set(neighborId, nextIndegree);
        if (nextIndegree === 0) {
          const neighbor = nodeById.get(neighborId);
          if (neighbor) {
            queue.push(neighbor);
          }
        }
      });
    }
    if (ordered.length < nodes.length) {
      nodes.forEach((node: AiNode) => {
        if (!processed.has(node.id)) ordered.push(node);
      });
    }
    return ordered;
  };
  const orderedNodes = orderNodesByDependencies();
  const triggerSource =
    triggerContext && typeof triggerContext === 'object'
      ? (triggerContext)['source']
      : null;
  const resolvedPathId =
    activePathId ??
    (triggerSource && typeof triggerSource === 'object'
      ? ((triggerSource as Record<string, unknown>)['pathId'] as string | undefined)
      : undefined) ??
    null;
  const resolvedPathName =
    activePathName ??
    (triggerSource && typeof triggerSource === 'object'
      ? ((triggerSource as Record<string, unknown>)['pathName'] as string | undefined)
      : undefined);

  const buildNodeIdempotencyKey = (
    node: AiNode,
    activationHash: string | null
  ): string | null => {
    if (!activationHash || !IDEMPOTENCY_NODE_TYPES.has(node.type)) return null;
    return hashRuntimeValue({
      runId: resolvedRunId,
      runStartedAt: resolvedRunStartedAt,
      pathId: resolvedPathId,
      nodeId: node.id,
      nodeType: node.type,
      activationHash,
    });
  };

  const buildInputLinks = (
    nodeId: string,
    nodeInputs: RuntimePortValues
  ): RuntimeHistoryLink[] => {
    const incoming = incomingEdgesByNode.get(nodeId) ?? [];
    const hasInputs = Object.keys(nodeInputs).length > 0;
    return incoming
      .map((edge: Edge): RuntimeHistoryLink | null => {
        const fromNodeId = edge.from;
        if (!fromNodeId) return null;
        const toPort = edge.toPort ?? null;
        const isPresent = toPort ? (nodeInputs)[toPort] !== undefined : hasInputs;
        if (!isPresent) return null;
        const fromNode = nodeById.get(fromNodeId);
        return {
          nodeId: fromNodeId,
          nodeType: fromNode?.type ?? null,
          nodeTitle: fromNode?.title ?? null,
          fromPort: edge.fromPort ?? null,
          toPort,
        };
      })
      .filter((link: RuntimeHistoryLink | null): link is RuntimeHistoryLink => Boolean(link));
  };

  const buildOutputLinks = (
    nodeId: string,
    nodeOutputs: RuntimePortValues
  ): RuntimeHistoryLink[] => {
    const outgoing = outgoingEdgesByNode.get(nodeId) ?? [];
    const hasOutputs = Object.keys(nodeOutputs).length > 0;
    return outgoing
      .map((edge: Edge): RuntimeHistoryLink | null => {
        const toNodeId = edge.to;
        if (!toNodeId) return null;
        const fromPort = edge.fromPort ?? null;
        const isPresent = fromPort ? (nodeOutputs)[fromPort] !== undefined : hasOutputs;
        if (!isPresent) return null;
        const toNode = nodeById.get(toNodeId);
        return {
          nodeId: toNodeId,
          nodeType: toNode?.type ?? null,
          nodeTitle: toNode?.title ?? null,
          fromPort,
          toPort: edge.toPort ?? null,
        };
      })
      .filter((link: RuntimeHistoryLink | null): link is RuntimeHistoryLink => Boolean(link));
  };

  const collectNodeInputs = (nodeId: string): RuntimePortValues => {
    const incoming = incomingEdgesByNode.get(nodeId) ?? [];
    if (incoming.length === 0) return {};
    const collected: RuntimePortValues = {};
    incoming.forEach((edge: Edge) => {
      const fromNodeId = edge.from;
      if (!fromNodeId) return;
      if (!isNodeActiveById(fromNodeId)) return;
      const fromOutput = outputs[fromNodeId];
      if (!fromOutput || !edge.fromPort || !edge.toPort) return;
      const value = (fromOutput)[edge.fromPort];
      if (value === undefined) return;
      const expectedTypes = getPortDataTypes(edge.toPort);
      if (!isValueCompatibleWithTypes(value, expectedTypes)) return;
      const existing = (collected)[edge.toPort];
      (collected)[edge.toPort] = appendInputValue(existing, value);
    });
    return collected;
  };

  const refreshDownstreamInputs = (
    sourceNodeId: string,
    nextInputs: Record<string, RuntimePortValues>
  ): void => {
    const outgoing = outgoingEdgesByNode.get(sourceNodeId) ?? [];
    if (outgoing.length === 0) return;
    const touched = new Set<string>();
    outgoing.forEach((edge: Edge) => {
      if (edge.to) {
        touched.add(edge.to);
      }
    });
    touched.forEach((targetId: string) => {
      let updatedInputs = collectNodeInputs(targetId);
      const targetNode = nodeById.get(targetId);
      if (targetNode?.type === 'database') {
        updatedInputs = deriveDatabaseInputs(updatedInputs);
      }
      nextInputs[targetId] = updatedInputs;
    });
  };

  const hasMeaningfulValue = (value: unknown): boolean => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
    return true;
  };

  type NodeInputReadiness = {
    ready: boolean;
    requiredPorts: string[];
    optionalPorts: string[];
    waitingOnPorts: string[];
    waitingOnDetails: Array<{
      port: string;
      upstream: Array<{
        nodeId: string;
        nodeType: string | null;
        nodeTitle: string | null;
        sourcePort: string | null;
        status: string;
        blockedReason?: string;
        waitingOnPorts?: string[];
      }>;
    }>;
  };

  const resolveConfiguredRequiredInputPorts = (
    node: AiNode,
    connectedPorts: Set<string>
  ): string[] => {
    const configuredPorts = new Set<string>([
      ...Object.keys(node.inputContracts ?? {}),
      ...Object.keys(node.config?.runtime?.inputContracts ?? {}),
      ...Array.from(connectedPorts),
    ]);
    node.inputs.forEach((port: string): void => {
      configuredPorts.add(port);
    });
    const explicitRequired = Array.from(configuredPorts).filter(
      (port: string): boolean => getNodeInputPortContract(node, port).required === true
    );
    return explicitRequired;
  };

  const hasRequiredInputContracts = (node: AiNode): boolean => {
    const contractPorts = new Set<string>([
      ...Object.keys(node.inputContracts ?? {}),
      ...Object.keys(node.config?.runtime?.inputContracts ?? {}),
    ]);
    if (contractPorts.size === 0) return false;
    return Array.from(contractPorts).some(
      (port: string): boolean => getNodeInputPortContract(node, port).required === true
    );
  };

  const buildWaitingOnDetails = (
    node: AiNode,
    waitingPorts: Set<string>
  ): NodeInputReadiness['waitingOnDetails'] => {
    if (waitingPorts.size === 0) return [];
    const incoming = incomingEdgesByNode.get(node.id) ?? [];
    const detailsByPort = new Map<
      string,
      {
        port: string;
        upstream: Array<{
          nodeId: string;
          nodeType: string | null;
          nodeTitle: string | null;
          sourcePort: string | null;
          status: string;
          blockedReason?: string;
          waitingOnPorts?: string[];
        }>;
      }
    >();
    waitingPorts.forEach((port: string): void => {
      detailsByPort.set(port, { port, upstream: [] });
    });
    incoming.forEach((edge: Edge): void => {
      if (!edge.toPort || !waitingPorts.has(edge.toPort)) return;
      if (!edge.from) return;
      const detail = detailsByPort.get(edge.toPort);
      if (!detail) return;
      const sourceNode = nodeById.get(edge.from);
      const sourceOutputs = outputs[edge.from] ?? {};
      const rawStatus = sourceOutputs['status'];
      const status =
        typeof rawStatus === 'string' && rawStatus.trim().length > 0
          ? rawStatus.trim().toLowerCase()
          : 'pending';
      const rawWaitingOnPorts = sourceOutputs['waitingOnPorts'];
      detail.upstream.push({
        nodeId: edge.from,
        nodeType: sourceNode?.type ?? null,
        nodeTitle: sourceNode?.title ?? null,
        sourcePort: edge.fromPort ?? null,
        status,
        ...(typeof sourceOutputs['blockedReason'] === 'string'
          ? { blockedReason: sourceOutputs['blockedReason'] }
          : {}),
        ...(Array.isArray(rawWaitingOnPorts)
          ? {
            waitingOnPorts: rawWaitingOnPorts
              .filter((port: unknown): port is string => typeof port === 'string')
              .map((port: string): string => port.trim())
              .filter((port: string): boolean => port.length > 0),
          }
          : {}),
      });
    });
    return Array.from(detailsByPort.values()).map((detail) => ({
      ...detail,
      upstream: detail.upstream.sort((left, right) => left.nodeId.localeCompare(right.nodeId)),
    }));
  };

  const evaluateInputReadiness = (
    node: AiNode,
    rawInputs: RuntimePortValues
  ): NodeInputReadiness => {
    const incoming = incomingEdgesByNode.get(node.id) ?? [];
    if (incoming.length === 0) {
      const requiredPorts = resolveConfiguredRequiredInputPorts(node, new Set<string>());
      if (requiredPorts.length > 0) {
        const waitingOnPorts = requiredPorts.filter(
          (port: string): boolean => rawInputs[port] === undefined
        );
        return {
          ready: waitingOnPorts.length === 0,
          requiredPorts,
          optionalPorts: [],
          waitingOnPorts,
          waitingOnDetails: buildWaitingOnDetails(node, new Set(waitingOnPorts)),
        };
      }
      return {
        ready: true,
        requiredPorts: [],
        optionalPorts: [],
        waitingOnPorts: [],
        waitingOnDetails: [],
      };
    }
    const connectedPorts = new Set<string>();
    incoming.forEach((edge: Edge) => {
      if (edge.toPort) connectedPorts.add(edge.toPort);
    });
    if (connectedPorts.size === 0) {
      const requiredPorts = resolveConfiguredRequiredInputPorts(node, connectedPorts);
      if (requiredPorts.length > 0) {
        const waitingOnPorts = requiredPorts.filter(
          (port: string): boolean => rawInputs[port] === undefined
        );
        return {
          ready: waitingOnPorts.length === 0,
          requiredPorts,
          optionalPorts: [],
          waitingOnPorts,
          waitingOnDetails: buildWaitingOnDetails(node, new Set(waitingOnPorts)),
        };
      }
      return {
        ready: true,
        requiredPorts: [],
        optionalPorts: [],
        waitingOnPorts: [],
        waitingOnDetails: [],
      };
    }

    const explicitRequiredPorts = resolveConfiguredRequiredInputPorts(node, connectedPorts);
    const requiredPorts =
      explicitRequiredPorts.length > 0
        ? explicitRequiredPorts
        : Array.from(connectedPorts);
    const requiredPortSet = new Set(requiredPorts);
    const optionalPorts = Array.from(connectedPorts).filter(
      (port: string): boolean => !requiredPortSet.has(port)
    );
    const waitingOnPorts = new Set<string>();
    const toReadiness = (ready: boolean): NodeInputReadiness => ({
      ready,
      requiredPorts,
      optionalPorts,
      waitingOnPorts: Array.from(waitingOnPorts),
      waitingOnDetails: buildWaitingOnDetails(node, waitingOnPorts),
    });
    if (explicitRequiredPorts.length > 0) {
      explicitRequiredPorts.forEach((port: string): void => {
        const value = rawInputs[port];
        if (value === undefined) {
          waitingOnPorts.add(port);
        }
      });
      if (waitingOnPorts.size > 0) {
        return toReadiness(false);
      }
    }

    if (node.type !== 'database') {
      requiredPorts.forEach((port: string): void => {
        if ((rawInputs)[port] === undefined) {
          waitingOnPorts.add(port);
        }
      });
      return toReadiness(waitingOnPorts.size === 0);
    }

    const dbConfig = node.config?.database ?? { operation: 'query' };
    const operation = dbConfig.operation ?? 'query';
    const hasAnyValue = (ports: string[]): boolean =>
      ports.some((port: string) =>
        hasMeaningfulValue(coerceInput((rawInputs)[port]))
      );
    const anyConnected = (ports: string[]): boolean =>
      ports.some((port: string) => connectedPorts.has(port));
    const allConnectedHaveValues = (ports: string[]): boolean =>
      ports.every((port: string) =>
        !connectedPorts.has(port) || hasMeaningfulValue(coerceInput((rawInputs)[port]))
      );
    const markWaitingPorts = (ports: string[], connectedOnly: boolean): void => {
      ports.forEach((port: string): void => {
        if (connectedOnly && !connectedPorts.has(port)) return;
        if (!hasMeaningfulValue(coerceInput((rawInputs)[port]))) {
          waitingOnPorts.add(port);
        }
      });
    };

    if (operation === 'query') {
      const queryPorts = ['aiQuery', 'query', 'queryCallback'];
      if (anyConnected(queryPorts) && !hasAnyValue(queryPorts)) {
        markWaitingPorts(queryPorts, true);
      }
      const nonQueryPorts = Array.from(connectedPorts).filter(
        (port: string) => !queryPorts.includes(port)
      );
      if (!allConnectedHaveValues(nonQueryPorts)) {
        markWaitingPorts(nonQueryPorts, true);
      }
      return toReadiness(waitingOnPorts.size === 0);
    }

    if (operation === 'delete') {
      const idPorts = ['entityId', 'productId', 'value'];
      if (anyConnected(idPorts) && !hasAnyValue(idPorts)) {
        markWaitingPorts(idPorts, true);
      }
      return toReadiness(waitingOnPorts.size === 0);
    }

    if (operation === 'insert') {
      // When a query template is configured, the payload comes from
      // config (queryTemplate) rather than from an input port.
      const hasTemplatePayload = Boolean(dbConfig.query?.queryTemplate?.trim());
      if (hasTemplatePayload) {
        return {
          ready: true,
          requiredPorts,
          optionalPorts,
          waitingOnPorts: [],
          waitingOnDetails: [],
        };
      }
      const writeSource = dbConfig.writeSource ?? 'bundle';
      const insertPorts = [writeSource, 'queryCallback'];
      const hasPayload = hasAnyValue(insertPorts);
      if (connectedPorts.has(writeSource) || connectedPorts.has('queryCallback')) {
        if (!hasPayload) {
          markWaitingPorts(insertPorts, true);
        }
      } else if (!hasPayload) {
        markWaitingPorts(insertPorts, false);
      }
      return toReadiness(waitingOnPorts.size === 0);
    }

    if (operation === 'update') {
      const mappings = Array.isArray(dbConfig.mappings) ? dbConfig.mappings : [];
      const sourcePorts = mappings.length
        ? mappings
          .map((mapping) => mapping?.sourcePort)
          .filter((port): port is string => typeof port === 'string' && port.trim().length > 0)
        : [];
      const connectedSources = sourcePorts.filter((port: string) => connectedPorts.has(port));
      if (connectedSources.length > 0) {
        const allSourcesReady = connectedSources.every((port: string) =>
          hasMeaningfulValue(coerceInput(rawInputs[port]))
        );
        if (!allSourcesReady) {
          markWaitingPorts(connectedSources, true);
        }
      }

      const entityType = (dbConfig.entityType ?? 'product').trim().toLowerCase();
      if (entityType !== 'custom') {
        const idPorts = ['entityId', 'productId', 'value'];
        if (anyConnected(idPorts) && !hasAnyValue(idPorts)) {
          markWaitingPorts(idPorts, true);
        }
      }

      if ((dbConfig.updateStrategy ?? 'one') === 'many') {
        const queryPorts = ['aiQuery', 'query', 'queryCallback'];
        if (anyConnected(queryPorts) && !hasAnyValue(queryPorts)) {
          markWaitingPorts(queryPorts, true);
        }
      }
      return toReadiness(waitingOnPorts.size === 0);
    }

    return {
      ready: true,
      requiredPorts,
      optionalPorts,
      waitingOnPorts: [],
      waitingOnDetails: [],
    };
  };

  const buildMissingInputsMessage = (
    node: AiNode,
    waitDiagnostics: NodeInputReadiness
  ): string => {
    const waitingPorts = waitDiagnostics.waitingOnPorts;
    const nodeLabel = node.title ?? node.id;
    if (waitingPorts.length === 0) {
      return `Node ${nodeLabel} is waiting for required inputs.`;
    }
    const portsLabel = waitingPorts.join(', ');
    const firstDetail = waitDiagnostics.waitingOnDetails[0];
    if (!firstDetail || firstDetail.upstream.length === 0) {
      return `Node ${nodeLabel} is waiting for required input port(s): ${portsLabel}. Connect upstream data or mark ports optional in Runtime settings.`;
    }
    const sourceSummary = firstDetail.upstream
      .slice(0, 3)
      .map((source) => {
        const sourceLabel = source.nodeTitle ?? source.nodeId;
        const base = `${sourceLabel} [${source.status}]`;
        if (source.blockedReason === 'missing_inputs' && source.waitingOnPorts?.length) {
          return `${base} waiting on ${source.waitingOnPorts.join(', ')}`;
        }
        return base;
      })
      .join('; ');
    return `Node ${nodeLabel} is waiting for required input port(s): ${portsLabel}. Upstream status for ${firstDetail.port}: ${sourceSummary}.`;
  };

  const pushHistoryEntry = (nodeId: string, entry: RuntimeHistoryEntry): void => {
    if (!recordHistory) return;
    const existing = history.get(nodeId) ?? [];
    const last = existing.length ? existing[existing.length - 1] : undefined;
    if (
      last &&
      last.runId === entry.runId &&
      last.runStartedAt === entry.runStartedAt &&
      last.status === entry.status &&
      last.skipReason === entry.skipReason &&
      last.sideEffectPolicy === entry.sideEffectPolicy &&
      last.sideEffectDecision === entry.sideEffectDecision &&
      last.activationHash === entry.activationHash &&
      last.idempotencyKey === entry.idempotencyKey &&
      hashRuntimeValue(last.inputs) === hashRuntimeValue(entry.inputs) &&
      hashRuntimeValue(last.outputs) === hashRuntimeValue(entry.outputs)
    ) {
      return;
    }
    // Clone inputs/outputs only when actually storing (after dedup check passes)
    entry.inputs = cloneValue(entry.inputs);
    entry.outputs = cloneValue(entry.outputs);
    existing.push(entry);
    if (existing.length > historyMax) {
      existing.splice(0, existing.length - historyMax);
    }
    history.set(nodeId, existing);
  };

  const pushSkipEntry = (
    node: AiNode,
    nodeInputs: RuntimePortValues,
    prevOutputs: RuntimePortValues,
    options: {
      status: RuntimeHistoryEntry['status'];
      reason: string;
      iteration: number;
      inputHash?: string | null;
      waitDiagnostics?: NodeInputReadiness;
      sideEffectPolicy?: NodeSideEffectPolicy | null;
      sideEffectDecision?: SideEffectDecision | null;
      activationHash?: string | null;
      idempotencyKey?: string | null;
    }
  ): void => {
    if (!recordHistory) return;
    const entry: RuntimeHistoryEntry = {
      timestamp: new Date().toISOString(),
      runId: resolvedRunId,
      runStartedAt: resolvedRunStartedAt,
      pathId: resolvedPathId ?? null,
      pathName: resolvedPathName ?? null,
      nodeId: node.id,
      nodeType: node.type,
      nodeTitle: node.title ?? null,
      status: options.status,
      iteration: options.iteration,
      inputs: nodeInputs,
      outputs: prevOutputs,
      inputHash: options.inputHash ?? null,
      skipReason: options.reason,
      requiredPorts: options.waitDiagnostics?.requiredPorts,
      optionalPorts: options.waitDiagnostics?.optionalPorts,
      waitingOnPorts: options.waitDiagnostics?.waitingOnPorts,
      sideEffectPolicy: options.sideEffectPolicy ?? undefined,
      sideEffectDecision: options.sideEffectDecision ?? undefined,
      activationHash: options.activationHash ?? null,
      idempotencyKey: options.idempotencyKey ?? null,
      inputsFrom: buildInputLinks(node.id, nodeInputs),
      outputsTo: buildOutputLinks(node.id, prevOutputs),
      delayMs: node.type === 'delay' ? (node.config?.delay?.ms ?? 300) : null,
      durationMs: null,
    };
    pushHistoryEntry(node.id, entry);
  };

  const getRunFence = (nodeId: string): Set<string> => {
    const existing = runFencesByNode.get(nodeId);
    if (existing) return existing;
    const created = new Set<string>();
    runFencesByNode.set(nodeId, created);
    return created;
  };

  const isActiveNode = (node: AiNode): boolean =>
    isNodeActiveById(node.id);
  const skipNodeSet = skipNodeIds
    ? new Set(Array.isArray(skipNodeIds) ? skipNodeIds : Array.from(skipNodeIds))
    : null;
  const markStep = (node: AiNode): boolean => {
    if (!shouldLimitSteps) return false;
    if (!isActiveNode(node)) return false;
    if (node.type === 'simulation') return false;
    stepCount += 1;
    if (stepCount >= (resolvedStepLimit ?? 0)) {
      haltReason = 'step_limit';
      haltIteration = currentIteration;
      return true;
    }
    return false;
  };

  const fetchEntityCached = async (entityType: string, entityId: string): Promise<Record<string, unknown> | null> => {
    if (!entityType || !entityId) return null;
    const key = `${entityType}:${entityId}`;
    if (entityCache.has(key)) return entityCache.get(key) ?? null;
    try {
      const data = await fetchEntityByType(entityType, entityId);
      entityCache.set(key, data);
      return data;
    } catch (error) {
      reportAiPathsError(error, {
        service: 'ai-paths-runtime',
        runId: resolvedRunId,
        entityType,
        entityId,
      }, `Runtime failure fetching entity ${entityType} ${entityId}`);
      // We don't rethrow here to allow other nodes to potentially still execute if they don't depend on this entity.
      return null;
    }
  };

  const normalizeEntityType = (value?: string | null): string | null => {
    const normalized = value?.trim().toLowerCase();
    if (!normalized) return null;
    if (normalized === 'product' || normalized === 'products') return 'product';
    if (normalized === 'note' || normalized === 'notes') return 'note';
    return normalized;
  };

  const triggerNode =
    triggerNodeId
      ? (nodes.find(
        (node: AiNode): boolean => node.id === triggerNodeId && node.type === 'trigger'
      ) ?? null)
      : null;
  const triggerContextMode = resolveTriggerContextMode(triggerNode);
  const allowSimulationContext = triggerContextMode !== 'trigger_only';
  const triggerContextRecord = triggerContext ?? null;
  const connectedSimulationNodes: AiNode[] = (() => {
    if (!triggerNodeId) return [];
    const simulationNodeById = new Map<string, AiNode>(
      nodes
        .filter((node: AiNode): boolean => node.type === 'simulation')
        .map((node: AiNode): [string, AiNode] => [node.id, node])
    );
    const resolved: AiNode[] = [];
    const seen = new Set<string>();
    sanitizedEdges.forEach((edge: Edge): void => {
      if (!edge.from || edge.to !== triggerNodeId) return;
      const toPort = (edge.toPort?.trim() || 'context').toLowerCase();
      if (toPort !== 'context') return;
      const simulationNode = simulationNodeById.get(edge.from);
      if (!simulationNode || seen.has(simulationNode.id)) return;
      resolved.push(simulationNode);
      seen.add(simulationNode.id);
    });
    return resolved;
  })();
  const connectedFetcherNodes: AiNode[] = (() => {
    if (!triggerNodeId) return [];
    const fetcherNodeById = new Map<string, AiNode>(
      nodes
        .filter((node: AiNode): boolean => node.type === 'fetcher')
        .map((node: AiNode): [string, AiNode] => [node.id, node])
    );
    const resolved: AiNode[] = [];
    const seen = new Set<string>();
    sanitizedEdges.forEach((edge: Edge): void => {
      if (edge.from !== triggerNodeId || !edge.to) return;
      const fromPort = (edge.fromPort?.trim() || '').toLowerCase();
      const toPort = (edge.toPort?.trim() || '').toLowerCase();
      if (fromPort && fromPort !== 'trigger') return;
      if (toPort && toPort !== 'trigger') return;
      const fetcherNode = fetcherNodeById.get(edge.to);
      if (!fetcherNode || seen.has(fetcherNode.id)) return;
      resolved.push(fetcherNode);
      seen.add(fetcherNode.id);
    });
    return resolved;
  })();
  const hasSimulationFetcherSource = connectedFetcherNodes.some((node: AiNode): boolean =>
    isSimulationCapableFetcher(node)
  );
  const autoSimulationNodes = connectedSimulationNodes.filter(
    (node: AiNode): boolean => resolveSimulationRunBehavior(node) === 'before_connected_trigger'
  );
  const manualSimulationNodes = connectedSimulationNodes.filter(
    (node: AiNode): boolean => resolveSimulationRunBehavior(node) === 'manual_only'
  );
  let simulationEntityId: string | null = null;
  let simulationEntityType: string | null = null;
  const triggerEntityId =
    typeof triggerContext?.['entityId'] === 'string'
      ? triggerContext?.['entityId']
      : typeof triggerContext?.['productId'] === 'string'
        ? triggerContext?.['productId']
        : null;
  const triggerEntityType =
    typeof triggerContext?.['entityType'] === 'string'
      ? normalizeEntityType(triggerContext?.['entityType'])
      : null;

  const primarySimulationNode = connectedSimulationNodes[0] ?? null;
  if (allowSimulationContext && primarySimulationNode) {
    simulationEntityType =
      normalizeEntityType(primarySimulationNode.config?.simulation?.entityType) ?? 'product';
    simulationEntityId =
      primarySimulationNode.config?.simulation?.entityId?.trim() ||
      primarySimulationNode.config?.simulation?.productId?.trim() ||
      null;
  }

  let fallbackEntityId = simulationEntityId ?? triggerEntityId ?? null;
  let resolvedEntity: Record<string, unknown> | null = null;

  const deriveDatabaseInputs = (
    rawInputs: RuntimePortValues
  ): RuntimePortValues => {
    const next: RuntimePortValues = { ...rawInputs };
    const pickString = (value: unknown): string | undefined => {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? trimmed : undefined;
      }
      if (typeof value === 'number') {
        return String(value);
      }
      return undefined;
    };
    const hasExplicitValue = (value: unknown): boolean => {
      const resolved = coerceInput(value);
      if (resolved === undefined || resolved === null) return false;
      if (typeof resolved === 'string') return resolved.trim().length > 0;
      if (Array.isArray(resolved)) return resolved.length > 0;
      if (typeof resolved === 'object') {
        return Object.keys(resolved as Record<string, unknown>).length > 0;
      }
      return true;
    };
    const applyRecord = (value: unknown): void => {
      if (!value || typeof value !== 'object') return;
      const record = value as Record<string, unknown>;
      if (!pickString(next['entityId'])) {
        const resolvedEntityId =
          pickString(record['entityId']) ??
          pickString(record['productId']) ??
          pickString(record['id']) ??
          pickString(record['_id']);
        if (resolvedEntityId) {
          next['entityId'] = resolvedEntityId;
        }
      }
      if (!pickString(next['productId'])) {
        const resolvedProductId =
          pickString(record['productId']) ??
          pickString(record['entityId']) ??
          pickString(record['id']) ??
          pickString(record['_id']);
        if (resolvedProductId) {
          next['productId'] = resolvedProductId;
        }
      }
      if (!pickString(next['entityType'])) {
        const resolvedEntityType = pickString(record['entityType']);
        if (resolvedEntityType) {
          next['entityType'] = resolvedEntityType;
        }
      }
    };

    applyRecord(coerceInput(next['context']));
    applyRecord(coerceInput(next['meta']));
    applyRecord(coerceInput(next['bundle']));

    if (!strictFlowMode) {
      if (!pickString(next['entityId'])) {
        next['entityId'] =
          pickString(triggerContext?.['entityId']) ??
          pickString(triggerContext?.['productId']) ??
          fallbackEntityId ??
          undefined;
      }
      if (!pickString(next['productId'])) {
        next['productId'] =
          pickString(triggerContext?.['productId']) ??
          pickString(triggerContext?.['entityId']) ??
          pickString(next['entityId']) ??
          undefined;
      }
      if (!pickString(next['entityType'])) {
        next['entityType'] =
          pickString(triggerContext?.['entityType']) ??
          simulationEntityType ??
          undefined;
      }

      if (!pickString(next['entityId']) || !pickString(next['productId']) || !pickString(next['entityType'])) {
        for (const [nodeId, output] of Object.entries(outputs)) {
          if (!output || typeof output !== 'object') continue;
          const nodeType = nodeById.get(nodeId)?.type;
          if (
            nodeType !== 'trigger' &&
            nodeType !== 'simulation' &&
            nodeType !== 'context' &&
            nodeType !== 'fetcher'
          ) {
            continue;
          }
          applyRecord(output);
          if (pickString(next['entityId']) && pickString(next['productId']) && pickString(next['entityType'])) {
            break;
          }
        }
      }
    }

    const resolvedEntityId = pickString(next['entityId']);
    const resolvedEntityType = pickString(next['entityType']);

    if (!strictFlowMode && !resolvedEntityId && resolvedEntity && typeof resolvedEntity === 'object') {
      const fallbackId =
        pickString(resolvedEntity['id']) ??
        pickString(resolvedEntity['_id']);
      if (fallbackId) {
        next['entityId'] = fallbackId;
      }
    }
    if (!strictFlowMode && !pickString(next['productId']) && pickString(next['entityId'])) {
      next['productId'] = pickString(next['entityId']);
    }
    if (!strictFlowMode && !resolvedEntityType && simulationEntityType) {
      next['entityType'] = simulationEntityType;
    }
    if (!strictFlowMode && !hasExplicitValue(next['value'])) {
      const fallbackValue =
        pickString(next['entityId']) ??
        pickString(next['productId']);
      if (fallbackValue) {
        next['value'] = fallbackValue;
      }
    }
    return next;
  };

  const upsertSimulationOutput = (
    node: AiNode,
    contextPayload: Record<string, unknown>
  ): void => {
    const contextEntityId = readEntityIdFromContext(contextPayload);
    const contextEntityType =
      readEntityTypeFromContext(contextPayload) ??
      normalizeEntityType(node.config?.simulation?.entityType);
    const productId =
      typeof contextPayload['productId'] === 'string' &&
      contextPayload['productId'].trim().length > 0
        ? contextPayload['productId']
        : contextEntityType === 'product' && contextEntityId
          ? contextEntityId
          : undefined;
    outputs[node.id] = {
      context: contextPayload,
      ...(contextEntityId ? { entityId: contextEntityId } : {}),
      ...(contextEntityType ? { entityType: contextEntityType } : {}),
      ...(productId ? { productId } : {}),
      ...(contextPayload['entityJson'] !== undefined
        ? { entityJson: contextPayload['entityJson'] }
        : {}),
    };
  };

  connectedSimulationNodes.forEach((node: AiNode): void => {
    delete outputs[node.id];
  });

  if (allowSimulationContext) {
    for (const node of autoSimulationNodes) {
      const entityType =
        normalizeEntityType(node.config?.simulation?.entityType) || 'product';
      const entityId =
        node.config?.simulation?.entityId?.trim() ||
        node.config?.simulation?.productId?.trim() ||
        null;
      if (!entityId) continue;
      const entity = await fetchEntityCached(entityType, entityId);
      const contextPayload: Record<string, unknown> = {
        entityType,
        entityId,
        contextSource: 'simulation',
        simulationNodeId: node.id,
        simulationNodeTitle: node.title ?? node.id,
        source: node.title,
        timestamp: now,
      };
      if (entityId && !entity) {
        const maybeUuid = entityId.includes('-');
        const hint =
          maybeUuid && entityId.length !== 36
            ? ` (id looks like a UUID but length is ${entityId.length}; expected 36)`
            : '';
        contextPayload['error'] = `Entity not found: ${entityType} ${entityId}${hint}`;
      }
      if (entity) {
        const imageUrls = extractImageUrls(entity);
        if (imageUrls.length) {
          contextPayload['images'] = imageUrls;
          contextPayload['imageUrls'] = imageUrls;
        }
        contextPayload['entity'] = entity;
        contextPayload['entityJson'] = entity;
        if (entityType === 'product') {
          contextPayload['product'] = entity;
        }
      }
      upsertSimulationOutput(node, contextPayload);
    }

    const contextEntityId = readEntityIdFromContext(triggerContextRecord);
    const contextEntityType = readEntityTypeFromContext(triggerContextRecord);
    const contextEntity = 
      triggerContextRecord &&
      typeof triggerContextRecord === 'object' &&
      triggerContextRecord['entity'] &&
      typeof triggerContextRecord['entity'] === 'object'
        ? (triggerContextRecord['entity'] as Record<string, unknown>)
        : triggerContextRecord &&
            typeof triggerContextRecord === 'object' &&
            triggerContextRecord['entityJson'] &&
            typeof triggerContextRecord['entityJson'] === 'object'
          ? (triggerContextRecord['entityJson'] as Record<string, unknown>)
          : triggerContextRecord &&
              typeof triggerContextRecord === 'object' &&
              triggerContextRecord['product'] &&
              typeof triggerContextRecord['product'] === 'object'
            ? (triggerContextRecord['product'] as Record<string, unknown>)
            : null;
    const triggerHasSimulationProvenance = hasSimulationContextProvenance(triggerContextRecord);
    if (contextEntityId && contextEntityType && triggerHasSimulationProvenance) {
      const inheritedContextSource =
        typeof triggerContextRecord?.['contextSource'] === 'string'
          ? triggerContextRecord['contextSource']
          : null;
      const contextPayloadBase: Record<string, unknown> = {
        ...(triggerContextRecord ?? {}),
        entityId: contextEntityId,
        entityType: contextEntityType,
        ...(contextEntityType === 'product' ? { productId: contextEntityId } : {}),
        contextSource: inheritedContextSource ?? 'simulation_manual',
        source:
          typeof triggerContextRecord?.['source'] === 'string'
            ? triggerContextRecord['source']
            : 'simulation',
        timestamp: now,
      };
      if (contextEntity) {
        contextPayloadBase['entity'] = contextEntity;
        contextPayloadBase['entityJson'] = contextEntity;
        if (contextEntityType === 'product') {
          contextPayloadBase['product'] = contextEntity;
        }
        const cacheKey = `${contextEntityType}:${contextEntityId}`;
        if (!entityCache.has(cacheKey)) {
          entityCache.set(cacheKey, contextEntity);
        }
      }
      manualSimulationNodes.forEach((node: AiNode): void => {
        const contextPayload = {
          ...contextPayloadBase,
          simulationNodeId: node.id,
          simulationNodeTitle: node.title ?? node.id,
        };
        upsertSimulationOutput(node, contextPayload);
      });
    }
  }

  const firstSimulationOutput = connectedSimulationNodes
    .map((node: AiNode): RuntimePortValues | null => outputs[node.id] ?? null)
    .find((output): output is RuntimePortValues => Boolean(output));
  const outputEntityId = readEntityIdFromContext(
    firstSimulationOutput &&
      typeof firstSimulationOutput['context'] === 'object' &&
      firstSimulationOutput['context'] !== null
      ? (firstSimulationOutput['context'] as Record<string, unknown>)
      : null
  );
  const outputEntityType = readEntityTypeFromContext(
    firstSimulationOutput &&
      typeof firstSimulationOutput['context'] === 'object' &&
      firstSimulationOutput['context'] !== null
      ? (firstSimulationOutput['context'] as Record<string, unknown>)
      : null
  );
  if (outputEntityId) {
    simulationEntityId = outputEntityId;
  }
  if (outputEntityType) {
    simulationEntityType = outputEntityType;
  }

  fallbackEntityId = simulationEntityId ?? triggerEntityId ?? null;
  resolvedEntity =
    allowSimulationContext && simulationEntityId && simulationEntityType
      ? await fetchEntityCached(simulationEntityType, simulationEntityId)
      : triggerEntityId && triggerEntityType
        ? await fetchEntityCached(triggerEntityType, triggerEntityId)
        : null;
  ensureNotCancelled();

  const simulationContextSatisfied =
    Boolean(simulationEntityId) ||
    hasSimulationContextProvenance(triggerContextRecord) ||
    hasSimulationFetcherSource;
  if (
    triggerNode &&
    triggerContextMode === 'simulation_required' &&
    !simulationContextSatisfied
  ) {
    throw new GraphExecutionError(
      `Trigger ${triggerNode.title ?? triggerNode.id} requires Simulation context, but no connected Simulation output was resolved. Run Simulation first (or set Simulation run behavior to Auto-run before connected Trigger).`,
      buildRuntimeStateSnapshot(inputs),
      triggerNode.id
    );
  }

  const maxIterations = Math.max(2, nodes.length + 2);
  const executed = {
    notification: new Set<string>(),
    updater: new Set<string>(),
    http: new Set<string>(),
    delay: new Set<string>(),
    poll: new Set<string>(),
    ai: new Set<string>(),
    schema: new Set<string>(),
    mapper: new Set<string>(),
  };
  let iterationCount = 0;
  ensureNotCancelled();

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    currentIteration = iteration;
    ensureNotCancelled();
    const iterationStartMs = profileEnabled ? nowMs() : 0;
    const nextInputs: Record<string, RuntimePortValues> = {};
    orderedNodes.forEach((node: AiNode): void => {
      try {
        nextInputs[node.id] = collectNodeInputs(node.id);
      } catch (collectError) {
        reportAiPathsError(collectError, {
          service: 'ai-paths-runtime',
          runId: resolvedRunId,
          nodeId: node.id,
        }, `Critical failure collecting inputs for node ${node.id}`);
        nextInputs[node.id] = {};
      }
    });

    let changed = false;
    const blockedNodeIds = new Set<string>();
    for (const node of orderedNodes) {
      ensureNotCancelled(nextInputs, node.id);
      const nodeInputsSnapshot = nextInputs[node.id] ?? {};
      let nodeInputs = nodeInputsSnapshot;
      if (node.type === 'database') {
        try {
          nodeInputs = deriveDatabaseInputs(nodeInputs);
        } catch (deriveError) {
          reportAiPathsError(deriveError, {
            service: 'ai-paths-runtime',
            runId: resolvedRunId,
            nodeId: node.id,
          }, `Failed to derive database inputs for node ${node.id}`);
          // Fallback to snapshot if derivation fails.
        }
      }
      const shouldWaitForInputs = node.config?.runtime?.waitForInputs ?? hasRequiredInputContracts(node);
      if (shouldWaitForInputs) {
        const waitDiagnostics = evaluateInputReadiness(node, nodeInputs);
        if (!waitDiagnostics.ready) {
          nextInputs[node.id] = nodeInputs;
          if (isActiveNode(node)) {
            const prevOutputs = outputs[node.id] ?? {};
            const blockedMessage = buildMissingInputsMessage(node, waitDiagnostics);
            const blockedOutputs: RuntimePortValues = {
              status: 'blocked',
              skipReason: 'missing_inputs',
              blockedReason: 'missing_inputs',
              requiredPorts: waitDiagnostics.requiredPorts,
              optionalPorts: waitDiagnostics.optionalPorts,
              waitingOnPorts: waitDiagnostics.waitingOnPorts,
              waitingOnDetails: waitDiagnostics.waitingOnDetails,
              message: blockedMessage,
            };
            const didBlockedChange = hashRuntimeValue(prevOutputs) !== hashRuntimeValue(blockedOutputs);
            if (didBlockedChange) {
              outputs[node.id] = blockedOutputs;
              changed = true;
              refreshDownstreamInputs(node.id, nextInputs);
            }
            blockedNodeIds.add(node.id);
            pushSkipEntry(node, nodeInputs, blockedOutputs, {
              status: 'blocked',
              reason: 'missing_inputs',
              iteration,
              waitDiagnostics,
            });
            recordNodeProfile(node, { durationMs: 0, status: 'skipped' });
            emitProfileEvent({
              type: 'node',
              runId: resolvedRunId,
              runStartedAt: resolvedRunStartedAt,
              nodeId: node.id,
              nodeType: node.type,
              iteration,
              status: 'skipped',
              durationMs: 0,
              reason: 'missing_inputs',
              requiredPorts: waitDiagnostics.requiredPorts,
              optionalPorts: waitDiagnostics.optionalPorts,
              waitingOnPorts: waitDiagnostics.waitingOnPorts,
            });
            if (onNodeFinish) {
              await onNodeFinish({
                runId: resolvedRunId,
                runStartedAt: resolvedRunStartedAt,
                node,
                nodeInputs,
                prevOutputs,
                nextOutputs: blockedOutputs,
                changed: didBlockedChange,
                iteration,
              });
            }
            if (markStep(node)) {
              break;
            }
          }
          continue;
        }
      }
      nextInputs[node.id] = nodeInputs;

      if (!isActiveNode(node)) {
        continue;
      }
      if (node.type === 'simulation') continue; // Already handled
      const prevOutputs = outputs[node.id] ?? {};
      let nextOutputs: RuntimePortValues = prevOutputs;

      if (skipNodeSet?.has(node.id)) {
        if (!outputs[node.id]) {
          outputs[node.id] = prevOutputs;
        }
        if (markStep(node)) {
          break;
        }
        continue;
      }

      const cacheMode = node.config?.runtime?.cache?.mode ?? 'auto';
      const cacheScope = resolveNodeCacheScope(node);
      const isWriteNode = isDatabaseWriteNode(node);
      const isEventNode = node.type === 'trigger';
      const isCacheable = cacheMode !== 'disabled' && !isWriteNode && !isEventNode;
      if (!isCacheable && inputHashes.has(node.id)) {
        inputHashes.delete(node.id);
        hashTimestamps.delete(node.id);
      }
      const cacheScopeFingerprint = buildNodeCacheScopeFingerprint({
        node,
        nodeInputs,
        scope: cacheScope,
        runId: resolvedRunId,
        activePathId,
        triggerContext: triggerContextRecord,
        triggerEvent,
        simulationEntityId,
        simulationEntityType,
      });
      let hashMs: number | undefined;
      let fenceHash: string;
      if (profileEnabled) {
        const hashStartMs = nowMs();
        fenceHash =
          node.type === 'database'
            ? buildDatabaseInputHash(node, nodeInputs, cacheScopeFingerprint)
            : buildNodeInputHash(node, nodeInputs, cacheScopeFingerprint);
        hashMs = nowMs() - hashStartMs;
        recordHashProfile(node, hashMs);
      } else {
        fenceHash =
          node.type === 'database'
            ? buildDatabaseInputHash(node, nodeInputs, cacheScopeFingerprint)
            : buildNodeInputHash(node, nodeInputs, cacheScopeFingerprint);
      }
      const inputHash = isCacheable ? fenceHash : null;
      const historyInputHash = fenceHash ?? null;
      const profileHashMs = typeof hashMs === 'number' ? hashMs : undefined;
      const canReusePrevOutputs = hasReusableNodeOutputsForCache(node, prevOutputs);
      const hasContextCacheMismatch = hasContextBoundCacheMismatch({
        node,
        nodeInputs,
        prevOutputs,
        triggerContext: triggerContextRecord,
        triggerEvent,
        simulationEntityId,
        simulationEntityType,
      });
      if (fenceHash) {
        const fenceSet = getRunFence(node.id);
        if (fenceSet.has(fenceHash) && canReusePrevOutputs && !hasContextCacheMismatch) {
          pushSkipEntry(node, nodeInputs, prevOutputs, {
            status: 'cached',
            reason: 'run_fence',
            iteration,
            inputHash: historyInputHash ?? null,
          });
          recordNodeProfile(node, { durationMs: 0, status: 'cached' });
          emitProfileEvent({
            type: 'node',
            runId: resolvedRunId,
            runStartedAt: resolvedRunStartedAt,
            nodeId: node.id,
            nodeType: node.type,
            iteration,
            status: 'cached',
            durationMs: 0,
            hashMs: profileHashMs,
            reason: 'run_fence',
          });
          if (onNodeFinish) {
            await onNodeFinish({
              runId: resolvedRunId,
              runStartedAt: resolvedRunStartedAt,
              node,
              nodeInputs,
              prevOutputs,
              nextOutputs: prevOutputs,
              changed: false,
              iteration,
              cached: true,
            });
          }
          if (markStep(node)) {
            break;
          }
          continue;
        }
      }
      const cacheTtlMs = node.config?.runtime?.cache?.ttlMs;
      const hashTs = hashTimestamps.get(node.id);
      const isTtlExpired =
        cacheTtlMs != null &&
        cacheTtlMs > 0 &&
        hashTs != null &&
        Date.now() - hashTs > cacheTtlMs;

      if (isTtlExpired && inputHashes.has(node.id)) {
        inputHashes.delete(node.id);
        hashTimestamps.delete(node.id);
      }

      const hasCachedOutput =
        isCacheable &&
        inputHash !== null &&
        inputHashes.get(node.id) === inputHash &&
        outputs[node.id] !== undefined &&
        canReusePrevOutputs &&
        !hasContextCacheMismatch &&
        !isTtlExpired;

      if (hasCachedOutput) {
        if (fenceHash) {
          getRunFence(node.id).add(fenceHash);
        }
        pushSkipEntry(node, nodeInputs, prevOutputs, {
          status: 'cached',
          reason: 'cache_hit',
          iteration,
          inputHash: historyInputHash ?? null,
        });
        recordNodeProfile(node, { durationMs: 0, status: 'cached' });
        emitProfileEvent({
          type: 'node',
          runId: resolvedRunId,
          runStartedAt: resolvedRunStartedAt,
          nodeId: node.id,
          nodeType: node.type,
          iteration,
          status: 'cached',
          durationMs: 0,
          hashMs: profileHashMs,
          reason: 'cache_hit',
        });
        if (onNodeFinish) {
          await onNodeFinish({
            runId: resolvedRunId,
            runStartedAt: resolvedRunStartedAt,
            node,
            nodeInputs,
            prevOutputs,
            nextOutputs: prevOutputs,
            changed: false,
            iteration,
            cached: true,
          });
        }
        if (markStep(node)) {
          break;
        }
        continue;
      }

      const sideEffectChannel = resolveSideEffectChannel(node);
      const sideEffectPolicy = resolveNodeSideEffectPolicy(node, sideEffectChannel);
      const sideEffectActivationHash = sideEffectPolicy ? fenceHash : null;
      const sideEffectIdempotencyKey = sideEffectPolicy
        ? buildNodeIdempotencyKey(node, sideEffectActivationHash)
        : null;
      if (sideEffectPolicy && sideEffectChannel) {
        const executionBucket = executed[sideEffectChannel];
        const activationSet = getSideEffectActivations(node.id);
        const hasExecutedForRun = executionBucket.has(node.id);
        const hasExecutedForActivation = sideEffectActivationHash
          ? activationSet.has(sideEffectActivationHash)
          : false;
        const shouldSkipForPolicy =
          sideEffectPolicy === 'per_run' ? hasExecutedForRun : hasExecutedForActivation;
        if (shouldSkipForPolicy) {
          const sideEffectDecision: SideEffectDecision =
            sideEffectPolicy === 'per_run' ? 'skipped_policy' : 'skipped_duplicate';
          pushSkipEntry(node, nodeInputs, prevOutputs, {
            status: 'cached',
            reason: 'side_effect_policy',
            iteration,
            inputHash: historyInputHash ?? null,
            sideEffectPolicy,
            sideEffectDecision,
            activationHash: sideEffectActivationHash,
            idempotencyKey: sideEffectIdempotencyKey,
          });
          recordNodeProfile(node, { durationMs: 0, status: 'cached' });
          emitProfileEvent({
            type: 'node',
            runId: resolvedRunId,
            runStartedAt: resolvedRunStartedAt,
            nodeId: node.id,
            nodeType: node.type,
            iteration,
            status: 'skipped',
            durationMs: 0,
            hashMs: profileHashMs,
            reason: 'side_effect_policy',
            sideEffectPolicy,
            sideEffectDecision,
            activationHash: sideEffectActivationHash ?? undefined,
            idempotencyKey: sideEffectIdempotencyKey ?? undefined,
          });
          if (onNodeFinish) {
            await onNodeFinish({
              runId: resolvedRunId,
              runStartedAt: resolvedRunStartedAt,
              node,
              nodeInputs,
              prevOutputs,
              nextOutputs: prevOutputs,
              changed: false,
              iteration,
              cached: true,
            });
          }
          if (markStep(node)) {
            break;
          }
          continue;
        }
        if (sideEffectPolicy === 'per_activation') {
          executionBucket.delete(node.id);
        }
      }

      const handler = HANDLERS[node.type];
      const nodeStartMs = nowMs();
      if (handler) {
        ensureNotCancelled(nextInputs, node.id);
        if (onNodeStart) {
          await onNodeStart({
            runId: resolvedRunId,
            runStartedAt: resolvedRunStartedAt,
            node,
            nodeInputs,
            prevOutputs,
            iteration,
          });
        }
        try {
          ensureNotCancelled(nextInputs, node.id);
          const timeoutMs = resolveNodeTimeoutMs(node);
          const retryAttempts = node.config?.runtime?.retry?.attempts ?? 1;
          const retryBackoffMs = node.config?.runtime?.retry?.backoffMs ?? DEFAULT_RETRY_BACKOFF_MS;
          const result = await withRetries(
            () =>
              withTimeout(
                Promise.resolve(
                  handler({
                    node,
                    nodeInputs,
                    prevOutputs,
                    edges: sanitizedEdges,
                    nodes,
                    nodeById,
                    runId: resolvedRunId,
                    runStartedAt: resolvedRunStartedAt,
                    runMeta,
                    activePathId,
                    triggerNodeId,
                    triggerEvent,
                    triggerContext,
                    deferPoll,
                    skipAiJobs,
                    now,
                    abortSignal: control?.signal,
                    allOutputs: outputs,
                    allInputs: nextInputs,
                    fetchEntityCached,
                    reportAiPathsError,
                    toast,
                    simulationEntityType,
                    simulationEntityId,
                    resolvedEntity,
                    fallbackEntityId,
                    strictFlowMode,
                    sideEffectControl:
                      sideEffectPolicy && sideEffectChannel
                        ? {
                          policy: sideEffectPolicy,
                          decision: 'executed',
                          activationHash: sideEffectActivationHash,
                          idempotencyKey: sideEffectIdempotencyKey,
                        }
                        : undefined,
                    executed,
                  })
                ),
                timeoutMs,
                `${node.type}:${node.id}`
              ),
            retryAttempts,
            retryBackoffMs,
            `${node.type}:${node.id}`,
            control?.signal
          );
          ensureNotCancelled(nextInputs, node.id);
          nextOutputs = result;
          if (sideEffectPolicy && sideEffectActivationHash) {
            getSideEffectActivations(node.id).add(sideEffectActivationHash);
          }
          const durationMs = profileEnabled ? nowMs() - nodeStartMs : 0;
          recordNodeProfile(node, { durationMs, status: 'executed' });
          emitProfileEvent({
            type: 'node',
            runId: resolvedRunId,
            runStartedAt: resolvedRunStartedAt,
            nodeId: node.id,
            nodeType: node.type,
            iteration,
            status: 'executed',
            durationMs,
            hashMs: profileHashMs,
            sideEffectPolicy: sideEffectPolicy ?? undefined,
            sideEffectDecision: sideEffectPolicy ? 'executed' : undefined,
            activationHash: sideEffectActivationHash ?? undefined,
            idempotencyKey: sideEffectIdempotencyKey ?? undefined,
          });
        } catch (error) {
          if (error instanceof GraphExecutionCancelled) {
            throw error;
          }
          if (control?.signal?.aborted || isAbortError(error)) {
            throwCancelled(nextInputs, node.id, error);
          }
          const durationMs = profileEnabled ? nowMs() - nodeStartMs : 0;
          recordNodeProfile(node, { durationMs, status: 'error' });
          emitProfileEvent({
            type: 'node',
            runId: resolvedRunId,
            runStartedAt: resolvedRunStartedAt,
            nodeId: node.id,
            nodeType: node.type,
            iteration,
            status: 'error',
            durationMs,
            hashMs: profileHashMs,
            sideEffectPolicy: sideEffectPolicy ?? undefined,
            sideEffectDecision: sideEffectPolicy ? 'failed' : undefined,
            activationHash: sideEffectActivationHash ?? undefined,
            idempotencyKey: sideEffectIdempotencyKey ?? undefined,
          });
          if (recordHistory) {
            const entry: RuntimeHistoryEntry = {
              timestamp: new Date().toISOString(),
              runId: resolvedRunId,
              runStartedAt: resolvedRunStartedAt,
              pathId: resolvedPathId ?? null,
              pathName: resolvedPathName ?? null,
              nodeId: node.id,
              nodeType: node.type,
              nodeTitle: node.title ?? null,
              status: 'failed',
              iteration,
              inputs: nodeInputs,
              outputs: prevOutputs,
              inputHash: historyInputHash ?? null,
              sideEffectPolicy: sideEffectPolicy ?? undefined,
              sideEffectDecision: sideEffectPolicy ? 'failed' : undefined,
              activationHash: sideEffectActivationHash ?? null,
              idempotencyKey: sideEffectIdempotencyKey ?? null,
              error: error instanceof Error ? error.message : String(error),
              inputsFrom: buildInputLinks(node.id, nodeInputs),
              outputsTo: buildOutputLinks(node.id, prevOutputs),
              delayMs: node.type === 'delay' ? (node.config?.delay?.ms ?? 300) : null,
              durationMs: Math.round(nowMs() - nodeStartMs),
            };
            pushHistoryEntry(node.id, entry);
          }
          if (onNodeError) {
            await onNodeError({
              runId: resolvedRunId,
              runStartedAt: resolvedRunStartedAt,
              node,
              nodeInputs,
              prevOutputs,
              error,
              iteration,
            });
          }
          const historySnapshot =
            recordHistory && history.size
              ? (cloneValue(Object.fromEntries(history)) as Record<string, RuntimeHistoryEntry[]>)
              : undefined;
          const errorState: RuntimeState = {
            status: 'running',
            nodeStatuses: {},
            nodeOutputs: cloneValue(outputs),
            variables: {},
            events: [],
            runId: resolvedRunId,
            runStartedAt: resolvedRunStartedAt,
            inputs: cloneValue(nextInputs),
            outputs: cloneValue(outputs),
            hashes: inputHashes.size ? Object.fromEntries(inputHashes) : undefined,
            hashTimestamps: hashTimestamps.size ? Object.fromEntries(hashTimestamps) : undefined,
            history: historySnapshot,
          };
          const message = error instanceof Error ? error.message : String(error);
          throw new GraphExecutionError(message, errorState, node.id, error);
        }
      } else {
        // Default behavior for unknown nodes or if no outputs changed
        if (!outputs[node.id]) {
          nextOutputs = prevOutputs;
        }
      }
      const outputStatus =
        typeof nextOutputs['status'] === 'string'
          ? nextOutputs['status'].trim().toLowerCase()
          : '';
      if (outputStatus === 'blocked') {
        blockedNodeIds.add(node.id);
      }

      if (recordHistory) {
        const entry: RuntimeHistoryEntry = {
          timestamp: new Date().toISOString(),
          runId: resolvedRunId,
          runStartedAt: resolvedRunStartedAt,
          pathId: resolvedPathId ?? null,
          pathName: resolvedPathName ?? null,
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle: node.title ?? null,
          status: node.type === 'delay' ? 'delayed' : 'completed',
          iteration,
          inputs: nodeInputs,
          outputs: nextOutputs,
          inputHash: historyInputHash ?? null,
          sideEffectPolicy: sideEffectPolicy ?? undefined,
          sideEffectDecision: sideEffectPolicy ? 'executed' : undefined,
          activationHash: sideEffectActivationHash ?? null,
          idempotencyKey: sideEffectIdempotencyKey ?? null,
          inputsFrom: buildInputLinks(node.id, nodeInputs),
          outputsTo: buildOutputLinks(node.id, nextOutputs),
          delayMs: node.type === 'delay' ? (node.config?.delay?.ms ?? 300) : null,
          durationMs: Math.round(nowMs() - nodeStartMs),
        };
        pushHistoryEntry(node.id, entry);
      }
      if (fenceHash) {
        getRunFence(node.id).add(fenceHash);
      }
      if (isCacheable && inputHash) {
        inputHashes.set(node.id, inputHash);
        hashTimestamps.set(node.id, Date.now());
      }
      const didChange = hashRuntimeValue(prevOutputs) !== hashRuntimeValue(nextOutputs);
      if (didChange) {
        const nextEntityId = readEntityIdFromPorts(nextOutputs);
        const nextEntityType = readEntityTypeFromPorts(nextOutputs);
        if (nextEntityId) {
          simulationEntityId = nextEntityId;
        }
        if (nextEntityType) {
          simulationEntityType = nextEntityType;
        }
        if (nextEntityId || nextEntityType) {
          fallbackEntityId = simulationEntityId ?? triggerEntityId ?? null;
        }
        outputs[node.id] = nextOutputs;
        changed = true;
        refreshDownstreamInputs(node.id, nextInputs);
      }
      if (handler && onNodeFinish) {
        await onNodeFinish({
          runId: resolvedRunId,
          runStartedAt: resolvedRunStartedAt,
          node,
          nodeInputs,
          prevOutputs,
          nextOutputs,
          changed: didChange,
          iteration,
        });
      }
      if (markStep(node)) {
        break;
      }
    }

    inputs = nextInputs;
    if (onIterationEnd) {
      await onIterationEnd({
        runId: resolvedRunId,
        runStartedAt: resolvedRunStartedAt,
        iteration,
        inputs,
        outputs,
        hashes: inputHashes.size ? Object.fromEntries(inputHashes) : undefined,
        hashTimestamps: hashTimestamps.size ? Object.fromEntries(hashTimestamps) : undefined,
        history:
          recordHistory && history.size ? Object.fromEntries(history) : undefined,
      });
    }
    if (profileEnabled) {
      try {
        const iterationDurationMs = nowMs() - iterationStartMs;
        emitProfileEvent({
          type: 'iteration',
          runId: resolvedRunId,
          runStartedAt: resolvedRunStartedAt,
          iteration,
          durationMs: iterationDurationMs,
          changed,
        });
      } catch (profileError) {
        reportAiPathsError(profileError, {
          service: 'ai-paths-runtime',
          runId: resolvedRunId,
        }, 'Profiling event emission failed');
      }
    }
    iterationCount += 1;
    if (haltReason === 'step_limit') break;
    if (!changed) {
      if (blockedNodeIds.size > 0) {
        haltReason = 'blocked';
        haltIteration = iteration;
      }
      break;
    }
  }

  const result: RuntimeState = {
    status: 'idle',
    nodeStatuses: {},
    nodeOutputs: cloneValue(outputs),
    variables: {},
    events: [],
    runId: resolvedRunId,
    runStartedAt: resolvedRunStartedAt,
    inputs,
    outputs,
    hashes: inputHashes.size ? Object.fromEntries(inputHashes) : undefined,
    hashTimestamps: hashTimestamps.size ? Object.fromEntries(hashTimestamps) : undefined,
    history: recordHistory && history.size ? Object.fromEntries(history) : undefined,
  };
  if ((haltReason as RuntimeExecutionHaltReason | null) === 'step_limit') {
    emitHalt('step_limit', haltIteration);
  } else if (haltReason === 'blocked') {
    emitHalt('blocked', haltIteration);
  } else {
    emitHalt('completed', Math.max(0, iterationCount - 1));
  }
  if ((haltReason as RuntimeExecutionHaltReason | null) !== 'step_limit') {
    try {
      if (profile?.onSummary && nodeProfile) {
        const durationMs = nowMs() - profileRunStartMs;
        const nodesSummary = Array.from(nodeProfile.values()).map((stats: RuntimeProfileNodeStats) => ({
          ...stats,
          avgMs: stats.count > 0 ? stats.totalMs / stats.count : 0,
          hashAvgMs: stats.hashCount > 0 ? stats.hashTotalMs / stats.hashCount : 0,
        }));
        const hottestNodes = nodesSummary
          .slice()
          .sort((a, b) => b.totalMs - a.totalMs)
          .slice(0, Math.min(5, nodesSummary.length));
        
        profile.onSummary({
          runId: resolvedRunId,
          durationMs,
          iterationCount,
          nodeCount: nodes.length,
          edgeCount: sanitizedEdges.length,
          nodes: nodesSummary,
          hottestNodes,
        });
      }
    } catch (summaryError) {
      reportAiPathsError(summaryError, {
        service: 'ai-paths-runtime',
        runId: resolvedRunId,
      }, 'Profiling summary emission failed');
    }
    
    if (profileEnabled) {
      try {
        const durationMs = nowMs() - profileRunStartMs;
        emitProfileEvent({
          type: 'run',
          phase: 'end',
          runId: resolvedRunId,
          runStartedAt: resolvedRunStartedAt,
          nodeCount: nodes.length,
          edgeCount: sanitizedEdges.length,
          durationMs,
          iterationCount,
        });
      } catch (finalProfileError) {
        reportAiPathsError(finalProfileError, {
          service: 'ai-paths-runtime',
          runId: resolvedRunId,
        }, 'Final profiling event emission failed');
      }
    }
  }
  return result;
}

const getIteratorMaxSteps = (nodes: AiNode[]): number => {
  const candidates = nodes
    .filter((node: AiNode): boolean => node.type === 'iterator')
    .map((node: AiNode) => node.config?.iterator?.maxSteps)
    .filter((value: number | undefined): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0);
  return candidates.length > 0 ? Math.min(...candidates) : 50;
};

const hasPendingIteratorAdvance = (nodes: AiNode[], state: RuntimeState): boolean =>
  nodes.some((node: AiNode): boolean => {
    if (node.type !== 'iterator') return false;
    if (node.config?.iterator?.autoContinue === false) return false;
    const status = state.outputs?.[node.id]?.['status'];
    return status === 'advance_pending';
  });

/**
 * Iterator nodes are intentionally non-cacheable and "step" only once per evaluateGraph call,
 * because downstream side-effect nodes (AI/jobs/http/etc) are guarded by `executed.*` sets.
 *
 * This helper re-runs evaluateGraph (seeding the previous outputs/hashes/history) until all
 * iterator nodes have either completed or are waiting for a callback.
 */
export async function evaluateGraphWithIteratorAutoContinue(options: EvaluateGraphOptions): Promise<RuntimeState> {
  const buildRunId = (): string =>
    `run_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
  const resolvedRunId = options.runId ?? options.seedRunId ?? buildRunId();
  const resolvedRunStartedAt =
    options.runStartedAt ?? options.seedRunStartedAt ?? new Date().toISOString();
  const baseOptions: EvaluateGraphOptions = {
    ...options,
    runId: resolvedRunId,
    runStartedAt: resolvedRunStartedAt,
  };
  
  try {
    const hasStepLimit =
      typeof options.control?.stepLimit === 'number' && options.control.stepLimit > 0;
    if (options.control?.mode === 'step' || hasStepLimit) {
      return await evaluateGraph(baseOptions);
    }
    let current = await evaluateGraph(baseOptions);
    if (!options.nodes.some((node: AiNode): boolean => node.type === 'iterator')) {
      return current;
    }

    const maxSteps = getIteratorMaxSteps(options.nodes);
    for (let step = 0; step < maxSteps; step += 1) {
      if (!hasPendingIteratorAdvance(options.nodes, current)) break;
      current = await evaluateGraph({
        ...baseOptions,
        seedOutputs: current.outputs,
        seedHashes: (current.hashes) ?? undefined,
        seedHashTimestamps:
          (current.hashTimestamps) ??
          undefined,
        seedHistory: current.history,
        seedRunId: current.runId ?? resolvedRunId,
        seedRunStartedAt: current.runStartedAt ?? resolvedRunStartedAt,
      });
    }
    return current;
  } catch (error) {
    options.reportAiPathsError(error, {
      service: 'ai-paths-engine',
      action: 'evaluateWithIterator',
      runId: resolvedRunId,
    });
    throw error;
  }
}
