import type {
  PortablePathEnvelopeSignatureVerificationMode,
  PortablePathFingerprintVerificationMode,
  PortablePathInputSource,
  PortablePathSigningPolicyProfile,
  PortablePathSigningPolicySurface,
  PortablePathValidationMode,
} from './index';

export type PortablePathMigratorFailureReason = 'missing_migrator' | 'migrator_error';

export type PortablePathMigratorObservabilityByVersion = {
  attempts: number;
  successes: number;
  failures: number;
  lastError: string | null;
  lastMigratedAt: string | null;
};

export type PortablePathMigratorFailureTelemetry = {
  specVersion: string;
  reason: PortablePathMigratorFailureReason;
  error: string;
  at: string;
};

export type PortablePathMigratorObservabilitySnapshot = {
  totals: {
    registrationCount: number;
    unregistrationCount: number;
    migrationAttempts: number;
    migrationSuccesses: number;
    migrationFailures: number;
  };
  sourceCounts: Record<PortablePathInputSource, number>;
  bySpecVersion: Record<string, PortablePathMigratorObservabilityByVersion>;
  recentFailures: PortablePathMigratorFailureTelemetry[];
};

export type PortablePathMigratorObservabilityEvent =
  | { type: 'migrator_registered'; specVersion: string }
  | { type: 'migrator_unregistered'; specVersion: string }
  | { type: 'migration_succeeded'; specVersion: string; warningCount: number }
  | {
      type: 'migration_failed';
      specVersion: string;
      reason: PortablePathMigratorFailureReason;
      error: string;
    }
  | { type: 'source_migrated'; source: PortablePathInputSource };

export type PortablePathMigratorObservabilityHook = (
  event: PortablePathMigratorObservabilityEvent,
  snapshot: PortablePathMigratorObservabilitySnapshot
) => void;

export type PortablePathSigningPolicyUsageEvent = {
  at: string;
  profile: PortablePathSigningPolicyProfile;
  surface: PortablePathSigningPolicySurface;
  fingerprintVerificationMode: PortablePathFingerprintVerificationMode;
  envelopeSignatureVerificationMode: PortablePathEnvelopeSignatureVerificationMode;
};

export type PortablePathSigningPolicyUsageByProfile = {
  uses: number;
  bySurface: Record<PortablePathSigningPolicySurface, number>;
  fingerprintModeCounts: Record<PortablePathFingerprintVerificationMode, number>;
  envelopeModeCounts: Record<PortablePathEnvelopeSignatureVerificationMode, number>;
  lastUsedAt: string | null;
  lastSurface: PortablePathSigningPolicySurface | null;
};

export type PortablePathSigningPolicyUsageSnapshot = {
  totals: {
    uses: number;
  };
  byProfile: Record<PortablePathSigningPolicyProfile, PortablePathSigningPolicyUsageByProfile>;
  bySurface: Record<PortablePathSigningPolicySurface, number>;
  recentEvents: PortablePathSigningPolicyUsageEvent[];
};

export type PortablePathSigningPolicyUsageHook = (
  event: PortablePathSigningPolicyUsageEvent,
  snapshot: PortablePathSigningPolicyUsageSnapshot
) => void;

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

export type PortablePathRunExecutionRunner = 'client' | 'server';
export type PortablePathRunExecutionFailureStage = 'resolve' | 'validation' | 'runtime';

export type PortablePathRunExecutionCounts = {
  attempts: number;
  successes: number;
  failures: number;
};

export type PortablePathRunExecutionEvent = {
  at: string;
  runner: PortablePathRunExecutionRunner;
  surface: PortablePathSigningPolicySurface;
  source: PortablePathInputSource | null;
  validateBeforeRun: boolean;
  validationMode: PortablePathValidationMode | null;
  durationMs: number;
  outcome: 'success' | 'failure';
  failureStage: PortablePathRunExecutionFailureStage | null;
  error: string | null;
};

