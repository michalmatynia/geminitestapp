import 'server-only';

import prisma from '@/shared/lib/db/prisma';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { logSystemEvent, type SystemLogInput } from '@/shared/lib/observability/system-logger';

import {
  getPortablePathEnvelopeVerificationAuditSinkSnapshot,
  getPortablePathSigningPolicyUsageSnapshot,
  listPortablePathEnvelopeVerificationAuditSinkIds,
  registerPortablePathSigningPolicyUsageHook,
  registerPortablePathEnvelopeVerificationAuditSink,
  unregisterPortablePathEnvelopeVerificationAuditSink,
  type PortablePathEnvelopeVerificationAuditEvent,
  type PortablePathEnvelopeVerificationAuditSinkSnapshot,
  type PortablePathEnvelopeVerificationAuditSink,
  type PortablePathEnvelopeVerificationObservabilitySnapshot,
  type PortablePathSigningPolicyUsageSnapshot,
} from './index';
import type {
  PortablePathSigningPolicyProfile,
  PortablePathSigningPolicySurface,
  PortablePathEnvelopeVerificationAuditSinkProfile,
  PortablePathEnvelopeVerificationAuditSinkHealthPolicy,
  PortablePathEnvelopeVerificationAuditSinkStartupHealthStatus,
  PortablePathEnvelopeVerificationAuditSinkHealthDiagnostic,
  PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary,
  PortablePathAuditSinkStartupHealthState,
  PortablePathAuditSinkAutoRemediationStrategy,
} from './types';
import {
  enqueuePortablePathAuditSinkAutoRemediationDeadLetterCore,
  loadPortablePathAuditSinkAutoRemediationDeadLettersCore,
  notifyPortablePathAuditSinkAutoRemediationCore,
  savePortablePathAuditSinkAutoRemediationDeadLettersCore,
  type EnqueuePortablePathAuditSinkAutoRemediationDeadLetterOptions,
  type LoadPortablePathAuditSinkAutoRemediationDeadLettersOptions,
  type NotifyPortablePathAuditSinkAutoRemediationDeps,
  type NotifyPortablePathAuditSinkAutoRemediationOptions,
  type PortablePathAuditSinkAutoRemediationAction,
  type PortablePathAuditSinkAutoRemediationNotificationChannel,
  type PortablePathAuditSinkAutoRemediationNotificationChannelResult,
  type PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry,
  type PortablePathAuditSinkAutoRemediationNotificationDeadLetterSignature,
  type PortablePathAuditSinkAutoRemediationNotificationInput,
  type PortablePathAuditSinkAutoRemediationNotificationReceipt,
  type PortablePathAuditSinkAutoRemediationNotificationResult,
  type SavePortablePathAuditSinkAutoRemediationDeadLettersOptions,

export * from './sinks-base.server';

export * from './sinks-trends.server';

export const emitPortablePathAuditSinkStartupHealthAlert = async (
  summary: PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary | null | undefined,
  options: EmitPortablePathAuditSinkStartupHealthAlertOptions = {}
): Promise<boolean> => {
  if (!summary || summary.status === 'healthy' || summary.status === 'skipped') {
    return false;
  }
  const level = options.level ?? 'warn';
  if (level === 'off') return false;
  const writer = options.writeLog ?? logSystemEvent;
  await writer({
    level: toPortablePathSigningPolicyAlertLevel(level),
    source: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_SOURCE,
    service: PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
    message: `Portable envelope verification audit sink startup health is ${summary.status}.`,
    context: {
      category: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
      kind: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
      alertType: 'portable_audit_sink_startup_health',
      startupHealth: summary,
    },
  });
  return true;
};

export type {
  NotifyPortablePathAuditSinkAutoRemediationOptions,
  PortablePathAuditSinkAutoRemediationAction,
  PortablePathAuditSinkAutoRemediationNotificationChannelResult,
  PortablePathAuditSinkAutoRemediationNotificationInput,
  PortablePathAuditSinkAutoRemediationNotificationReceipt,
  PortablePathAuditSinkAutoRemediationNotificationResult,
};

export type PortablePathAuditSinkAutoRemediationThrottleReason = 'cooldown' | 'rate_limited' | null;

export type PortablePathAuditSinkAutoRemediationResult = {
  enabled: boolean;
  threshold: number;
  strategy: PortablePathAuditSinkAutoRemediationStrategy;
  cooldownSeconds: number;
  rateLimitWindowSeconds: number;
  rateLimitMaxActions: number;
  throttled: boolean;
  throttleReason: PortablePathAuditSinkAutoRemediationThrottleReason;
  triggered: boolean;
  action: PortablePathAuditSinkAutoRemediationAction;
  notification: PortablePathAuditSinkAutoRemediationNotificationResult | null;
  state: PortablePathAuditSinkStartupHealthState;
};

export type RunPortablePathAuditSinkAutoRemediationOptions = {
  enabled?: boolean;
  threshold?: number;
  strategy?: PortablePathAuditSinkAutoRemediationStrategy;
  cooldownSeconds?: number;
  rateLimitWindowSeconds?: number;
  rateLimitMaxActions?: number;
  unregisterAll?: () => void;
  activateLogOnlyMode?: () => void;
  notify?: (
    input: PortablePathAuditSinkAutoRemediationNotificationInput
  ) => Promise<PortablePathAuditSinkAutoRemediationNotificationResult>;
  now?: string | Date;
  writeLog?: (input: SystemLogInput) => Promise<void>;
  loadState?: () => Promise<PortablePathAuditSinkStartupHealthState>;
  saveState?: (state: PortablePathAuditSinkStartupHealthState) => Promise<boolean>;
};

export const NOTIFY_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEPS: NotifyPortablePathAuditSinkAutoRemediationDeps =
  {
    resolveTimeoutMs: resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMs,
    defaultFetch: fetch,
    defaultWriteLog: logSystemEvent,
    toErrorMessage,
    logSource: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_SOURCE,
    logService: PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
    logCategory: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
    logKind: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
  };

export const notifyPortablePathAuditSinkAutoRemediation = async (
  input: PortablePathAuditSinkAutoRemediationNotificationInput,
  options: NotifyPortablePathAuditSinkAutoRemediationOptions = {}
): Promise<PortablePathAuditSinkAutoRemediationNotificationResult> => {
  const deadLetterMaxEntries = resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntries(
    options.deadLetterMaxEntries
  );
  const enqueueDeadLetter =
    options.enqueueDeadLetter ??
    (async (
      entry: PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry
    ): Promise<boolean> =>
      enqueuePortablePathAuditSinkAutoRemediationDeadLetter(entry, {
        maxEntries: deadLetterMaxEntries,
        readRaw: options.deadLetterReadRaw,
        writeRaw: options.deadLetterWriteRaw,
      }));
  return notifyPortablePathAuditSinkAutoRemediationCore(
    input,
    {
      ...options,
      enqueueDeadLetter,
    },
    NOTIFY_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEPS
  );
};

export type {
  PortablePathAuditSinkAutoRemediationDeadLetterReplayAttempt,
  PortablePathAuditSinkAutoRemediationDeadLetterReplayResult,
  ReplayPortablePathAuditSinkAutoRemediationDeadLettersOptions,
};

export const REPLAY_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTERS_DEPS: ReplayPortablePathAuditSinkAutoRemediationDeadLettersDeps =
  {
    resolveReplayLimit: resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayLimit,
    resolveReplayWindowSeconds:
      resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayWindowSeconds,
    resolveTimeoutMs: resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMs,
    resolveMaxEntries: resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntries,
    normalizeEndpoint: normalizePortablePathAuditSinkAutoRemediationEndpoint,
    normalizeEndpointAllowlist: normalizePortablePathAuditSinkAutoRemediationEndpointAllowlist,
    loadDeadLetters: ({ maxEntries, readRaw }) =>
      loadPortablePathAuditSinkAutoRemediationDeadLetters({ maxEntries, readRaw }),
    saveDeadLetters: (entries, { maxEntries, writeRaw }) =>
      savePortablePathAuditSinkAutoRemediationDeadLetters(entries, { maxEntries, writeRaw }),
    defaultWriteLog: logSystemEvent,
    toErrorMessage,
    logSource: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_SOURCE,
    logService: PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
    logCategory: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
    logKind: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
  };

export const replayPortablePathAuditSinkAutoRemediationDeadLetters = async (
  options: ReplayPortablePathAuditSinkAutoRemediationDeadLettersOptions = {}
): Promise<PortablePathAuditSinkAutoRemediationDeadLetterReplayResult> =>
  replayPortablePathAuditSinkAutoRemediationDeadLettersCore(
    options,
    REPLAY_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTERS_DEPS
  );
export const toEpochMs = (value: string | null | undefined): number | null => {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export const runPortablePathAuditSinkAutoRemediation = async (
  summary: PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary,
  options: RunPortablePathAuditSinkAutoRemediationOptions = {}
): Promise<PortablePathAuditSinkAutoRemediationResult> => {
  const enabled = options.enabled ?? true;
  const threshold = resolvePortablePathAuditSinkAutoRemediationThreshold(options.threshold);
  const strategy = options.strategy ?? 'unregister_all';
  const cooldownSeconds = resolvePortablePathAuditSinkAutoRemediationCooldownSeconds(
    options.cooldownSeconds
  );
  const rateLimitWindowSeconds = resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSeconds(
    options.rateLimitWindowSeconds
  );
  const rateLimitMaxActions = resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActions(
    options.rateLimitMaxActions
  );
  const writeLog = options.writeLog ?? logSystemEvent;
  const loadState = options.loadState ?? loadPortablePathAuditSinkStartupHealthState;
  const saveState = options.saveState ?? savePortablePathAuditSinkStartupHealthState;
  const nowDate =
    options.now instanceof Date
      ? options.now
      : typeof options.now === 'string'
        ? new Date(options.now)
        : new Date();
  const now = Number.isNaN(nowDate.getTime()) ? new Date().toISOString() : nowDate.toISOString();
  const nowMs = Date.parse(now);
  const previousState = await loadState();
  const state: PortablePathAuditSinkStartupHealthState = {
    ...previousState,
    lastStatus: summary.status,
  };
  let throttled = false;
  let throttleReason: PortablePathAuditSinkAutoRemediationThrottleReason = null;
  let notification: PortablePathAuditSinkAutoRemediationNotificationResult | null = null;

  if (summary.status === 'healthy' || summary.status === 'skipped') {
    state.consecutiveFailureCount = 0;
    state.lastRecoveredAt = now;
    state.lastFailedSinkIds = [];
    state.lastRemediationSkippedAt = null;
    state.lastRemediationSkippedReason = null;
    await saveState(state);
    return {
      enabled,
      threshold,
      strategy,
      cooldownSeconds,
      rateLimitWindowSeconds,
      rateLimitMaxActions,
      throttled,
      throttleReason,
      triggered: false,
      action: 'none',
      notification,
      state,
    };
  }

  state.consecutiveFailureCount = Math.max(0, state.consecutiveFailureCount) + 1;
  state.lastFailureAt = now;
  state.lastFailedSinkIds = [...summary.failedSinkIds];
  let triggered = false;
  let action: PortablePathAuditSinkAutoRemediationAction = 'none';
  const rateLimitEnabled = rateLimitWindowSeconds > 0 && rateLimitMaxActions > 0;

  if (enabled && state.consecutiveFailureCount >= threshold) {
    const lastRemediatedAtMs = toEpochMs(state.lastRemediatedAt);
    const inCooldown =
      cooldownSeconds > 0 &&
      lastRemediatedAtMs !== null &&
      nowMs - lastRemediatedAtMs < cooldownSeconds * 1000;
    if (inCooldown) {
      throttled = true;
      throttleReason = 'cooldown';
    }

    if (!throttled && rateLimitEnabled) {
      const previousWindowStartedAtMs = toEpochMs(state.remediationWindowStartedAt);
      const isWindowExpired =
        previousWindowStartedAtMs === null ||
        nowMs - previousWindowStartedAtMs >= rateLimitWindowSeconds * 1000;
      if (isWindowExpired) {
        state.remediationWindowStartedAt = now;
        state.remediationWindowActionCount = 0;
      }
      if (state.remediationWindowActionCount >= rateLimitMaxActions) {
        throttled = true;
        throttleReason = 'rate_limited';
      }
    }

    if (throttled) {
      state.lastRemediationSkippedAt = now;
      state.lastRemediationSkippedReason = throttleReason;
      await writeLog({
        level: 'warn',
        source: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_SOURCE,
        service: PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
        message:
          'Portable envelope verification audit sink auto-remediation skipped due to throttle policy.',
        context: {
          category: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
          kind: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
          alertType: 'portable_audit_sink_auto_remediation_throttled',
          throttleReason,
          cooldownSeconds,
          rateLimitWindowSeconds,
          rateLimitMaxActions,
          consecutiveFailureCount: state.consecutiveFailureCount,
        },
      });
    } else if (strategy === 'unregister_all') {
      options.unregisterAll?.();
      triggered = true;
      action = 'unregister_all';
    } else if (strategy === 'degrade_to_log_only') {
      if (options.activateLogOnlyMode) {
        options.activateLogOnlyMode();
        triggered = true;
        action = 'degrade_to_log_only';
      } else {
        options.unregisterAll?.();
        triggered = true;
        action = 'unregister_all';
      }
    } else {
      triggered = false;
      action = 'none';
    }
    if (triggered) {
      if (rateLimitEnabled) {
        const previousWindowStartedAtMs = toEpochMs(state.remediationWindowStartedAt);
        if (
          previousWindowStartedAtMs === null ||
          nowMs - previousWindowStartedAtMs >= rateLimitWindowSeconds * 1000
        ) {
          state.remediationWindowStartedAt = now;
          state.remediationWindowActionCount = 0;
        }
        state.remediationWindowActionCount = Math.max(0, state.remediationWindowActionCount) + 1;
      }
      state.remediationCount = Math.max(0, state.remediationCount) + 1;
      state.lastRemediatedAt = now;
      state.lastRemediationSkippedAt = null;
      state.lastRemediationSkippedReason = null;
      await writeLog({
        level: 'error',
        source: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_SOURCE,
        service: PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
        message:
          'Portable envelope verification audit sink auto-remediation triggered after repeated startup failures.',
        context: {
          category: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
          kind: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
          alertType: 'portable_audit_sink_auto_remediation',
          strategy,
          threshold,
          consecutiveFailureCount: state.consecutiveFailureCount,
          failedSinkIds: summary.failedSinkIds,
          action,
        },
      });
      if (options.notify) {
        try {
          notification = await options.notify({
            summary,
            strategy,
            action,
            threshold,
            cooldownSeconds,
            rateLimitWindowSeconds,
            rateLimitMaxActions,
            state,
          });
        } catch (error) {
          await writeLog({
            level: 'warn',
            source: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_SOURCE,
            service: PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
            message: 'Portable audit sink auto-remediation notification dispatch failed.',
            context: {
              category: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
              kind: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
              alertType: 'portable_audit_sink_auto_remediation_notification_failed',
              error: toErrorMessage(error),
            },
          });
        }
      }
    }
  }

  await saveState(state);
  return {
    enabled,
    threshold,
    strategy,
    cooldownSeconds,
    rateLimitWindowSeconds,
    rateLimitMaxActions,
    throttled,
    throttleReason,
    triggered,
    action,
    notification,
    state,
  };
};

export type BootstrapPortablePathSigningPolicyTrendReporterFromEnvironmentOptions = {
  env?: Record<string, string | undefined>;
  startupHealthSummary?: PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary | null;
};

export type BootstrapPortablePathSigningPolicyTrendReporterFromEnvironmentResult = {
  enabled: boolean;
  reportEveryUses: number | null;
  persistenceEnabled: boolean;
  persistenceMaxSnapshots: number | null;
  driftAlertLevel: PortablePathSigningPolicyAlertLevel;
  sinkFailureAlertLevel: PortablePathSigningPolicyAlertLevel;
  expectedProfilesBySurface: PortablePathSigningPolicyExpectedProfilesBySurface;
  reporter: PortablePathSigningPolicyTrendReporter | null;
  stop: () => void;
};

export const bootstrapPortablePathSigningPolicyTrendReporterFromEnvironment = async (
  options: BootstrapPortablePathSigningPolicyTrendReporterFromEnvironmentOptions = {}
): Promise<BootstrapPortablePathSigningPolicyTrendReporterFromEnvironmentResult> => {
  const env = options.env ?? process.env;
  const enabled =
    parseBooleanFromEnvironment(env[PORTABLE_PATH_SIGNING_POLICY_TREND_REPORTER_ENABLED_ENV]) ??
    true;
  const environmentProfile = resolvePortablePathEnvelopeVerificationAuditSinkProfileFromEnvironment(
    env['NODE_ENV']
  );
  const reportEveryUses = resolvePortablePathSigningPolicyTrendReportEveryUsesFromEnvironment(
    env[PORTABLE_PATH_SIGNING_POLICY_TREND_REPORT_EVERY_USES_ENV]
  );
  const persistenceEnabled =
    resolvePortablePathSigningPolicyTrendPersistenceEnabledFromEnvironment(
      env[PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_ENABLED_ENV]
    ) ?? true;
  const persistenceMaxSnapshots =
    resolvePortablePathSigningPolicyTrendPersistenceMaxSnapshotsFromEnvironment(
      env[PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_MAX_SNAPSHOTS_ENV]
    );
  const driftAlertLevel =
    resolvePortablePathSigningPolicyTrendAlertLevelFromEnvironment(
      env[PORTABLE_PATH_SIGNING_POLICY_DRIFT_ALERT_LEVEL_ENV]
    ) ?? 'warn';
  const sinkFailureAlertLevel =
    resolvePortablePathAuditSinkFailureAlertLevelFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_FAILURE_ALERT_LEVEL_ENV]
    ) ?? 'warn';
  const expectedProfilesBySurface =
    parsePortablePathSigningPolicyExpectedProfilesBySurfaceFromEnvironment(
      env['PORTABLE_PATH_SIGNING_POLICY_ALLOWED_PROFILES_BY_SURFACE'],
      environmentProfile
    );

  await emitPortablePathAuditSinkStartupHealthAlert(options.startupHealthSummary, {
    level: sinkFailureAlertLevel,
  });

  if (!enabled) {
    return {
      enabled: false,
      reportEveryUses,
      persistenceEnabled,
      persistenceMaxSnapshots,
      driftAlertLevel,
      sinkFailureAlertLevel,
      expectedProfilesBySurface,
      reporter: null,
      stop: () => {},
    };
  }

  const reporter = createPortablePathSigningPolicyTrendReporter({
    reportEveryUses: reportEveryUses ?? undefined,
    driftAlertLevel,
    sinkFailureAlertLevel,
    persistenceEnabled,
    persistenceMaxSnapshots: persistenceMaxSnapshots ?? undefined,
    expectedProfilesBySurface,
    environmentProfile,
  });

  return {
    enabled: true,
    reportEveryUses: reportEveryUses ?? reporter.getState().reportEveryUses,
    persistenceEnabled,
    persistenceMaxSnapshots:
      persistenceMaxSnapshots ??
      resolvePortablePathSigningPolicyTrendPersistenceMaxSnapshots(undefined),
    driftAlertLevel,
    sinkFailureAlertLevel,
    expectedProfilesBySurface,
    reporter,
    stop: () => {
      reporter.stop();
    },
  };
};

