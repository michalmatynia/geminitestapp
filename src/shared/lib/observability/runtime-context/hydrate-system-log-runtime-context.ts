import 'server-only';

import { contextRegistryEngine } from '@/features/ai/ai-context-registry/server';
import type {
  ContextRegistryConsumerEnvelope,
  ContextRegistryRef,
} from '@/shared/contracts/ai-context-registry';
import type { SystemLogRecordDto as SystemLogRecord } from '@/shared/contracts/observability';
import { isObjectRecord } from '@/shared/utils/object-utils';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  isObjectRecord(value) ? value : null;

const readTrimmedString = (value: unknown, maxLength: number = 200): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
};

const toContextRegistryRef = (value: unknown): ContextRegistryRef | null => {
  const record = asRecord(value);
  if (!record) return null;
  const id = readTrimmedString(record['id']);
  const kind = readTrimmedString(record['kind']);
  if (!id || (kind !== 'static_node' && kind !== 'runtime_document')) return null;

  return {
    id,
    kind,
    ...(readTrimmedString(record['providerId'])
      ? { providerId: readTrimmedString(record['providerId'])! }
      : {}),
    ...(readTrimmedString(record['entityType'])
      ? { entityType: readTrimmedString(record['entityType'])! }
      : {}),
  };
};

const readContextRegistryRefs = (value: unknown): ContextRegistryRef[] => {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const refs: ContextRegistryRef[] = [];
  for (const entry of value) {
    const ref = toContextRegistryRef(entry);
    if (!ref || seen.has(ref.id)) continue;
    seen.add(ref.id);
    refs.push(ref);
  }

  return refs;
};

const readContextRegistryEnvelope = (
  value: unknown
): (Partial<ContextRegistryConsumerEnvelope> & Record<string, unknown>) | null => asRecord(value);

const stripAiPathRunSnapshot = (record: Record<string, unknown>): Record<string, unknown> => {
  const staticContext = asRecord(record['staticContext']);
  if (!staticContext || !('aiPathRun' in staticContext)) return record;

  const { aiPathRun: _removed, ...restStaticContext } = staticContext;
  if (Object.keys(restStaticContext).length === 0) {
    const { staticContext: _staticContext, ...rest } = record;
    return rest;
  }

  return {
    ...record,
    staticContext: restStaticContext,
  };
};

const attachContextRegistryEnvelope = async (
  value: Record<string, unknown>,
  options: { stripAiPathRunSnapshot: boolean }
): Promise<Record<string, unknown>> => {
  const existingEnvelope = readContextRegistryEnvelope(value['contextRegistry']);
  const existingRefs = readContextRegistryRefs(existingEnvelope?.['refs']);
  const refs = existingRefs.length > 0 ? existingRefs : contextRegistryEngine.inferRefs(value);

  const baseRecord = options.stripAiPathRunSnapshot ? stripAiPathRunSnapshot(value) : value;
  if (refs.length === 0) {
    return baseRecord;
  }

  const envelope = {
    ...(existingEnvelope ?? {}),
    refs,
    engineVersion: contextRegistryEngine.getVersion(),
  };

  if (options.stripAiPathRunSnapshot && 'resolved' in envelope) {
    delete envelope['resolved'];
  }

  return {
    ...baseRecord,
    contextRegistry: envelope,
  };
};

const resolveContextRegistryEnvelope = async (
  value: Record<string, unknown>
): Promise<Record<string, unknown>> => {
  const existingEnvelope = readContextRegistryEnvelope(value['contextRegistry']);
  const refs = readContextRegistryRefs(existingEnvelope?.['refs']);
  if (refs.length === 0) return value;

  try {
    const resolved = await contextRegistryEngine.resolveRefs({
      refs,
      maxNodes: 16,
      depth: 1,
    });

    return {
      ...value,
      contextRegistry: {
        ...(existingEnvelope ?? {}),
        refs,
        engineVersion: resolved.engineVersion,
        resolved,
      },
    };
  } catch (error) {
    void ErrorSystem.captureException(error);
    return {
      ...value,
      contextRegistry: {
        ...(existingEnvelope ?? {}),
        refs,
        engineVersion: contextRegistryEngine.getVersion(),
      },
    };
  }
};

const hydrateConsumerRecordRuntimeContext = async (
  value: unknown
): Promise<Record<string, unknown> | null> => {
  const record = asRecord(value);
  if (!record) return record;

  const withEnvelope = await attachContextRegistryEnvelope(record, {
    stripAiPathRunSnapshot: false,
  });
  return await resolveContextRegistryEnvelope(withEnvelope);
};

const hydrateAlertEvidenceRuntimeContext = async (
  context: Record<string, unknown>
): Promise<Record<string, unknown>> => {
  const alertEvidence = asRecord(context['alertEvidence']);
  if (!alertEvidence) return context;

  const sampleValues = Array.isArray(alertEvidence['samples']) ? alertEvidence['samples'] : [];
  const hydratedSamples = await Promise.all(
    sampleValues.map(async (sample) => await hydrateConsumerRecordRuntimeContext(sample))
  );
  const hydratedLastObservedLog = await hydrateConsumerRecordRuntimeContext(
    alertEvidence['lastObservedLog']
  );

  return {
    ...context,
    alertEvidence: {
      ...alertEvidence,
      samples: hydratedSamples.filter((sample): sample is Record<string, unknown> =>
        Boolean(sample)
      ),
      ...(alertEvidence['lastObservedLog'] !== undefined
        ? { lastObservedLog: hydratedLastObservedLog }
        : {}),
    },
  };
};

export const hydrateLogRuntimeContext = async (
  context: Record<string, unknown> | null | undefined
): Promise<Record<string, unknown> | null> => {
  const contextRecord = asRecord(context);
  if (!contextRecord) return context ?? null;
  return await attachContextRegistryEnvelope(contextRecord, {
    stripAiPathRunSnapshot: true,
  });
};

export const hydrateSystemLogRecordRuntimeContext = async (
  log: SystemLogRecord
): Promise<SystemLogRecord> => {
  const contextRecord = asRecord(log.context);
  if (!contextRecord) return log;

  const withEnvelope = await attachContextRegistryEnvelope(contextRecord, {
    stripAiPathRunSnapshot: false,
  });
  const withResolved = await resolveContextRegistryEnvelope(withEnvelope);
  const hydratedContext = await hydrateAlertEvidenceRuntimeContext(withResolved);

  if (hydratedContext === log.context) return log;

  return {
    ...log,
    context: hydratedContext,
  };
};