export type PortablePathRunExecutionSnapshot = {
  totals: PortablePathRunExecutionCounts;
  byRunner: Record<PortablePathRunExecutionRunner, PortablePathRunExecutionCounts>;
  bySurface: Record<PortablePathSigningPolicySurface, PortablePathRunExecutionCounts>;
  bySource: Record<PortablePathInputSource, PortablePathRunExecutionCounts>;
  failureStageCounts: Record<PortablePathRunExecutionFailureStage, number>;
  recentEvents: PortablePathRunExecutionEvent[];
};

export type PortablePathRunExecutionHook = (
  event: PortablePathRunExecutionEvent,
  snapshot: PortablePathRunExecutionSnapshot
) => void;

const MAX_PORTABLE_PATH_MIGRATOR_FAILURE_EVENTS = 25;
const MAX_PORTABLE_PATH_SIGNING_POLICY_USAGE_EVENTS = 100;
const MAX_PORTABLE_PATH_ENVELOPE_VERIFICATION_EVENTS = 100;
const MAX_PORTABLE_PATH_ENVELOPE_VERIFICATION_SINK_FAILURE_EVENTS = 50;
const MAX_PORTABLE_PATH_RUN_EXECUTION_EVENTS = 100;
const MAX_PORTABLE_PATH_RUN_EXECUTION_ERROR_MESSAGE_LENGTH = 320;
const PORTABLE_PATH_ENVELOPE_KEY_ID_UNSPECIFIED = '(none)';

const createEmptyPortablePathSourceCounts = (): Record<PortablePathInputSource, number> => ({
  portable_package: 0,
  portable_envelope: 0,
  semantic_canvas: 0,
  path_config: 0,
});

const createEmptyPortablePathSigningPolicySurfaceCounts = (): Record<
  PortablePathSigningPolicySurface,
  number
> => ({
  canvas: 0,
  product: 0,
  api: 0,
});

const createEmptyPortablePathFingerprintVerificationModeCounts = (): Record<
  PortablePathFingerprintVerificationMode,
  number
> => ({
  off: 0,
  warn: 0,
  strict: 0,
});

const createEmptyPortablePathEnvelopeSignatureVerificationModeCounts = (): Record<
  PortablePathEnvelopeSignatureVerificationMode,
  number
> => ({
  off: 0,
  warn: 0,
  strict: 0,
});

const createEmptyPortablePathSigningPolicyByProfile = (): Record<
  PortablePathSigningPolicyProfile,
  PortablePathSigningPolicyUsageByProfile
> => ({
  dev: {
    uses: 0,
    bySurface: createEmptyPortablePathSigningPolicySurfaceCounts(),
    fingerprintModeCounts: createEmptyPortablePathFingerprintVerificationModeCounts(),
    envelopeModeCounts: createEmptyPortablePathEnvelopeSignatureVerificationModeCounts(),
    lastUsedAt: null,
    lastSurface: null,
  },
  staging: {
    uses: 0,
    bySurface: createEmptyPortablePathSigningPolicySurfaceCounts(),
    fingerprintModeCounts: createEmptyPortablePathFingerprintVerificationModeCounts(),
    envelopeModeCounts: createEmptyPortablePathEnvelopeSignatureVerificationModeCounts(),
    lastUsedAt: null,
    lastSurface: null,
  },
  prod: {
    uses: 0,
    bySurface: createEmptyPortablePathSigningPolicySurfaceCounts(),
    fingerprintModeCounts: createEmptyPortablePathFingerprintVerificationModeCounts(),
    envelopeModeCounts: createEmptyPortablePathEnvelopeSignatureVerificationModeCounts(),
    lastUsedAt: null,
    lastSurface: null,
  },
});

const createEmptyPortablePathRunExecutionCounts = (): PortablePathRunExecutionCounts => ({
  attempts: 0,
  successes: 0,
  failures: 0,
});

const createEmptyPortablePathMigratorObservabilityState =
  (): PortablePathMigratorObservabilitySnapshot => ({
    totals: {
      registrationCount: 0,
      unregistrationCount: 0,
      migrationAttempts: 0,
      migrationSuccesses: 0,
      migrationFailures: 0,
    },
    sourceCounts: createEmptyPortablePathSourceCounts(),
    bySpecVersion: {},
    recentFailures: [],
  });

