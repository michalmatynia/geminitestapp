import type { PortablePathInputSource } from './portable-engine-contract';

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

const MAX_PORTABLE_PATH_MIGRATOR_FAILURE_EVENTS = 25;

const createEmptyPortablePathSourceCounts = (): Record<PortablePathInputSource, number> => ({
  portable_package: 0,
  portable_envelope: 0,
  semantic_canvas: 0,
  path_config: 0,
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