export type BootstrapPortablePathEnvelopeVerificationAuditSinksOptions = {
  profile?: PortablePathEnvelopeVerificationAuditSinkProfile;
  clearExisting?: boolean;
  includeLogForwarding?: boolean;
  includePrisma?: boolean;
  includeMongo?: boolean;
  logForwarding?: Omit<CreatePortablePathEnvelopeVerificationLogForwardingSinkOptions, 'id'> & {
    id?: string;
  };
  prisma?: Omit<CreatePortablePathEnvelopeVerificationPrismaSinkOptions, 'id'> & {
    id?: string;
  };
  mongo?: Omit<CreatePortablePathEnvelopeVerificationMongoSinkOptions, 'id'> & {
    id?: string;
  };
};

export type RunPortablePathEnvelopeVerificationAuditSinkStartupHealthChecksOptions = {
  policy?: PortablePathEnvelopeVerificationAuditSinkHealthPolicy;
  timeoutMs?: number;
  emitSystemLog?: boolean;
};

export type BootstrapPortablePathEnvelopeVerificationAuditSinksResult = {
  profile: PortablePathEnvelopeVerificationAuditSinkProfile;
  registeredSinkIds: string[];
  runStartupHealthChecks: (
    options?: RunPortablePathEnvelopeVerificationAuditSinkStartupHealthChecksOptions
  ) => Promise<PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary>;
  unregisterAll: () => void;
};

