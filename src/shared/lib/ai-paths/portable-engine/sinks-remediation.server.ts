import 'server-only';

import { logSystemEvent } from '@/shared/lib/observability/system-logger';

import {
  type PortablePathAuditSinkAutoRemediationAction,
  type PortablePathAuditSinkAutoRemediationNotificationResult,
} from './sinks-auto-remediation-notifications.server';

import {
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_COOLDOWN_SECONDS_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_MAX_ENTRIES_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_RECIPIENTS_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_WEBHOOK_SECRET_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_WEBHOOK_SIGNATURE_KEY_ID_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_WEBHOOK_URL_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_ENABLED_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_NOTIFICATION_TIMEOUT_MS_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_NOTIFICATIONS_ENABLED_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_RATE_LIMIT_MAX_ACTIONS_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_RATE_LIMIT_WINDOW_SECONDS_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_STRATEGY_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_THRESHOLD_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_WEBHOOK_SECRET_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_WEBHOOK_SIGNATURE_KEY_ID_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_WEBHOOK_URL_ENV,
  type PortablePathAuditSinkAutoRemediationResult,
  type PortablePathAuditSinkAutoRemediationThrottleReason,
  type PortablePathAuditSinkStartupHealthState,
  type PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary,
  type RunPortablePathAuditSinkAutoRemediationOptions,
  loadPortablePathAuditSinkStartupHealthState,
  savePortablePathAuditSinkStartupHealthState,
  resolvePortablePathAuditSinkAutoRemediationThreshold,
  resolvePortablePathAuditSinkAutoRemediationStrategy,
  resolvePortablePathAuditSinkAutoRemediationCooldownSeconds,
  resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSeconds,
  resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActions,
  resolvePortablePathAuditSinkAutoRemediationEnabledFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationThresholdFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationStrategyFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationCooldownSecondsFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSecondsFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActionsFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationNotificationsEnabledFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationEmailRecipientsFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMsFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationWebhookSignatureKeyIdFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSignatureKeyIdFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntriesFromEnvironment,
} from './sinks.server';

const toEpochMs = (value: string | null): number => (value ? Date.parse(value) : 0);

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
  const rateLimitWindowSeconds =
    resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSeconds(
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
      lastRemediatedAtMs > 0 && nowMs - lastRemediatedAtMs < cooldownSeconds * 1000;

    if (inCooldown) {
      throttled = true;
      throttleReason = 'cooldown';
      state.lastRemediationSkippedAt = now;
      state.lastRemediationSkippedReason = 'cooldown';
    } else if (rateLimitEnabled) {
      const previousWindowStartedAtMs = toEpochMs(state.remediationWindowStartedAt);
      const isWindowExpired =
        previousWindowStartedAtMs === 0 ||
        nowMs - previousWindowStartedAtMs > rateLimitWindowSeconds * 1000;

      if (isWindowExpired) {
        state.remediationWindowStartedAt = now;
        state.remediationWindowActionCount = 1;
      } else if ((state.remediationWindowActionCount ?? 0) >= rateLimitMaxActions) {
        throttled = true;
        throttleReason = 'rate_limit';
        state.lastRemediationSkippedAt = now;
        state.lastRemediationSkippedReason = 'rate_limit';
      } else {
        state.remediationWindowActionCount = (state.remediationWindowActionCount ?? 0) + 1;
      }
    }

    if (!throttled) {
      triggered = true;
      action = strategy === 'unregister_all' ? 'unregister_all' : 'none';
      state.lastRemediatedAt = now;
      state.totalRemediationCount = (state.totalRemediationCount ?? 0) + 1;
      state.lastRemediationSkippedAt = null;
      state.lastRemediationSkippedReason = null;
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

export const resolvePortablePathAuditSinkAutoRemediationOptionsFromEnvironment = (
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>
): RunPortablePathAuditSinkAutoRemediationOptions => {
  const enabled = resolvePortablePathAuditSinkAutoRemediationEnabledFromEnvironment(
    env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_ENABLED_ENV]
  );
  const threshold = resolvePortablePathAuditSinkAutoRemediationThresholdFromEnvironment(
    env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_THRESHOLD_ENV]
  );
  const strategy = resolvePortablePathAuditSinkAutoRemediationStrategyFromEnvironment(
    env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_STRATEGY_ENV]
  );
  const cooldownSeconds = resolvePortablePathAuditSinkAutoRemediationCooldownSecondsFromEnvironment(
    env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_COOLDOWN_SECONDS_ENV]
  );
  const rateLimitWindowSeconds =
    resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSecondsFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_RATE_LIMIT_WINDOW_SECONDS_ENV]
    );
  const rateLimitMaxActions =
    resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActionsFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_RATE_LIMIT_MAX_ACTIONS_ENV]
    );
  const notificationsEnabled =
    resolvePortablePathAuditSinkAutoRemediationNotificationsEnabledFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_NOTIFICATIONS_ENABLED_ENV]
    );
  const webhookUrl = resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironment(
    env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_WEBHOOK_URL_ENV]
  );
  const emailWebhookUrl = resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironment(
    env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_WEBHOOK_URL_ENV]
  );
  const emailRecipients = resolvePortablePathAuditSinkAutoRemediationEmailRecipientsFromEnvironment(
    env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_RECIPIENTS_ENV]
  );
  const notificationTimeoutMs =
    resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMsFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_NOTIFICATION_TIMEOUT_MS_ENV]
    );
  const webhookSecret = resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironment(
    env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_WEBHOOK_SECRET_ENV]
  );
  const webhookSignatureKeyId =
    resolvePortablePathAuditSinkAutoRemediationWebhookSignatureKeyIdFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_WEBHOOK_SIGNATURE_KEY_ID_ENV]
    );
  const emailWebhookSecret =
    resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_WEBHOOK_SECRET_ENV]
    );
  const emailWebhookSignatureKeyId =
    resolvePortablePathAuditSinkAutoRemediationEmailWebhookSignatureKeyIdFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_WEBHOOK_SIGNATURE_KEY_ID_ENV]
    );
  const autoRemediationDeadLetterMaxEntries =
    resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntriesFromEnvironment(
      env[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_MAX_ENTRIES_ENV]
    );

  return {
    enabled,
    threshold,
    strategy,
    cooldownSeconds,
    rateLimitWindowSeconds,
    rateLimitMaxActions,
    notifications: {
      enabled: notificationsEnabled,
      webhookUrl,
      emailWebhookUrl,
      emailRecipients,
      timeoutMs: notificationTimeoutMs,
      webhookSecret,
      webhookSignatureKeyId,
      emailWebhookSecret,
      emailWebhookSignatureKeyId,
    },
    deadLetterMaxEntries: autoRemediationDeadLetterMaxEntries,
  };
};
