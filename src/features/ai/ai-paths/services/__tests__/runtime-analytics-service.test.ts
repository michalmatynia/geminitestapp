import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getBrainAssignmentForCapabilityMock,
  getPortablePathRunExecutionSnapshotMock,
  getRedisConnectionMock,
  getPathRunRepositoryMock,
} = vi.hoisted(() => ({
  getBrainAssignmentForCapabilityMock: vi.fn(),
  getPortablePathRunExecutionSnapshotMock: vi.fn(),
  getRedisConnectionMock: vi.fn(),
  getPathRunRepositoryMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  getBrainAssignmentForCapability: getBrainAssignmentForCapabilityMock,
}));

vi.mock('@/shared/lib/queue', () => ({
  getRedisConnection: getRedisConnectionMock,
}));

vi.mock('@/features/ai/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: getPathRunRepositoryMock,
}));

vi.mock('@/shared/lib/ai-paths/portable-engine', () => ({
  getPortablePathRunExecutionSnapshot: getPortablePathRunExecutionSnapshotMock,
}));

const buildPipelineResults = (): Array<[null, number | string[]]> => [
  [null, 8],
  [null, 2],
  [null, 3],
  [null, 5],
  [null, 1],
  [null, 0],
  [null, 0],
  [null, 6],
  [null, 5],
  [null, 1],
  [null, 2],
  [null, 0],
  [null, 0],
  [null, 1],
  [null, 0],
  [null, 4],
  [null, 2],
  [null, 6],
  [null, 1],
  [null, 1],
  [null, ['1709251200000|1200|run-1|a', '1709251201000|2400|run-2|b']],
];

const createRedisMock = () => {
  const pipeline = {
    zcount: vi.fn().mockReturnThis(),
    zrangebyscore: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(buildPipelineResults()),
  };
  return {
    redis: {
      pipeline: vi.fn(() => pipeline),
    },
    pipeline,
  };
};

const createRecordingRedisMock = () => {
  const multi = {
    zadd: vi.fn().mockReturnThis(),
    zremrangebyscore: vi.fn().mockReturnThis(),
    hincrby: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
  };
  return {
    redis: {
      multi: vi.fn(() => multi),
    },
    multi,
  };
};