export const bootstrapPortablePathEnvelopeVerificationAuditSinks = (
  options: BootstrapPortablePathEnvelopeVerificationAuditSinksOptions = {}
): BootstrapPortablePathEnvelopeVerificationAuditSinksResult => {
  const profile =
    options.profile ?? resolvePortablePathEnvelopeVerificationAuditSinkProfileFromEnvironment();
  const defaults = resolveDefaultProfileInclusion(profile);
  const includeLogForwarding = applyBooleanOverride(
    defaults.includeLogForwarding,
    options.includeLogForwarding
  );
  const includePrisma = applyBooleanOverride(defaults.includePrisma, options.includePrisma);
  const includeMongo = applyBooleanOverride(defaults.includeMongo, options.includeMongo);
  const clearExisting = options.clearExisting !== false;

  if (clearExisting) {
    const existingSinkIds = listPortablePathEnvelopeVerificationAuditSinkIds();
    for (const sinkId of existingSinkIds) {
      unregisterPortablePathEnvelopeVerificationAuditSink(sinkId);
    }
  }

  const unregisterCallbacks: Array<() => void> = [];
  const registeredSinkIds: string[] = [];
  const healthChecksBySinkId = new Map<
    string,
    PortablePathEnvelopeVerificationAuditSinkHealthCheck
  >();
  const register = (sink: PortablePathEnvelopeVerificationAuditSinkWithHealthCheck): void => {
    const unregister = registerPortablePathEnvelopeVerificationAuditSink(sink);
    unregisterCallbacks.push(unregister);
    registeredSinkIds.push(sink.id);
    if (typeof sink.healthCheck === 'function') {
      healthChecksBySinkId.set(sink.id, sink.healthCheck);
    }
  };

  try {
    if (includeLogForwarding) {
      register(
        createPortablePathEnvelopeVerificationLogForwardingSink({
          ...(options.logForwarding ?? {}),
        })
      );
    }
    if (includePrisma) {
      register(
        createPortablePathEnvelopeVerificationPrismaSink({
          ...(options.prisma ?? {}),
        })
      );
    }
    if (includeMongo) {
      register(
        createPortablePathEnvelopeVerificationMongoSink({
          ...(options.mongo ?? {}),
        })
      );
    }
  } catch (error) {
    for (const unregister of [...unregisterCallbacks].reverse()) {
      try {
        unregister();
      } catch {
        // Best-effort rollback; surfacing original registration error.
      }
    }
    throw error;
  }

  return {
    profile,
    registeredSinkIds: [...registeredSinkIds],
    runStartupHealthChecks: async (
      healthOptions: RunPortablePathEnvelopeVerificationAuditSinkStartupHealthChecksOptions = {}
    ): Promise<PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary> => {
      const policy = healthOptions.policy ?? 'warn';
      const timeoutMs = resolveHealthTimeoutMs(healthOptions.timeoutMs);
      const checkedAt = new Date().toISOString();
      if (policy === 'off') {
        const summary: PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary = {
          profile,
          policy,
          timeoutMs,
          status: 'skipped',
          checkedAt,
          failedSinkIds: [],
          diagnostics: [],
        };
        if (healthOptions.emitSystemLog !== false) {
          await logSystemEvent(toStartupHealthSummaryLogInput(summary));
        }
        return summary;
      }

      const diagnostics = await Promise.all(
        registeredSinkIds.map(
          async (
            sinkId: string
          ): Promise<PortablePathEnvelopeVerificationAuditSinkHealthDiagnostic> => {
            const startedAt = Date.now();
            const healthCheck = healthChecksBySinkId.get(sinkId);
            if (!healthCheck) {
              return {
                sinkId,
                status: 'skipped',
                checkedAt: new Date().toISOString(),
                durationMs: Date.now() - startedAt,
                message: 'No health check is registered for this sink.',
                error: null,
              };
            }
            try {
              await runWithTimeout(sinkId, timeoutMs, healthCheck);
              return {
                sinkId,
                status: 'healthy',
                checkedAt: new Date().toISOString(),
                durationMs: Date.now() - startedAt,
                message: 'Health check passed.',
                error: null,
              };
            } catch (error) {
              return {
                sinkId,
                status: 'failed',
                checkedAt: new Date().toISOString(),
                durationMs: Date.now() - startedAt,
                message: 'Health check failed.',
                error: toErrorMessage(error),
              };
            }
          }
        )
      );

      const failedSinkIds = diagnostics
        .filter((entry: PortablePathEnvelopeVerificationAuditSinkHealthDiagnostic): boolean => {
          return entry.status === 'failed';
        })
        .map((entry: PortablePathEnvelopeVerificationAuditSinkHealthDiagnostic): string => {
          return entry.sinkId;
        });
      let status: PortablePathEnvelopeVerificationAuditSinkStartupHealthStatus = 'healthy';
      if (diagnostics.length === 0) {
        status = 'skipped';
      } else if (failedSinkIds.length > 0) {
        status = policy === 'error' ? 'failed' : 'degraded';
      }

      const summary: PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary = {
        profile,
        policy,
        timeoutMs,
        status,
        checkedAt,
        failedSinkIds,
        diagnostics,
      };

      if (healthOptions.emitSystemLog !== false) {
        await logSystemEvent(toStartupHealthSummaryLogInput(summary));
      }
      if (summary.status === 'failed') {
        throw new Error(
          `Portable envelope verification audit sink startup health checks failed for sinks: ${summary.failedSinkIds.join(
            ', '
          )}.`
        );
      }
      return summary;
    },
    unregisterAll: () => {
      for (const unregister of [...unregisterCallbacks].reverse()) {
        try {
          unregister();
        } catch {
          // Best-effort unregister.
        }
      }
    },
  };
};

