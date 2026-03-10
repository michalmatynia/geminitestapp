import 'server-only';

import {
  resolveDefaultPortablePathAuditSinkAutoRemediationStrategyByProfile,
  resolvePortablePathAuditSinkAutoRemediationCooldownSecondsFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntriesFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationEmailRecipientsFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSignatureKeyIdFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationEnabledFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationNotificationsEnabledFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMsFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActionsFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSecondsFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationStrategyFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationThresholdFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationWebhookSignatureKeyIdFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironment,
  type PortablePathAuditSinkAutoRemediationStrategy,
} from './sinks-auto-remediation-config.server';
import {
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_COOLDOWN_SECONDS_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_MAX_ENTRIES_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_RECIPIENTS_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_WEBHOOK_SECRET_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_WEBHOOK_SIGNATURE_KEY_ID_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_WEBHOOK_URL_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_ENABLED_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_NOTIFICATIONS_ENABLED_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_NOTIFICATION_TIMEOUT_MS_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_RATE_LIMIT_MAX_ACTIONS_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_RATE_LIMIT_WINDOW_SECONDS_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_STRATEGY_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_THRESHOLD_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_WEBHOOK_SECRET_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_WEBHOOK_SIGNATURE_KEY_ID_ENV,
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_WEBHOOK_URL_ENV,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_ENABLED_ENV,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_POLICY_ENV,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_TIMEOUT_MS_ENV,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_PROFILE_ENV,
} from './sinks-constants.server';
import {
  parseBooleanFromEnvironment,
  resolvePortablePathEnvelopeVerificationAuditSinkHealthPolicyFromEnvironment,
  resolvePortablePathEnvelopeVerificationAuditSinkHealthTimeoutMsFromEnvironment,
  resolvePortablePathEnvelopeVerificationAuditSinkProfileFromEnvironment,
  resolvePortablePathEnvelopeVerificationAuditSinkProfileOverrideFromEnvironment,
} from './sinks-environment.server';

import type {
  PortablePathEnvelopeVerificationAuditSinkHealthPolicy,
  PortablePathEnvelopeVerificationAuditSinkProfile,
} from './sinks-contracts.server';

export type PortablePathEnvelopeVerificationAuditSinkBootstrapEnvironmentSettings = {
  enabled: boolean;
  profile: PortablePathEnvelopeVerificationAuditSinkProfile;
  healthPolicy: PortablePathEnvelopeVerificationAuditSinkHealthPolicy;
  healthTimeoutMs: number | null;
  autoRemediationEnabled: boolean;
  autoRemediationThreshold: number | null;
  autoRemediationStrategy: PortablePathAuditSinkAutoRemediationStrategy;
  autoRemediationCooldownSeconds: number | null;
  autoRemediationRateLimitWindowSeconds: number | null;
  autoRemediationRateLimitMaxActions: number | null;
  autoRemediationNotificationsEnabled: boolean;
  autoRemediationWebhookUrl: string | null;
  autoRemediationEmailWebhookUrl: string | null;
  autoRemediationEmailRecipients: string[] | null;
  autoRemediationNotificationTimeoutMs: number | null;
  autoRemediationWebhookSecret: string | null;
  autoRemediationWebhookSignatureKeyId: string | null;
  autoRemediationEmailWebhookSecret: string | null;
  autoRemediationEmailWebhookSignatureKeyId: string | null;
  autoRemediationDeadLetterMaxEntries: number | null;
};

export const resolvePortablePathEnvelopeVerificationAuditSinkBootstrapSettingsFromEnvironment = (
  env: Record<string, string | undefined> = process.env
): PortablePathEnvelopeVerificationAuditSinkBootstrapEnvironmentSettings => {
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

  return {
    enabled,
    profile,
    healthPolicy,
    healthTimeoutMs,
    autoRemediationEnabled,
    autoRemediationThreshold,
    autoRemediationStrategy,
    autoRemediationCooldownSeconds,
    autoRemediationRateLimitWindowSeconds,
    autoRemediationRateLimitMaxActions,
    autoRemediationNotificationsEnabled,
    autoRemediationWebhookUrl,
    autoRemediationEmailWebhookUrl,
    autoRemediationEmailRecipients,
    autoRemediationNotificationTimeoutMs,
    autoRemediationWebhookSecret,
    autoRemediationWebhookSignatureKeyId,
    autoRemediationEmailWebhookSecret,
    autoRemediationEmailWebhookSignatureKeyId,
    autoRemediationDeadLetterMaxEntries,
  };
};
