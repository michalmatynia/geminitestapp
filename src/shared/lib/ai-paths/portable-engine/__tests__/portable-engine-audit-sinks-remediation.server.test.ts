import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';

import type {
  PortablePathEnvelopeVerificationAuditEvent,
  PortablePathEnvelopeVerificationAuditSinkSnapshot,
  PortablePathEnvelopeVerificationObservabilitySnapshot,
  PortablePathSigningPolicyUsageSnapshot,
} from '../index';
import {
  listPortablePathEnvelopeVerificationAuditSinkIds,
  resetPortablePathEnvelopeVerificationAuditSinkSnapshot,
  resetPortablePathSigningPolicyUsageSnapshot,
  resolvePortablePathInput,
} from '../index';

const { logSystemEventMock } = vi.hoisted(() => ({
  logSystemEventMock: vi.fn(),
}));

const { prismaSystemLogCreateMock } = vi.hoisted(() => ({
  prismaSystemLogCreateMock: vi.fn(),
}));

const { getMongoDbMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: logSystemEventMock,
}));

vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    systemLog: {
      create: prismaSystemLogCreateMock,
    },
  },
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

import {
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
  PORTABLE_PATH_SIGNING_POLICY_TREND_KIND,
  appendPortablePathSigningPolicyTrendSnapshot,
  bootstrapPortablePathEnvelopeVerificationAuditSinks,
  bootstrapPortablePathEnvelopeVerificationAuditSinksFromEnvironment,
  bootstrapPortablePathEnvelopeVerificationAuditSinksWithStartupHealthChecks,
  bootstrapPortablePathSigningPolicyTrendReporterFromEnvironment,
  createPortablePathSigningPolicyTrendReporter,
  loadPortablePathSigningPolicyTrendSnapshots,
  createPortablePathEnvelopeVerificationLogForwardingSink,
  createPortablePathEnvelopeVerificationMongoSink,
  createPortablePathEnvelopeVerificationPrismaSink,
  notifyPortablePathAuditSinkAutoRemediation,
  resolvePortablePathAuditSinkFailureAlertLevelFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationCooldownSecondsFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationEmailRecipientsFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationEnabledFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMsFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationNotificationsEnabledFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActionsFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSecondsFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationStrategyFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationThresholdFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironment,
  resolvePortablePathEnvelopeVerificationAuditSinkHealthPolicyFromEnvironment,
  resolvePortablePathEnvelopeVerificationAuditSinkProfileFromEnvironment,
  resolvePortablePathEnvelopeVerificationAuditSinkProfileOverrideFromEnvironment,
  resolvePortablePathSigningPolicyTrendAlertLevelFromEnvironment,
  resolvePortablePathSigningPolicyTrendPersistenceEnabledFromEnvironment,
  resolvePortablePathSigningPolicyTrendPersistenceMaxSnapshotsFromEnvironment,
  resolvePortablePathSigningPolicyTrendReportEveryUsesFromEnvironment,
  runPortablePathAuditSinkAutoRemediation,
} from '../sinks.server';

const createEvent = (
  overrides?: Partial<PortablePathEnvelopeVerificationAuditEvent>
): PortablePathEnvelopeVerificationAuditEvent => ({
  at: '2026-03-05T00:00:00.000Z',
  phase: 'async',
  mode: 'strict',
  algorithm: 'hmac_sha256',
  keyId: 'key-v1',
  candidateSecretCount: 2,
  matchedSecretIndex: 1,
  outcome: 'verified',
  status: 'verified',
  ...(overrides ?? {}),
});

const createSnapshot = (
  event: PortablePathEnvelopeVerificationAuditEvent
): PortablePathEnvelopeVerificationObservabilitySnapshot => ({
  totals: {
    events: 3,
    verified: 2,
    warned: 1,
    rejected: 0,
  },
  byKeyId: {
    'key-v1': {
      events: 2,
      verified: 2,
      warned: 0,
      rejected: 0,
      lastOutcome: event.outcome,
      lastSeenAt: event.at,
      lastAlgorithm: event.algorithm,
    },
  },
  recentEvents: [event],
});

