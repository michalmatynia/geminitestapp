import type { PortablePathEnvelopeSignatureVerificationMode } from './portable-engine-types';

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

export type PortablePathEnvelopeVerificationAuditSink = {
  id: string;
  write: (
    event: PortablePathEnvelopeVerificationAuditEvent,
    snapshot: PortablePathEnvelopeVerificationObservabilitySnapshot
  ) => void | Promise<void>;
};

export type PortablePathEnvelopeVerificationAuditSinkById = {
  writesAttempted: number;
  writesSucceeded: number;
  writesFailed: number;
  lastError: string | null;
  lastWrittenAt: string | null;
};

export type PortablePathEnvelopeVerificationAuditSinkFailureTelemetry = {
  sinkId: string;
  error: string;
  at: string;
};

export type PortablePathEnvelopeVerificationAuditSinkSnapshot = {
  totals: {
    registrationCount: number;
    unregistrationCount: number;
    writesAttempted: number;
    writesSucceeded: number;
    writesFailed: number;
  };
  registeredSinkIds: string[];
  bySinkId: Record<string, PortablePathEnvelopeVerificationAuditSinkById>;
  recentFailures: PortablePathEnvelopeVerificationAuditSinkFailureTelemetry[];
};

const MAX_PORTABLE_PATH_ENVELOPE_VERIFICATION_EVENTS = 100;
const MAX_PORTABLE_PATH_ENVELOPE_VERIFICATION_SINK_FAILURE_EVENTS = 50;
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
const portablePathEnvelopeVerificationObservabilityHooks = new Set<
  PortablePathEnvelopeVerificationObservabilityHook
>();

const clonePortablePathEnvelopeVerificationObservabilitySnapshot = (
  snapshot: PortablePathEnvelopeVerificationObservabilitySnapshot
): PortablePathEnvelopeVerificationObservabilitySnapshot => ({
  totals: { ...snapshot.totals },
  byKeyId: Object.fromEntries(
    Object.entries(snapshot.byKeyId).map(([keyId, stats]) => [keyId, { ...stats }])
  ),
  recentEvents: snapshot.recentEvents.map((event) => ({ ...event })),
});

const emitPortablePathEnvelopeVerificationObservabilityEvent = (
  event: PortablePathEnvelopeVerificationAuditEvent
): void => {
  if (portablePathEnvelopeVerificationObservabilityHooks.size === 0) return;
  const snapshot = clonePortablePathEnvelopeVerificationObservabilitySnapshot(
    portablePathEnvelopeVerificationObservabilityState
  );
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

const createEmptyPortablePathEnvelopeVerificationAuditSinkState =
  (): PortablePathEnvelopeVerificationAuditSinkSnapshot => ({
    totals: {
      registrationCount: 0,
      unregistrationCount: 0,
      writesAttempted: 0,
      writesSucceeded: 0,
      writesFailed: 0,
    },
    registeredSinkIds: [],
    bySinkId: {},
    recentFailures: [],
  });

let portablePathEnvelopeVerificationAuditSinkState =
  createEmptyPortablePathEnvelopeVerificationAuditSinkState();
const portablePathEnvelopeVerificationAuditSinks = new Map<
  string,
  PortablePathEnvelopeVerificationAuditSink
>();

const ensurePortablePathEnvelopeVerificationAuditSinkById = (
  sinkId: string
): PortablePathEnvelopeVerificationAuditSinkById => {
  if (!portablePathEnvelopeVerificationAuditSinkState.bySinkId[sinkId]) {
    portablePathEnvelopeVerificationAuditSinkState.bySinkId[sinkId] = {
      writesAttempted: 0,
      writesSucceeded: 0,
      writesFailed: 0,
      lastError: null,
      lastWrittenAt: null,
    };
  }
  return portablePathEnvelopeVerificationAuditSinkState.bySinkId[sinkId];
};

const markPortablePathEnvelopeVerificationAuditSinkAttempt = (sinkId: string): void => {
  portablePathEnvelopeVerificationAuditSinkState.totals.writesAttempted += 1;
  const sink = ensurePortablePathEnvelopeVerificationAuditSinkById(sinkId);
  sink.writesAttempted += 1;
};

const markPortablePathEnvelopeVerificationAuditSinkSuccess = (sinkId: string): void => {
  portablePathEnvelopeVerificationAuditSinkState.totals.writesSucceeded += 1;
  const sink = ensurePortablePathEnvelopeVerificationAuditSinkById(sinkId);
  sink.writesSucceeded += 1;
  sink.lastError = null;
  sink.lastWrittenAt = new Date().toISOString();
};

const markPortablePathEnvelopeVerificationAuditSinkFailure = (
  sinkId: string,
  error: unknown
): void => {
  const message = error instanceof Error ? error.message : String(error);
  portablePathEnvelopeVerificationAuditSinkState.totals.writesFailed += 1;
  const sink = ensurePortablePathEnvelopeVerificationAuditSinkById(sinkId);
  sink.writesFailed += 1;
  sink.lastError = message;
  sink.lastWrittenAt = new Date().toISOString();
  portablePathEnvelopeVerificationAuditSinkState.recentFailures.push({
    sinkId,
    error: message,
    at: new Date().toISOString(),
  });
  if (
    portablePathEnvelopeVerificationAuditSinkState.recentFailures.length >
    MAX_PORTABLE_PATH_ENVELOPE_VERIFICATION_SINK_FAILURE_EVENTS
  ) {
    portablePathEnvelopeVerificationAuditSinkState.recentFailures.shift();
  }
};

const dispatchPortablePathEnvelopeVerificationAuditSinks = (
  event: PortablePathEnvelopeVerificationAuditEvent
): void => {
  if (portablePathEnvelopeVerificationAuditSinks.size === 0) return;
  const snapshot = clonePortablePathEnvelopeVerificationObservabilitySnapshot(
    portablePathEnvelopeVerificationObservabilityState
  );
  for (const [sinkId, sink] of portablePathEnvelopeVerificationAuditSinks.entries()) {
    markPortablePathEnvelopeVerificationAuditSinkAttempt(sinkId);
    try {
      const sinkResult = sink.write(event, snapshot);
      Promise.resolve(sinkResult)
        .then(() => {
          markPortablePathEnvelopeVerificationAuditSinkSuccess(sinkId);
        })
        .catch((error: unknown) => {
          markPortablePathEnvelopeVerificationAuditSinkFailure(sinkId, error);
        });
    } catch (error: unknown) {
      markPortablePathEnvelopeVerificationAuditSinkFailure(sinkId, error);
    }
  }
};

const clonePortablePathEnvelopeVerificationAuditSinkSnapshot = (
  snapshot: PortablePathEnvelopeVerificationAuditSinkSnapshot
): PortablePathEnvelopeVerificationAuditSinkSnapshot => ({
  totals: { ...snapshot.totals },
  registeredSinkIds: [...snapshot.registeredSinkIds],
  bySinkId: Object.fromEntries(
    Object.entries(snapshot.bySinkId).map(([sinkId, stats]) => [sinkId, { ...stats }])
  ),
  recentFailures: snapshot.recentFailures.map((item) => ({ ...item })),
});

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
  emitPortablePathEnvelopeVerificationObservabilityEvent(finalizedEvent);
  dispatchPortablePathEnvelopeVerificationAuditSinks(finalizedEvent);
};

