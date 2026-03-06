import type {
  PortablePathEnvelopeVerificationAuditEvent,
  PortablePathEnvelopeVerificationObservabilitySnapshot,
} from './portable-engine-envelope-observability';

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

const MAX_PORTABLE_PATH_ENVELOPE_VERIFICATION_SINK_FAILURE_EVENTS = 50;

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

export const dispatchPortablePathEnvelopeVerificationAuditSinks = (
  event: PortablePathEnvelopeVerificationAuditEvent,
  snapshot: PortablePathEnvelopeVerificationObservabilitySnapshot
): void => {
  if (portablePathEnvelopeVerificationAuditSinks.size === 0) return;
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
