import type {
  AiNode,
  Edge,
  RuntimeHistoryEntry,
  RuntimeHistoryLink,
  RuntimePortValues,
  RuntimeState,
} from '@/shared/types/domain/ai-paths';

import { DEFAULT_DB_QUERY } from '../constants';
import {
  appendInputValue,
  cloneValue,
  coerceInput,
  hashRuntimeValue,
  sanitizeEdges,
  getPortDataTypes,
  isValueCompatibleWithTypes,
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
  handleAgent,
  handleBundle,
  handleCompare,
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
  handleStringMutator,
  handleNotification,
  handleParser,
  handlePoll,
  handlePrompt,
  handleRegex,
  handleIterator,
  handleRouter,
  handleLearnerAgent,
  handleTemplate,
  handleTrigger,
  handleValidator,
  handleViewer,
} from './handlers';
import { buildDbQueryPayload, extractImageUrls } from './utils';

type ToastFn = (message: string, options?: Partial<{ variant: 'success' | 'error' | 'info'; duration: number }>) => void;

export type RuntimeProfileEvent =
  | {
    type: 'run';
    phase: 'start' | 'end';
    runId: string;
    runStartedAt: string;
    nodeCount: number;
    edgeCount: number;
    durationMs?: number;
    iterationCount?: number;
  }
  | {
    type: 'iteration';
    runId: string;
    runStartedAt: string;
    iteration: number;
    durationMs: number;
    changed: boolean;
  }
  | {
    type: 'node';
    runId: string;
    runStartedAt: string;
    nodeId: string;
    nodeType: string;
    iteration: number;
    status: 'executed' | 'cached' | 'skipped' | 'error';
    durationMs: number;
    hashMs?: number | undefined;
    reason?: string | undefined;
  };

export type RuntimeProfileNodeStats = {
  nodeId: string;
  nodeType: string;
  count: number;
  totalMs: number;
  maxMs: number;
  cachedCount: number;
  skippedCount: number;
  errorCount: number;
  hashCount: number;
  hashTotalMs: number;
  hashMaxMs: number;
};

export type RuntimeProfileSummary = {
  runId: string;
  durationMs: number;
  iterationCount: number;
  nodeCount: number;
  edgeCount: number;
  nodes: Array<
  RuntimeProfileNodeStats & {
    avgMs: number;
    hashAvgMs: number;
  }
  >;
  hottestNodes: Array<
  RuntimeProfileNodeStats & {
    avgMs: number;
    hashAvgMs: number;
  }
  >;
};

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

export type RuntimeExecutionHaltReason = 'step_limit' | 'completed' | 'cancelled';

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
  seedRunId?: string | undefined;
  seedRunStartedAt?: string | undefined;
  triggerNodeId?: string | undefined;
  triggerEvent?: string | undefined;
  triggerContext?: Record<string, unknown> | null | undefined;
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
  toast: ToastFn;
};

const CACHE_VERSION = 1;

const buildNodeInputHash = (
  node: AiNode,
  nodeInputs: RuntimePortValues
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
  });

