import 'server-only';

import type { ContextNode } from '@/shared/contracts/ai-context-registry';
import type {
  AiNode,
  AiPathRunEventRecord,
  AiPathRunNodeRecord,
  AiPathRunRecord,
} from '@/shared/contracts/ai-paths';
import { retrievalService, registryBackend } from '@/features/ai/ai-context-registry/server';
import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import { isObjectRecord } from '@/shared/utils/object-utils';

import type {
  SystemLogRuntimeContextAdapter,
  SystemLogRuntimeContextHydrationResult,
} from '../types';

const AI_PATH_RUN_CONTEXT_ROOT_IDS = [
  'page:ai-paths',
  'action:run-ai-path',
  'collection:ai-path-runs',
] as const;

const MAX_EXECUTED_MODELS = 8;
const MAX_FAILED_NODES = 8;
const MAX_RECENT_ERROR_EVENTS = 8;
const MAX_SAMPLE_STRINGS = 3;
const MAX_REGISTRY_NODES = 12;
const MAX_REGISTRY_TAGS = 6;
const MAX_REGISTRY_RELATIONSHIPS = 6;
const MAX_DESCRIPTION_LENGTH = 240;
const MAX_SAMPLE_LENGTH = 180;
const MAX_ERROR_MESSAGE_LENGTH = 220;

const COMPLETED_NODE_STATUSES = new Set(['completed', 'cached']);
const FAILED_NODE_STATUSES = new Set(['failed', 'timeout', 'canceled', 'cancelled']);
const WARNING_NODE_STATUSES = new Set(['blocked', 'skipped']);
const RECENT_ERROR_EVENT_LEVELS = new Set(['error', 'fatal', 'warn']);

type CompactRegistryNode = {
  id: string;
  kind: ContextNode['kind'];
  name: string;
  description: string;
  tags: string[];
  relationships: Array<{ type: string; targetId: string }>;
};

export type AiPathRunStaticContext = {
  kind: 'ai_path_run';
  runId: string;
  pathId: string | null;
  pathName: string | null;
  status: string;
  entityId: string | null;
  entityType: string | null;
  triggerEvent: string | null;
  triggerNodeId: string | null;
  runtimeFingerprint: string | null;
  timestamps: {
    createdAt: string;
    startedAt: string | null;
    finishedAt: string | null;
    deadLetteredAt: string | null;
  };
  summary: {
    totalNodes: number;
    completedNodes: number;
    failedNodes: number;
    warningNodes: number;
    totalEvents: number;
    errorEvents: number;
    warnEvents: number;
  };
  executedModels: Array<{
    nodeId: string;
    nodeTitle: string | null;
    status: string;
    attempt: number;
    modelId: string | null;
    usesBrainDefault: boolean;
    startedAt: string | null;
    finishedAt: string | null;
    errorMessage: string | null;
  }>;
  failedNodes: Array<{
    nodeId: string;
    nodeType: string;
    nodeTitle: string | null;
    status: string;
    attempt: number;
    errorMessage: string | null;
  }>;
  recentErrorEvents: Array<{
    createdAt: string;
    level: string;
    message: string;
    nodeId: string | null;
    nodeType: string | null;
    nodeTitle: string | null;
  }>;
  preflight: {
    compileErrorCount: number;
    compileWarningCount: number;
    compileFindingCount: number;
    validationErrorCount: number;
    validationWarningCount: number;
    dependencyErrorCount: number;
    dependencyWarningCount: number;
    dependencyStrictReady: boolean | null;
    dataContractErrorCount: number;
    dataContractWarningCount: number;
    runWarningCount: number;
    samples: string[];
  };
  registry: {
    version: string;
    refs: string[];
    nodes: CompactRegistryNode[];
  };
};

const truncate = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) return value;
  if (maxLength <= 3) return value.slice(0, maxLength);
  return `${value.slice(0, maxLength - 3)}...`;
};

const readTrimmedString = (value: unknown, maxLength: number = MAX_SAMPLE_LENGTH): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return truncate(trimmed, maxLength);
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  isObjectRecord(value) ? value : null;

const toSampleString = (value: unknown): string | null => {
  const direct = readTrimmedString(value);
  if (direct) return direct;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    if (value === null || value === undefined) return null;
    return truncate(JSON.stringify(value), MAX_SAMPLE_LENGTH);
  } catch {
    return null;
  }
};

const collectSamples = (...values: unknown[]): string[] => {
  const seen = new Set<string>();
  const samples: string[] = [];

  const append = (value: unknown): void => {
    if (samples.length >= MAX_SAMPLE_STRINGS) return;
    if (Array.isArray(value)) {
      value.forEach(append);
      return;
    }
    const sample = toSampleString(value);
    if (!sample || seen.has(sample)) return;
    seen.add(sample);
    samples.push(sample);
  };

  values.forEach(append);
  return samples;
};

const countItems = (value: unknown): number => (Array.isArray(value) ? value.length : 0);

