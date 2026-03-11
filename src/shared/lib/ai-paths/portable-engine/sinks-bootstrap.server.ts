import 'server-only';

import { logSystemEvent } from '@/shared/lib/observability/system-logger';

import {
  listPortablePathEnvelopeVerificationAuditSinkIds,
  registerPortablePathEnvelopeVerificationAuditSink,
  unregisterPortablePathEnvelopeVerificationAuditSink,
} from './portable-engine-envelope-audit-sinks';
import {
  notifyPortablePathAuditSinkAutoRemediation,
  runPortablePathAuditSinkAutoRemediation,
  type PortablePathAuditSinkAutoRemediationResult,
} from './sinks-auto-remediation.server';
import { resolvePortablePathEnvelopeVerificationAuditSinkBootstrapSettingsFromEnvironment } from './sinks-bootstrap-config.server';
import {
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_SOURCE,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_DEFAULT_SERVICE,
} from './sinks-constants.server';
import {
  createPortablePathEnvelopeVerificationLogForwardingSink,
  createPortablePathEnvelopeVerificationMongoSink,
  type CreatePortablePathEnvelopeVerificationLogForwardingSinkOptions,
  type CreatePortablePathEnvelopeVerificationMongoSinkOptions,
} from './sinks-creators.server';
import {
  resolveHealthTimeoutMs,
  resolvePortablePathEnvelopeVerificationAuditSinkProfileFromEnvironment,
} from './sinks-environment.server';
import {
  runWithTimeout,
  toErrorMessage,
  toStartupHealthSummaryLogInput,
} from './sinks-shared.server';

import type {
  PortablePathEnvelopeVerificationAuditSinkHealthCheck,
  PortablePathEnvelopeVerificationAuditSinkHealthDiagnostic,
  PortablePathEnvelopeVerificationAuditSinkHealthPolicy,
  PortablePathEnvelopeVerificationAuditSinkProfile,
  PortablePathEnvelopeVerificationAuditSinkStartupHealthStatus,
  PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary,
  PortablePathEnvelopeVerificationAuditSinkWithHealthCheck,
} from './sinks-contracts.server';

const resolveDefaultProfileInclusion = (
  profile: PortablePathEnvelopeVerificationAuditSinkProfile
): {
  includeLogForwarding: boolean;
  includeMongo: boolean;
} => {
  switch (profile) {
    case 'prod':
      return {
        includeLogForwarding: true,
        includeMongo: true,
      };
    case 'staging':
      return {
        includeLogForwarding: true,
        includeMongo: true,
      };
    case 'dev':
    default:
      return {
        includeLogForwarding: true,
        includeMongo: false,
      };
  }
};

const applyBooleanOverride = (value: boolean, override: boolean | undefined): boolean =>
  override === undefined ? value : override;

export type BootstrapPortablePathEnvelopeVerificationAuditSinksOptions = {
  profile?: PortablePathEnvelopeVerificationAuditSinkProfile;
  clearExisting?: boolean;
  includeLogForwarding?: boolean;
  includeMongo?: boolean;
  logForwarding?: Omit<CreatePortablePathEnvelopeVerificationLogForwardingSinkOptions, 'id'> & {
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
  const {
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
  } = resolvePortablePathEnvelopeVerificationAuditSinkBootstrapSettingsFromEnvironment(
    options.env ?? process.env
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