const buildDatabaseInputHash = (
  node: AiNode,
  nodeInputs: RuntimePortValues
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
    });
  }
  if (operation === 'update') {
    const sourcePorts = mappings.length
      ? mappings
        .map((mapping) => mapping.sourcePort)
        .filter((port): port is string => typeof port === 'string' && port.trim().length > 0)
      : [node.inputs.includes('result') ? 'result' : 'content_en'];
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
    });
  }
  return hashRuntimeValue({
    v: CACHE_VERSION,
    id: node.id,
    type: node.type,
    config: baseConfig,
    inputs,
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

const HANDLERS: Record<string, NodeHandler> = {
  trigger: handleTrigger,
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
  constant: handleConstant,
  math: handleMath,
  compare: handleCompare,
  router: handleRouter,
  delay: handleDelay,
  poll: handlePoll,
  http: handleHttp,
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
  seedRunId,
  seedRunStartedAt,
  triggerNodeId,
  triggerEvent,
  triggerContext,
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

  // Prime entityCache from seed simulation outputs so subsequent fetchEntityCached
  // calls hit the cache instead of re-fetching from the database.
  if (seedOutputs) {
    for (const node of nodes) {
      if (node.type !== 'simulation') continue;
      const seedOut = seedOutputs[node.id];
      if (!seedOut) continue;
      const seedCtx =
        typeof (seedOut)['context'] === 'object' &&
        (seedOut)['context'] !== null
          ? ((seedOut)['context'] as Record<string, unknown>)
          : null;
      const seedEnt =
        seedCtx?.['entity'] !== undefined &&
        seedCtx['entity'] !== null &&
        typeof seedCtx['entity'] === 'object' &&
        Object.keys(seedCtx['entity'] as Record<string, unknown>).length > 1
          ? (seedCtx['entity'] as Record<string, unknown>)
          : null;
      if (!seedEnt) continue;
      const simEntityType =
        node.config?.simulation?.entityType?.trim().toLowerCase() || 'product';
      const normalizedType =
        simEntityType === 'products' ? 'product' : simEntityType === 'notes' ? 'note' : simEntityType;
      const simEntityId =
        node.config?.simulation?.entityId?.trim() ||
        node.config?.simulation?.productId?.trim() ||
        null;
      if (simEntityId && normalizedType) {
        const cacheKey = `${normalizedType}:${simEntityId}`;
        if (!entityCache.has(cacheKey)) {
          entityCache.set(cacheKey, seedEnt);
        }
      }
    }
  }

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

  const hasMeaningfulValue = (value: unknown): boolean => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
    return true;
  };

  const hasRequiredInputs = (node: AiNode, rawInputs: RuntimePortValues): boolean => {
    const incoming = incomingEdgesByNode.get(node.id) ?? [];
    if (incoming.length === 0) return true;
    if (node.type !== 'database') {
      const connectedPorts = new Set<string>();
      incoming.forEach((edge: Edge) => {
        if (edge.toPort) connectedPorts.add(edge.toPort);
      });
      if (connectedPorts.size === 0) return true;
      return Array.from(connectedPorts).every((port: string) =>
        (rawInputs)[port] !== undefined
      );
    }
    const connectedPorts = new Set<string>();
    incoming.forEach((edge: Edge) => {
      if (edge.toPort) connectedPorts.add(edge.toPort);
    });
    if (connectedPorts.size === 0) return true;
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

    if (operation === 'query') {
      const queryPorts = ['aiQuery', 'query', 'queryCallback'];
      const idPorts = ['value', 'entityId', 'productId'];
      const queryGroup = [...queryPorts, ...idPorts];
      if (anyConnected(queryGroup) && !hasAnyValue(queryGroup)) {
        return false;
      }
      const nonQueryPorts = Array.from(connectedPorts).filter(
        (port: string) => !queryGroup.includes(port)
      );
      if (!allConnectedHaveValues(nonQueryPorts)) {
        return false;
      }
      return true;
    }

    if (operation === 'delete') {
      const idPorts = ['entityId', 'productId', 'value'];
      if (anyConnected(idPorts)) {
        return hasAnyValue(idPorts);
      }
      return true;
    }

    if (operation === 'insert') {
      // When a query template is configured, the payload comes from
      // config (queryTemplate) rather than from an input port.
      const hasTemplatePayload = Boolean(dbConfig.query?.queryTemplate?.trim());
      if (hasTemplatePayload) return true;
      const writeSource = dbConfig.writeSource ?? 'bundle';
      const insertPorts = [writeSource, 'queryCallback'];
      const hasPayload = hasAnyValue(insertPorts);
      if (connectedPorts.has(writeSource) || connectedPorts.has('queryCallback')) {
        return hasPayload;
      }
      return hasPayload;
    }

    if (operation === 'update') {
      const mappings = Array.isArray(dbConfig.mappings) ? dbConfig.mappings : [];
      const sourcePorts = mappings.length
        ? mappings
          .map((mapping) => mapping?.sourcePort)
          .filter((port): port is string => typeof port === 'string' && port.trim().length > 0)
        : [node.inputs.includes('result') ? 'result' : 'content_en'];
      const connectedSources = sourcePorts.filter((port: string) => connectedPorts.has(port));
      if (connectedSources.length > 0) {
        const allSourcesReady = connectedSources.every((port: string) =>
          hasMeaningfulValue(coerceInput(rawInputs[port]))
        );
        if (!allSourcesReady) return false;
      }

      const entityType = (dbConfig.entityType ?? 'product').trim().toLowerCase();
      if (entityType !== 'custom') {
        const idPorts = ['entityId', 'productId', 'value'];
        if (anyConnected(idPorts) && !hasAnyValue(idPorts)) {
          return false;
        }
      }

      if ((dbConfig.updateStrategy ?? 'one') === 'many') {
        const queryPorts = ['aiQuery', 'query', 'queryCallback', 'value', 'entityId', 'productId'];
        if (anyConnected(queryPorts) && !hasAnyValue(queryPorts)) {
          return false;
        }
      }
      return true;
    }

    return true;
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

  if (triggerNodeId) {
    const adjacency = new Map<string, Set<string>>();
    sanitizedEdges.forEach((edge: Edge) => {
      if (!edge.from || !edge.to) return;
      const fromSet = adjacency.get(edge.from) ?? new Set<string>();
      fromSet.add(edge.to);
      adjacency.set(edge.from, fromSet);
      const toSet = adjacency.get(edge.to) ?? new Set<string>();
      toSet.add(edge.from);
      adjacency.set(edge.to, toSet);
    });
    const queue = [triggerNodeId];
    activeNodeIds.add(triggerNodeId);
    while (queue.length) {
      const current = queue.shift();
      if (!current) continue;
      const neighbors = adjacency.get(current);
      if (!neighbors) continue;
      neighbors.forEach((neighbor: string) => {
        if (activeNodeIds.has(neighbor)) return;
        activeNodeIds.add(neighbor);
        queue.push(neighbor);
      });
    }
  }
  const alwaysActiveTypes = new Set(['parser', 'prompt', 'viewer', 'database']);
  const isActiveNode = (node: AiNode): boolean =>
    !triggerNodeId ||
    activeNodeIds.has(node.id) ||
    alwaysActiveTypes.has(node.type);
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

  if (triggerNodeId) {
    const simulationEdge = sanitizedEdges.find(
      (edge: Edge) => edge.to === triggerNodeId && edge.toPort === 'context'
    );
    if (simulationEdge) {
      const simNode = nodes.find(
        (node: AiNode) => node.id === simulationEdge.from && node.type === 'simulation'
      );
      simulationEntityType =
        normalizeEntityType(simNode?.config?.simulation?.entityType) ?? 'product';
      simulationEntityId =
        simNode?.config?.simulation?.entityId?.trim() ||
        simNode?.config?.simulation?.productId?.trim() ||
        null;
    }
  }

  const resolvedEntity =
    simulationEntityId && simulationEntityType
      ? await fetchEntityCached(simulationEntityType, simulationEntityId)
      : triggerEntityId && triggerEntityType
        ? await fetchEntityCached(triggerEntityType, triggerEntityId)
        : null;
  const fallbackEntityId = simulationEntityId ?? triggerEntityId ?? null;
  ensureNotCancelled();

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
        if (nodeType !== 'trigger' && nodeType !== 'simulation' && nodeType !== 'context') {
          continue;
        }
        applyRecord(output);
        if (pickString(next['entityId']) && pickString(next['productId']) && pickString(next['entityType'])) {
          break;
        }
      }
    }

    const resolvedEntityId = pickString(next['entityId']);
    const resolvedEntityType = pickString(next['entityType']);

    if (!resolvedEntityId && resolvedEntity && typeof resolvedEntity === 'object') {
      const fallbackId =
        pickString(resolvedEntity['id']) ??
        pickString(resolvedEntity['_id']);
      if (fallbackId) {
        next['entityId'] = fallbackId;
      }
    }
    if (!pickString(next['productId']) && pickString(next['entityId'])) {
      next['productId'] = pickString(next['entityId']);
    }
    if (!resolvedEntityType && simulationEntityType) {
      next['entityType'] = simulationEntityType;
    }
    if (!hasExplicitValue(next['value'])) {
      const fallbackValue =
        pickString(next['entityId']) ??
        pickString(next['productId']);
      if (fallbackValue) {
        next['value'] = fallbackValue;
      }
    }
    return next;
  };

  // Pre-calculate simulation nodes
  for (const node of nodes) {
    if (node.type !== 'simulation' && !isActiveNode(node)) {
      continue;
    }
    if (node.type === 'simulation') {
      const entityType =
        normalizeEntityType(node.config?.simulation?.entityType) || 'product';
      const entityId =
        node.config?.simulation?.entityId?.trim() ||
        node.config?.simulation?.productId?.trim() ||
        null;

      // Check if seedOutputs already provided enriched simulation data for this node.
      const existingSeed = outputs[node.id];
      const existingContext =
        existingSeed &&
        typeof (existingSeed)['context'] === 'object' &&
        (existingSeed)['context'] !== null
          ? ((existingSeed)['context'] as Record<string, unknown>)
          : null;
      const seedEntity =
        existingContext?.['entity'] !== undefined &&
        existingContext['entity'] !== null &&
        typeof existingContext['entity'] === 'object'
          ? (existingContext['entity'] as Record<string, unknown>)
          : null;
      const seedHasEntity = seedEntity !== null && Object.keys(seedEntity).length > 1;

      if (seedHasEntity) {
        // Seed data already has a fully-enriched entity — skip re-fetch.
        // Prime the entityCache so downstream nodes can use fetchEntityCached.
        if (entityId && entityType) {
          const cacheKey = `${entityType}:${entityId}`;
          if (!entityCache.has(cacheKey)) {
            entityCache.set(cacheKey, seedEntity);
          }
        }
        // Keep outputs[node.id] as-is from the seed.
      } else {
        const entity =
          entityId && entityType ? await fetchEntityCached(entityType, entityId) : null;
        const contextPayload: Record<string, unknown> = {
          entityType,
          entityId,
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
        outputs[node.id] = {
          context: contextPayload,
          entityId,
          entityType,
          productId: entityType === 'product' ? entityId : undefined,
        };
      }
    }
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
      const shouldWaitForInputs = node.config?.runtime?.waitForInputs ?? false;
      if (shouldWaitForInputs) {
        if (!hasRequiredInputs(node, nodeInputs)) {
          nextInputs[node.id] = nodeInputs;
          if (isActiveNode(node)) {
            const prevOutputs = outputs[node.id] ?? {};
            pushSkipEntry(node, nodeInputs, prevOutputs, {
              status: 'skipped',
              reason: 'missing_inputs',
              iteration,
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
            });
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
      const isWriteNode = isDatabaseWriteNode(node);
      const isCacheable = cacheMode !== 'disabled' && !isWriteNode;
      if (!isCacheable && inputHashes.has(node.id)) {
        inputHashes.delete(node.id);
        hashTimestamps.delete(node.id);
      }
      let hashMs: number | undefined;
      let fenceHash: string;
      if (profileEnabled) {
        const hashStartMs = nowMs();
        fenceHash =
          node.type === 'database'
            ? buildDatabaseInputHash(node, nodeInputs)
            : buildNodeInputHash(node, nodeInputs);
        hashMs = nowMs() - hashStartMs;
        recordHashProfile(node, hashMs);
      } else {
        fenceHash =
          node.type === 'database'
            ? buildDatabaseInputHash(node, nodeInputs)
            : buildNodeInputHash(node, nodeInputs);
      }
      const inputHash = isCacheable ? fenceHash : null;
      const historyInputHash = fenceHash ?? null;
      const profileHashMs = typeof hashMs === 'number' ? hashMs : undefined;
      if (fenceHash) {
        const fenceSet = getRunFence(node.id);
        if (fenceSet.has(fenceHash)) {
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
        outputs[node.id] = nextOutputs;
        changed = true;
        const outgoing = outgoingEdgesByNode.get(node.id) ?? [];
        if (outgoing.length > 0) {
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
        }
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
    if (!changed) break;
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
  if (haltReason === 'step_limit') {
    emitHalt('step_limit', haltIteration);
  } else {
    emitHalt('completed', Math.max(0, iterationCount - 1));
  }
  if (haltReason !== 'step_limit') {
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
        seedHashes: (current.hashes as Record<string, string> | undefined) ?? undefined,
        seedHashTimestamps:
          (current.hashTimestamps as Record<string, number> | undefined) ??
          undefined,
        seedHistory: current.history as Record<string, RuntimeHistoryEntry[]> | undefined,
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
