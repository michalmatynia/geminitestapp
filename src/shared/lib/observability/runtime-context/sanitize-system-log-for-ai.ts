import 'server-only';

import type {
  ContextNode,
  ContextRegistryConsumerEnvelope,
  ContextRegistryRef,
  ContextRuntimeDocument,
} from '@/shared/contracts/ai-context-registry';
import type { SystemLogRecordDto as SystemLogRecord } from '@/shared/contracts/observability';
import { isObjectRecord } from '@/shared/utils/object-utils';

import { hydrateSystemLogRecordRuntimeContext } from './hydrate-system-log-runtime-context';

const MAX_AI_DOCUMENTS = 3;
const MAX_AI_NODES = 8;
const MAX_AI_SECTION_ITEMS = 6;
const MAX_AI_TAGS = 6;
const MAX_ALERT_EVIDENCE_SAMPLES = 3;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  isObjectRecord(value) ? value : null;

const sanitizeRuntimeDocument = (value: unknown): ContextRuntimeDocument | null => {
  const record = asRecord(value);
  if (!record || typeof record['id'] !== 'string' || record['kind'] !== 'runtime_document') {
    return null;
  }

  return {
    id: record['id'],
    kind: 'runtime_document',
    entityType:
      typeof record['entityType'] === 'string' ? record['entityType'] : 'runtime_document',
    title: typeof record['title'] === 'string' ? record['title'] : String(record['id']),
    summary: typeof record['summary'] === 'string' ? record['summary'] : '',
    status: typeof record['status'] === 'string' ? record['status'] : null,
    tags: Array.isArray(record['tags'])
      ? record['tags']
          .filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
          .slice(0, MAX_AI_TAGS)
      : [],
    relatedNodeIds: Array.isArray(record['relatedNodeIds'])
      ? record['relatedNodeIds']
          .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
          .slice(0, MAX_AI_NODES)
      : [],
    timestamps: asRecord(record['timestamps']) ?? undefined,
    facts: asRecord(record['facts']) ?? undefined,
    sections: Array.isArray(record['sections'])
      ? record['sections']
          .map((section) => {
            const sectionRecord = asRecord(section);
            if (!sectionRecord || typeof sectionRecord['title'] !== 'string') return null;
            const items = Array.isArray(sectionRecord['items'])
              ? sectionRecord['items']
                  .filter((item): item is Record<string, unknown> => Boolean(asRecord(item)))
                  .slice(0, MAX_AI_SECTION_ITEMS)
              : undefined;

            const kindRaw = sectionRecord['kind'];
            const kind: 'text' | 'items' | 'events' | 'facts' =
              kindRaw === 'facts' ||
              kindRaw === 'items' ||
              kindRaw === 'events' ||
              kindRaw === 'text'
                ? kindRaw
                : 'items';

            return {
              ...(typeof sectionRecord['id'] === 'string' ? { id: sectionRecord['id'] } : {}),
              kind,
              title: sectionRecord['title'],
              ...(typeof sectionRecord['summary'] === 'string'
                ? { summary: sectionRecord['summary'] }
                : {}),
              ...(typeof sectionRecord['text'] === 'string' ? { text: sectionRecord['text'] } : {}),
              ...(items ? { items } : {}),
            };
          })
          .filter((section): section is NonNullable<typeof section> => Boolean(section))
      : undefined,
    provenance: asRecord(record['provenance']) ?? undefined,
  };
};

const sanitizeContextNode = (value: unknown): ContextNode | null => {
  const record = asRecord(value);
  if (!record || typeof record['id'] !== 'string') return null;

  return {
    id: record['id'],
    kind:
      record['kind'] === 'page' ||
      record['kind'] === 'component' ||
      record['kind'] === 'collection' ||
      record['kind'] === 'action' ||
      record['kind'] === 'policy' ||
      record['kind'] === 'event' ||
      record['kind'] === 'workflow'
        ? record['kind']
        : 'page',
    name: typeof record['name'] === 'string' ? record['name'] : record['id'],
    description: typeof record['description'] === 'string' ? record['description'] : '',
    tags: Array.isArray(record['tags'])
      ? record['tags']
          .filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
          .slice(0, MAX_AI_TAGS)
      : [],
    owner: typeof record['owner'] === 'string' ? record['owner'] : undefined,
    relationships: Array.isArray(record['relationships'])
      ? record['relationships']
          .filter(
            (relationship): relationship is NonNullable<ContextNode['relationships']>[number] => {
              const relationshipRecord = asRecord(relationship);
              return Boolean(
                relationshipRecord &&
                typeof relationshipRecord['type'] === 'string' &&
                typeof relationshipRecord['targetId'] === 'string'
              );
            }
          )
          .slice(0, MAX_AI_NODES)
      : undefined,
    permissions: {
      readScopes: [],
      riskTier: 'low',
      classification: 'internal',
    },
    version: typeof record['version'] === 'string' ? record['version'] : 'sanitized',
    updatedAtISO:
      typeof record['updatedAtISO'] === 'string'
        ? record['updatedAtISO']
        : new Date(0).toISOString(),
    source: {
      type: 'code',
      ref:
        typeof asRecord(record['source'])?.['ref'] === 'string'
          ? String(asRecord(record['source'])?.['ref'])
          : 'sanitized',
    },
  };
};

