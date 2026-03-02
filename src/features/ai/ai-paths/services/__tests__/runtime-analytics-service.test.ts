import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getBrainAssignmentForCapabilityMock,
  getRedisConnectionMock,
  getPathRunRepositoryMock,
} = vi.hoisted(() => ({
  getBrainAssignmentForCapabilityMock: vi.fn(),
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
});
