import { type NextRequest } from 'next/server';
import { compileGraph } from '@/shared/lib/ai-paths/core/utils';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import type { AiNode, Edge, AiPathRunEnqueueRequest } from '@/shared/contracts/ai-paths';
import type { enqueuePathRun } from '@/features/ai/ai-paths/server';
import type { requireAiPathsRunAccess } from '@/features/ai/ai-paths/server';

const hasOwn = (record: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(record, key);

export type ContextBundle = {
  refs: { id: string; kind: 'static_node' | 'runtime_document'; providerId?: string; entityType?: string }[] | undefined;
  resolved: {
    nodes: any[];
    documents: any[];
  } | null;
};

export type EnqueueTimingData = {
  timings: Record<string, number>;
  pathId: string;
  nodeCount: number;
  edgeCount: number;
  graphSource: string;
  contextRegistry: ContextBundle;
  req: NextRequest;
  triggerContext: unknown;
};

function getTriggerContextFlags(triggerContext: unknown): { hasEntityJson: boolean; hasEntity: boolean; hasProduct: boolean } {
  const record = (triggerContext !== null && typeof triggerContext === 'object' && !Array.isArray(triggerContext)) ? (triggerContext as Record<string, unknown>) : null;
  if (record === null) return { hasEntityJson: false, hasEntity: false, hasProduct: false };
  return {
    hasEntityJson: hasOwn(record, 'entityJson'),
    hasEntity: hasOwn(record, 'entity'),
    hasProduct: hasOwn(record, 'product'),
  };
}

export function buildTimingContext(data: EnqueueTimingData): Record<string, unknown> {
  const { timings, pathId, nodeCount, edgeCount, graphSource, contextRegistry, req, triggerContext } = data;
  const h = req.headers;
  const cl = h.get('content-length');
  const contentLength = typeof cl === 'string' ? Number.parseInt(cl, 10) : NaN;
  const flags = getTriggerContextFlags(triggerContext);

  return {
    pathId, nodeCount, edgeCount, graphSource,
    accessMs: Math.round(timings['accessMs'] ?? 0),
    rateLimitMs: Math.round(timings['rateLimitMs'] ?? 0),
    parseBodyMs: Math.round(timings['parseBodyMs'] ?? 0),
    loadStoredPathMs: Math.round(timings['loadStoredPathMs'] ?? 0),
    compileMs: Math.round(timings['compileMs'] ?? 0),
    contextRegistryMs: Math.round(timings['contextRegistryMs'] ?? 0),
    queueReadyMs: Math.round(timings['queueReadyMs'] ?? 0),
    enqueueServiceMs: Math.round(timings['enqueueServiceMs'] ?? 0),
    contextRegistryRefCount: contextRegistry?.refs?.length ?? 0,
    contextRegistryDocumentCount: contextRegistry?.resolved?.documents.length ?? 0,
    ...(Number.isFinite(contentLength) ? { requestContentLength: contentLength } : {}),
    triggerContextHasEntityJson: flags.hasEntityJson,
    triggerContextHasEntity: flags.hasEntity,
    triggerContextHasProduct: flags.hasProduct,
  };
}

export async function logEnqueueTiming(data: EnqueueTimingData): Promise<void> {
  await logSystemEvent({
    level: 'info',
    source: 'ai-paths.runs.enqueue',
    message: '[ai-paths.runs.enqueue] timing',
    context: buildTimingContext(data),
  });
}

export function resolveMetaRecord(meta: unknown): Record<string, unknown> {
  if (meta !== null && typeof meta === 'object' && !Array.isArray(meta)) {
    return meta as Record<string, unknown>;
  }
  return {};
}

type PathRunPayloadOptions = {
  access: Awaited<ReturnType<typeof requireAiPathsRunAccess>>;
  data: AiPathRunEnqueueRequest;
  nodes: AiNode[];
  edges: Edge[];
  meta: Record<string, unknown>;
  pathName: string;
};

export function buildPathRunPayload(options: PathRunPayloadOptions): Parameters<typeof enqueuePathRun>[0] {
  const { access, data, nodes, edges, meta, pathName } = options;
  return {
    userId: access.userId, pathId: data.pathId, pathName, nodes, edges,
    triggerEvent: data.triggerEvent, triggerNodeId: data.triggerNodeId, triggerContext: data.triggerContext ?? null,
    entityId: data.entityId ?? null, entityType: data.entityType ?? null, maxAttempts: data.maxAttempts,
    backoffMs: data.backoffMs, backoffMaxMs: data.backoffMaxMs, requestId: data.requestId,
    meta,
  };
}

type CompileOptions = {
  nodes: AiNode[];
  edges: Edge[];
  triggerNodeId?: string;
  isNodeValidationEnabled: boolean;
};

export function runCompileGraphSync(options: CompileOptions): ReturnType<typeof compileGraph> {
  const { nodes, edges, triggerNodeId, isNodeValidationEnabled } = options;
  if (isNodeValidationEnabled) return compileGraph(nodes, edges);
  const isNodeString = typeof triggerNodeId === 'string';
  const isNodeNotEmpty = triggerNodeId !== '';
  const triggerId = (isNodeString && isNodeNotEmpty) ? triggerNodeId : undefined;
  const compileOptions = triggerId ? { scopeRootNodeIds: [triggerId] } : {};
  return compileGraph(nodes, edges, { scopeMode: 'reachable_from_roots', ...compileOptions });
}