const sanitizeContextRegistryEnvelope = (
  value: unknown
): ContextRegistryConsumerEnvelope | null => {
  const record = asRecord(value);
  if (!record) return null;

  const refs = Array.isArray(record['refs'])
    ? record['refs']
        .map((ref) => {
          const refRecord = asRecord(ref);
          if (
            !refRecord ||
            typeof refRecord['id'] !== 'string' ||
            (refRecord['kind'] !== 'static_node' && refRecord['kind'] !== 'runtime_document')
          ) {
            return null;
          }

          return {
            id: refRecord['id'],
            kind: refRecord['kind'],
            ...(typeof refRecord['providerId'] === 'string'
              ? { providerId: refRecord['providerId'] }
              : {}),
            ...(typeof refRecord['entityType'] === 'string'
              ? { entityType: refRecord['entityType'] }
              : {}),
          } satisfies ContextRegistryRef;
        })
        .filter((ref): ref is ContextRegistryRef => Boolean(ref))
    : [];

  const resolvedRecord = asRecord(record['resolved']);
  const documents = Array.isArray(resolvedRecord?.['documents'])
    ? resolvedRecord['documents']
        .map((document) => sanitizeRuntimeDocument(document))
        .filter((document): document is ContextRuntimeDocument => Boolean(document))
        .slice(0, MAX_AI_DOCUMENTS)
    : [];
  const nodes = Array.isArray(resolvedRecord?.['nodes'])
    ? resolvedRecord['nodes']
        .map((node) => sanitizeContextNode(node))
        .filter((node): node is ContextNode => Boolean(node))
        .slice(0, MAX_AI_NODES)
    : [];

  return {
    refs,
    engineVersion:
      typeof record['engineVersion'] === 'string' ? record['engineVersion'] : 'unknown',
    ...(resolvedRecord
      ? {
          resolved: {
            refs,
            nodes,
            documents,
            truncated: Boolean(resolvedRecord['truncated']),
            engineVersion:
              typeof resolvedRecord['engineVersion'] === 'string'
                ? resolvedRecord['engineVersion']
                : typeof record['engineVersion'] === 'string'
                  ? record['engineVersion']
                  : 'unknown',
          },
        }
      : {}),
  };
};

const sanitizeAlertEvidenceSample = (value: unknown): Record<string, unknown> | null => {
  const record = asRecord(value);
  if (!record) return null;

  return {
    ...(typeof record['logId'] === 'string' ? { logId: record['logId'] } : {}),
    ...(typeof record['createdAt'] === 'string' ? { createdAt: record['createdAt'] } : {}),
    ...(typeof record['level'] === 'string' ? { level: record['level'] } : {}),
    ...(typeof record['source'] === 'string' ? { source: record['source'] } : {}),
    ...(typeof record['message'] === 'string' ? { message: record['message'] } : {}),
    ...(typeof record['fingerprint'] === 'string' ? { fingerprint: record['fingerprint'] } : {}),
    ...(sanitizeContextRegistryEnvelope(record['contextRegistry'])
      ? { contextRegistry: sanitizeContextRegistryEnvelope(record['contextRegistry']) }
      : {}),
  };
};

const sanitizeAlertEvidence = (value: unknown): Record<string, unknown> | null => {
  const record = asRecord(value);
  if (!record) return null;

  const samples = Array.isArray(record['samples'])
    ? record['samples']
        .map((sample) => sanitizeAlertEvidenceSample(sample))
        .filter((sample): sample is Record<string, unknown> => Boolean(sample))
        .slice(0, MAX_ALERT_EVIDENCE_SAMPLES)
    : [];
  const lastObservedLog = sanitizeAlertEvidenceSample(record['lastObservedLog']);

  return {
    ...(record['matchedCount'] !== undefined ? { matchedCount: record['matchedCount'] } : {}),
    ...(record['sampleSize'] !== undefined ? { sampleSize: record['sampleSize'] } : {}),
    ...(typeof record['windowStart'] === 'string' ? { windowStart: record['windowStart'] } : {}),
    ...(typeof record['windowEnd'] === 'string' ? { windowEnd: record['windowEnd'] } : {}),
    ...(lastObservedLog ? { lastObservedLog } : {}),
    samples,
  };
};

export const sanitizeSystemLogForAi = async (
  log: SystemLogRecord
): Promise<Record<string, unknown>> => {
  const hydrated = await hydrateSystemLogRecordRuntimeContext(log);
  const context = asRecord(hydrated.context);
  const fingerprint = context ? context['fingerprint'] : undefined;
  const contextRegistry = sanitizeContextRegistryEnvelope(context?.['contextRegistry']);
  const alertEvidence = sanitizeAlertEvidence(context?.['alertEvidence']);

  return {
    id: hydrated.id,
    level: hydrated.level,
    message: hydrated.message,
    source: hydrated.source,
    createdAt: hydrated.createdAt,
    path: hydrated.path ?? null,
    method: hydrated.method ?? null,
    statusCode: hydrated.statusCode ?? null,
    context:
      fingerprint !== undefined || contextRegistry || alertEvidence
        ? {
            ...(fingerprint !== undefined ? { fingerprint } : {}),
            ...(contextRegistry ? { contextRegistry } : {}),
            ...(alertEvidence ? { alertEvidence } : {}),
          }
        : null,
  };
};