const buildCompactRegistryNode = (node: ContextNode): CompactRegistryNode => ({
  id: node.id,
  kind: node.kind,
  name: node.name,
  description: truncate(node.description, MAX_DESCRIPTION_LENGTH),
  tags: node.tags.slice(0, MAX_REGISTRY_TAGS).map((tag: string) => truncate(tag, 40)),
  relationships: (node.relationships ?? [])
    .slice(0, MAX_REGISTRY_RELATIONSHIPS)
    .map((relationship) => ({
      type: relationship.type,
      targetId: relationship.targetId,
    })),
});

const buildRegistryContext = (): AiPathRunStaticContext['registry'] => {
  const version = registryBackend.getVersion();

  try {
    const resolved = retrievalService.resolveWithExpansion({
      ids: [...AI_PATH_RUN_CONTEXT_ROOT_IDS],
      depth: 1,
      maxNodes: MAX_REGISTRY_NODES,
    });

    return {
      version,
      refs: [...AI_PATH_RUN_CONTEXT_ROOT_IDS],
      nodes: resolved.nodes.map(buildCompactRegistryNode),
    };
  } catch {
    return {
      version,
      refs: [...AI_PATH_RUN_CONTEXT_ROOT_IDS],
      nodes: registryBackend.getByIds([...AI_PATH_RUN_CONTEXT_ROOT_IDS]).map(buildCompactRegistryNode),
    };
  }
};

const getGraphNodes = (run: AiPathRunRecord): AiNode[] => {
  const graph = asRecord(run.graph);
  const nodes = graph?.['nodes'];
  return Array.isArray(nodes) ? (nodes as AiNode[]) : [];
};

const buildExecutedModels = (
  run: AiPathRunRecord,
  nodes: AiPathRunNodeRecord[]
): AiPathRunStaticContext['executedModels'] => {
  const graphNodeById = new Map<string, AiNode>();
  getGraphNodes(run).forEach((node: AiNode) => {
    graphNodeById.set(node.id, node);
  });

  return nodes
    .filter((node: AiPathRunNodeRecord) => {
      if (node.status === 'pending') return false;
      return graphNodeById.get(node.nodeId)?.type === 'model';
    })
    .slice(0, MAX_EXECUTED_MODELS)
    .map((node: AiPathRunNodeRecord) => {
      const graphNode = graphNodeById.get(node.nodeId);
      const config = asRecord(graphNode?.config);
      const modelConfig = asRecord(config?.['model']);
      const modelId = readTrimmedString(modelConfig?.['modelId'], 160);
      return {
        nodeId: node.nodeId,
        nodeTitle: readTrimmedString(node.nodeTitle, 120),
        status: node.status,
        attempt: node.attempt ?? 0,
        modelId,
        usesBrainDefault: !modelId,
        startedAt: readTrimmedString(node.startedAt, 80),
        finishedAt: readTrimmedString(node.finishedAt ?? node.completedAt, 80),
        errorMessage: readTrimmedString(node.errorMessage, MAX_ERROR_MESSAGE_LENGTH),
      };
    });
};

const buildFailedNodes = (nodes: AiPathRunNodeRecord[]): AiPathRunStaticContext['failedNodes'] =>
  nodes
    .filter((node: AiPathRunNodeRecord) => FAILED_NODE_STATUSES.has(node.status))
    .slice(0, MAX_FAILED_NODES)
    .map((node: AiPathRunNodeRecord) => ({
      nodeId: node.nodeId,
      nodeType: node.nodeType,
      nodeTitle: readTrimmedString(node.nodeTitle, 120),
      status: node.status,
      attempt: node.attempt ?? 0,
      errorMessage: readTrimmedString(node.errorMessage, MAX_ERROR_MESSAGE_LENGTH),
    }));

const buildRecentErrorEvents = (
  events: AiPathRunEventRecord[]
): AiPathRunStaticContext['recentErrorEvents'] =>
  events
    .filter((event: AiPathRunEventRecord) => RECENT_ERROR_EVENT_LEVELS.has(event.level))
    .sort((left: AiPathRunEventRecord, right: AiPathRunEventRecord) =>
      String(right.createdAt).localeCompare(String(left.createdAt))
    )
    .slice(0, MAX_RECENT_ERROR_EVENTS)
    .map((event: AiPathRunEventRecord) => ({
      createdAt: event.createdAt,
      level: event.level,
      message: truncate(event.message, MAX_SAMPLE_LENGTH),
      nodeId: readTrimmedString(event.nodeId, 120),
      nodeType: readTrimmedString(event.nodeType, 120),
      nodeTitle: readTrimmedString(event.nodeTitle, 120),
    }));