const createSigningPolicyUsageSnapshot = (
  uses: number
): PortablePathSigningPolicyUsageSnapshot => ({
  totals: { uses },
  byProfile: {
    dev: {
      uses,
      bySurface: { canvas: 0, product: uses, api: 0 },
      fingerprintModeCounts: { off: uses, warn: 0, strict: 0 },
      envelopeModeCounts: { off: uses, warn: 0, strict: 0 },
      lastUsedAt: '2026-03-05T00:00:00.000Z',
      lastSurface: 'product',
    },
    staging: {
      uses: 0,
      bySurface: { canvas: 0, product: 0, api: 0 },
      fingerprintModeCounts: { off: 0, warn: 0, strict: 0 },
      envelopeModeCounts: { off: 0, warn: 0, strict: 0 },
      lastUsedAt: null,
      lastSurface: null,
    },
    prod: {
      uses: 0,
      bySurface: { canvas: 0, product: 0, api: 0 },
      fingerprintModeCounts: { off: 0, warn: 0, strict: 0 },
      envelopeModeCounts: { off: 0, warn: 0, strict: 0 },
      lastUsedAt: null,
      lastSurface: null,
    },
  },
  bySurface: { canvas: 0, product: uses, api: 0 },
  recentEvents: [],
});

const createAuditSinkSnapshot = (
  writesFailed: number
): PortablePathEnvelopeVerificationAuditSinkSnapshot => ({
  totals: {
    registrationCount: 1,
    unregistrationCount: 0,
    writesAttempted: writesFailed,
    writesSucceeded: 0,
    writesFailed,
  },
  registeredSinkIds: ['test-sink'],
  bySinkId: {
    'test-sink': {
      writesAttempted: writesFailed,
      writesSucceeded: 0,
      writesFailed,
      lastError: writesFailed > 0 ? 'sink_down' : null,
      lastWrittenAt: writesFailed > 0 ? '2026-03-05T00:00:00.000Z' : null,
    },
  },
  recentFailures:
    writesFailed > 0
      ? [{ sinkId: 'test-sink', error: 'sink_down', at: '2026-03-05T00:00:00.000Z' }]
      : [],
});

const createPersistedTrendSnapshot = (at: string, uses: number) => ({
  at,
  trigger: 'manual' as const,
  reportEveryUses: 5,
  usageTotals: createSigningPolicyUsageSnapshot(uses).totals,
  usageBySurface: createSigningPolicyUsageSnapshot(uses).bySurface,
  usageByProfile: createSigningPolicyUsageSnapshot(uses).byProfile,
  sinkTotals: createAuditSinkSnapshot(0).totals,
  sinkRegisteredIds: createAuditSinkSnapshot(0).registeredSinkIds,
  sinkRecentFailures: [],
  expectedProfilesBySurface: {
    canvas: ['prod'],
    product: ['prod'],
    api: ['prod'],
  },
  driftAlerts: [],
});

