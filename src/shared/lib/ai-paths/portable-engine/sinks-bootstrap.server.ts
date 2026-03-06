import 'server-only';

import { logSystemEvent } from '@/shared/lib/observability/system-logger';

import {
  listPortablePathEnvelopeVerificationAuditSinkIds,
  registerPortablePathEnvelopeVerificationAuditSink,
  unregisterPortablePathEnvelopeVerificationAuditSink,
} from './portable-engine-envelope-audit-sinks';
import {
  notifyPortablePathAuditSinkAutoRemediation,
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
  runPortablePathAuditSinkAutoRemediation,
  type PortablePathAuditSinkAutoRemediationResult,
} from './sinks-auto-remediation.server';
import {
  createPortablePathEnvelopeVerificationLogForwardingSink,
  createPortablePathEnvelopeVerificationMongoSink,
  createPortablePathEnvelopeVerificationPrismaSink,
  type CreatePortablePathEnvelopeVerificationLogForwardingSinkOptions,
  type CreatePortablePathEnvelopeVerificationMongoSinkOptions,
  type CreatePortablePathEnvelopeVerificationPrismaSinkOptions,
} from './sinks-creators.server';
import {
  parseBooleanFromEnvironment,
  resolveHealthTimeoutMs,
  resolvePortablePathEnvelopeVerificationAuditSinkHealthPolicyFromEnvironment,
  resolvePortablePathEnvelopeVerificationAuditSinkHealthTimeoutMsFromEnvironment,
  resolvePortablePathEnvelopeVerificationAuditSinkProfileFromEnvironment,
  resolvePortablePathEnvelopeVerificationAuditSinkProfileOverrideFromEnvironment,
} from './sinks-environment.server';
import {
  runWithTimeout,
  toErrorMessage,
  toStartupHealthSummaryLogInput,
} from './sinks-shared.server';
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
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_SOURCE,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_POLICY_ENV,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_TIMEOUT_MS_ENV,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_PROFILE_ENV,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
  type PortablePathEnvelopeVerificationAuditSinkHealthCheck,
  type PortablePathEnvelopeVerificationAuditSinkHealthDiagnostic,
  type PortablePathEnvelopeVerificationAuditSinkHealthPolicy,
  type PortablePathEnvelopeVerificationAuditSinkProfile,
  type PortablePathEnvelopeVerificationAuditSinkStartupHealthStatus,
  type PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary,
  type PortablePathEnvelopeVerificationAuditSinkWithHealthCheck,
} from './sinks-types.server';

const resolveDefaultProfileInclusion = (
  profile: PortablePathEnvelopeVerificationAuditSinkProfile
): {
  includeLogForwarding: boolean;
  includePrisma: boolean;
  includeMongo: boolean;
} => {
  switch (profile) {
    case 'prod':
      return {
        includeLogForwarding: true,
        includePrisma: true,
        includeMongo: true,
      };
    case 'staging':
      return {
        includeLogForwarding: true,
        includePrisma: true,
        includeMongo: false,
      };
    case 'dev':
    default:
      return {
        includeLogForwarding: true,
        includePrisma: false,
        includeMongo: false,
      };
  }
};

const applyBooleanOverride = (
  value: boolean,
  override: boolean | undefined
): boolean => (override === undefined ? value : override);

export type BootstrapPortablePathEnvelopeVerificationAuditSinksOptions = {
  profile?: PortablePathEnvelopeVerificationAuditSinkProfile;
  clearExisting?: boolean;
  includeLogForwarding?: boolean;
  includePrisma?: boolean;
  includeMongo?: boolean;
  logForwarding?: Omit<
    CreatePortablePathEnvelopeVerificationLogForwardingSinkOptions,
    'id'
  > & { id?: string };
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
    options.profile ??
    resolvePortablePathEnvelopeVerificationAuditSinkProfileFromEnvironment();
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
    ) ??
    resolvePortablePathEnvelopeVerificationAuditSinkProfileFromEnvironment(env['NODE_ENV']);
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
