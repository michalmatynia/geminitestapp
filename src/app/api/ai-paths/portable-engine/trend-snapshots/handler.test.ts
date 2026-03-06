import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION } from '@/shared/lib/ai-paths/portable-engine';

const { builders.requireAiPathsAccessMock } = vi.hoisted(() => ({
  builders.requireAiPathsAccessMock: vi.fn(),
}));

const { builders.getPortablePathRunExecutionSnapshotMock } = vi.hoisted(() => ({
  builders.getPortablePathRunExecutionSnapshotMock: vi.fn(),
}));

const {
  builders.loadPortablePathAuditSinkAutoRemediationDeadLettersMock,
  builders.loadPortablePathSigningPolicyTrendSnapshotsMock,
  builders.loadPortablePathAuditSinkStartupHealthStateMock,
  builders.resolvePortablePathAuditSinkAutoRemediationCooldownSecondsFromEnvironmentMock,
  builders.resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntriesFromEnvironmentMock,
  builders.resolvePortablePathAuditSinkAutoRemediationEmailRecipientsFromEnvironmentMock,
  builders.resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironmentMock,
  builders.resolvePortablePathAuditSinkAutoRemediationEmailWebhookSignatureKeyIdFromEnvironmentMock,
  builders.resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironmentMock,
  builders.resolvePortablePathAuditSinkAutoRemediationEnabledFromEnvironmentMock,
  builders.resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMsFromEnvironmentMock,
  builders.resolvePortablePathAuditSinkAutoRemediationNotificationsEnabledFromEnvironmentMock,
  builders.resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActionsFromEnvironmentMock,
  builders.resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSecondsFromEnvironmentMock,
  builders.resolvePortablePathAuditSinkAutoRemediationStrategyFromEnvironmentMock,
  builders.resolvePortablePathAuditSinkAutoRemediationThresholdFromEnvironmentMock,
  builders.resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironmentMock,
  builders.resolvePortablePathAuditSinkAutoRemediationWebhookSignatureKeyIdFromEnvironmentMock,
  builders.resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironmentMock,
} = vi.hoisted(() => ({
  builders.loadPortablePathAuditSinkAutoRemediationDeadLettersMock: vi.fn(),
  builders.loadPortablePathSigningPolicyTrendSnapshotsMock: vi.fn(),
  builders.loadPortablePathAuditSinkStartupHealthStateMock: vi.fn(),
  builders.resolvePortablePathAuditSinkAutoRemediationCooldownSecondsFromEnvironmentMock: vi.fn(),
  builders.resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntriesFromEnvironmentMock: vi.fn(),
  builders.resolvePortablePathAuditSinkAutoRemediationEmailRecipientsFromEnvironmentMock: vi.fn(),
  builders.resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironmentMock: vi.fn(),
  builders.resolvePortablePathAuditSinkAutoRemediationEmailWebhookSignatureKeyIdFromEnvironmentMock: vi.fn(),
  builders.resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironmentMock: vi.fn(),
  builders.resolvePortablePathAuditSinkAutoRemediationEnabledFromEnvironmentMock: vi.fn(),
  builders.resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMsFromEnvironmentMock: vi.fn(),
  builders.resolvePortablePathAuditSinkAutoRemediationNotificationsEnabledFromEnvironmentMock: vi.fn(),
  builders.resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActionsFromEnvironmentMock: vi.fn(),
  builders.resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSecondsFromEnvironmentMock: vi.fn(),
  builders.resolvePortablePathAuditSinkAutoRemediationStrategyFromEnvironmentMock: vi.fn(),
  builders.resolvePortablePathAuditSinkAutoRemediationThresholdFromEnvironmentMock: vi.fn(),
  builders.resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironmentMock: vi.fn(),
  builders.resolvePortablePathAuditSinkAutoRemediationWebhookSignatureKeyIdFromEnvironmentMock: vi.fn(),
  builders.resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironmentMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsAccess: builders.requireAiPathsAccessMock,
}));

vi.mock('@/shared/lib/ai-paths/portable-engine/portable-engine-observability', () => ({
  getPortablePathRunExecutionSnapshot: builders.getPortablePathRunExecutionSnapshotMock,
}));

