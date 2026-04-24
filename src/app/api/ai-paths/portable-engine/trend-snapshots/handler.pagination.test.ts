import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const builders = vi.hoisted(() => ({
  requireAiPathsAccessMock: vi.fn(),
  getPortablePathRunExecutionSnapshotMock: vi.fn(),
  loadPortablePathSigningPolicyTrendSnapshotsMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsAccess: builders.requireAiPathsAccessMock,
}));

vi.mock('@/shared/lib/ai-paths/portable-engine/portable-engine-observability', () => ({
  getPortablePathRunExecutionSnapshot: builders.getPortablePathRunExecutionSnapshotMock,
}));

vi.mock('@/shared/lib/ai-paths/portable-engine/server', () => ({
  loadPortablePathSigningPolicyTrendSnapshots:
    builders.loadPortablePathSigningPolicyTrendSnapshotsMock,
}));

import { getHandler } from './handler';

describe('ai-paths portable-engine trend snapshots pagination', () => {
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
    builders.loadPortablePathSigningPolicyTrendSnapshotsMock.mockReset();
  });

  it('applies trigger/date filters and returns latest matching snapshots within limit', async () => {
    builders.loadPortablePathSigningPolicyTrendSnapshotsMock.mockResolvedValue([
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

    const response = await getHandler(
      new NextRequest(
        'http://localhost/api/ai-paths/portable-engine/trend-snapshots?limit=1&trigger=threshold&from=2026-03-05T00:05:00.000Z&to=2026-03-05T00:25:00.000Z'
      ),
      {} as Parameters<typeof getHandler>[1]
    );

    expect(response.status).toBe(200);
    expect(builders.loadPortablePathSigningPolicyTrendSnapshotsMock).toHaveBeenCalledWith({
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
    expect(payload['pagination']).toEqual(
      expect.objectContaining({
        hasMore: true,
        cursor: null,
      })
    );
    expect(typeof (payload['pagination'] as Record<string, unknown>)['nextCursor']).toBe('string');
    expect((payload['snapshots'] as Array<{ at: string }>).map((entry) => entry.at)).toEqual([
      '2026-03-05T00:20:00.000Z',
    ]);

    const nextCursor = String((payload['pagination'] as Record<string, unknown>)['nextCursor']);
    const cursorResponse = await getHandler(
      new NextRequest(
        `http://localhost/api/ai-paths/portable-engine/trend-snapshots?limit=1&trigger=threshold&from=2026-03-05T00:05:00.000Z&to=2026-03-05T00:25:00.000Z&cursor=${encodeURIComponent(nextCursor)}`
      ),
      {} as Parameters<typeof getHandler>[1]
    );

    expect(cursorResponse.status).toBe(200);
    const cursorPayload = (await cursorResponse.json()) as Record<string, unknown>;
    expect(cursorPayload['snapshotCount']).toBe(1);
    expect(cursorPayload['matchedSnapshotCount']).toBe(2);
    expect(cursorPayload['summary']).toEqual({
      latestSnapshotAt: '2026-03-05T00:10:00.000Z',
      driftAlertsTotal: 1,
      sinkWritesFailedTotal: 1,
    });
    expect(cursorPayload['pagination']).toEqual(
      expect.objectContaining({
        hasMore: false,
        nextCursor: null,
      })
    );
    expect((cursorPayload['snapshots'] as Array<{ at: string }>).map((entry) => entry.at)).toEqual([
      '2026-03-05T00:10:00.000Z',
    ]);
  });

  it('keeps cursor windows stable when newer snapshots append between page requests', async () => {
    builders.loadPortablePathSigningPolicyTrendSnapshotsMock.mockResolvedValueOnce([
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
        driftAlerts: [],
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
        driftAlerts: [],
      },
    ]);
    builders.loadPortablePathSigningPolicyTrendSnapshotsMock.mockResolvedValueOnce([
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
        driftAlerts: [],
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
        driftAlerts: [],
      },
      {
        at: '2026-03-05T00:30:00.000Z',
        trigger: 'threshold',
        reportEveryUses: 5,
        usageTotals: { uses: 4 },
        usageBySurface: { canvas: 0, product: 0, api: 4 },
        usageByProfile: {
          dev: {
            uses: 4,
            bySurface: { canvas: 0, product: 0, api: 4 },
            fingerprintModeCounts: { off: 4, warn: 0, strict: 0 },
            envelopeModeCounts: { off: 4, warn: 0, strict: 0 },
            lastUsedAt: '2026-03-05T00:30:00.000Z',
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
          writesAttempted: 4,
          writesSucceeded: 3,
          writesFailed: 1,
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

    const firstResponse = await getHandler(
      new NextRequest(
        'http://localhost/api/ai-paths/portable-engine/trend-snapshots?limit=1&trigger=threshold'
      ),
      {} as Parameters<typeof getHandler>[1]
    );

    expect(firstResponse.status).toBe(200);
    const firstPayload = (await firstResponse.json()) as Record<string, unknown>;
    expect((firstPayload['snapshots'] as Array<{ at: string }>).map((entry) => entry.at)).toEqual([
      '2026-03-05T00:20:00.000Z',
    ]);
    const nextCursor = String((firstPayload['pagination'] as Record<string, unknown>)['nextCursor']);

    const secondResponse = await getHandler(
      new NextRequest(
        `http://localhost/api/ai-paths/portable-engine/trend-snapshots?limit=1&trigger=threshold&cursor=${encodeURIComponent(nextCursor)}`
      ),
      {} as Parameters<typeof getHandler>[1]
    );

    expect(secondResponse.status).toBe(200);
    const secondPayload = (await secondResponse.json()) as Record<string, unknown>;
    expect((secondPayload['snapshots'] as Array<{ at: string }>).map((entry) => entry.at)).toEqual([
      '2026-03-05T00:10:00.000Z',
    ]);
    expect((secondPayload['pagination'] as Record<string, unknown>)['hasMore']).toBe(false);
  });
});
