import 'server-only';

import type { SystemLogInput } from '@/shared/lib/observability/system-logger';

import {
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_KIND,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_SOURCE,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_CATEGORY,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SOURCE,
} from './sinks-constants.server';

import type {
  PortablePathEnvelopeVerificationAuditEvent,
  PortablePathEnvelopeVerificationObservabilitySnapshot,
} from './portable-engine-envelope-observability';
import type { PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary } from './sinks-contracts.server';

export type PortablePathEnvelopeVerificationSinkLevel = 'info' | 'warn' | 'error';

export const getSinkLevel = (
  event: PortablePathEnvelopeVerificationAuditEvent
): PortablePathEnvelopeVerificationSinkLevel => {
  if (event.status === 'rejected') return 'error';
  if (event.status === 'warned') return 'warn';
  return 'info';
};

const normalizePortablePathEnvelopeVerificationKeyId = (keyId: string | null): string => {
  if (typeof keyId !== 'string') return 'none';
  const normalized = keyId.trim();
  return normalized.length > 0 ? normalized : 'none';
};

export const buildPortablePathEnvelopeVerificationMessage = (
  event: PortablePathEnvelopeVerificationAuditEvent
): string =>
  [
    'Portable envelope verification',
    `status=${event.status}`,
    `outcome=${event.outcome}`,
    `phase=${event.phase}`,
    `algorithm=${event.algorithm ?? 'unknown'}`,
    `keyId=${normalizePortablePathEnvelopeVerificationKeyId(event.keyId)}`,
  ].join(' ');

export const buildPortablePathEnvelopeVerificationAuditSinkHealthMessage = (
  sinkId: string,
  stage: 'probe' | 'summary'
): string => {
  if (stage === 'probe') {
    return `Portable envelope verification audit sink health probe sinkId=${sinkId}`;
  }
  return `Portable envelope verification audit sink startup health summary sinkId=${sinkId}`;
};

export const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) return error.message.trim();
  if (typeof error === 'string' && error.trim().length > 0) return error.trim();
  try {
    return JSON.stringify(error);
  } catch {
    return 'unknown_error';
  }
};

type PortablePathEnvelopeVerificationSnapshotReference = {
  totals: PortablePathEnvelopeVerificationObservabilitySnapshot['totals'];
  keyIdBucket: PortablePathEnvelopeVerificationObservabilitySnapshot['byKeyId'][string] | null;
};

const createPortablePathEnvelopeVerificationSnapshotReference = (
  event: PortablePathEnvelopeVerificationAuditEvent,
  snapshot: PortablePathEnvelopeVerificationObservabilitySnapshot
): PortablePathEnvelopeVerificationSnapshotReference => {
  const normalizedKeyId = normalizePortablePathEnvelopeVerificationKeyId(event.keyId);
  return {
    totals: snapshot.totals,
    keyIdBucket: snapshot.byKeyId[normalizedKeyId] ?? null,
  };
};

export const toPortablePathEnvelopeVerificationSystemLogInput = (
  event: PortablePathEnvelopeVerificationAuditEvent,
  snapshot: PortablePathEnvelopeVerificationObservabilitySnapshot,
  options?: {
    source?: string;
    service?: string;
    category?: string;
    includeSnapshot?: boolean;
  }
): SystemLogInput => ({
  level: getSinkLevel(event),
  source: options?.source ?? PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SOURCE,
  service: options?.service ?? PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
  message: buildPortablePathEnvelopeVerificationMessage(event),
  context: {
    category: options?.category ?? PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_CATEGORY,
    kind: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_KIND,
    event,
    ...(options?.includeSnapshot === false
      ? {}
      : {
        snapshot: createPortablePathEnvelopeVerificationSnapshotReference(event, snapshot),
      }),
  },
});

export const toPortablePathEnvelopeVerificationMongoDocument = (
  event: PortablePathEnvelopeVerificationAuditEvent,
  snapshot: PortablePathEnvelopeVerificationObservabilitySnapshot,
  options?: {
    source?: string;
    service?: string;
    category?: string;
    includeSnapshot?: boolean;
  }
): Record<string, unknown> => ({
  kind: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_KIND,
  level: getSinkLevel(event),
  source: options?.source ?? PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SOURCE,
  service: options?.service ?? PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
  category: options?.category ?? PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_CATEGORY,
  message: buildPortablePathEnvelopeVerificationMessage(event),
  event,
  ...(options?.includeSnapshot === false
    ? {}
    : {
      snapshot: createPortablePathEnvelopeVerificationSnapshotReference(event, snapshot),
  }),
  createdAt: new Date(event.at),
});

export const createPortablePathEnvelopeVerificationAuditSinkHealthSystemLogInput = (
  sinkId: string,
  options?: {
    source?: string;
    service?: string;
    category?: string;
  }
): SystemLogInput => ({
  level: 'info',
  source: options?.source ?? PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SOURCE,
  service: options?.service ?? PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
  message: buildPortablePathEnvelopeVerificationAuditSinkHealthMessage(sinkId, 'probe'),
  context: {
    category: options?.category ?? PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
    kind: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
    sinkId,
    stage: 'probe',
  },
});

export const createPortablePathEnvelopeVerificationAuditSinkHealthMongoDocument = (
  sinkId: string,
  options?: {
    source?: string;
    service?: string;
    category?: string;
  }
): Record<string, unknown> => ({
  kind: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
  level: 'info',
  source: options?.source ?? PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SOURCE,
  service: options?.service ?? PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
  category: options?.category ?? PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
  message: buildPortablePathEnvelopeVerificationAuditSinkHealthMessage(sinkId, 'probe'),
  sinkId,
  stage: 'probe',
  createdAt: new Date(),
});

export const toStartupHealthSummaryLogInput = (
  summary: PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary
): SystemLogInput => ({
  level: summary.status === 'failed' ? 'error' : summary.status === 'degraded' ? 'warn' : 'info',
  source: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_SOURCE,
  service: PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
  message: buildPortablePathEnvelopeVerificationAuditSinkHealthMessage('all', 'summary'),
  context: {
    category: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
    kind: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
    profile: summary.profile,
    policy: summary.policy,
    timeoutMs: summary.timeoutMs,
    status: summary.status,
    failedSinkIds: summary.failedSinkIds,
    diagnostics: summary.diagnostics,
  },
});

export const runWithTimeout = async (
  sinkId: string,
  timeoutMs: number,
  callback: () => void | Promise<void>
): Promise<void> => {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(
        new Error(
          `Portable envelope verification audit sink "${sinkId}" health check timed out after ${timeoutMs}ms.`
        )
      );
    }, timeoutMs);
  });
  try {
    await Promise.race([Promise.resolve().then(callback), timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
};