export const registerPortablePathEnvelopeVerificationObservabilityHook = (
  hook: PortablePathEnvelopeVerificationObservabilityHook
): (() => void) => {
  portablePathEnvelopeVerificationObservabilityHooks.add(hook);
  return () => {
    portablePathEnvelopeVerificationObservabilityHooks.delete(hook);
  };
};

export const getPortablePathEnvelopeVerificationObservabilitySnapshot =
  (): PortablePathEnvelopeVerificationObservabilitySnapshot =>
    clonePortablePathEnvelopeVerificationObservabilitySnapshot(
      portablePathEnvelopeVerificationObservabilityState
    );

export const resetPortablePathEnvelopeVerificationObservabilitySnapshot = (): void => {
  portablePathEnvelopeVerificationObservabilityState =
    createEmptyPortablePathEnvelopeVerificationObservabilityState();
};

export const registerPortablePathEnvelopeVerificationAuditSink = (
  sink: PortablePathEnvelopeVerificationAuditSink
): (() => void) => {
  const sinkId = sink.id.trim();
  if (sinkId.length === 0) {
    throw new Error('Portable envelope verification audit sink id cannot be empty.');
  }
  if (portablePathEnvelopeVerificationAuditSinks.has(sinkId)) {
    throw new Error(`Portable envelope verification audit sink "${sinkId}" is already registered.`);
  }
  portablePathEnvelopeVerificationAuditSinks.set(sinkId, {
    ...sink,
    id: sinkId,
  });
  portablePathEnvelopeVerificationAuditSinkState.totals.registrationCount += 1;
  ensurePortablePathEnvelopeVerificationAuditSinkById(sinkId);
  portablePathEnvelopeVerificationAuditSinkState.registeredSinkIds =
    Array.from(portablePathEnvelopeVerificationAuditSinks.keys()).sort();
  return () => {
    unregisterPortablePathEnvelopeVerificationAuditSink(sinkId);
  };
};

export const unregisterPortablePathEnvelopeVerificationAuditSink = (sinkId: string): boolean => {
  const normalizedSinkId = sinkId.trim();
  if (normalizedSinkId.length === 0) return false;
  const deleted = portablePathEnvelopeVerificationAuditSinks.delete(normalizedSinkId);
  if (deleted) {
    portablePathEnvelopeVerificationAuditSinkState.totals.unregistrationCount += 1;
    portablePathEnvelopeVerificationAuditSinkState.registeredSinkIds =
      Array.from(portablePathEnvelopeVerificationAuditSinks.keys()).sort();
  }
  return deleted;
};

export const listPortablePathEnvelopeVerificationAuditSinkIds = (): string[] =>
  Array.from(portablePathEnvelopeVerificationAuditSinks.keys()).sort();

export const getPortablePathEnvelopeVerificationAuditSinkSnapshot =
  (): PortablePathEnvelopeVerificationAuditSinkSnapshot =>
    clonePortablePathEnvelopeVerificationAuditSinkSnapshot(
      portablePathEnvelopeVerificationAuditSinkState
    );

export const resetPortablePathEnvelopeVerificationAuditSinkSnapshot = (
  options?: { clearRegisteredSinks?: boolean }
): void => {
  const registeredSinkIds = options?.clearRegisteredSinks
    ? []
    : Array.from(portablePathEnvelopeVerificationAuditSinks.keys()).sort();
  if (options?.clearRegisteredSinks) {
    portablePathEnvelopeVerificationAuditSinks.clear();
  }
  portablePathEnvelopeVerificationAuditSinkState =
    createEmptyPortablePathEnvelopeVerificationAuditSinkState();
  portablePathEnvelopeVerificationAuditSinkState.registeredSinkIds = registeredSinkIds;
};
