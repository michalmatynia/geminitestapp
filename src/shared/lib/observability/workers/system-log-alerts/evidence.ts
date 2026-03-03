import type { SystemLogRecordDto as SystemLogRecord } from '@/shared/contracts/observability';
import { hydrateLogRuntimeContext } from '@/shared/lib/observability/runtime-context/hydrate-system-log-runtime-context';
import { isObjectRecord } from '@/shared/utils/object-utils';
import { 
  type AlertEvidenceContextRegistry, 
  type AlertEvidenceSample, 
  type AlertEvidenceContext,
  type AlertEvidenceQuery
} from './types';
import { listAlertEvidenceLogs } from './repository';
import { ALERT_EVIDENCE_SAMPLE_LIMIT } from './config';

export const asRecord = (value: unknown): Record<string, unknown> | null =>
  isObjectRecord(value) ? value : null;

export const readTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const readContextRegistryEvidence = (value: unknown): AlertEvidenceContextRegistry | null => {
  const contextRegistry = asRecord(value);
  if (!contextRegistry) return null;

  const refs = Array.isArray(contextRegistry['refs'])
    ? contextRegistry['refs']
      .map((ref) => {
        const record = asRecord(ref);
        const id = readTrimmedString(record?.['id']);
        const kind = readTrimmedString(record?.['kind']);
        if (!id || !kind) return null;

        return {
          id,
          kind,
          ...(readTrimmedString(record?.['providerId'])
            ? { providerId: readTrimmedString(record?.['providerId'])! }
            : {}),
          ...(readTrimmedString(record?.['entityType'])
            ? { entityType: readTrimmedString(record?.['entityType'])! }
            : {}),
        };
      })
      .filter((ref): ref is AlertEvidenceContextRegistry['refs'][number] => Boolean(ref))
    : [];

  if (refs.length === 0) return null;

  return {
    refs,
    engineVersion: readTrimmedString(contextRegistry['engineVersion']),
  };
};

export const summarizeLogForAlertEvidence = async (log: SystemLogRecord): Promise<AlertEvidenceSample> => {
  const context = await hydrateLogRuntimeContext(log.context ?? null);
  const contextRecord = asRecord(context);
  const contextRegistry = readContextRegistryEvidence(contextRecord?.['contextRegistry']);

  return {
    logId: log.id,
    createdAt: log.createdAt || '',
    level: log.level,
    source: log.source ?? null,
    message: log.message,
    fingerprint: readTrimmedString(contextRecord?.['fingerprint']),
    contextRegistry,
  };
};

export const buildAlertEvidenceContext = async (input: {
  provider: 'mongodb' | 'prisma';
  query: AlertEvidenceQuery;
  matchedCount: number;
  windowStart?: Date | null;
}): Promise<AlertEvidenceContext> => {
  const logs = await listAlertEvidenceLogs(input.provider, {
    ...input.query,
    limit: ALERT_EVIDENCE_SAMPLE_LIMIT,
  }, ALERT_EVIDENCE_SAMPLE_LIMIT);
  const samples = await Promise.all(logs.map((log) => summarizeLogForAlertEvidence(log)));

  return {
    windowStart: input.windowStart ? input.windowStart.toISOString() : null,
    windowEnd: new Date().toISOString(),
    matchedCount: input.matchedCount,
    sampleSize: samples.length,
    samples,
  };
};

export const buildLogSilenceEvidenceContext = async (provider: 'mongodb' | 'prisma'): Promise<AlertEvidenceContext> => {
  const latest = await listAlertEvidenceLogs(provider, {
    limit: 1,
  }, 1);
  const lastObservedLog = latest[0] ? await summarizeLogForAlertEvidence(latest[0]) : null;

  return {
    windowStart: null,
    windowEnd: new Date().toISOString(),
    matchedCount: 0,
    sampleSize: 0,
    samples: [],
    lastObservedLog,
  };
};
