import 'server-only';

import type {
  ContextRegistryRef,
  ContextRuntimeDocumentSection,
  ContextRuntimeDocument,
} from '@/shared/contracts/ai-context-registry';
import type {
  AiNode,
  AiPathRunEventRecord,
  AiPathRunNodeRecord,
  AiPathRunRecord,
} from '@/shared/contracts/ai-paths';
import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import { isObjectRecord } from '@/shared/utils/object-utils';

import type { RuntimeContextProvider } from '../runtime-provider';

export const AI_PATH_RUN_RUNTIME_PROVIDER_ID = 'ai-path-run';
export const AI_PATH_RUN_CONTEXT_ROOT_IDS = [
  'page:ai-paths',
  'action:run-ai-path',
  'collection:ai-path-runs',
] as const;

const PROVIDER_VERSION = '1';
const MAX_EXECUTED_MODELS = 8;
const MAX_FAILED_NODES = 8;
const MAX_RECENT_ERROR_EVENTS = 8;
const MAX_SAMPLE_STRINGS = 3;
const MAX_ERROR_MESSAGE_LENGTH = 220;
const MAX_SAMPLE_LENGTH = 180;

const COMPLETED_NODE_STATUSES = new Set(['completed', 'cached']);
const FAILED_NODE_STATUSES = new Set(['failed', 'timeout', 'canceled']);
const WARNING_NODE_STATUSES = new Set(['blocked', 'skipped']);
const RECENT_ERROR_EVENT_LEVELS = new Set(['error', 'fatal', 'warn']);

const asRecord = (value: unknown): Record<string, unknown> | null =>
  isObjectRecord(value) ? value : null;

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

const countItems = (value: unknown): number => (Array.isArray(value) ? value.length : 0);

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

const getGraphNodes = (run: AiPathRunRecord): AiNode[] => {
  const graph = asRecord(run.graph);
  const nodes = graph?.['nodes'];
  return Array.isArray(nodes) ? (nodes as AiNode[]) : [];
};

const createAiPathRunRuntimeRef = (runId: string): ContextRegistryRef => ({
  id: `runtime:ai-path-run:${runId}`,
  kind: 'runtime_document',
  providerId: AI_PATH_RUN_RUNTIME_PROVIDER_ID,
  entityType: 'ai_path_run',
});

const extractAiPathRunIdFromRef = (ref: ContextRegistryRef): string | null => {
  if (ref.kind !== 'runtime_document') return null;
  const prefix = 'runtime:ai-path-run:';
  if (!ref.id.startsWith(prefix)) return null;
  return readTrimmedString(ref.id.slice(prefix.length), 200);
};

const extractLinkedAiPathRunId = (context: Record<string, unknown> | null): string | null => {
  if (!context) return null;
  const runId = readTrimmedString(context['runId'], 200);
  if (runId) return runId;
  return readTrimmedString(context['jobId'], 200);
};

const buildSummaryFacts = (
  run: AiPathRunRecord,
  nodes: AiPathRunNodeRecord[],
  events: AiPathRunEventRecord[]
): Record<string, unknown> => {
  const meta = asRecord(run.meta);

  return {
    runId: run.id,
    pathId: readTrimmedString(run.pathId, 120),
    pathName: readTrimmedString(run.pathName, 160),
    status: run.status,
    entityId: readTrimmedString(run.entityId, 160),
    entityType: readTrimmedString(run.entityType, 120),
    triggerEvent: readTrimmedString(run.triggerEvent, 120),
    triggerNodeId: readTrimmedString(run.triggerNodeId, 120),
    runtimeFingerprint: readTrimmedString(meta?.['runtimeFingerprint'], 120),
    totalNodes: nodes.length,
    completedNodes: nodes.filter((node) => COMPLETED_NODE_STATUSES.has(node.status)).length,
    failedNodes: nodes.filter((node) => FAILED_NODE_STATUSES.has(node.status)).length,
    warningNodes: nodes.filter((node) => WARNING_NODE_STATUSES.has(node.status)).length,
    totalEvents: events.length,
    errorEvents: events.filter((event) => event.level === 'error' || event.level === 'fatal').length,
    warnEvents: events.filter((event) => event.level === 'warn').length,
  };
};

