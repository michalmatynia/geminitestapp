import 'server-only';

import { logSystemEvent, type SystemLogInput } from '@/shared/lib/observability/system-logger';

import {
  normalizePortablePathAuditSinkAutoRemediationEndpoint,
  normalizePortablePathAuditSinkAutoRemediationEndpointAllowlist,
  resolvePortablePathAuditSinkAutoRemediationCooldownSeconds,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntries,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayLimit,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayWindowSeconds,
  resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMs,
  resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActions,
  resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSeconds,
  resolvePortablePathAuditSinkAutoRemediationThreshold,
  type PortablePathAuditSinkAutoRemediationStrategy,
} from './sinks-auto-remediation-config.server';
import {
  notifyPortablePathAuditSinkAutoRemediationCore,
  type NotifyPortablePathAuditSinkAutoRemediationDeps,
  type NotifyPortablePathAuditSinkAutoRemediationOptions,
  type PortablePathAuditSinkAutoRemediationAction,
  type PortablePathAuditSinkAutoRemediationNotificationInput,
  type PortablePathAuditSinkAutoRemediationNotificationResult,
} from './sinks-auto-remediation-notifications.server';
import {
  replayPortablePathAuditSinkAutoRemediationDeadLettersCore,
  type PortablePathAuditSinkAutoRemediationDeadLetterReplayResult,
  type ReplayPortablePathAuditSinkAutoRemediationDeadLettersDeps,
  type ReplayPortablePathAuditSinkAutoRemediationDeadLettersOptions,
} from './sinks-auto-remediation-replay.server';
import {
  enqueuePortablePathAuditSinkAutoRemediationDeadLetter,
  loadPortablePathAuditSinkAutoRemediationDeadLetters,
  loadPortablePathAuditSinkStartupHealthState,
  savePortablePathAuditSinkAutoRemediationDeadLetters,
  savePortablePathAuditSinkStartupHealthState,
  type PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry,
  type PortablePathAuditSinkStartupHealthState,
} from './sinks-auto-remediation-state.server';
import {
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_SOURCE,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
} from './sinks-constants.server';
import { toErrorMessage } from './sinks-shared.server';

import type { PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary } from './sinks-contracts.server';

export {
  enqueuePortablePathAuditSinkAutoRemediationDeadLetter,
  loadPortablePathAuditSinkAutoRemediationDeadLetters,
  loadPortablePathAuditSinkStartupHealthState,
} from './sinks-auto-remediation-state.server';
export {
  resolveDefaultPortablePathAuditSinkAutoRemediationStrategyByProfile,
  resolvePortablePathAuditSinkAutoRemediationCooldownSecondsFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntriesFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayEndpointAllowlistFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportKeyIdFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportRedactionModeFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportSecretFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayWindowSecondsFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationEmailRecipientsFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSignatureKeyIdFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationEnabledFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMsFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationNotificationsEnabledFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActionsFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSecondsFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationStrategyFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationThresholdFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationWebhookSignatureKeyIdFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironment,
} from './sinks-auto-remediation-config.server';
export {
  savePortablePathAuditSinkAutoRemediationDeadLetters,
  savePortablePathAuditSinkStartupHealthState,
} from './sinks-auto-remediation-state.server';
export type {
  EnqueuePortablePathAuditSinkAutoRemediationDeadLetterOptions,
  LoadPortablePathAuditSinkAutoRemediationDeadLettersOptions,
  LoadPortablePathAuditSinkStartupHealthStateOptions,
  PortablePathAuditSinkAutoRemediationNotificationChannel,
  PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry,
  PortablePathAuditSinkAutoRemediationNotificationDeadLetterSignature,
  PortablePathAuditSinkStartupHealthState,
  SavePortablePathAuditSinkAutoRemediationDeadLettersOptions,
  SavePortablePathAuditSinkStartupHealthStateOptions,
} from './sinks-auto-remediation-state.server';
export type { PortablePathAuditSinkAutoRemediationStrategy } from './sinks-auto-remediation-config.server';

export type {
  NotifyPortablePathAuditSinkAutoRemediationOptions,
  PortablePathAuditSinkAutoRemediationAction,
  PortablePathAuditSinkAutoRemediationNotificationInput,
  PortablePathAuditSinkAutoRemediationNotificationChannelResult,
  PortablePathAuditSinkAutoRemediationNotificationResult,
  PortablePathAuditSinkAutoRemediationNotificationReceipt,
} from './sinks-auto-remediation-notifications.server';

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

const NOTIFY_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEPS: NotifyPortablePathAuditSinkAutoRemediationDeps =
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
} from './sinks-auto-remediation-replay.server';

const REPLAY_PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTERS_DEPS: ReplayPortablePathAuditSinkAutoRemediationDeadLettersDeps =
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

const toEpochMs = (value: string | null | undefined): number | null => {
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