let portablePathMigratorObservabilityState = createEmptyPortablePathMigratorObservabilityState();
const portablePathMigratorObservabilityHooks = new Set<PortablePathMigratorObservabilityHook>();

const clonePortablePathMigratorObservabilitySnapshot = (
  snapshot: PortablePathMigratorObservabilitySnapshot
): PortablePathMigratorObservabilitySnapshot => ({
  totals: { ...snapshot.totals },
  sourceCounts: { ...snapshot.sourceCounts },
  bySpecVersion: Object.fromEntries(
    Object.entries(snapshot.bySpecVersion).map(([specVersion, stats]) => [specVersion, { ...stats }])
  ),
  recentFailures: snapshot.recentFailures.map((failure) => ({ ...failure })),
});

const emitPortablePathMigratorObservabilityEvent = (
  event: PortablePathMigratorObservabilityEvent
): void => {
  if (portablePathMigratorObservabilityHooks.size === 0) return;
  const snapshot = clonePortablePathMigratorObservabilitySnapshot(portablePathMigratorObservabilityState);
  for (const hook of portablePathMigratorObservabilityHooks) {
    try {
      hook(event, snapshot);
    } catch {
      // Observability hooks must not break migration flow.
    }
  }
};

const ensurePortablePathMigratorVersionStats = (
  specVersion: string
): PortablePathMigratorObservabilityByVersion => {
  if (!portablePathMigratorObservabilityState.bySpecVersion[specVersion]) {
    portablePathMigratorObservabilityState.bySpecVersion[specVersion] = {
      attempts: 0,
      successes: 0,
      failures: 0,
      lastError: null,
      lastMigratedAt: null,
    };
  }
  return portablePathMigratorObservabilityState.bySpecVersion[specVersion];
};

export const markPortablePathMigratorRegistration = (specVersion: string): void => {
  portablePathMigratorObservabilityState.totals.registrationCount += 1;
  ensurePortablePathMigratorVersionStats(specVersion);
  emitPortablePathMigratorObservabilityEvent({
    type: 'migrator_registered',
    specVersion,
  });
};

export const markPortablePathMigratorUnregistration = (specVersion: string): void => {
  portablePathMigratorObservabilityState.totals.unregistrationCount += 1;
  emitPortablePathMigratorObservabilityEvent({
    type: 'migrator_unregistered',
    specVersion,
  });
};

export const beginPortablePathMigratorAttempt = (specVersion: string): void => {
  portablePathMigratorObservabilityState.totals.migrationAttempts += 1;
  const stats = ensurePortablePathMigratorVersionStats(specVersion);
  stats.attempts += 1;
};

export const markPortablePathMigratorSuccess = (input: {
  specVersion: string;
  warningCount: number;
}): void => {
  portablePathMigratorObservabilityState.totals.migrationSuccesses += 1;
  const stats = ensurePortablePathMigratorVersionStats(input.specVersion);
  stats.successes += 1;
  stats.lastError = null;
  stats.lastMigratedAt = new Date().toISOString();
  emitPortablePathMigratorObservabilityEvent({
    type: 'migration_succeeded',
    specVersion: input.specVersion,
    warningCount: input.warningCount,
  });
};

export const recordPortablePathMigratorSource = (source: PortablePathInputSource): void => {
  portablePathMigratorObservabilityState.sourceCounts[source] += 1;
  emitPortablePathMigratorObservabilityEvent({
    type: 'source_migrated',
    source,
  });
};

