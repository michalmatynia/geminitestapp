import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION } from '@/shared/lib/ai-paths/portable-engine';

const { requireAiPathsAccessMock } = vi.hoisted(() => ({
  requireAiPathsAccessMock: vi.fn(),
}));

const {
  loadPortablePathAuditSinkAutoRemediationDeadLettersMock,
  loadPortablePathSigningPolicyTrendSnapshotsMock,
  loadPortablePathAuditSinkStartupHealthStateMock,
  resolvePortablePathAuditSinkAutoRemediationCooldownSecondsFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntriesFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationEmailRecipientsFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSignatureKeyIdFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationEnabledFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMsFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationNotificationsEnabledFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActionsFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSecondsFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationStrategyFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationThresholdFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationWebhookSignatureKeyIdFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironmentMock,
} = vi.hoisted(() => ({
  loadPortablePathAuditSinkAutoRemediationDeadLettersMock: vi.fn(),
  loadPortablePathSigningPolicyTrendSnapshotsMock: vi.fn(),
  loadPortablePathAuditSinkStartupHealthStateMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationCooldownSecondsFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntriesFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationEmailRecipientsFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSignatureKeyIdFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationEnabledFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMsFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationNotificationsEnabledFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActionsFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSecondsFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationStrategyFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationThresholdFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationWebhookSignatureKeyIdFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironmentMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsAccess: requireAiPathsAccessMock,
}));

vi.mock('@/shared/lib/ai-paths/portable-engine/server', () => ({
  loadPortablePathAuditSinkAutoRemediationDeadLetters:
    loadPortablePathAuditSinkAutoRemediationDeadLettersMock,
  loadPortablePathSigningPolicyTrendSnapshots:
    loadPortablePathSigningPolicyTrendSnapshotsMock,
  loadPortablePathAuditSinkStartupHealthState:
    loadPortablePathAuditSinkStartupHealthStateMock,
  resolvePortablePathAuditSinkAutoRemediationCooldownSecondsFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationCooldownSecondsFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntriesFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntriesFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationEmailRecipientsFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationEmailRecipientsFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSignatureKeyIdFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationEmailWebhookSignatureKeyIdFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationEnabledFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationEnabledFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMsFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMsFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationNotificationsEnabledFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationNotificationsEnabledFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActionsFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActionsFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSecondsFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSecondsFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationStrategyFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationStrategyFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationThresholdFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationThresholdFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationWebhookSignatureKeyIdFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationWebhookSignatureKeyIdFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironmentMock,
}));

import { GET_handler } from './handler';