export type BootstrapPortablePathEnvelopeVerificationAuditSinksWithStartupHealthChecksOptions =
  BootstrapPortablePathEnvelopeVerificationAuditSinksOptions & {
    healthChecks?: RunPortablePathEnvelopeVerificationAuditSinkStartupHealthChecksOptions;
  };

export type BootstrapPortablePathEnvelopeVerificationAuditSinksWithStartupHealthChecksResult =
  BootstrapPortablePathEnvelopeVerificationAuditSinksResult & {
    startupHealthSummary: PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary;
  };

export const bootstrapPortablePathEnvelopeVerificationAuditSinksWithStartupHealthChecks = async (
  options: BootstrapPortablePathEnvelopeVerificationAuditSinksWithStartupHealthChecksOptions = {}
): Promise<BootstrapPortablePathEnvelopeVerificationAuditSinksWithStartupHealthChecksResult> => {
  const { healthChecks, ...bootstrapOptions } = options;
  const bootstrap = bootstrapPortablePathEnvelopeVerificationAuditSinks(bootstrapOptions);
  try {
    const startupHealthSummary = await bootstrap.runStartupHealthChecks(healthChecks);
    return {
      ...bootstrap,
      startupHealthSummary,
    };
  } catch (error) {
    bootstrap.unregisterAll();
    throw error;
  }
};