vi.mock('@/shared/lib/ai-paths/portable-engine/server', () => ({
  loadPortablePathAuditSinkAutoRemediationDeadLetters:
    builders.loadPortablePathAuditSinkAutoRemediationDeadLettersMock,
  loadPortablePathSigningPolicyTrendSnapshots: builders.loadPortablePathSigningPolicyTrendSnapshotsMock,
  loadPortablePathAuditSinkStartupHealthState: builders.loadPortablePathAuditSinkStartupHealthStateMock,
  resolvePortablePathAuditSinkAutoRemediationCooldownSecondsFromEnvironment:
    builders.resolvePortablePathAuditSinkAutoRemediationCooldownSecondsFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntriesFromEnvironment:
    builders.resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntriesFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationEmailRecipientsFromEnvironment:
    builders.resolvePortablePathAuditSinkAutoRemediationEmailRecipientsFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironment:
    builders.resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSignatureKeyIdFromEnvironment:
    builders.resolvePortablePathAuditSinkAutoRemediationEmailWebhookSignatureKeyIdFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironment:
    builders.resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationEnabledFromEnvironment:
    builders.resolvePortablePathAuditSinkAutoRemediationEnabledFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMsFromEnvironment:
    builders.resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMsFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationNotificationsEnabledFromEnvironment:
    builders.resolvePortablePathAuditSinkAutoRemediationNotificationsEnabledFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActionsFromEnvironment:
    builders.resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActionsFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSecondsFromEnvironment:
    builders.resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSecondsFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationStrategyFromEnvironment:
    builders.resolvePortablePathAuditSinkAutoRemediationStrategyFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationThresholdFromEnvironment:
    builders.resolvePortablePathAuditSinkAutoRemediationThresholdFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironment:
    builders.resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationWebhookSignatureKeyIdFromEnvironment:
    builders.resolvePortablePathAuditSinkAutoRemediationWebhookSignatureKeyIdFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironment:
    builders.resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironmentMock,
}));

import { GET_handler } from './handler';