const buildPreflightContext = (run: AiPathRunRecord): AiPathRunStaticContext['preflight'] => {
  const meta = asRecord(run.meta);
  const graphCompile = asRecord(meta?.['graphCompile']);
  const runPreflight = asRecord(meta?.['runPreflight']);
  const validation = asRecord(runPreflight?.['validation']);
  const dependency = asRecord(runPreflight?.['dependency']);
  const dataContract = asRecord(runPreflight?.['dataContract']);

  return {
    compileErrorCount: countItems(graphCompile?.['errors']),
    compileWarningCount: countItems(graphCompile?.['warnings']),
    compileFindingCount: countItems(graphCompile?.['findings']),
    validationErrorCount: countItems(validation?.['errors']),
    validationWarningCount: countItems(validation?.['warnings']),
    dependencyErrorCount: countItems(dependency?.['errors']),
    dependencyWarningCount: countItems(dependency?.['warnings']),
    dependencyStrictReady:
      typeof dependency?.['strictReady'] === 'boolean' ? (dependency['strictReady'] as boolean) : null,
    dataContractErrorCount: countItems(dataContract?.['errors']),
    dataContractWarningCount: countItems(dataContract?.['warnings']),
    runWarningCount: countItems(runPreflight?.['warnings']),
    samples: collectSamples(
      graphCompile?.['errors'],
      graphCompile?.['warnings'],
      graphCompile?.['findings'],
      validation?.['errors'],
      validation?.['warnings'],
      dependency?.['errors'],
      dependency?.['warnings'],
      dataContract?.['issues'],
      dataContract?.['errors'],
      dataContract?.['warnings'],
      runPreflight?.['warnings']
    ),
  };
};

const hasStoredAiPathRunStaticContext = (context: Record<string, unknown> | null): boolean => {
  const staticContext = asRecord(context?.['staticContext']);
  return Boolean(asRecord(staticContext?.['aiPathRun']));
};

const extractLinkedAiPathRunId = (context: Record<string, unknown> | null): string | null => {
  if (!context) return null;
  const runId = readTrimmedString(context['runId'], 200);
  if (runId) return runId;
  return readTrimmedString(context['jobId'], 200);
};

export const buildAiPathRunStaticContext = async (
  runId: string
): Promise<AiPathRunStaticContext | null> => {
  const normalizedRunId = readTrimmedString(runId, 200);
  if (!normalizedRunId) return null;

  const repo = await getPathRunRepository();
  const run = await repo.findRunById(normalizedRunId);
  if (!run) return null;

  const [nodes, events] = await Promise.all([
    repo.listRunNodes(normalizedRunId),
    repo.listRunEvents(normalizedRunId),
  ]);

  const meta = asRecord(run.meta);

  return {
    kind: 'ai_path_run',
    runId: run.id,
    pathId: readTrimmedString(run.pathId, 120),
    pathName: readTrimmedString(run.pathName, 160),
    status: run.status,
    entityId: readTrimmedString(run.entityId, 160),
    entityType: readTrimmedString(run.entityType, 120),
    triggerEvent: readTrimmedString(run.triggerEvent, 120),
    triggerNodeId: readTrimmedString(run.triggerNodeId, 120),
    runtimeFingerprint: readTrimmedString(meta?.['runtimeFingerprint'], 120),
    timestamps: {
      createdAt: run.createdAt,
      startedAt: readTrimmedString(run.startedAt, 80),
      finishedAt: readTrimmedString(run.finishedAt, 80),
      deadLetteredAt: readTrimmedString(run.deadLetteredAt, 80),
    },
    summary: {
      totalNodes: nodes.length,
      completedNodes: nodes.filter((node: AiPathRunNodeRecord) => COMPLETED_NODE_STATUSES.has(node.status))
        .length,
      failedNodes: nodes.filter((node: AiPathRunNodeRecord) => FAILED_NODE_STATUSES.has(node.status))
        .length,
      warningNodes: nodes.filter((node: AiPathRunNodeRecord) => WARNING_NODE_STATUSES.has(node.status))
        .length,
      totalEvents: events.length,
      errorEvents: events.filter(
        (event: AiPathRunEventRecord) => event.level === 'error' || event.level === 'fatal'
      ).length,
      warnEvents: events.filter((event: AiPathRunEventRecord) => event.level === 'warn').length,
    },
    executedModels: buildExecutedModels(run, nodes),
    failedNodes: buildFailedNodes(nodes),
    recentErrorEvents: buildRecentErrorEvents(events),
    preflight: buildPreflightContext(run),
    registry: buildRegistryContext(),
  };
};

export const aiPathRunRuntimeContextAdapter: SystemLogRuntimeContextAdapter = {
  id: 'ai-path-run',
  ownedStaticContextKeys: ['aiPathRun'],
  canHydrate(context: Record<string, unknown> | null): boolean {
    if (!context) return false;
    if (hasStoredAiPathRunStaticContext(context)) return false;
    return Boolean(extractLinkedAiPathRunId(context));
  },
  async hydrate(
    context: Record<string, unknown>
  ): Promise<SystemLogRuntimeContextHydrationResult | null> {
    const linkedRunId = extractLinkedAiPathRunId(context);
    if (!linkedRunId) return null;

    const aiPathRun = await buildAiPathRunStaticContext(linkedRunId);
    if (!aiPathRun) return null;

    return {
      staticContextPatch: {
        aiPathRun,
      },
    };
  },
};
