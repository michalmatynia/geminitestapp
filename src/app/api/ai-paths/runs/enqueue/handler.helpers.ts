import { type NextRequest } from 'next/server';
import { compileGraph } from '@/shared/lib/ai-paths/core/utils';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import type { AiNode, Edge, AiPathRunEnqueueRequest } from '@/shared/contracts/ai-paths';
import type { enqueuePathRun } from '@/features/ai/ai-paths/server';
import type { requireAiPathsRunAccess } from '@/features/ai/ai-paths/server';

const hasOwn = (record: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(record, key);

const RUN_TRIGGER_CONTEXT_MAX_ARRAY_ITEMS = 12;
const RUN_TRIGGER_CONTEXT_MAX_STRING_LENGTH = 4_000;
const RUN_TRIGGER_CONTEXT_MAX_DEPTH = 10;
const RUN_TRIGGER_CONTEXT_HEAVY_KEYS = new Set([
  'cvs',
  'harvestprofiles',
  'importeddemands',
  'importedprofiles',
  'joblistings',
  'linkedrecords',
  'linkedanyparams',
  'linkedanytexts',
  'linkedbankaccounts',
  'linkeddocuments',
  'linkedevents',
  'selectedlinks',
  'selectedterms',
  'sourceapplicationcontext',
  'valuecatalog',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isHeavyTriggerContextKey = (key: string): boolean => {
  const normalized = key.trim().toLowerCase();
  return (
    RUN_TRIGGER_CONTEXT_HEAVY_KEYS.has(normalized) ||
    /(?:^|[_-])base64(?:$|[_-])/i.test(key) ||
    /(?:^|[_-])binary(?:$|[_-])/i.test(key) ||
    /(?:^|[_-])blob(?:$|[_-])/i.test(key) ||
    /(?:^|[_-])buffer(?:$|[_-])/i.test(key) ||
    normalized === 'bodyhtml' ||
    normalized === 'rawhtml'
  );
};

const summarizeTriggerContextCollection = (value: unknown): Record<string, number> | null => {
  if (Array.isArray(value)) return { count: value.length };
  if (!isRecord(value)) return null;
  const counts: Record<string, number> = {};
  Object.entries(value).forEach(([key, entryValue]) => {
    if (Array.isArray(entryValue)) counts[key] = entryValue.length;
  });
  return Object.keys(counts).length > 0 ? counts : null;
};

const summarizeTriggerContextLinkedRecords = (value: unknown): Record<string, unknown> | null => {
  if (!isRecord(value)) return summarizeTriggerContextCollection(value);
  const summary: Record<string, unknown> = {};
  Object.entries(value).forEach(([key, entryValue]) => {
    if (Array.isArray(entryValue)) summary[`${key}Count`] = entryValue.length;
  });
  const pickItems = (key: string, fields: string[]): void => {
    const items = value[key];
    if (!Array.isArray(items)) return;
    summary[key] = items.slice(0, 4).map((item: unknown): Record<string, unknown> => {
      const itemRecord = isRecord(item) ? item : {};
      return fields.reduce<Record<string, unknown>>((picked, field) => {
        const compacted = compactTriggerContextValue(itemRecord[field], 0);
        if (compacted !== undefined && compacted !== null && compacted !== '') {
          picked[field] = compacted;
        }
        return picked;
      }, {});
    });
  };
  pickItems('linkedEmails', ['email', 'value', 'label', 'type']);
  pickItems('linkedWebsites', ['url', 'website', 'value', 'label', 'type']);
  pickItems('linkedAddresses', ['city', 'country', 'street', 'postalCode', 'value', 'label']);
  pickItems('linkedOccupations', ['title', 'role', 'company', 'organizationName', 'value', 'label']);
  return Object.keys(summary).length > 0 ? summary : null;
};

const compactTriggerContextValue = (value: unknown, depth = 0): unknown => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > RUN_TRIGGER_CONTEXT_MAX_STRING_LENGTH
      ? `${trimmed.slice(0, RUN_TRIGGER_CONTEXT_MAX_STRING_LENGTH).trim()}... [truncated]`
      : trimmed;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value
      .slice(0, RUN_TRIGGER_CONTEXT_MAX_ARRAY_ITEMS)
      .map((entry: unknown): unknown => compactTriggerContextValue(entry, depth + 1))
      .filter((entry: unknown): boolean => entry !== undefined);
  }
  if (!isRecord(value)) return undefined;
  if (depth >= RUN_TRIGGER_CONTEXT_MAX_DEPTH) return {};

  const next: Record<string, unknown> = {};
  Object.entries(value).forEach(([key, entryValue]) => {
    if (isHeavyTriggerContextKey(key)) {
      const summary = key.trim().toLowerCase() === 'linkedrecords'
        ? summarizeTriggerContextLinkedRecords(entryValue)
        : summarizeTriggerContextCollection(entryValue);
      if (summary !== null) next[`${key}Summary`] = summary;
      return;
    }
    const compacted = compactTriggerContextValue(entryValue, depth + 1);
    if (compacted !== undefined) next[key] = compacted;
  });
  return next;
};

export const compactRunTriggerContext = (
  triggerContext: AiPathRunEnqueueRequest['triggerContext']
): Record<string, unknown> | null => {
  if (!isRecord(triggerContext)) return null;
  const compacted = compactTriggerContextValue(triggerContext);
  if (!isRecord(compacted)) return null;
  const source = isRecord(compacted['source']) ? compacted['source'] : null;
  if (source?.['location'] === 'filemaker_organization_job_application' && hasOwn(compacted, 'entityJson')) {
    return {
      ...compacted,
      entity: null,
    };
  }
  return compacted;
};

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
    triggerEvent: data.triggerEvent, triggerNodeId: data.triggerNodeId, triggerContext: compactRunTriggerContext(data.triggerContext ?? null),
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
