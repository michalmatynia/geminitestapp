import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION } from '@/shared/lib/ai-paths/portable-engine';

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
  });

  it('returns portable trend snapshots payload with live summary only', async () => {
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

    const response = await getHandler(
      new NextRequest('http://localhost/api/ai-paths/portable-engine/trend-snapshots?limit=12'),
      {} as Parameters<typeof getHandler>[1]
    );

    expect(response.status).toBe(200);
    expect(builders.requireAiPathsAccessMock).toHaveBeenCalledTimes(1);
    expect(builders.loadPortablePathSigningPolicyTrendSnapshotsMock).toHaveBeenCalledWith({
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

    const response = await getHandler(
      new NextRequest('http://localhost/api/ai-paths/portable-engine/trend-snapshots'),
      {} as Parameters<typeof getHandler>[1]
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

    const response = await getHandler(
      new NextRequest('http://localhost/api/ai-paths/portable-engine/trend-snapshots'),
      {} as Parameters<typeof getHandler>[1]
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
});