export const markPortablePathMigratorFailure = (
  specVersion: string,
  reason: PortablePathMigratorFailureReason,
  error: string
): void => {
  portablePathMigratorObservabilityState.totals.migrationFailures += 1;
  const stats = ensurePortablePathMigratorVersionStats(specVersion);
  stats.failures += 1;
  stats.lastError = error;
  const telemetry: PortablePathMigratorFailureTelemetry = {
    specVersion,
    reason,
    error,
    at: new Date().toISOString(),
  };
  portablePathMigratorObservabilityState.recentFailures.push(telemetry);
  if (portablePathMigratorObservabilityState.recentFailures.length > MAX_PORTABLE_PATH_MIGRATOR_FAILURE_EVENTS) {
    portablePathMigratorObservabilityState.recentFailures.shift();
  }
  emitPortablePathMigratorObservabilityEvent({
    type: 'migration_failed',
    specVersion,
    reason,
    error,
  });
};

export const registerPortablePathMigratorObservabilityHook = (
  hook: PortablePathMigratorObservabilityHook
): (() => void) => {
  portablePathMigratorObservabilityHooks.add(hook);
  return () => {
    portablePathMigratorObservabilityHooks.delete(hook);
  };
};

export const getPortablePathMigratorObservabilitySnapshot =
  (): PortablePathMigratorObservabilitySnapshot =>
    clonePortablePathMigratorObservabilitySnapshot(portablePathMigratorObservabilityState);

export const resetPortablePathMigratorObservabilitySnapshot = (): void => {
  portablePathMigratorObservabilityState = createEmptyPortablePathMigratorObservabilityState();
};

const createEmptyPortablePathSigningPolicyUsageState =
  (): PortablePathSigningPolicyUsageSnapshot => ({
    totals: {
      uses: 0,
    },
    byProfile: createEmptyPortablePathSigningPolicyByProfile(),
    bySurface: createEmptyPortablePathSigningPolicySurfaceCounts(),
    recentEvents: [],
  });

let portablePathSigningPolicyUsageState = createEmptyPortablePathSigningPolicyUsageState();
const portablePathSigningPolicyUsageHooks = new Set<PortablePathSigningPolicyUsageHook>();

const clonePortablePathSigningPolicyUsageSnapshot = (
  snapshot: PortablePathSigningPolicyUsageSnapshot
): PortablePathSigningPolicyUsageSnapshot => ({
  totals: { ...snapshot.totals },
  byProfile: {
    dev: {
      ...snapshot.byProfile.dev,
      bySurface: { ...snapshot.byProfile.dev.bySurface },
      fingerprintModeCounts: { ...snapshot.byProfile.dev.fingerprintModeCounts },
      envelopeModeCounts: { ...snapshot.byProfile.dev.envelopeModeCounts },
    },
    staging: {
      ...snapshot.byProfile.staging,
      bySurface: { ...snapshot.byProfile.staging.bySurface },
      fingerprintModeCounts: { ...snapshot.byProfile.staging.fingerprintModeCounts },
      envelopeModeCounts: { ...snapshot.byProfile.staging.envelopeModeCounts },
    },
    prod: {
      ...snapshot.byProfile.prod,
      bySurface: { ...snapshot.byProfile.prod.bySurface },
      fingerprintModeCounts: { ...snapshot.byProfile.prod.fingerprintModeCounts },
      envelopeModeCounts: { ...snapshot.byProfile.prod.envelopeModeCounts },
    },
  },
  bySurface: { ...snapshot.bySurface },
  recentEvents: snapshot.recentEvents.map((event) => ({ ...event })),
});

const emitPortablePathSigningPolicyUsageEvent = (
  event: PortablePathSigningPolicyUsageEvent
): void => {
  if (portablePathSigningPolicyUsageHooks.size === 0) return;
  const snapshot = clonePortablePathSigningPolicyUsageSnapshot(portablePathSigningPolicyUsageState);
  for (const hook of portablePathSigningPolicyUsageHooks) {
    try {
      hook(event, snapshot);
    } catch {
      // Observability hooks must not break portable path resolution flow.
    }
  }
};

