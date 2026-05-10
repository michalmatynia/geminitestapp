import type {
  ContextRuntimeDocument,
  ContextRuntimeDocumentSection,
} from '@/shared/contracts/ai-context-registry';
import type {
  AiNode,
  AiPathRunEventRecord,
  AiPathRunNodeRecord,
  AiPathRunRecord,
} from '@/shared/contracts/ai-paths';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { isObjectRecord } from '@/shared/utils/object-utils';

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

type PreflightRecords = {
  graphCompile: Record<string, unknown> | null;
  runPreflight: Record<string, unknown> | null;
  validation: Record<string, unknown> | null;
  dependency: Record<string, unknown> | null;
  dataContract: Record<string, unknown> | null;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  isObjectRecord(value) ? value : null;

const truncate = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) return value;
  if (maxLength <= 3) return value.slice(0, maxLength);
  return `${value.slice(0, maxLength - 3)}...`;
};

export const readTrimmedString = (
  value: unknown,
  maxLength: number = MAX_SAMPLE_LENGTH
): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  return truncate(trimmed, maxLength);
};

const countItems = (value: unknown): number => (Array.isArray(value) ? value.length : 0);

const toSampleString = (value: unknown): string | null => {
  const direct = readTrimmedString(value);
  if (direct !== null) return direct;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  try {
    if (value === null || value === undefined) return null;
    return truncate(JSON.stringify(value), MAX_SAMPLE_LENGTH);
  } catch (error) {
    void ErrorSystem.captureException(error);
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
    if (sample === null || seen.has(sample)) return;
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

export const buildSummaryFacts = (
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
    errorEvents: events.filter((event) => event.level === 'error' || event.level === 'fatal')
      .length,
    warnEvents: events.filter((event) => event.level === 'warn').length,
  };
};

export const buildExecutedModels = (
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
        attempt: node.attempt,
        modelId,
        usesBrainDefault: modelId === null,
        startedAt: readTrimmedString(node.startedAt, 80),
        finishedAt: readTrimmedString(node.finishedAt ?? node.completedAt, 80),
        errorMessage: readTrimmedString(node.errorMessage, MAX_ERROR_MESSAGE_LENGTH),
      };
    });
};

export const buildFailedNodes = (nodes: AiPathRunNodeRecord[]): Array<Record<string, unknown>> =>
  nodes
    .filter((node) => FAILED_NODE_STATUSES.has(node.status))
    .slice(0, MAX_FAILED_NODES)
    .map((node) => ({
      nodeId: node.nodeId,
      nodeType: node.nodeType,
      nodeTitle: readTrimmedString(node.nodeTitle, 120),
      status: node.status,
      attempt: node.attempt,
      errorMessage: readTrimmedString(node.errorMessage, MAX_ERROR_MESSAGE_LENGTH),
    }));

export const buildRecentErrorEvents = (
  events: AiPathRunEventRecord[]
): Array<Record<string, unknown>> =>
  events
    .filter((event) => RECENT_ERROR_EVENT_LEVELS.has(event.level))
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
    .slice(0, MAX_RECENT_ERROR_EVENTS)
    .map((event) => ({
      createdAt: readTrimmedString(event.createdAt, 80) ?? '',
      level: event.level,
      message: truncate(event.message, MAX_SAMPLE_LENGTH),
      nodeId: readTrimmedString(event.nodeId, 120),
      nodeType: readTrimmedString(event.nodeType, 120),
      nodeTitle: readTrimmedString(event.nodeTitle, 120),
    }));

const getPreflightRecords = (run: AiPathRunRecord): PreflightRecords => {
  const meta = asRecord(run.meta);
  const graphCompile = asRecord(meta?.['graphCompile']);
  const runPreflight = asRecord(meta?.['runPreflight']);

  return {
    graphCompile,
    runPreflight,
    validation: asRecord(runPreflight?.['validation']),
    dependency: asRecord(runPreflight?.['dependency']),
    dataContract: asRecord(runPreflight?.['dataContract']),
  };
};

const readRecordValue = (
  record: Record<string, unknown> | null,
  key: string
): unknown => (record === null ? undefined : record[key]);

const countRecordItems = (record: Record<string, unknown> | null, key: string): number =>
  countItems(readRecordValue(record, key));

const readDependencyStrictReady = (dependency: Record<string, unknown> | null): boolean | null => {
  const strictReady = readRecordValue(dependency, 'strictReady');
  return typeof strictReady === 'boolean' ? strictReady : null;
};