export type BootstrapPortablePathEnvelopeVerificationAuditSinksFromEnvironmentOptions = {
  env?: Record<string, string | undefined>;
  emitSystemLog?: boolean;
};

export type BootstrapPortablePathEnvelopeVerificationAuditSinksFromEnvironmentResult = {
  enabled: boolean;
  profile: PortablePathEnvelopeVerificationAuditSinkProfile;
  healthPolicy: PortablePathEnvelopeVerificationAuditSinkHealthPolicy;
  healthTimeoutMs: number | null;
  startupHealthSummary: PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary | null;
  autoRemediation: PortablePathAuditSinkAutoRemediationResult | null;
  unregisterAll: () => void;
};

export const bootstrapPortablePathEnvelopeVerificationAuditSinksFromEnvironment = async (
  options: BootstrapPortablePathEnvelopeVerificationAuditSinksFromEnvironmentOptions = {}
): Promise<BootstrapPortablePathEnvelopeVerificationAuditSinksFromEnvironmentResult> => {
  const env = options.env ?? process.env;
  const enabled =
    parseBooleanFromEnvironment(
      env[PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_ENABLED_ENV]
    ) ?? true;
  const profile =
    resolvePortablePathEnvelopeVerificationAuditSinkProfileOverrideFromEnvironment(
      env[PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_PROFILE_ENV]
    ) ?? resolvePortablePathEnvelopeVerificationAuditSinkProfileFromEnvironment(env['NODE_ENV']);
  const healthPolicy =
    resolvePortablePathEnvelopeVerificationAuditSinkHealthPolicyFromEnvironment(
      env[PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_POLICY_ENV]
    ) ?? 'warn';
  const healthTimeoutMs =
    resolvePortablePathEnvelopeVerificationAuditSinkHealthTimeoutMsFromEnvironment(
      env[PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_TIMEOUT_MS_ENV]
    );
  const autoRemediationEnabled =
    resolvePortablePathAuditSinkAutoRemediationEnabledFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_ENABLED_ENV]
    ) ?? true;
  const autoRemediationThreshold =
    resolvePortablePathAuditSinkAutoRemediationThresholdFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_THRESHOLD_ENV]
    );
  const autoRemediationStrategy =
    resolvePortablePathAuditSinkAutoRemediationStrategyFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_STRATEGY_ENV]
    ) ?? resolveDefaultPortablePathAuditSinkAutoRemediationStrategyByProfile(profile);
  const autoRemediationCooldownSeconds =
    resolvePortablePathAuditSinkAutoRemediationCooldownSecondsFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_COOLDOWN_SECONDS_ENV]
    );
  const autoRemediationRateLimitWindowSeconds =
    resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSecondsFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_RATE_LIMIT_WINDOW_SECONDS_ENV]
    );
  const autoRemediationRateLimitMaxActions =
    resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActionsFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_RATE_LIMIT_MAX_ACTIONS_ENV]
    );
  const autoRemediationNotificationsEnabled =
    resolvePortablePathAuditSinkAutoRemediationNotificationsEnabledFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_NOTIFICATIONS_ENABLED_ENV]
    ) ?? true;
  const autoRemediationWebhookUrl =
    resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_WEBHOOK_URL_ENV]
    );
  const autoRemediationEmailWebhookUrl =
    resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_WEBHOOK_URL_ENV]
    );
  const autoRemediationEmailRecipients =
    resolvePortablePathAuditSinkAutoRemediationEmailRecipientsFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_RECIPIENTS_ENV]
    );
  const autoRemediationNotificationTimeoutMs =
    resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMsFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_NOTIFICATION_TIMEOUT_MS_ENV]
    );
  const autoRemediationWebhookSecret =
    resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_WEBHOOK_SECRET_ENV]
    );
  const autoRemediationWebhookSignatureKeyId =
    resolvePortablePathAuditSinkAutoRemediationWebhookSignatureKeyIdFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_WEBHOOK_SIGNATURE_KEY_ID_ENV]
    );
  const autoRemediationEmailWebhookSecret =
    resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_WEBHOOK_SECRET_ENV]
    );
  const autoRemediationEmailWebhookSignatureKeyId =
    resolvePortablePathAuditSinkAutoRemediationEmailWebhookSignatureKeyIdFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_WEBHOOK_SIGNATURE_KEY_ID_ENV]
    );
  const autoRemediationDeadLetterMaxEntries =
    resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntriesFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_MAX_ENTRIES_ENV]
    );

  if (!enabled) {
    if (options.emitSystemLog !== false) {
      await logSystemEvent({
        level: 'info',
        source: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_SOURCE,
        service: PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
        message: 'Portable envelope verification audit sink bootstrap disabled by environment.',
        context: {
          category: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
          kind: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
          enabled: false,
          profile,
          policy: healthPolicy,
        },
      });
    }
    return {
      enabled: false,
      profile,
      healthPolicy,
      healthTimeoutMs,
      startupHealthSummary: null,
      autoRemediation: null,
      unregisterAll: () => {},
    };
  }

  const bootstrapped =
    await bootstrapPortablePathEnvelopeVerificationAuditSinksWithStartupHealthChecks({
      profile,
      healthChecks: {
        policy: healthPolicy,
        timeoutMs: healthTimeoutMs ?? undefined,
        emitSystemLog: options.emitSystemLog,
      },
    });
  const remediationUnregisterCallbacks: Array<() => void> = [];
  const unregisterAll = (): void => {
    for (const unregister of [...remediationUnregisterCallbacks].reverse()) {
      try {
        unregister();
      } catch {
        // Best-effort unregister for remediation replacement sinks.
      }
    }
    remediationUnregisterCallbacks.length = 0;
    bootstrapped.unregisterAll();
  };
  const autoRemediation = await runPortablePathAuditSinkAutoRemediation(
    bootstrapped.startupHealthSummary,
    {
      enabled: autoRemediationEnabled,
      threshold: autoRemediationThreshold ?? undefined,
      strategy: autoRemediationStrategy,
      cooldownSeconds: autoRemediationCooldownSeconds ?? undefined,
      rateLimitWindowSeconds: autoRemediationRateLimitWindowSeconds ?? undefined,
      rateLimitMaxActions: autoRemediationRateLimitMaxActions ?? undefined,
      unregisterAll,
      activateLogOnlyMode: () => {
        unregisterAll();
        const unregisterLogOnlySink = registerPortablePathEnvelopeVerificationAuditSink(
          createPortablePathEnvelopeVerificationLogForwardingSink()
        );
        remediationUnregisterCallbacks.push(unregisterLogOnlySink);
      },
      notify: async (notificationInput) =>
        notifyPortablePathAuditSinkAutoRemediation(notificationInput, {
          enabled: autoRemediationNotificationsEnabled,
          webhookUrl: autoRemediationWebhookUrl,
          webhookSecret: autoRemediationWebhookSecret,
          webhookSignatureKeyId: autoRemediationWebhookSignatureKeyId,
          emailWebhookUrl: autoRemediationEmailWebhookUrl,
          emailWebhookSecret: autoRemediationEmailWebhookSecret,
          emailWebhookSignatureKeyId: autoRemediationEmailWebhookSignatureKeyId,
          emailRecipients: autoRemediationEmailRecipients,
          timeoutMs: autoRemediationNotificationTimeoutMs ?? undefined,
          deadLetterMaxEntries: autoRemediationDeadLetterMaxEntries ?? undefined,
        }),
    }
  );
  return {
    enabled: true,
    profile,
    healthPolicy,
    healthTimeoutMs,
    startupHealthSummary: bootstrapped.startupHealthSummary,
    autoRemediation,
    unregisterAll,
  };
};