export const recordPortablePathSigningPolicyUsage = (input: {
  profile: PortablePathSigningPolicyProfile;
  surface: PortablePathSigningPolicySurface;
  fingerprintVerificationMode: PortablePathFingerprintVerificationMode;
  envelopeSignatureVerificationMode: PortablePathEnvelopeSignatureVerificationMode;
}): void => {
  const event: PortablePathSigningPolicyUsageEvent = {
    at: new Date().toISOString(),
    profile: input.profile,
    surface: input.surface,
    fingerprintVerificationMode: input.fingerprintVerificationMode,
    envelopeSignatureVerificationMode: input.envelopeSignatureVerificationMode,
  };
  portablePathSigningPolicyUsageState.totals.uses += 1;
  portablePathSigningPolicyUsageState.bySurface[input.surface] += 1;
  const profileStats = portablePathSigningPolicyUsageState.byProfile[input.profile];
  profileStats.uses += 1;
  profileStats.bySurface[input.surface] += 1;
  profileStats.fingerprintModeCounts[input.fingerprintVerificationMode] += 1;
  profileStats.envelopeModeCounts[input.envelopeSignatureVerificationMode] += 1;
  profileStats.lastUsedAt = event.at;
  profileStats.lastSurface = input.surface;
  portablePathSigningPolicyUsageState.recentEvents.push(event);
  if (portablePathSigningPolicyUsageState.recentEvents.length > MAX_PORTABLE_PATH_SIGNING_POLICY_USAGE_EVENTS) {
    portablePathSigningPolicyUsageState.recentEvents.shift();
  }
  emitPortablePathSigningPolicyUsageEvent(event);
};

export const registerPortablePathSigningPolicyUsageHook = (
  hook: PortablePathSigningPolicyUsageHook
): (() => void) => {
  portablePathSigningPolicyUsageHooks.add(hook);
  return () => {
    portablePathSigningPolicyUsageHooks.delete(hook);
  };
};

export const getPortablePathSigningPolicyUsageSnapshot = (): PortablePathSigningPolicyUsageSnapshot =>
  clonePortablePathSigningPolicyUsageSnapshot(portablePathSigningPolicyUsageState);

export const resetPortablePathSigningPolicyUsageSnapshot = (): void => {
  portablePathSigningPolicyUsageState = createEmptyPortablePathSigningPolicyUsageState();
};

const createEmptyPortablePathRunExecutionState = (): PortablePathRunExecutionSnapshot => ({
  totals: createEmptyPortablePathRunExecutionCounts(),
  byRunner: {
    client: createEmptyPortablePathRunExecutionCounts(),
    server: createEmptyPortablePathRunExecutionCounts(),
  },
  bySurface: {
    canvas: createEmptyPortablePathRunExecutionCounts(),
    product: createEmptyPortablePathRunExecutionCounts(),
    api: createEmptyPortablePathRunExecutionCounts(),
  },
  bySource: {
    portable_package: createEmptyPortablePathRunExecutionCounts(),
    portable_envelope: createEmptyPortablePathRunExecutionCounts(),
    semantic_canvas: createEmptyPortablePathRunExecutionCounts(),
    path_config: createEmptyPortablePathRunExecutionCounts(),
  },
  failureStageCounts: {
    resolve: 0,
    validation: 0,
    runtime: 0,
  },
  recentEvents: [],
});

let portablePathRunExecutionState = createEmptyPortablePathRunExecutionState();
const portablePathRunExecutionHooks = new Set<PortablePathRunExecutionHook>();

const clonePortablePathRunExecutionSnapshot = (
  snapshot: PortablePathRunExecutionSnapshot
): PortablePathRunExecutionSnapshot => ({
  totals: { ...snapshot.totals },
  byRunner: {
    client: { ...snapshot.byRunner.client },
    server: { ...snapshot.byRunner.server },
  },
  bySurface: {
    canvas: { ...snapshot.bySurface.canvas },
    product: { ...snapshot.bySurface.product },
    api: { ...snapshot.bySurface.api },
  },
  bySource: {
    portable_package: { ...snapshot.bySource.portable_package },
    portable_envelope: { ...snapshot.bySource.portable_envelope },
    semantic_canvas: { ...snapshot.bySource.semantic_canvas },
    path_config: { ...snapshot.bySource.path_config },
  },
  failureStageCounts: { ...snapshot.failureStageCounts },
  recentEvents: snapshot.recentEvents.map((event) => ({ ...event })),
});

