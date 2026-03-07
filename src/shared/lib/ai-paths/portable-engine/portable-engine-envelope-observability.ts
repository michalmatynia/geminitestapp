import { dispatchPortablePathEnvelopeVerificationAuditSinks } from './portable-engine-envelope-audit-sinks';
import type { PortablePathEnvelopeSignatureVerificationMode } from './portable-engine-resolution-types';

export type PortablePathEnvelopeVerificationOutcome =
  | 'signature_missing'
  | 'key_missing'
  | 'async_required'
  | 'unsupported_algorithm'
  | 'verification_unavailable'
  | 'mismatch'
  | 'verified';

export type PortablePathEnvelopeVerificationStatus = 'verified' | 'warned' | 'rejected';

export type PortablePathEnvelopeVerificationAuditEvent = {
  at: string;
  phase: 'sync' | 'async';
  mode: PortablePathEnvelopeSignatureVerificationMode;
  algorithm: string | null;
  keyId: string | null;
  candidateSecretCount: number;
  matchedSecretIndex: number | null;
  outcome: PortablePathEnvelopeVerificationOutcome;
  status: PortablePathEnvelopeVerificationStatus;
};

export type PortablePathEnvelopeVerificationObservabilityByKeyId = {
  events: number;
  verified: number;
  warned: number;
  rejected: number;
  lastOutcome: PortablePathEnvelopeVerificationOutcome | null;
  lastSeenAt: string | null;
  lastAlgorithm: string | null;
};

export type PortablePathEnvelopeVerificationObservabilitySnapshot = {
  totals: {
    events: number;
    verified: number;
    warned: number;
    rejected: number;
  };
  byKeyId: Record<string, PortablePathEnvelopeVerificationObservabilityByKeyId>;
  recentEvents: PortablePathEnvelopeVerificationAuditEvent[];
};

export type PortablePathEnvelopeVerificationObservabilityHook = (
  event: PortablePathEnvelopeVerificationAuditEvent,
  snapshot: PortablePathEnvelopeVerificationObservabilitySnapshot
) => void;

const MAX_PORTABLE_PATH_ENVELOPE_VERIFICATION_EVENTS = 100;
const PORTABLE_PATH_ENVELOPE_KEY_ID_UNSPECIFIED = '(none)';

const createEmptyPortablePathEnvelopeVerificationObservabilityState =
  (): PortablePathEnvelopeVerificationObservabilitySnapshot => ({
    totals: {
      events: 0,
      verified: 0,
      warned: 0,
      rejected: 0,
    },
    byKeyId: {},
    recentEvents: [],
  });

let portablePathEnvelopeVerificationObservabilityState =
  createEmptyPortablePathEnvelopeVerificationObservabilityState();
const portablePathEnvelopeVerificationObservabilityHooks =
  new Set<PortablePathEnvelopeVerificationObservabilityHook>();

const clonePortablePathEnvelopeVerificationObservabilitySnapshot = (
  snapshot: PortablePathEnvelopeVerificationObservabilitySnapshot
): PortablePathEnvelopeVerificationObservabilitySnapshot => ({
  totals: { ...snapshot.totals },
  byKeyId: Object.fromEntries(
    Object.entries(snapshot.byKeyId).map(([keyId, stats]) => [keyId, { ...stats }])
  ),
  recentEvents: snapshot.recentEvents.map((event) => ({ ...event })),
});

export const getPortablePathEnvelopeVerificationObservabilitySnapshot =
  (): PortablePathEnvelopeVerificationObservabilitySnapshot =>
    clonePortablePathEnvelopeVerificationObservabilitySnapshot(
      portablePathEnvelopeVerificationObservabilityState
    );

const emitPortablePathEnvelopeVerificationObservabilityEvent = (
  event: PortablePathEnvelopeVerificationAuditEvent,
  snapshot: PortablePathEnvelopeVerificationObservabilitySnapshot
): void => {
  if (portablePathEnvelopeVerificationObservabilityHooks.size === 0) return;
  for (const hook of portablePathEnvelopeVerificationObservabilityHooks) {
    try {
      hook(event, snapshot);
    } catch {
      // Observability hooks must not break verification flow.
    }
  }
};

const resolvePortablePathEnvelopeVerificationKeyIdBucket = (keyId: string | null): string => {
  if (typeof keyId !== 'string') return PORTABLE_PATH_ENVELOPE_KEY_ID_UNSPECIFIED;
  const normalized = keyId.trim();
  return normalized.length > 0 ? normalized : PORTABLE_PATH_ENVELOPE_KEY_ID_UNSPECIFIED;
};

