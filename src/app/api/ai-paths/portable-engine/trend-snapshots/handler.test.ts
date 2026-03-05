import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION } from '@/shared/lib/ai-paths/portable-engine';

const { requireAiPathsAccessMock } = vi.hoisted(() => ({
  requireAiPathsAccessMock: vi.fn(),
}));

const {
  loadPortablePathSigningPolicyTrendSnapshotsMock,
  loadPortablePathAuditSinkStartupHealthStateMock,
  resolvePortablePathAuditSinkAutoRemediationCooldownSecondsFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationEmailRecipientsFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationEnabledFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMsFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationNotificationsEnabledFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActionsFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSecondsFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationStrategyFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationThresholdFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironmentMock,
} = vi.hoisted(() => ({
  loadPortablePathSigningPolicyTrendSnapshotsMock: vi.fn(),
  loadPortablePathAuditSinkStartupHealthStateMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationCooldownSecondsFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationEmailRecipientsFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationEnabledFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMsFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationNotificationsEnabledFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActionsFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSecondsFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationStrategyFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationThresholdFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironmentMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsAccess: requireAiPathsAccessMock,
}));

vi.mock('@/shared/lib/ai-paths/portable-engine/server', () => ({
  loadPortablePathSigningPolicyTrendSnapshots:
    loadPortablePathSigningPolicyTrendSnapshotsMock,
  loadPortablePathAuditSinkStartupHealthState:
    loadPortablePathAuditSinkStartupHealthStateMock,
  resolvePortablePathAuditSinkAutoRemediationCooldownSecondsFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationCooldownSecondsFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationEmailRecipientsFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationEmailRecipientsFromEnvironmentMock,
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
  resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironmentMock,
}));

import { GET_handler } from './handler';

describe('ai-paths portable-engine trend snapshots handler', () => {
  beforeEach(() => {
    requireAiPathsAccessMock.mockReset().mockResolvedValue(undefined);
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
    resolvePortablePathAuditSinkAutoRemediationStrategyFromEnvironmentMock
      .mockReset()
      .mockReturnValue('degrade_to_log_only');
    resolvePortablePathAuditSinkAutoRemediationThresholdFromEnvironmentMock
      .mockReset()
      .mockReturnValue(4);
  });

  it('returns portable trend snapshots payload with summary', async () => {
    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/portable-engine/trend-snapshots?limit=12'),
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(200);
    expect(requireAiPathsAccessMock).toHaveBeenCalledTimes(1);
    expect(loadPortablePathSigningPolicyTrendSnapshotsMock).toHaveBeenCalledWith({
      maxSnapshots: 12,
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
          emailWebhookConfigured: true,
          emailRecipients: ['ops@example.test'],
          timeoutMs: 5000,
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
    resolvePortablePathAuditSinkAutoRemediationStrategyFromEnvironmentMock.mockReturnValue(
      null
    );
    resolvePortablePathAuditSinkAutoRemediationThresholdFromEnvironmentMock.mockReturnValue(
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
          emailWebhookConfigured: false,
          emailRecipients: [],
          timeoutMs: 8000,
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
    });
    expect((payload['snapshots'] as Array<{ at: string }>).map((entry) => entry.at)).toEqual([
      '2026-03-05T00:20:00.000Z',
    ]);
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
  });
});