const emitPortablePathRunExecutionEvent = (event: PortablePathRunExecutionEvent): void => {
  if (portablePathRunExecutionHooks.size === 0) return;
  const snapshot = clonePortablePathRunExecutionSnapshot(portablePathRunExecutionState);
  for (const hook of portablePathRunExecutionHooks) {
    try {
      hook(event, snapshot);
    } catch {
      // Observability hooks must not break runtime execution.
    }
  }
};

const incrementPortablePathRunExecutionAttempt = (input: {
  runner: PortablePathRunExecutionRunner;
  surface: PortablePathSigningPolicySurface;
}): void => {
  portablePathRunExecutionState.totals.attempts += 1;
  portablePathRunExecutionState.byRunner[input.runner].attempts += 1;
  portablePathRunExecutionState.bySurface[input.surface].attempts += 1;
};

const normalizePortablePathRunExecutionErrorText = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  return null;
};

const truncatePortablePathRunExecutionErrorMessage = (value: string): string => {
  if (value.length <= MAX_PORTABLE_PATH_RUN_EXECUTION_ERROR_MESSAGE_LENGTH) return value;
  return `${value.slice(0, MAX_PORTABLE_PATH_RUN_EXECUTION_ERROR_MESSAGE_LENGTH - 3)}...`;
};

const toPortablePathRunExecutionErrorMessageFromRecord = (
  value: Record<string, unknown>
): string | null => {
  const name = normalizePortablePathRunExecutionErrorText(value['name']);
  const code = normalizePortablePathRunExecutionErrorText(value['code']);
  const message =
    normalizePortablePathRunExecutionErrorText(value['message']) ??
    normalizePortablePathRunExecutionErrorText(value['reason']) ??
    normalizePortablePathRunExecutionErrorText(value['error']) ??
    normalizePortablePathRunExecutionErrorText(value['detail']) ??
    null;
  if (!name && !code && !message) return null;
  const detail = message ?? 'Unknown portable engine runtime failure.';
  const namePrefix = name && name !== 'Error' && !detail.startsWith(`${name}:`) ? `${name}: ` : '';
  const codeSuffix = code ? ` (code: ${code})` : '';
  return `${namePrefix}${detail}${codeSuffix}`;
};

const toPortablePathRunExecutionErrorMessage = (value: unknown): string => {
  if (value instanceof Error) {
    const extendedError = value as Error & {
      code?: unknown;
      reason?: unknown;
      error?: unknown;
      detail?: unknown;
    };
    const recordValue: Record<string, unknown> = {
      name: extendedError.name,
      code: extendedError.code,
      message: extendedError.message,
      reason: extendedError.reason,
      error: extendedError.error,
      detail: extendedError.detail,
    };
    const normalized =
      toPortablePathRunExecutionErrorMessageFromRecord(recordValue) ??
      normalizePortablePathRunExecutionErrorText(value.message) ??
      normalizePortablePathRunExecutionErrorText(value.name) ??
      'Unknown portable engine runtime failure.';
    return truncatePortablePathRunExecutionErrorMessage(normalized);
  }
  const direct = normalizePortablePathRunExecutionErrorText(value);
  if (direct) {
    return truncatePortablePathRunExecutionErrorMessage(direct);
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const fromRecord = toPortablePathRunExecutionErrorMessageFromRecord(value as Record<string, unknown>);
    if (fromRecord) {
      return truncatePortablePathRunExecutionErrorMessage(fromRecord);
    }
    try {
      const serialized = JSON.stringify(value);
      if (typeof serialized === 'string' && serialized.length > 0) {
        return truncatePortablePathRunExecutionErrorMessage(serialized);
      }
    } catch {
      return 'Unserializable portable engine runtime error object.';
    }
  }
  const fallback = String(value);
  return truncatePortablePathRunExecutionErrorMessage(
    fallback.trim().length > 0 ? fallback : 'Unknown portable engine runtime failure.'
  );
};

