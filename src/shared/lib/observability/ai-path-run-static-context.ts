import 'server-only';

import type { ContextNode, ContextRuntimeDocument } from '@/shared/contracts/ai-context-registry';
import type { SystemLogRecordDto as SystemLogRecord } from '@/shared/contracts/observability';
import { contextRegistryEngine } from '@/features/ai/ai-context-registry/server';
import { isObjectRecord } from '@/shared/utils/object-utils';

import {
  hydrateLogRuntimeContext,
  hydrateSystemLogRecordRuntimeContext,
} from './runtime-context/hydrate-system-log-runtime-context';
import { sanitizeSystemLogForAi } from './runtime-context/sanitize-system-log-for-ai';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  isObjectRecord(value) ? value : null;

const readTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readNumber = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

const getSectionItems = (document: ContextRuntimeDocument, sectionId: string): Array<Record<string, unknown>> => {
  const section = (document.sections ?? []).find((entry) => entry.id === sectionId);
  return Array.isArray(section?.items) ? section.items : [];
};

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

const buildCompactRegistryNodes = (nodes: ContextNode[]): CompactRegistryNode[] =>
  nodes.map((node) => ({
    id: node.id,
    kind: node.kind,
    name: node.name,
    description: node.description,
    tags: node.tags,
    relationships: (node.relationships ?? []).map((relationship) => ({
      type: relationship.type,
      targetId: relationship.targetId,
    })),
  }));

const readFactsRecord = (document: ContextRuntimeDocument): Record<string, unknown> =>
  asRecord(document.facts) ?? {};