describe('portable-engine envelope verification sink factories', () => {
  beforeEach(() => {
    logSystemEventMock.mockReset().mockResolvedValue(undefined);
    prismaSystemLogCreateMock.mockReset().mockResolvedValue({});
    getMongoDbMock.mockReset();
    resetPortablePathSigningPolicyUsageSnapshot();
    resetPortablePathEnvelopeVerificationAuditSinkSnapshot({
      clearRegisteredSinks: true,
    });
  });
  it('triggers auto-remediation after repeated startup sink failures and resets on recovery', async () => {
    let state = {
      consecutiveFailureCount: 0,
      lastFailureAt: null,
      lastRecoveredAt: null,
      lastFailedSinkIds: [] as string[],
      remediationCount: 0,
      lastRemediatedAt: null,
      remediationWindowStartedAt: null,
      remediationWindowActionCount: 0,
      lastRemediationSkippedAt: null,
      lastRemediationSkippedReason: null as 'cooldown' | 'rate_limited' | null,
      lastStatus: null as
        | 'healthy'
        | 'degraded'
        | 'failed'
        | 'skipped'
        | null,
    };
    const loadState = async () => state;
    const saveState = async (next: typeof state): Promise<boolean> => {
      state = next;
      return true;
    };
    const unregisterAll = vi.fn();
    const degradedSummary = {
      profile: 'prod' as const,
      policy: 'warn' as const,
      timeoutMs: 1000,
      status: 'degraded' as const,
      checkedAt: '2026-03-05T00:00:00.000Z',
      failedSinkIds: ['sink-a'],
      diagnostics: [
        {
          sinkId: 'sink-a',
          status: 'failed' as const,
          checkedAt: '2026-03-05T00:00:00.000Z',
          durationMs: 5,
          message: 'Health check failed.',
          error: 'permission_denied',
        },
      ],
    };

    const first = await runPortablePathAuditSinkAutoRemediation(degradedSummary, {
      enabled: true,
      threshold: 2,
      strategy: 'unregister_all',
      loadState,
      saveState,
      unregisterAll,
    });
    expect(first.triggered).toBe(false);
    expect(first.state.consecutiveFailureCount).toBe(1);

    const second = await runPortablePathAuditSinkAutoRemediation(degradedSummary, {
      enabled: true,
      threshold: 2,
      strategy: 'unregister_all',
      loadState,
      saveState,
      unregisterAll,
    });
    expect(second.triggered).toBe(true);
    expect(second.action).toBe('unregister_all');
    expect(second.state.remediationCount).toBe(1);
    expect(second.throttled).toBe(false);
    expect(unregisterAll).toHaveBeenCalledTimes(1);

    const healthySummary = {
      ...degradedSummary,
      status: 'healthy' as const,
      failedSinkIds: [] as string[],
      diagnostics: [] as typeof degradedSummary.diagnostics,
    };
    const recovered = await runPortablePathAuditSinkAutoRemediation(healthySummary, {
      enabled: true,
      threshold: 2,
      strategy: 'unregister_all',
      loadState,
      saveState,
      unregisterAll,
    });
    expect(recovered.triggered).toBe(false);
    expect(recovered.state.consecutiveFailureCount).toBe(0);
    expect(recovered.state.lastRecoveredAt).toBeTruthy();
    expect(recovered.throttled).toBe(false);
  });

  it('supports log-only degradation remediation strategy', async () => {
    let state = {
      consecutiveFailureCount: 1,
      lastFailureAt: '2026-03-05T00:00:00.000Z',
      lastRecoveredAt: null,
      lastFailedSinkIds: ['sink-a'] as string[],
      remediationCount: 0,
      lastRemediatedAt: null,
      remediationWindowStartedAt: null,
      remediationWindowActionCount: 0,
      lastRemediationSkippedAt: null,
      lastRemediationSkippedReason: null as 'cooldown' | 'rate_limited' | null,
      lastStatus: 'degraded' as
        | 'healthy'
        | 'degraded'
        | 'failed'
        | 'skipped'
        | null,
    };
    const loadState = async () => state;
    const saveState = async (next: typeof state): Promise<boolean> => {
      state = next;
      return true;
    };
    const unregisterAll = vi.fn();
    const activateLogOnlyMode = vi.fn();
    const summary = {
      profile: 'staging' as const,
      policy: 'warn' as const,
      timeoutMs: 1000,
      status: 'degraded' as const,
      checkedAt: '2026-03-05T00:00:00.000Z',
      failedSinkIds: ['sink-a'],
      diagnostics: [
        {
          sinkId: 'sink-a',
          status: 'failed' as const,
          checkedAt: '2026-03-05T00:00:00.000Z',
          durationMs: 5,
          message: 'Health check failed.',
          error: 'permission_denied',
        },
      ],
    };

    const result = await runPortablePathAuditSinkAutoRemediation(summary, {
      enabled: true,
      threshold: 2,
      strategy: 'degrade_to_log_only',
      loadState,
      saveState,
      unregisterAll,
      activateLogOnlyMode,
    });

    expect(result.triggered).toBe(true);
    expect(result.action).toBe('degrade_to_log_only');
    expect(result.strategy).toBe('degrade_to_log_only');
    expect(activateLogOnlyMode).toHaveBeenCalledTimes(1);
    expect(unregisterAll).not.toHaveBeenCalled();
  });

  it('throttles auto-remediation during cooldown windows', async () => {
    let state = {
      consecutiveFailureCount: 1,
      lastFailureAt: '2026-03-05T00:00:00.000Z',
      lastRecoveredAt: null,
      lastFailedSinkIds: ['sink-a'] as string[],
      remediationCount: 1,
      lastRemediatedAt: '2026-03-05T00:00:30.000Z',
      remediationWindowStartedAt: '2026-03-05T00:00:00.000Z',
      remediationWindowActionCount: 1,
      lastRemediationSkippedAt: null,
      lastRemediationSkippedReason: null as 'cooldown' | 'rate_limited' | null,
      lastStatus: 'degraded' as
        | 'healthy'
        | 'degraded'
        | 'failed'
        | 'skipped'
        | null,
    };
    const loadState = async () => state;
    const saveState = async (next: typeof state): Promise<boolean> => {
      state = next;
      return true;
    };
    const unregisterAll = vi.fn();
    const summary = {
      profile: 'prod' as const,
      policy: 'warn' as const,
      timeoutMs: 1000,
      status: 'degraded' as const,
      checkedAt: '2026-03-05T00:01:00.000Z',
      failedSinkIds: ['sink-a'],
      diagnostics: [
        {
          sinkId: 'sink-a',
          status: 'failed' as const,
          checkedAt: '2026-03-05T00:01:00.000Z',
          durationMs: 5,
          message: 'Health check failed.',
          error: 'permission_denied',
        },
      ],
    };

    const result = await runPortablePathAuditSinkAutoRemediation(summary, {
      enabled: true,
      threshold: 2,
      strategy: 'unregister_all',
      cooldownSeconds: 120,
      now: '2026-03-05T00:01:00.000Z',
      loadState,
      saveState,
      unregisterAll,
    });

    expect(result.triggered).toBe(false);
    expect(result.throttled).toBe(true);
    expect(result.throttleReason).toBe('cooldown');
    expect(result.state.lastRemediationSkippedReason).toBe('cooldown');
    expect(unregisterAll).not.toHaveBeenCalled();
  });

  it('throttles auto-remediation when rate-limit window is exhausted', async () => {
    let state = {
      consecutiveFailureCount: 1,
      lastFailureAt: '2026-03-05T00:00:00.000Z',
      lastRecoveredAt: null,
      lastFailedSinkIds: ['sink-a'] as string[],
      remediationCount: 2,
      lastRemediatedAt: '2026-03-05T00:00:10.000Z',
      remediationWindowStartedAt: '2026-03-05T00:00:00.000Z',
      remediationWindowActionCount: 2,
      lastRemediationSkippedAt: null,
      lastRemediationSkippedReason: null as 'cooldown' | 'rate_limited' | null,
      lastStatus: 'degraded' as
        | 'healthy'
        | 'degraded'
        | 'failed'
        | 'skipped'
        | null,
    };
    const loadState = async () => state;
    const saveState = async (next: typeof state): Promise<boolean> => {
      state = next;
      return true;
    };
    const unregisterAll = vi.fn();
    const summary = {
      profile: 'prod' as const,
      policy: 'warn' as const,
      timeoutMs: 1000,
      status: 'degraded' as const,
      checkedAt: '2026-03-05T00:05:00.000Z',
      failedSinkIds: ['sink-a'],
      diagnostics: [
        {
          sinkId: 'sink-a',
          status: 'failed' as const,
          checkedAt: '2026-03-05T00:05:00.000Z',
          durationMs: 5,
          message: 'Health check failed.',
          error: 'permission_denied',
        },
      ],
    };

    const result = await runPortablePathAuditSinkAutoRemediation(summary, {
      enabled: true,
      threshold: 2,
      strategy: 'unregister_all',
      cooldownSeconds: 0,
      rateLimitWindowSeconds: 600,
      rateLimitMaxActions: 2,
      now: '2026-03-05T00:05:00.000Z',
      loadState,
      saveState,
      unregisterAll,
    });

    expect(result.triggered).toBe(false);
    expect(result.throttled).toBe(true);
    expect(result.throttleReason).toBe('rate_limited');
    expect(result.state.lastRemediationSkippedReason).toBe('rate_limited');
    expect(unregisterAll).not.toHaveBeenCalled();
  });

  it('delivers remediation fan-out notifications to webhook and email relay channels', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });

    const result = await notifyPortablePathAuditSinkAutoRemediation(
      {
        summary: {
          profile: 'prod',
          policy: 'warn',
          timeoutMs: 1000,
          status: 'degraded',
          checkedAt: '2026-03-05T00:00:00.000Z',
          failedSinkIds: ['sink-a'],
          diagnostics: [],
        },
        strategy: 'unregister_all',
        action: 'unregister_all',
        threshold: 2,
        cooldownSeconds: 120,
        rateLimitWindowSeconds: 900,
        rateLimitMaxActions: 2,
        state: {
          consecutiveFailureCount: 2,
          lastFailureAt: '2026-03-05T00:00:00.000Z',
          lastRecoveredAt: null,
          lastFailedSinkIds: ['sink-a'],
          remediationCount: 1,
          lastRemediatedAt: '2026-03-05T00:00:00.000Z',
          remediationWindowStartedAt: '2026-03-05T00:00:00.000Z',
          remediationWindowActionCount: 1,
          lastRemediationSkippedAt: null,
          lastRemediationSkippedReason: null,
          lastStatus: 'degraded',
        },
      },
      {
        enabled: true,
        webhookUrl: 'https://example.test/remediation',
        emailWebhookUrl: 'https://example.test/email-remediation',
        emailRecipients: ['ops@example.test'],
        fetchImpl: fetchMock as unknown as typeof fetch,
      }
    );

    expect(result.webhook.attempted).toBe(true);
    expect(result.webhook.delivered).toBe(true);
    expect(result.email.attempted).toBe(true);
    expect(result.email.delivered).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('emits startup sink health alert and can disable trend reporter from environment', async () => {
    const result = await bootstrapPortablePathSigningPolicyTrendReporterFromEnvironment({
      env: {
        NODE_ENV: 'production',
        PORTABLE_PATH_SIGNING_POLICY_TREND_REPORTER_ENABLED: 'false',
        PORTABLE_PATH_AUDIT_SINK_FAILURE_ALERT_LEVEL: 'error',
        PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_ENABLED: 'false',
        PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_MAX_SNAPSHOTS: '50',
      },
      startupHealthSummary: {
        profile: 'prod',
        policy: 'warn',
        timeoutMs: 1500,
        status: 'degraded',
        checkedAt: '2026-03-05T00:00:00.000Z',
        failedSinkIds: ['portable-envelope-verification-prisma'],
        diagnostics: [
          {
            sinkId: 'portable-envelope-verification-prisma',
            status: 'failed',
            checkedAt: '2026-03-05T00:00:00.000Z',
            durationMs: 5,
            message: 'Health check failed.',
            error: 'permission_denied',
          },
        ],
      },
    });

    expect(result.enabled).toBe(false);
    expect(result.reporter).toBeNull();
    expect(result.persistenceEnabled).toBe(false);
    expect(result.persistenceMaxSnapshots).toBe(50);
    expect(
      logSystemEventMock.mock.calls.some(
        ([input]) =>
          input.level === 'error' &&
          input.context?.['kind'] === PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND &&
          input.context?.['alertType'] === 'portable_audit_sink_startup_health'
      )
    ).toBe(true);
  });
});