const pushPortablePathRunExecutionEvent = (event: PortablePathRunExecutionEvent): void => {
  portablePathRunExecutionState.recentEvents.push(event);
  if (portablePathRunExecutionState.recentEvents.length > MAX_PORTABLE_PATH_RUN_EXECUTION_EVENTS) {
    portablePathRunExecutionState.recentEvents.shift();
  }
  emitPortablePathRunExecutionEvent(event);
};

export const recordPortablePathRunExecutionAttempt = (input: {
  runner: PortablePathRunExecutionRunner;
  surface: PortablePathSigningPolicySurface;
}): void => {
  incrementPortablePathRunExecutionAttempt(input);
};

export const recordPortablePathRunExecutionSuccess = (input: {
  runner: PortablePathRunExecutionRunner;
  surface: PortablePathSigningPolicySurface;
  source: PortablePathInputSource;
  validateBeforeRun: boolean;
  validationMode: PortablePathValidationMode | null;
  durationMs: number;
}): void => {
  portablePathRunExecutionState.totals.successes += 1;
  portablePathRunExecutionState.byRunner[input.runner].successes += 1;
  portablePathRunExecutionState.bySurface[input.surface].successes += 1;
  portablePathRunExecutionState.bySource[input.source].attempts += 1;
  portablePathRunExecutionState.bySource[input.source].successes += 1;
  const event: PortablePathRunExecutionEvent = {
    at: new Date().toISOString(),
    runner: input.runner,
    surface: input.surface,
    source: input.source,
    validateBeforeRun: input.validateBeforeRun,
    validationMode: input.validationMode,
    durationMs: Math.max(0, Math.round(input.durationMs)),
    outcome: 'success',
    failureStage: null,
    error: null,
  };
  pushPortablePathRunExecutionEvent(event);
};

export const recordPortablePathRunExecutionFailure = (input: {
  runner: PortablePathRunExecutionRunner;
  surface: PortablePathSigningPolicySurface;
  source: PortablePathInputSource | null;
  validateBeforeRun: boolean;
  validationMode: PortablePathValidationMode | null;
  durationMs: number;
  failureStage: PortablePathRunExecutionFailureStage;
  error: unknown;
}): void => {
  const errorMessage = toPortablePathRunExecutionErrorMessage(input.error);
  portablePathRunExecutionState.totals.failures += 1;
  portablePathRunExecutionState.byRunner[input.runner].failures += 1;
  portablePathRunExecutionState.bySurface[input.surface].failures += 1;
  if (input.source) {
    portablePathRunExecutionState.bySource[input.source].attempts += 1;
    portablePathRunExecutionState.bySource[input.source].failures += 1;
  }
  portablePathRunExecutionState.failureStageCounts[input.failureStage] += 1;
  const event: PortablePathRunExecutionEvent = {
    at: new Date().toISOString(),
    runner: input.runner,
    surface: input.surface,
    source: input.source,
    validateBeforeRun: input.validateBeforeRun,
    validationMode: input.validationMode,
    durationMs: Math.max(0, Math.round(input.durationMs)),
    outcome: 'failure',
    failureStage: input.failureStage,
    error: errorMessage,
  };
  pushPortablePathRunExecutionEvent(event);
};

export const registerPortablePathRunExecutionHook = (
  hook: PortablePathRunExecutionHook
): (() => void) => {
  portablePathRunExecutionHooks.add(hook);
  return () => {
    portablePathRunExecutionHooks.delete(hook);
  };
};

export const getPortablePathRunExecutionSnapshot = (): PortablePathRunExecutionSnapshot =>
  clonePortablePathRunExecutionSnapshot(portablePathRunExecutionState);

export const resetPortablePathRunExecutionSnapshot = (): void => {
  portablePathRunExecutionState = createEmptyPortablePathRunExecutionState();
};

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