const ensurePortablePathEnvelopeVerificationByKeyId = (
  keyId: string
): PortablePathEnvelopeVerificationObservabilityByKeyId => {
  if (!portablePathEnvelopeVerificationObservabilityState.byKeyId[keyId]) {
    portablePathEnvelopeVerificationObservabilityState.byKeyId[keyId] = {
      events: 0,
      verified: 0,
      warned: 0,
      rejected: 0,
      lastOutcome: null,
      lastSeenAt: null,
      lastAlgorithm: null,
    };
  }
  return portablePathEnvelopeVerificationObservabilityState.byKeyId[keyId];
};

export const recordPortablePathEnvelopeVerificationEvent = (
  event: Omit<PortablePathEnvelopeVerificationAuditEvent, 'at'>
): void => {
  const finalizedEvent: PortablePathEnvelopeVerificationAuditEvent = {
    ...event,
    at: new Date().toISOString(),
  };
  portablePathEnvelopeVerificationObservabilityState.totals.events += 1;
  switch (finalizedEvent.status) {
    case 'verified':
      portablePathEnvelopeVerificationObservabilityState.totals.verified += 1;
      break;
    case 'warned':
      portablePathEnvelopeVerificationObservabilityState.totals.warned += 1;
      break;
    case 'rejected':
      portablePathEnvelopeVerificationObservabilityState.totals.rejected += 1;
      break;
    default:
      break;
  }
  const keyIdBucket = resolvePortablePathEnvelopeVerificationKeyIdBucket(finalizedEvent.keyId);
  const byKeyIdStats = ensurePortablePathEnvelopeVerificationByKeyId(keyIdBucket);
  byKeyIdStats.events += 1;
  switch (finalizedEvent.status) {
    case 'verified':
      byKeyIdStats.verified += 1;
      break;
    case 'warned':
      byKeyIdStats.warned += 1;
      break;
    case 'rejected':
      byKeyIdStats.rejected += 1;
      break;
    default:
      break;
  }
  byKeyIdStats.lastOutcome = finalizedEvent.outcome;
  byKeyIdStats.lastSeenAt = finalizedEvent.at;
  byKeyIdStats.lastAlgorithm = finalizedEvent.algorithm;

  portablePathEnvelopeVerificationObservabilityState.recentEvents.push(finalizedEvent);
  if (
    portablePathEnvelopeVerificationObservabilityState.recentEvents.length >
    MAX_PORTABLE_PATH_ENVELOPE_VERIFICATION_EVENTS
  ) {
    portablePathEnvelopeVerificationObservabilityState.recentEvents.shift();
  }
  const snapshot = getPortablePathEnvelopeVerificationObservabilitySnapshot();
  emitPortablePathEnvelopeVerificationObservabilityEvent(finalizedEvent, snapshot);
  dispatchPortablePathEnvelopeVerificationAuditSinks(finalizedEvent, snapshot);
};

export const registerPortablePathEnvelopeVerificationObservabilityHook = (
  hook: PortablePathEnvelopeVerificationObservabilityHook
): (() => void) => {
  portablePathEnvelopeVerificationObservabilityHooks.add(hook);
  return () => {
    portablePathEnvelopeVerificationObservabilityHooks.delete(hook);
  };
};

export const resetPortablePathEnvelopeVerificationObservabilitySnapshot = (): void => {
  portablePathEnvelopeVerificationObservabilityState =
    createEmptyPortablePathEnvelopeVerificationObservabilityState();
};

export {
  getPortablePathEnvelopeVerificationAuditSinkSnapshot,
  listPortablePathEnvelopeVerificationAuditSinkIds,
  registerPortablePathEnvelopeVerificationAuditSink,
  resetPortablePathEnvelopeVerificationAuditSinkSnapshot,
  unregisterPortablePathEnvelopeVerificationAuditSink,
} from './portable-engine-envelope-audit-sinks';

export type {
  PortablePathEnvelopeVerificationAuditSink,
  PortablePathEnvelopeVerificationAuditSinkById,
  PortablePathEnvelopeVerificationAuditSinkFailureTelemetry,
  PortablePathEnvelopeVerificationAuditSinkSnapshot,
} from './portable-engine-envelope-audit-sinks';