const buildPortableRunSnapshot = () => ({
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

const mockCapabilities = (runtimeAnalyticsEnabled: boolean, aiPathsEnabled: boolean): void => {
  getBrainAssignmentForCapabilityMock.mockImplementation(async (capability: string) => ({
    enabled:
      capability === 'insights.runtime_analytics'
        ? runtimeAnalyticsEnabled
        : capability === 'ai_paths.model'
          ? aiPathsEnabled
          : false,
  }));
};

const loadModule = async () =>
  await import('@/features/ai/ai-paths/services/runtime-analytics-service');

describe('runtime analytics service', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getPortablePathRunExecutionSnapshotMock.mockReturnValue(buildPortableRunSnapshot());
  });

  it('returns disabled storage without touching Redis or trace sampling when the gate is off', async () => {
    mockCapabilities(false, true);

    const { getRuntimeAnalyticsSummary } = await loadModule();
    const summary = await getRuntimeAnalyticsSummary({
      from: new Date('2026-03-01T00:00:00.000Z'),
      to: new Date('2026-03-02T00:00:00.000Z'),
      range: '24h',
    });

    expect(summary.storage).toBe('disabled');
    expect(summary.traces.source).toBe('none');
    expect(summary.portableEngine?.source).toBe('in_memory');
    expect(getRedisConnectionMock).not.toHaveBeenCalled();
    expect(getPathRunRepositoryMock).not.toHaveBeenCalled();
  });

  it('skips trace sampling when includeTraces is false', async () => {
    mockCapabilities(true, true);
    const { redis, pipeline } = createRedisMock();
    const listRunsMock = vi.fn();

    getRedisConnectionMock.mockReturnValue(redis);
    getPathRunRepositoryMock.mockResolvedValue({
      listRuns: listRunsMock,
    });

    const { getRuntimeAnalyticsSummary } = await loadModule();
    const summary = await getRuntimeAnalyticsSummary({
      from: new Date('2026-03-01T00:00:00.000Z'),
      to: new Date('2026-03-02T00:00:00.000Z'),
      range: '24h',
      includeTraces: false,
    });

    expect(summary.storage).toBe('redis');
    expect(summary.runs.total).toBe(8);
    expect(summary.runs.avgDurationMs).toBe(1800);
    expect(summary.runs.p95DurationMs).toBe(2400);
    expect(summary.traces.source).toBe('none');
    expect(summary.portableEngine?.totals.attempts).toBe(0);
    expect(redis.pipeline).toHaveBeenCalledTimes(1);
    expect(pipeline.exec).toHaveBeenCalledTimes(1);
    expect(getPathRunRepositoryMock).not.toHaveBeenCalled();
    expect(listRunsMock).not.toHaveBeenCalled();
  });

  it('includes trace sampling by default for the runtime analytics summary route', async () => {
    mockCapabilities(true, true);
    const { redis } = createRedisMock();
    const listRunsMock = vi.fn().mockResolvedValue({
      runs: [
        {
          id: 'run-1',
          meta: {
            runtimeTrace: {
              profile: {
                nodeSpans: [
                  {
                    spanId: 'span-1',
                    nodeId: 'node-1',
                    nodeType: 'model',
                    status: 'completed',
                    durationMs: 1800,
                  },
                ],
              },
            },
          },
        },
      ],
      total: 1,
    });

    getRedisConnectionMock.mockReturnValue(redis);
    getPathRunRepositoryMock.mockResolvedValue({
      listRuns: listRunsMock,
    });

    const { getRuntimeAnalyticsSummary } = await loadModule();
    const summary = await getRuntimeAnalyticsSummary({
      from: new Date('2026-03-01T00:00:00.000Z'),
      to: new Date('2026-03-02T00:00:00.000Z'),
      range: '24h',
    });

    expect(listRunsMock).toHaveBeenCalledTimes(1);
    expect(listRunsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        includeTotal: false,
        limit: 100,
        statuses: ['completed', 'failed', 'canceled', 'dead_lettered'],
      })
    );
    expect(summary.traces.source).toBe('db_sample');
    expect(summary.traces.sampledRuns).toBe(1);
    expect(summary.traces.sampledSpans).toBe(1);
    expect(summary.traces.avgDurationMs).toBe(1800);
  });

  it('aggregates runtime kernel parity telemetry from run trace meta', async () => {
    mockCapabilities(true, true);
    const { redis } = createRedisMock();
    const listRunsMock = vi.fn().mockResolvedValue({
      runs: [
        {
          id: 'run-1',
          meta: {
            runtimeTrace: {
              profile: {
                nodeSpans: [],
              },
              kernelParity: {
                sampledHistoryEntries: 3,
                strategyCounts: {
                  compatibility: 2,
                  code_object_v3: 1,
                  unknown: 0,
                },
                resolutionSourceCounts: {
                  override: 1,
                  registry: 2,
                  missing: 0,
                  unknown: 0,
                },
                codeObjectIds: ['ai-paths.node-code-object.constant.v3'],
              },
            },
          },
        },
        {
          id: 'run-2',
          meta: {
            runtimeTrace: {
              profile: {
                nodeSpans: [],
              },
              kernelParity: {
                sampledHistoryEntries: 2,
                strategyCounts: {
                  compatibility: 0,
                  code_object_v3: 2,
                  unknown: 0,
                },
                resolutionSourceCounts: {
                  override: 2,
                  registry: 0,
                  missing: 0,
                  unknown: 0,
                },
                codeObjectIds: ['ai-paths.node-code-object.template.v3'],
              },
            },
          },
        },
        {
          id: 'run-3',
          meta: {
            runtimeTrace: {
              profile: {
                nodeSpans: [],
              },
            },
          },
        },
      ],
      total: 3,
    });

    getRedisConnectionMock.mockReturnValue(redis);
    getPathRunRepositoryMock.mockResolvedValue({
      listRuns: listRunsMock,
    });

    const { getRuntimeAnalyticsSummary } = await loadModule();
    const summary = await getRuntimeAnalyticsSummary({
      from: new Date('2026-03-01T00:00:00.000Z'),
      to: new Date('2026-03-02T00:00:00.000Z'),
      range: '24h',
    });

    expect(summary.traces.kernelParity).toEqual({
      sampledRuns: 3,
      runsWithKernelParity: 2,
      sampledHistoryEntries: 5,
      strategyCounts: {
        compatibility: 2,
        code_object_v3: 3,
        unknown: 0,
      },
      resolutionSourceCounts: {
        override: 3,
        registry: 2,
        missing: 0,
        unknown: 0,
      },
      codeObjectIds: [
        'ai-paths.node-code-object.constant.v3',
        'ai-paths.node-code-object.template.v3',
      ],
    });
  });

  it('includes portable engine runtime analytics snapshot details', async () => {
    mockCapabilities(true, true);
    const { redis } = createRedisMock();
    getRedisConnectionMock.mockReturnValue(redis);
    getPathRunRepositoryMock.mockResolvedValue({
      listRuns: vi.fn().mockResolvedValue({ runs: [], total: 0 }),
    });
    getPortablePathRunExecutionSnapshotMock.mockReturnValue({
      totals: {
        attempts: 5,
        successes: 3,
        failures: 2,
      },
      byRunner: {
        client: { attempts: 4, successes: 3, failures: 1 },
        server: { attempts: 1, successes: 0, failures: 1 },
      },
      bySurface: {
        canvas: { attempts: 2, successes: 1, failures: 1 },
        product: { attempts: 2, successes: 2, failures: 0 },
        api: { attempts: 1, successes: 0, failures: 1 },
      },
      bySource: {
        portable_package: { attempts: 1, successes: 1, failures: 0 },
        portable_envelope: { attempts: 1, successes: 0, failures: 1 },
        semantic_canvas: { attempts: 1, successes: 1, failures: 0 },
        path_config: { attempts: 2, successes: 1, failures: 1 },
      },
      failureStageCounts: {
        resolve: 1,
        validation: 0,
        runtime: 1,
      },
      recentEvents: [
        {
          at: '2026-03-05T10:00:00.000Z',
          runner: 'client',
          surface: 'canvas',
          source: 'path_config',
          validateBeforeRun: true,
          validationMode: 'strict',
          durationMs: 231,
          outcome: 'failure',
          failureStage: 'runtime',
          error: 'model request failed',
        },
        {
          at: '2026-03-05T09:59:00.000Z',
          runner: 'server',
          surface: 'api',
          source: null,
          validateBeforeRun: true,
          validationMode: 'strict',
          durationMs: 10,
          outcome: 'failure',
          failureStage: 'resolve',
          error: 'Invalid AI-Path payload',
        },
      ],
    });

    const { getRuntimeAnalyticsSummary } = await loadModule();
    const summary = await getRuntimeAnalyticsSummary({
      from: new Date('2026-03-01T00:00:00.000Z'),
      to: new Date('2026-03-02T00:00:00.000Z'),
      range: '24h',
      includeTraces: false,
    });

    expect(summary.portableEngine).toEqual({
      source: 'in_memory',
      totals: {
        attempts: 5,
        successes: 3,
        failures: 2,
        successRate: 60,
        failureRate: 40,
      },
      byRunner: {
        client: { attempts: 4, successes: 3, failures: 1 },
        server: { attempts: 1, successes: 0, failures: 1 },
      },
      bySurface: {
        canvas: { attempts: 2, successes: 1, failures: 1 },
        product: { attempts: 2, successes: 2, failures: 0 },
        api: { attempts: 1, successes: 0, failures: 1 },
      },
      byInputSource: {
        portable_package: { attempts: 1, successes: 1, failures: 0 },
        portable_envelope: { attempts: 1, successes: 0, failures: 1 },
        semantic_canvas: { attempts: 1, successes: 1, failures: 0 },
        path_config: { attempts: 2, successes: 1, failures: 1 },
      },
      failureStageCounts: {
        resolve: 1,
        validation: 0,
        runtime: 1,
      },
      recentFailures: [
        {
          at: '2026-03-05T09:59:00.000Z',
          runner: 'server',
          surface: 'api',
          source: null,
          stage: 'resolve',
          error: 'Invalid AI-Path payload',
          durationMs: 10,
          validateBeforeRun: true,
          validationMode: 'strict',
        },
        {
          at: '2026-03-05T10:00:00.000Z',
          runner: 'client',
          surface: 'canvas',
          source: 'path_config',
          stage: 'runtime',
          error: 'model request failed',
          durationMs: 231,
          validateBeforeRun: true,
          validationMode: 'strict',
        },
      ],
    });
  });

  it('falls back to unavailable portable engine analytics when snapshot lookup fails', async () => {
    mockCapabilities(true, true);
    const { redis } = createRedisMock();
    getRedisConnectionMock.mockReturnValue(redis);
    getPathRunRepositoryMock.mockResolvedValue({
      listRuns: vi.fn().mockResolvedValue({ runs: [], total: 0 }),
    });
    getPortablePathRunExecutionSnapshotMock.mockImplementation(() => {
      throw new Error('snapshot unavailable');
    });

    const { getRuntimeAnalyticsSummary } = await loadModule();
    const summary = await getRuntimeAnalyticsSummary({
      from: new Date('2026-03-01T00:00:00.000Z'),
      to: new Date('2026-03-02T00:00:00.000Z'),
      range: '24h',
      includeTraces: false,
    });

    expect(summary.portableEngine).toEqual({
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
      recentFailures: [],
    });
  });

  it('maps failed brain insight status to error counters', async () => {
    const { redis, multi } = createRecordingRedisMock();
    getRedisConnectionMock.mockReturnValue(redis);

    const { recordBrainInsightAnalytics } = await loadModule();
    await recordBrainInsightAnalytics({
      type: 'analytics',
      status: 'failed',
      timestamp: '2026-03-06T00:00:00.000Z',
    });

    const incrementedFields = multi.hincrby.mock.calls.map((call) => call[1]);
    expect(incrementedFields).toContain('brain_analytics_reports');
    expect(incrementedFields).toContain('brain_reports_total');
    expect(incrementedFields).toContain('brain_error_reports');
    expect(incrementedFields).not.toContain('brain_warning_reports');
  });

  it('maps completed brain insight status to success-only counters', async () => {
    const { redis, multi } = createRecordingRedisMock();
    getRedisConnectionMock.mockReturnValue(redis);

    const { recordBrainInsightAnalytics } = await loadModule();
    await recordBrainInsightAnalytics({
      type: 'analytics',
      status: 'completed',
      timestamp: '2026-03-06T00:00:00.000Z',
    });

    const incrementedFields = multi.hincrby.mock.calls.map((call) => call[1]);
    expect(incrementedFields).toContain('brain_analytics_reports');
    expect(incrementedFields).toContain('brain_reports_total');
    expect(incrementedFields).not.toContain('brain_error_reports');
    expect(incrementedFields).not.toContain('brain_warning_reports');
  });
});