export const buildAiPathRunStaticContext = async (
  runId: string
): Promise<AiPathRunStaticContext | null> => {
  const resolved = await contextRegistryEngine.resolveRefs({
    refs: [
      {
        id: `runtime:ai-path-run:${runId}`,
        kind: 'runtime_document',
        providerId: 'ai-path-run',
        entityType: 'ai_path_run',
      },
    ],
    maxNodes: 16,
    depth: 1,
  });
  const runtimeDocument = resolved.documents.find(
    (document) => document.entityType === 'ai_path_run'
  );
  if (!runtimeDocument) return null;
  const facts = readFactsRecord(runtimeDocument);
  const preflightItems = getSectionItems(runtimeDocument, 'preflight');

  return {
    kind: 'ai_path_run',
    runId: readTrimmedString(facts['runId']) ?? runId,
    pathId: readTrimmedString(facts['pathId']),
    pathName: readTrimmedString(facts['pathName']),
    status: readTrimmedString(facts['status']) ?? 'unknown',
    entityId: readTrimmedString(facts['entityId']),
    entityType: readTrimmedString(facts['entityType']),
    triggerEvent: readTrimmedString(facts['triggerEvent']),
    triggerNodeId: readTrimmedString(facts['triggerNodeId']),
    runtimeFingerprint: readTrimmedString(facts['runtimeFingerprint']),
    timestamps: {
      createdAt: readTrimmedString(runtimeDocument.timestamps?.createdAt) ?? new Date(0).toISOString(),
      startedAt: readTrimmedString(runtimeDocument.timestamps?.startedAt),
      finishedAt: readTrimmedString(runtimeDocument.timestamps?.finishedAt),
      deadLetteredAt: readTrimmedString(runtimeDocument.timestamps?.deadLetteredAt),
    },
    summary: {
      totalNodes: readNumber(facts['totalNodes']),
      completedNodes: readNumber(facts['completedNodes']),
      failedNodes: readNumber(facts['failedNodes']),
      warningNodes: readNumber(facts['warningNodes']),
      totalEvents: readNumber(facts['totalEvents']),
      errorEvents: readNumber(facts['errorEvents']),
      warnEvents: readNumber(facts['warnEvents']),
    },
    executedModels: getSectionItems(runtimeDocument, 'executed-models').map((item) => ({
      nodeId: readTrimmedString(item['nodeId']) ?? 'unknown',
      nodeTitle: readTrimmedString(item['nodeTitle']),
      status: readTrimmedString(item['status']) ?? 'unknown',
      attempt: readNumber(item['attempt']),
      modelId: readTrimmedString(item['modelId']),
      usesBrainDefault: Boolean(item['usesBrainDefault']),
      startedAt: readTrimmedString(item['startedAt']),
      finishedAt: readTrimmedString(item['finishedAt']),
      errorMessage: readTrimmedString(item['errorMessage']),
    })),
    failedNodes: getSectionItems(runtimeDocument, 'failed-nodes').map((item) => ({
      nodeId: readTrimmedString(item['nodeId']) ?? 'unknown',
      nodeType: readTrimmedString(item['nodeType']) ?? 'unknown',
      nodeTitle: readTrimmedString(item['nodeTitle']),
      status: readTrimmedString(item['status']) ?? 'unknown',
      attempt: readNumber(item['attempt']),
      errorMessage: readTrimmedString(item['errorMessage']),
    })),
    recentErrorEvents: getSectionItems(runtimeDocument, 'recent-runtime-errors').map((item) => ({
      createdAt: readTrimmedString(item['createdAt']) ?? new Date(0).toISOString(),
      level: readTrimmedString(item['level']) ?? 'info',
      message: readTrimmedString(item['message']) ?? '',
      nodeId: readTrimmedString(item['nodeId']),
      nodeType: readTrimmedString(item['nodeType']),
      nodeTitle: readTrimmedString(item['nodeTitle']),
    })),
    preflight: {
      compileErrorCount: readNumber(preflightItems.find((item) => item['label'] === 'compileErrorCount')?.['value']),
      compileWarningCount: readNumber(preflightItems.find((item) => item['label'] === 'compileWarningCount')?.['value']),
      compileFindingCount: readNumber(preflightItems.find((item) => item['label'] === 'compileFindingCount')?.['value']),
      validationErrorCount: readNumber(preflightItems.find((item) => item['label'] === 'validationErrorCount')?.['value']),
      validationWarningCount: readNumber(preflightItems.find((item) => item['label'] === 'validationWarningCount')?.['value']),
      dependencyErrorCount: readNumber(preflightItems.find((item) => item['label'] === 'dependencyErrorCount')?.['value']),
      dependencyWarningCount: readNumber(preflightItems.find((item) => item['label'] === 'dependencyWarningCount')?.['value']),
      dependencyStrictReady:
        typeof preflightItems.find((item) => item['label'] === 'dependencyStrictReady')?.['value'] === 'boolean'
          ? (preflightItems.find((item) => item['label'] === 'dependencyStrictReady')?.['value'] as boolean)
          : null,
      dataContractErrorCount: readNumber(preflightItems.find((item) => item['label'] === 'dataContractErrorCount')?.['value']),
      dataContractWarningCount: readNumber(preflightItems.find((item) => item['label'] === 'dataContractWarningCount')?.['value']),
      runWarningCount: readNumber(preflightItems.find((item) => item['label'] === 'runWarningCount')?.['value']),
      samples: Array.isArray(preflightItems.find((item) => item['label'] === 'samples')?.['value'])
        ? (preflightItems.find((item) => item['label'] === 'samples')?.['value'] as unknown[])
            .map((value) => readTrimmedString(value))
            .filter((value): value is string => Boolean(value))
        : [],
    },
    registry: {
      version: resolved.engineVersion,
      refs: runtimeDocument.relatedNodeIds,
      nodes: buildCompactRegistryNodes(resolved.nodes),
    },
  };
};

export const hydrateLogContextWithAiPathRunStaticContext = async (
  context: Record<string, unknown> | null | undefined
): Promise<Record<string, unknown> | null> => await hydrateLogRuntimeContext(context);

export const hydrateSystemLogWithAiPathRunStaticContext = async (
  log: SystemLogRecord
): Promise<SystemLogRecord> => await hydrateSystemLogRecordRuntimeContext(log);

export const sanitizeSystemLogForAiInsight = async (
  log: SystemLogRecord
): Promise<Record<string, unknown>> => await sanitizeSystemLogForAi(log);