import * as builders from './handler.builders.test';
describe('ai-paths portable-engine trend snapshots handler', () => {
  beforeEach(() => {
    builders.requireAiPathsAccessMock.mockReset().mockResolvedValue(undefined);
    builders.getPortablePathRunExecutionSnapshotMock.mockReset().mockReturnValue({
      totals: {
        attempts: 0,
        successes: 0,
        failures: 0,
      },
      byRunner: {
        client: { attempts: 0, successes: 0, failures: 0 },
        server: { attempts: 0, successes: 0, failures: 0 },
      },
      bySurface: {
        canvas: { attempts: 0, successes: 0, failures: 0 },
        product: { attempts: 0, successes: 0, failures: 0 },
        api: { attempts: 0, successes: 0, failures: 0 },
      },
      bySource: {
        portable_package: { attempts: 0, successes: 0, failures: 0 },
        portable_envelope: { attempts: 0, successes: 0, failures: 0 },
        semantic_canvas: { attempts: 0, successes: 0, failures: 0 },
        path_config: { attempts: 0, successes: 0, failures: 0 },
      },
      failureStageCounts: {
        resolve: 0,
        validation: 0,
        runtime: 0,
      },
      recentEvents: [],
    });
    builders.loadPortablePathAuditSinkAutoRemediationDeadLettersMock.mockReset().mockResolvedValue([]);
    builders.loadPortablePathSigningPolicyTrendSnapshotsMock.mockReset().mockResolvedValue([
      {
        at: '2026-03-05T00:00:00.000Z',
        trigger: 'manual',
        reportEveryUses: 5,
        usageTotals: { uses: 3 },
        usageBySurface: { canvas: 1, product: 1, api: 1 },
        usageByProfile: {
          dev: {
            uses: 3,
            bySurface: { canvas: 1, product: 1, api: 1 },
            fingerprintModeCounts: { off: 3, warn: 0, strict: 0 },
            envelopeModeCounts: { off: 3, warn: 0, strict: 0 },
            lastUsedAt: '2026-03-05T00:00:00.000Z',
            lastSurface: 'api',
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
        sinkTotals: {
          registrationCount: 1,
          unregistrationCount: 0,
          writesAttempted: 2,
          writesSucceeded: 2,
          writesFailed: 0,
        },
        sinkRegisteredIds: ['sink-a'],
        sinkRecentFailures: [],
        expectedProfilesBySurface: {
          canvas: ['prod'],
          product: ['prod'],
          api: ['prod'],
        },
        driftAlerts: [],
      },
    ]);
    builders.loadPortablePathAuditSinkStartupHealthStateMock.mockReset().mockResolvedValue({
      consecutiveFailureCount: 0,
      lastFailureAt: null,
      lastRecoveredAt: '2026-03-05T00:00:00.000Z',
      lastFailedSinkIds: [],
      remediationCount: 1,
      lastRemediatedAt: '2026-03-04T23:00:00.000Z',
      remediationWindowStartedAt: '2026-03-04T23:00:00.000Z',
      remediationWindowActionCount: 1,
      lastRemediationSkippedAt: null,
      lastRemediationSkippedReason: null,
      lastStatus: 'healthy',
    });
    builders.resolvePortablePathAuditSinkAutoRemediationEnabledFromEnvironmentMock
      .mockReset()
      .mockReturnValue(true);
    builders.resolvePortablePathAuditSinkAutoRemediationCooldownSecondsFromEnvironmentMock
      .mockReset()
      .mockReturnValue(120);
    builders.resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSecondsFromEnvironmentMock
      .mockReset()
      .mockReturnValue(1800);
    builders.resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActionsFromEnvironmentMock
      .mockReset()
      .mockReturnValue(2);
    builders.resolvePortablePathAuditSinkAutoRemediationNotificationsEnabledFromEnvironmentMock
      .mockReset()
      .mockReturnValue(true);
    builders.resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironmentMock
      .mockReset()
      .mockReturnValue('https://example.test/webhook');
    builders.resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironmentMock
      .mockReset()
      .mockReturnValue('https://example.test/email-webhook');
    builders.resolvePortablePathAuditSinkAutoRemediationEmailRecipientsFromEnvironmentMock
      .mockReset()
      .mockReturnValue(['ops@example.test']);
    builders.resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMsFromEnvironmentMock
      .mockReset()
      .mockReturnValue(5000);
    builders.resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntriesFromEnvironmentMock
      .mockReset()
      .mockReturnValue(100);
    builders.resolvePortablePathAuditSinkAutoRemediationStrategyFromEnvironmentMock
      .mockReset()
      .mockReturnValue('degrade_to_log_only');
    builders.resolvePortablePathAuditSinkAutoRemediationThresholdFromEnvironmentMock
      .mockReset()
      .mockReturnValue(4);
    builders.resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironmentMock
      .mockReset()
      .mockReturnValue('webhook-secret');
    builders.resolvePortablePathAuditSinkAutoRemediationWebhookSignatureKeyIdFromEnvironmentMock
      .mockReset()
      .mockReturnValue('webhook-key-id');
    builders.resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironmentMock
      .mockReset()
      .mockReturnValue('email-secret');
    builders.resolvePortablePathAuditSinkAutoRemediationEmailWebhookSignatureKeyIdFromEnvironmentMock
      .mockReset()
      .mockReturnValue('email-key-id');
  });

  it('returns portable trend snapshots payload with summary', async () => {
    builders.getPortablePathRunExecutionSnapshotMock.mockReturnValue({
      totals: {
        attempts: 4,
        successes: 2,
        failures: 2,
      },
      byRunner: {
        client: { attempts: 3, successes: 2, failures: 1 },
        server: { attempts: 1, successes: 0, failures: 1 },
      },
      bySurface: {
        canvas: { attempts: 2, successes: 1, failures: 1 },
        product: { attempts: 1, successes: 1, failures: 0 },
        api: { attempts: 1, successes: 0, failures: 1 },
      },
      bySource: {
        portable_package: { attempts: 1, successes: 1, failures: 0 },
        portable_envelope: { attempts: 1, successes: 0, failures: 1 },
        semantic_canvas: { attempts: 0, successes: 0, failures: 0 },
        path_config: { attempts: 2, successes: 1, failures: 1 },
      },
      failureStageCounts: {
        resolve: 1,
        validation: 0,
        runtime: 1,
      },
      recentEvents: [
        {
          at: '2026-03-05T00:15:00.000Z',
          runner: 'client',
          surface: 'canvas',
          source: 'path_config',
          validateBeforeRun: true,
          validationMode: 'strict',
          durationMs: 210,
          outcome: 'failure',
          failureStage: 'runtime',
          error: 'runtime failure',
        },
        {
          at: '2026-03-05T00:14:00.000Z',
          runner: 'server',
          surface: 'api',
          source: null,
          validateBeforeRun: true,
          validationMode: 'strict',
          durationMs: 30,
          outcome: 'failure',
          failureStage: 'resolve',
          error: 'Invalid AI-Path payload',
        },
      ],
    });
    builders.loadPortablePathAuditSinkAutoRemediationDeadLettersMock.mockResolvedValue([
      {
        queuedAt: '2026-03-05T00:10:00.000Z',
        channel: 'webhook',
        endpoint: 'https://example.test/webhook',
        payload: { event: 'portable_audit_sink_auto_remediation' },
        error: 'notification_http_502',
        statusCode: 502,
        attemptCount: 1,
        signature: null,
      },
    ]);
    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/portable-engine/trend-snapshots?limit=12'),
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(200);
    expect(builders.requireAiPathsAccessMock).toHaveBeenCalledTimes(1);
    expect(builders.loadPortablePathSigningPolicyTrendSnapshotsMock).toHaveBeenCalledWith({
      maxSnapshots: 12,
    });
    expect(builders.loadPortablePathAuditSinkAutoRemediationDeadLettersMock).toHaveBeenCalledWith({
      maxEntries: 100,
    });

    const payload = (await response.json()) as Record<string, unknown>;
    expect(payload['specVersion']).toBe(AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION);
    expect(payload['kind']).toBe('portable_signing_policy_trend_snapshots');
    expect(payload['snapshotCount']).toBe(1);
    expect(payload['matchedSnapshotCount']).toBe(1);
    expect(payload['filters']).toEqual({
      trigger: null,
      from: null,
      to: null,
    });
    expect(payload['summary']).toEqual({
      latestSnapshotAt: '2026-03-05T00:00:00.000Z',
      driftAlertsTotal: 0,
      sinkWritesFailedTotal: 0,
      notificationDeadLetterCount: 1,
      latestNotificationDeadLetterAt: '2026-03-05T00:10:00.000Z',
      notificationDeadLetterTopErrors: [{ reason: 'notification_http_502', count: 1 }],
    });
    expect(payload['autoRemediation']).toEqual(
      expect.objectContaining({
        enabled: true,
        strategy: 'degrade_to_log_only',
        threshold: 4,
        cooldownSeconds: 120,
        rateLimitWindowSeconds: 1800,
        rateLimitMaxActions: 2,
        notifications: expect.objectContaining({
          enabled: true,
          webhookConfigured: true,
          webhookSigningConfigured: true,
          webhookSignatureKeyId: 'webhook-key-id',
          emailWebhookConfigured: true,
          emailWebhookSigningConfigured: true,
          emailWebhookSignatureKeyId: 'email-key-id',
          emailRecipients: ['ops@example.test'],
          timeoutMs: 5000,
          deadLetter: {
            maxEntries: 100,
            queuedCount: 1,
            latestQueuedAt: '2026-03-05T00:10:00.000Z',
            topErrors: [{ reason: 'notification_http_502', count: 1 }],
            replayPolicySkipsTotal: 0,
            replayPolicySkipReasons: [],
          },
        }),
      })
    );
    expect(payload['runExecution']).toEqual({
      source: 'in_memory',
      totals: {
        attempts: 4,
        successes: 2,
        failures: 2,
        successRate: 50,
        failureRate: 50,
      },
      byRunner: {
        client: { attempts: 3, successes: 2, failures: 1 },
        server: { attempts: 1, successes: 0, failures: 1 },
      },
      bySurface: {
        canvas: { attempts: 2, successes: 1, failures: 1 },
        product: { attempts: 1, successes: 1, failures: 0 },
        api: { attempts: 1, successes: 0, failures: 1 },
      },
      byInputSource: {
        portable_package: { attempts: 1, successes: 1, failures: 0 },
        portable_envelope: { attempts: 1, successes: 0, failures: 1 },
        semantic_canvas: { attempts: 0, successes: 0, failures: 0 },
        path_config: { attempts: 2, successes: 1, failures: 1 },
      },
      failureStageCounts: {
        resolve: 1,
        validation: 0,
        runtime: 1,
      },
      topFailureErrors: [
        { reason: 'Invalid AI-Path payload', count: 1 },
        { reason: 'runtime failure', count: 1 },
      ],
      recentFailures: [
        {
          at: '2026-03-05T00:14:00.000Z',
          runner: 'server',
          surface: 'api',
          source: null,
          stage: 'resolve',
          error: 'Invalid AI-Path payload',
          durationMs: 30,
          validateBeforeRun: true,
          validationMode: 'strict',
        },
        {
          at: '2026-03-05T00:15:00.000Z',
          runner: 'client',
          surface: 'canvas',
          source: 'path_config',
          stage: 'runtime',
          error: 'runtime failure',
          durationMs: 210,
          validateBeforeRun: true,
          validationMode: 'strict',
        },
      ],
    });
  });

  it('aggregates top run failure errors from full in-memory history', async () => {
    const failureEvents = Array.from({ length: 12 }, (_value, index) => ({
      at: `2026-03-05T00:${String(index).padStart(2, '0')}:00.000Z`,
      runner: 'client' as const,
      surface: 'canvas' as const,
      source: 'path_config' as const,
      validateBeforeRun: true,
      validationMode: 'strict' as const,
      durationMs: 10 + index,
      outcome: 'failure' as const,
      failureStage: 'runtime' as const,
      error: index < 5 ? 'timeout contacting provider' : `runtime_failure_${index}`,
    }));
    builders.getPortablePathRunExecutionSnapshotMock.mockReturnValue({
      totals: {
        attempts: 12,
        successes: 0,
        failures: 12,
      },
      byRunner: {
        client: { attempts: 12, successes: 0, failures: 12 },
        server: { attempts: 0, successes: 0, failures: 0 },
      },
      bySurface: {
        canvas: { attempts: 12, successes: 0, failures: 12 },
        product: { attempts: 0, successes: 0, failures: 0 },
        api: { attempts: 0, successes: 0, failures: 0 },
      },
      bySource: {
        portable_package: { attempts: 0, successes: 0, failures: 0 },
        portable_envelope: { attempts: 0, successes: 0, failures: 0 },
        semantic_canvas: { attempts: 0, successes: 0, failures: 0 },
        path_config: { attempts: 12, successes: 0, failures: 12 },
      },
      failureStageCounts: {
        resolve: 0,
        validation: 0,
        runtime: 12,
      },
      recentEvents: failureEvents,
    });

    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/portable-engine/trend-snapshots'),
      {} as Parameters<typeof GET_handler>[1]
    );
    expect(response.status).toBe(200);

    const payload = (await response.json()) as Record<string, unknown>;
    const runExecution = payload['runExecution'] as {
      topFailureErrors: Array<{ reason: string; count: number }>;
      recentFailures: Array<Record<string, unknown>>;
    };
    expect(runExecution.topFailureErrors[0]).toEqual({
      reason: 'timeout contacting provider',
      count: 5,
    });
    expect(runExecution.recentFailures).toHaveLength(10);
  });

  it('falls back to unavailable run execution summary when snapshot loading fails', async () => {
    builders.getPortablePathRunExecutionSnapshotMock.mockImplementation(() => {
      throw new Error('snapshot unavailable');
    });

    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/portable-engine/trend-snapshots'),
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as Record<string, unknown>;
    expect(payload['runExecution']).toEqual({
      source: 'unavailable',
      totals: {
        attempts: 0,
        successes: 0,
        failures: 0,
        successRate: 0,
        failureRate: 0,
      },
      byRunner: {
        client: { attempts: 0, successes: 0, failures: 0 },
        server: { attempts: 0, successes: 0, failures: 0 },
      },
      bySurface: {
        canvas: { attempts: 0, successes: 0, failures: 0 },
        product: { attempts: 0, successes: 0, failures: 0 },
        api: { attempts: 0, successes: 0, failures: 0 },
      },
      byInputSource: {
        portable_package: { attempts: 0, successes: 0, failures: 0 },
        portable_envelope: { attempts: 0, successes: 0, failures: 0 },
        semantic_canvas: { attempts: 0, successes: 0, failures: 0 },
        path_config: { attempts: 0, successes: 0, failures: 0 },
      },
      failureStageCounts: {
        resolve: 0,
        validation: 0,
        runtime: 0,
      },
      topFailureErrors: [],
      recentFailures: [],
    });
  });

  it('falls back to default remediation threshold when resolver returns null', async () => {
    builders.resolvePortablePathAuditSinkAutoRemediationEnabledFromEnvironmentMock.mockReturnValue(null);
    builders.resolvePortablePathAuditSinkAutoRemediationCooldownSecondsFromEnvironmentMock.mockReturnValue(
      null
    );
    builders.resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSecondsFromEnvironmentMock.mockReturnValue(
      null
    );
    builders.resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActionsFromEnvironmentMock.mockReturnValue(
      null
    );
    builders.resolvePortablePathAuditSinkAutoRemediationNotificationsEnabledFromEnvironmentMock.mockReturnValue(
      null
    );
    builders.resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironmentMock.mockReturnValue(null);
    builders.resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironmentMock.mockReturnValue(
      null
    );
    builders.resolvePortablePathAuditSinkAutoRemediationEmailRecipientsFromEnvironmentMock.mockReturnValue(
      null
    );
    builders.resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMsFromEnvironmentMock.mockReturnValue(
      null
    );
    builders.resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntriesFromEnvironmentMock.mockReturnValue(
      null
    );
    builders.resolvePortablePathAuditSinkAutoRemediationStrategyFromEnvironmentMock.mockReturnValue(null);
    builders.resolvePortablePathAuditSinkAutoRemediationThresholdFromEnvironmentMock.mockReturnValue(null);
    builders.resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironmentMock.mockReturnValue(
      null
    );
    builders.resolvePortablePathAuditSinkAutoRemediationWebhookSignatureKeyIdFromEnvironmentMock.mockReturnValue(
      null
    );
    builders.resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironmentMock.mockReturnValue(
      null
    );
    builders.resolvePortablePathAuditSinkAutoRemediationEmailWebhookSignatureKeyIdFromEnvironmentMock.mockReturnValue(
      null
    );

    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/portable-engine/trend-snapshots'),
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as Record<string, unknown>;
    expect(payload['autoRemediation']).toEqual(
      expect.objectContaining({
        enabled: true,
        strategy: 'unregister_all',
        threshold: 3,
        cooldownSeconds: 300,
        rateLimitWindowSeconds: 3600,
        rateLimitMaxActions: 3,
        notifications: expect.objectContaining({
          enabled: true,
          webhookConfigured: false,
          webhookSigningConfigured: false,
          webhookSignatureKeyId: null,
          emailWebhookConfigured: false,
          emailWebhookSigningConfigured: false,
          emailWebhookSignatureKeyId: null,
          emailRecipients: [],
          timeoutMs: 8000,
          deadLetter: {
            maxEntries: 200,
            queuedCount: 0,
            latestQueuedAt: null,
            topErrors: [],
            replayPolicySkipsTotal: 0,
            replayPolicySkipReasons: [],
          },
        }),
      })
    );
  });

  it('summarizes dead-letter replay policy skip reasons', async () => {
    builders.loadPortablePathAuditSinkAutoRemediationDeadLettersMock.mockResolvedValue([
      {
        queuedAt: '2026-03-05T00:10:00.000Z',
        channel: 'webhook',
        endpoint: 'https://example.test/webhook',
        payload: { event: 'portable_audit_sink_auto_remediation' },
        error: 'dead_letter_outside_replay_window',
        statusCode: null,
        attemptCount: 2,
        signature: null,
      },
      {
        queuedAt: '2026-03-05T00:11:00.000Z',
        channel: 'webhook',
        endpoint: 'https://example.test/webhook',
        payload: { event: 'portable_audit_sink_auto_remediation' },
        error: 'dead_letter_endpoint_disallowed',
        statusCode: null,
        attemptCount: 2,
        signature: null,
      },
      {
        queuedAt: '2026-03-05T00:12:00.000Z',
        channel: 'webhook',
        endpoint: 'https://example.test/webhook',
        payload: { event: 'portable_audit_sink_auto_remediation' },
        error: 'dead_letter_outside_replay_window',
        statusCode: null,
        attemptCount: 3,
        signature: null,
      },
    ]);

    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/portable-engine/trend-snapshots'),
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as Record<string, unknown>;
    expect(payload['summary']).toEqual(
      expect.objectContaining({
        notificationDeadLetterTopErrors: [
          { reason: 'dead_letter_outside_replay_window', count: 2 },
          { reason: 'dead_letter_endpoint_disallowed', count: 1 },
        ],
      })
    );
    expect(payload['autoRemediation']).toEqual(
      expect.objectContaining({
        notifications: expect.objectContaining({
          deadLetter: expect.objectContaining({
            replayPolicySkipsTotal: 3,
            replayPolicySkipReasons: [
              { reason: 'dead_letter_outside_replay_window', count: 2 },
              { reason: 'dead_letter_endpoint_disallowed', count: 1 },
            ],
          }),
        }),
      })
    );
  });

});