const buildPreflightCountItems = (
  records: PreflightRecords
): Array<Record<string, unknown>> => [
  { label: 'compileErrorCount', value: countRecordItems(records.graphCompile, 'errors') },
  { label: 'compileWarningCount', value: countRecordItems(records.graphCompile, 'warnings') },
  { label: 'compileFindingCount', value: countRecordItems(records.graphCompile, 'findings') },
  { label: 'validationErrorCount', value: countRecordItems(records.validation, 'errors') },
  { label: 'validationWarningCount', value: countRecordItems(records.validation, 'warnings') },
  { label: 'dependencyErrorCount', value: countRecordItems(records.dependency, 'errors') },
  { label: 'dependencyWarningCount', value: countRecordItems(records.dependency, 'warnings') },
  { label: 'dependencyStrictReady', value: readDependencyStrictReady(records.dependency) },
  { label: 'dataContractErrorCount', value: countRecordItems(records.dataContract, 'errors') },
  { label: 'dataContractWarningCount', value: countRecordItems(records.dataContract, 'warnings') },
  { label: 'runWarningCount', value: countRecordItems(records.runPreflight, 'warnings') },
];

const buildPreflightSamples = (records: PreflightRecords): string[] =>
  collectSamples(
    readRecordValue(records.graphCompile, 'errors'),
    readRecordValue(records.graphCompile, 'warnings'),
    readRecordValue(records.graphCompile, 'findings'),
    readRecordValue(records.validation, 'errors'),
    readRecordValue(records.validation, 'warnings'),
    readRecordValue(records.dependency, 'errors'),
    readRecordValue(records.dependency, 'warnings'),
    readRecordValue(records.dataContract, 'issues'),
    readRecordValue(records.dataContract, 'errors'),
    readRecordValue(records.dataContract, 'warnings'),
    readRecordValue(records.runPreflight, 'warnings')
  );

export const buildPreflightItems = (run: AiPathRunRecord): Array<Record<string, unknown>> => {
  const records = getPreflightRecords(run);
  return [
    ...buildPreflightCountItems(records),
    { label: 'samples', value: buildPreflightSamples(records) },
  ];
};

const buildEntitySummaryPart = (entityType: string | null, entityId: string | null): string | null =>
  entityType !== null && entityId !== null ? `on ${entityType} ${entityId}` : null;

const buildFailureSummaryPart = (failedNodes: number, errorEvents: number): string | null => {
  if (failedNodes === 0 && errorEvents === 0) return null;
  const failedNodeLabel = failedNodes === 1 ? 'failed node' : 'failed nodes';
  const errorEventLabel = errorEvents === 1 ? 'error event' : 'error events';
  return `with ${failedNodes} ${failedNodeLabel} and ${errorEvents} ${errorEventLabel}`;
};

export const buildAiPathRunRuntimeSummary = (
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
    pathName !== null ? `for "${pathName}"` : null,
    buildEntitySummaryPart(entityType, entityId),
    buildFailureSummaryPart(failedNodes, errorEvents),
  ].filter((part): part is string => part !== null);

  return parts.join(' ');
};

export const buildAiPathRunRuntimeSections = (input: {
  executedModels: Array<Record<string, unknown>>;
  failedNodes: Array<Record<string, unknown>>;
  recentErrorEvents: Array<Record<string, unknown>>;
  preflightItems: Array<Record<string, unknown>>;
}): ContextRuntimeDocumentSection[] => {
  const rawSections: ContextRuntimeDocumentSection[] = [
    { id: 'executed-models', kind: 'items', title: 'Executed Models', items: input.executedModels },
    { id: 'failed-nodes', kind: 'items', title: 'Failed Nodes', items: input.failedNodes },
    {
      id: 'recent-runtime-errors',
      kind: 'events',
      title: 'Recent Runtime Errors',
      items: input.recentErrorEvents,
    },
    { id: 'preflight', kind: 'facts', title: 'Preflight', items: input.preflightItems },
  ];

  return rawSections.filter(
    (section): section is ContextRuntimeDocumentSection =>
      Array.isArray(section.items) && section.items.length > 0
  );
};

export const buildAiPathRunRuntimeTags = (run: AiPathRunRecord): string[] =>
  ['ai-paths', 'runtime', readTrimmedString(run.status, 60), readTrimmedString(run.entityType, 60)]
    .filter((tag): tag is string => tag !== null)
    .slice(0, 6);

export const buildAiPathRunRuntimeTimestamps = (
  run: AiPathRunRecord
): ContextRuntimeDocument['timestamps'] => ({
  createdAt: readTrimmedString(run.createdAt, 80) ?? '',
  startedAt: readTrimmedString(run.startedAt, 80),
  finishedAt: readTrimmedString(run.finishedAt, 80),
  updatedAt: readTrimmedString(run.updatedAt, 80),
});