const buildExecutedModels = (
  run: AiPathRunRecord,
  nodes: AiPathRunNodeRecord[]
): Array<Record<string, unknown>> => {
  const graphNodeById = new Map<string, AiNode>();
  getGraphNodes(run).forEach((node: AiNode) => {
    graphNodeById.set(node.id, node);
  });

  return nodes
    .filter((node) => node.status !== 'pending' && graphNodeById.get(node.nodeId)?.type === 'model')
    .slice(0, MAX_EXECUTED_MODELS)
    .map((node) => {
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

const buildFailedNodes = (nodes: AiPathRunNodeRecord[]): Array<Record<string, unknown>> =>
  nodes
    .filter((node) => FAILED_NODE_STATUSES.has(node.status))
    .slice(0, MAX_FAILED_NODES)
    .map((node) => ({
      nodeId: node.nodeId,
      nodeType: node.nodeType,
      nodeTitle: readTrimmedString(node.nodeTitle, 120),
      status: node.status,
      attempt: node.attempt ?? 0,
      errorMessage: readTrimmedString(node.errorMessage, MAX_ERROR_MESSAGE_LENGTH),
    }));

const buildRecentErrorEvents = (events: AiPathRunEventRecord[]): Array<Record<string, unknown>> =>
  events
    .filter((event) => RECENT_ERROR_EVENT_LEVELS.has(event.level))
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
    .slice(0, MAX_RECENT_ERROR_EVENTS)
    .map((event) => ({
      createdAt: event.createdAt || '',
      level: event.level,
      message: truncate(event.message, MAX_SAMPLE_LENGTH),
      nodeId: readTrimmedString(event.nodeId, 120),
      nodeType: readTrimmedString(event.nodeType, 120),
      nodeTitle: readTrimmedString(event.nodeTitle, 120),
    }));

const buildPreflightItems = (run: AiPathRunRecord): Array<Record<string, unknown>> => {
  const meta = asRecord(run.meta);
  const graphCompile = asRecord(meta?.['graphCompile']);
  const runPreflight = asRecord(meta?.['runPreflight']);
  const validation = asRecord(runPreflight?.['validation']);
  const dependency = asRecord(runPreflight?.['dependency']);
  const dataContract = asRecord(runPreflight?.['dataContract']);

  return [
    { label: 'compileErrorCount', value: countItems(graphCompile?.['errors']) },
    { label: 'compileWarningCount', value: countItems(graphCompile?.['warnings']) },
    { label: 'compileFindingCount', value: countItems(graphCompile?.['findings']) },
    { label: 'validationErrorCount', value: countItems(validation?.['errors']) },
    { label: 'validationWarningCount', value: countItems(validation?.['warnings']) },
    { label: 'dependencyErrorCount', value: countItems(dependency?.['errors']) },
    { label: 'dependencyWarningCount', value: countItems(dependency?.['warnings']) },
    {
      label: 'dependencyStrictReady',
      value: typeof dependency?.['strictReady'] === 'boolean' ? dependency['strictReady'] : null,
    },
    { label: 'dataContractErrorCount', value: countItems(dataContract?.['errors']) },
    { label: 'dataContractWarningCount', value: countItems(dataContract?.['warnings']) },
    { label: 'runWarningCount', value: countItems(runPreflight?.['warnings']) },
    {
      label: 'samples',
      value: collectSamples(
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
    },
  ];
};

const buildAiPathRunRuntimeSummary = (
  run: AiPathRunRecord,
  facts: Record<string, unknown>
): string => {
  const status = readTrimmedString(run.status, 80) ?? 'unknown';
  const pathName = readTrimmedString(run.pathName, 160);
  const entityType = readTrimmedString(run.entityType, 120);
  const entityId = readTrimmedString(run.entityId, 160);
  const failedNodes = typeof facts['failedNodes'] === 'number' ? facts['failedNodes'] : 0;
  const errorEvents = typeof facts['errorEvents'] === 'number' ? facts['errorEvents'] : 0;

  const parts = [
    `${status} AI Path run`,
    pathName ? `for "${pathName}"` : null,
    entityType && entityId ? `on ${entityType} ${entityId}` : null,
    failedNodes || errorEvents
      ? `with ${failedNodes} failed node${failedNodes === 1 ? '' : 's'} and ${errorEvents} error event${
        errorEvents === 1 ? '' : 's'
      }`
      : null,
  ].filter((part): part is string => Boolean(part));

  return parts.join(' ');
};

export const buildAiPathRunRuntimeDocument = async (
  runId: string
): Promise<ContextRuntimeDocument | null> => {
  const normalizedRunId = readTrimmedString(runId, 200);
  if (!normalizedRunId) return null;

  const repo = await getPathRunRepository();
  const run = await repo.findRunById(normalizedRunId);
  if (!run) return null;

  const [nodes, events] = await Promise.all([
    repo.listRunNodes(normalizedRunId),
    repo.listRunEvents(normalizedRunId),
  ]);

  const facts = buildSummaryFacts(run, nodes, events);
  const executedModels = buildExecutedModels(run, nodes);
  const failedNodes = buildFailedNodes(nodes);
  const recentErrorEvents = buildRecentErrorEvents(events);
  const preflightItems = buildPreflightItems(run);
  const rawSections: ContextRuntimeDocumentSection[] = [
    {
      id: 'executed-models',
      kind: 'items' as const,
      title: 'Executed Models',
      items: executedModels,
    },
    {
      id: 'failed-nodes',
      kind: 'items' as const,
      title: 'Failed Nodes',
      items: failedNodes,
    },
    {
      id: 'recent-runtime-errors',
      kind: 'events' as const,
      title: 'Recent Runtime Errors',
      items: recentErrorEvents,
    },
    {
      id: 'preflight',
      kind: 'facts' as const,
      title: 'Preflight',
      items: preflightItems,
    },
  ];
  const sections = rawSections.filter(
    (section): section is ContextRuntimeDocumentSection =>
      Array.isArray(section.items) && section.items.length > 0
  );

  return {
    id: createAiPathRunRuntimeRef(run.id).id,
    kind: 'runtime_document',
    entityType: 'ai_path_run',
    title: readTrimmedString(run.pathName, 160) ?? `AI Path Run ${run.id}`,
    summary: buildAiPathRunRuntimeSummary(run, facts),
    status: run.status,
    tags: ([
      'ai-paths',
      'runtime',
      readTrimmedString(run.status, 60),
      readTrimmedString(run.entityType, 60),
    ].filter((tag): tag is string => typeof tag === 'string')).slice(0, 6),
    relatedNodeIds: [...AI_PATH_RUN_CONTEXT_ROOT_IDS],
    timestamps: {
      createdAt: run.createdAt || '',
      startedAt: readTrimmedString(run.startedAt, 80),
      finishedAt: readTrimmedString(run.finishedAt, 80),
      deadLetteredAt: readTrimmedString(run.deadLetteredAt, 80),
      updatedAt: readTrimmedString(run.updatedAt, 80),
    },
    facts,
    sections,
    provenance: {
      providerId: AI_PATH_RUN_RUNTIME_PROVIDER_ID,
      providerVersion: PROVIDER_VERSION,
      source: 'ai_path_runs',
    },
  };
};

export const aiPathRunRuntimeContextProvider: RuntimeContextProvider = {
  id: AI_PATH_RUN_RUNTIME_PROVIDER_ID,
  canInferRefs(input: Record<string, unknown> | null): boolean {
    return Boolean(extractLinkedAiPathRunId(input));
  },
  inferRefs(input: Record<string, unknown>): ContextRegistryRef[] {
    const runId = extractLinkedAiPathRunId(input);
    return runId ? [createAiPathRunRuntimeRef(runId)] : [];
  },
  canResolveRef(ref: ContextRegistryRef): boolean {
    return ref.kind === 'runtime_document' && ref.id.startsWith('runtime:ai-path-run:');
  },
  async resolveRefs(refs: ContextRegistryRef[]): Promise<ContextRuntimeDocument[]> {
    const documents = await Promise.all(
      refs.map(async (ref) => {
        const runId = extractAiPathRunIdFromRef(ref);
        if (!runId) return null;
        return await buildAiPathRunRuntimeDocument(runId);
      })
    );

    return documents.filter((document): document is ContextRuntimeDocument => Boolean(document));
  },
  getVersion(): string {
    return PROVIDER_VERSION;
  },
};
