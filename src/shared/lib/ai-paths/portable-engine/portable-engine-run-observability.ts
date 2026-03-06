import type {
  PortablePathInputSource,
  PortablePathSigningPolicySurface,
  PortablePathValidationMode,
} from './portable-engine-types';

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

const MAX_PORTABLE_PATH_RUN_EXECUTION_EVENTS = 100;
const MAX_PORTABLE_PATH_RUN_EXECUTION_ERROR_MESSAGE_LENGTH = 320;

const createEmptyPortablePathRunExecutionCounts = (): PortablePathRunExecutionCounts => ({
  attempts: 0,
  successes: 0,
  failures: 0,
});

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
    const fromRecord =
      toPortablePathRunExecutionErrorMessageFromRecord(value as Record<string, unknown>);
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