describe('ai-paths portable-engine trend snapshots handler', () => {
  beforeEach(() => {
    requireAiPathsAccessMock.mockReset().mockResolvedValue(undefined);
    loadPortablePathAuditSinkAutoRemediationDeadLettersMock
      .mockReset()
      .mockResolvedValue([]);
    loadPortablePathSigningPolicyTrendSnapshotsMock.mockReset().mockResolvedValue([
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
    loadPortablePathAuditSinkStartupHealthStateMock.mockReset().mockResolvedValue({
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
    resolvePortablePathAuditSinkAutoRemediationEnabledFromEnvironmentMock
      .mockReset()
      .mockReturnValue(true);
    resolvePortablePathAuditSinkAutoRemediationCooldownSecondsFromEnvironmentMock
      .mockReset()
      .mockReturnValue(120);
    resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSecondsFromEnvironmentMock
      .mockReset()
      .mockReturnValue(1800);
    resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActionsFromEnvironmentMock
      .mockReset()
      .mockReturnValue(2);
    resolvePortablePathAuditSinkAutoRemediationNotificationsEnabledFromEnvironmentMock
      .mockReset()
      .mockReturnValue(true);
    resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironmentMock
      .mockReset()
      .mockReturnValue('https://example.test/webhook');
    resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironmentMock
      .mockReset()
      .mockReturnValue('https://example.test/email-webhook');
    resolvePortablePathAuditSinkAutoRemediationEmailRecipientsFromEnvironmentMock
      .mockReset()
      .mockReturnValue(['ops@example.test']);
    resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMsFromEnvironmentMock
      .mockReset()
      .mockReturnValue(5000);
    resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntriesFromEnvironmentMock
      .mockReset()
      .mockReturnValue(100);
    resolvePortablePathAuditSinkAutoRemediationStrategyFromEnvironmentMock
      .mockReset()
      .mockReturnValue('degrade_to_log_only');
    resolvePortablePathAuditSinkAutoRemediationThresholdFromEnvironmentMock
      .mockReset()
      .mockReturnValue(4);
    resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironmentMock
      .mockReset()
      .mockReturnValue('webhook-secret');
    resolvePortablePathAuditSinkAutoRemediationWebhookSignatureKeyIdFromEnvironmentMock
      .mockReset()
      .mockReturnValue('webhook-key-id');
    resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironmentMock
      .mockReset()
      .mockReturnValue('email-secret');
    resolvePortablePathAuditSinkAutoRemediationEmailWebhookSignatureKeyIdFromEnvironmentMock
      .mockReset()
      .mockReturnValue('email-key-id');
  });

  it('returns portable trend snapshots payload with summary', async () => {
    loadPortablePathAuditSinkAutoRemediationDeadLettersMock.mockResolvedValue([
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
    expect(requireAiPathsAccessMock).toHaveBeenCalledTimes(1);
    expect(loadPortablePathSigningPolicyTrendSnapshotsMock).toHaveBeenCalledWith({
      maxSnapshots: 12,
    });
    expect(loadPortablePathAuditSinkAutoRemediationDeadLettersMock).toHaveBeenCalledWith({
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
          },
        }),
      })
    );
  });

  it('falls back to default remediation threshold when resolver returns null', async () => {
    resolvePortablePathAuditSinkAutoRemediationEnabledFromEnvironmentMock.mockReturnValue(
      null
    );
    resolvePortablePathAuditSinkAutoRemediationCooldownSecondsFromEnvironmentMock.mockReturnValue(
      null
    );
    resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSecondsFromEnvironmentMock.mockReturnValue(
      null
    );
    resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActionsFromEnvironmentMock.mockReturnValue(
      null
    );
    resolvePortablePathAuditSinkAutoRemediationNotificationsEnabledFromEnvironmentMock.mockReturnValue(
      null
    );
    resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironmentMock.mockReturnValue(
      null
    );
    resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironmentMock.mockReturnValue(
      null
    );
    resolvePortablePathAuditSinkAutoRemediationEmailRecipientsFromEnvironmentMock.mockReturnValue(
      null
    );
    resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMsFromEnvironmentMock.mockReturnValue(
      null
    );
    resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntriesFromEnvironmentMock.mockReturnValue(
      null
    );
    resolvePortablePathAuditSinkAutoRemediationStrategyFromEnvironmentMock.mockReturnValue(
      null
    );
    resolvePortablePathAuditSinkAutoRemediationThresholdFromEnvironmentMock.mockReturnValue(
      null
    );
    resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironmentMock.mockReturnValue(
      null
    );
    resolvePortablePathAuditSinkAutoRemediationWebhookSignatureKeyIdFromEnvironmentMock.mockReturnValue(
      null
    );
    resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironmentMock.mockReturnValue(
      null
    );
    resolvePortablePathAuditSinkAutoRemediationEmailWebhookSignatureKeyIdFromEnvironmentMock.mockReturnValue(
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
          },
        }),
      })
    );
  });

  it('applies trigger/date filters and returns latest matching snapshots within limit', async () => {
    loadPortablePathSigningPolicyTrendSnapshotsMock.mockResolvedValue([
      {
        at: '2026-03-05T00:00:00.000Z',
        trigger: 'manual',
        reportEveryUses: 5,
        usageTotals: { uses: 1 },
        usageBySurface: { canvas: 1, product: 0, api: 0 },
        usageByProfile: {
          dev: {
            uses: 1,
            bySurface: { canvas: 1, product: 0, api: 0 },
            fingerprintModeCounts: { off: 1, warn: 0, strict: 0 },
            envelopeModeCounts: { off: 1, warn: 0, strict: 0 },
            lastUsedAt: '2026-03-05T00:00:00.000Z',
            lastSurface: 'canvas',
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
          writesAttempted: 1,
          writesSucceeded: 1,
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
      {
        at: '2026-03-05T00:10:00.000Z',
        trigger: 'threshold',
        reportEveryUses: 5,
        usageTotals: { uses: 2 },
        usageBySurface: { canvas: 0, product: 2, api: 0 },
        usageByProfile: {
          dev: {
            uses: 2,
            bySurface: { canvas: 0, product: 2, api: 0 },
            fingerprintModeCounts: { off: 2, warn: 0, strict: 0 },
            envelopeModeCounts: { off: 2, warn: 0, strict: 0 },
            lastUsedAt: '2026-03-05T00:10:00.000Z',
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
        sinkTotals: {
          registrationCount: 1,
          unregistrationCount: 0,
          writesAttempted: 2,
          writesSucceeded: 1,
          writesFailed: 1,
        },
        sinkRegisteredIds: ['sink-a'],
        sinkRecentFailures: [],
        expectedProfilesBySurface: {
          canvas: ['prod'],
          product: ['prod'],
          api: ['prod'],
        },
        driftAlerts: [{ test: true }],
      },
      {
        at: '2026-03-05T00:20:00.000Z',
        trigger: 'threshold',
        reportEveryUses: 5,
        usageTotals: { uses: 3 },
        usageBySurface: { canvas: 0, product: 0, api: 3 },
        usageByProfile: {
          dev: {
            uses: 3,
            bySurface: { canvas: 0, product: 0, api: 3 },
            fingerprintModeCounts: { off: 3, warn: 0, strict: 0 },
            envelopeModeCounts: { off: 3, warn: 0, strict: 0 },
            lastUsedAt: '2026-03-05T00:20:00.000Z',
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
          writesAttempted: 3,
          writesSucceeded: 2,
          writesFailed: 1,
        },
        sinkRegisteredIds: ['sink-a'],
        sinkRecentFailures: [],
        expectedProfilesBySurface: {
          canvas: ['prod'],
          product: ['prod'],
          api: ['prod'],
        },
        driftAlerts: [{ test: true }],
      },
    ]);

    const response = await GET_handler(
      new NextRequest(
        'http://localhost/api/ai-paths/portable-engine/trend-snapshots?limit=1&trigger=threshold&from=2026-03-05T00:05:00.000Z&to=2026-03-05T00:25:00.000Z'
      ),
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(200);
    expect(loadPortablePathSigningPolicyTrendSnapshotsMock).toHaveBeenCalledWith({
      maxSnapshots: 500,
    });
    const payload = (await response.json()) as Record<string, unknown>;
    expect(payload['snapshotCount']).toBe(1);
    expect(payload['matchedSnapshotCount']).toBe(2);
    expect(payload['filters']).toEqual({
      trigger: 'threshold',
      from: '2026-03-05T00:05:00.000Z',
      to: '2026-03-05T00:25:00.000Z',
    });
    expect(payload['summary']).toEqual({
      latestSnapshotAt: '2026-03-05T00:20:00.000Z',
      driftAlertsTotal: 1,
      sinkWritesFailedTotal: 1,
      notificationDeadLetterCount: 0,
      latestNotificationDeadLetterAt: null,
    });
    expect(payload['pagination']).toEqual(
      expect.objectContaining({
        hasMore: true,
        cursor: null,
        nextCursor: expect.any(String),
      })
    );
    expect((payload['snapshots'] as Array<{ at: string }>).map((entry) => entry.at)).toEqual([
      '2026-03-05T00:20:00.000Z',
    ]);

    const nextCursor = String((payload['pagination'] as Record<string, unknown>)['nextCursor']);
    const cursorResponse = await GET_handler(
      new NextRequest(
        `http://localhost/api/ai-paths/portable-engine/trend-snapshots?limit=1&trigger=threshold&from=2026-03-05T00:05:00.000Z&to=2026-03-05T00:25:00.000Z&cursor=${encodeURIComponent(nextCursor)}`
      ),
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(cursorResponse.status).toBe(200);
    const cursorPayload = (await cursorResponse.json()) as Record<string, unknown>;
    expect(cursorPayload['snapshotCount']).toBe(1);
    expect(cursorPayload['matchedSnapshotCount']).toBe(2);
    expect(cursorPayload['summary']).toEqual({
      latestSnapshotAt: '2026-03-05T00:10:00.000Z',
      driftAlertsTotal: 1,
      sinkWritesFailedTotal: 1,
      notificationDeadLetterCount: 0,
      latestNotificationDeadLetterAt: null,
    });
    expect(cursorPayload['pagination']).toEqual(
      expect.objectContaining({
        hasMore: false,
        nextCursor: null,
      })
    );
    expect(
      (cursorPayload['snapshots'] as Array<{ at: string }>).map((entry) => entry.at)
    ).toEqual(['2026-03-05T00:10:00.000Z']);
  });

  it('rejects invalid snapshot limits', async () => {
    await expect(
      GET_handler(
        new NextRequest('http://localhost/api/ai-paths/portable-engine/trend-snapshots?limit=0'),
        {} as Parameters<typeof GET_handler>[1]
      )
    ).rejects.toThrow('Trend snapshot limit must be between 1 and 500.');
  });

  it('rejects invalid trigger and invalid date ranges', async () => {
    await expect(
      GET_handler(
        new NextRequest(
          'http://localhost/api/ai-paths/portable-engine/trend-snapshots?trigger=invalid'
        ),
        {} as Parameters<typeof GET_handler>[1]
      )
    ).rejects.toThrow('Trend snapshot trigger must be one of: manual, threshold.');

    await expect(
      GET_handler(
        new NextRequest(
          'http://localhost/api/ai-paths/portable-engine/trend-snapshots?from=2026-03-05T01:00:00.000Z&to=2026-03-05T00:00:00.000Z'
        ),
        {} as Parameters<typeof GET_handler>[1]
      )
    ).rejects.toThrow('Trend snapshot "from" timestamp must be earlier than or equal to "to".');

    await expect(
      GET_handler(
        new NextRequest(
          'http://localhost/api/ai-paths/portable-engine/trend-snapshots?cursor=invalid'
        ),
        {} as Parameters<typeof GET_handler>[1]
      )
    ).rejects.toThrow('Trend snapshot cursor is invalid.');

    const mismatchedCursor = Buffer.from(
      JSON.stringify({
        version: 1,
        beforeAt: '2026-03-05T00:30:00.000Z',
        trigger: 'manual',
        from: null,
        to: null,
      }),
      'utf8'
    ).toString('base64url');
    await expect(
      GET_handler(
        new NextRequest(
          `http://localhost/api/ai-paths/portable-engine/trend-snapshots?trigger=threshold&cursor=${encodeURIComponent(mismatchedCursor)}`
        ),
        {} as Parameters<typeof GET_handler>[1]
      )
    ).rejects.toThrow('Trend snapshot cursor is invalid.');
  });
});
