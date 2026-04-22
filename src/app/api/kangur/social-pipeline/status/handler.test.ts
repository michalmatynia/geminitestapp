import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  getKangurSocialPipelineQueueMock,
  getHealthStatusMock,
  getQueueMock,
  getJobsMock,
  isPausedMock,
  isRedisAvailableMock,
  isRedisReachableMock,
  getKangurSocialPipelineWorkerHeartbeatMock,
} = vi.hoisted(() => ({
  getKangurSocialPipelineQueueMock: vi.fn(),
  getHealthStatusMock: vi.fn(),
  getQueueMock: vi.fn(),
  getJobsMock: vi.fn(),
  isPausedMock: vi.fn(),
  isRedisAvailableMock: vi.fn(),
  isRedisReachableMock: vi.fn(),
  getKangurSocialPipelineWorkerHeartbeatMock: vi.fn(),
}));

vi.mock('@/features/kangur/social/workers/kangurSocialPipelineQueue', () => ({
  getKangurSocialPipelineQueue: (...args: unknown[]) =>
    getKangurSocialPipelineQueueMock(...args),
  getKangurSocialPipelineWorkerHeartbeat: (...args: unknown[]) =>
    getKangurSocialPipelineWorkerHeartbeatMock(...args),
  KANGUR_SOCIAL_PIPELINE_REPEAT_EVERY_MS: 600000,
  KANGUR_SOCIAL_PIPELINE_WORKER_HEARTBEAT_TTL_MS: 120000,
}));

vi.mock('@/shared/lib/queue', () => ({
  isRedisAvailable: (...args: unknown[]) => isRedisAvailableMock(...args),
  isRedisReachable: (...args: unknown[]) => isRedisReachableMock(...args),
}));

import { getHandler } from './handler';

const createContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-social-pipeline-status-1',
    traceId: 'trace-social-pipeline-status-1',
    correlationId: 'corr-social-pipeline-status-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

describe('social pipeline status handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getKangurSocialPipelineQueueMock.mockReturnValue({
      getHealthStatus: getHealthStatusMock,
      getQueue: getQueueMock,
    });
    getHealthStatusMock.mockResolvedValue({
      deliveryMode: 'queue',
      workerState: 'running',
      redisAvailable: true,
      workerLocal: false,
      running: false,
      healthy: false,
      processing: true,
      activeCount: 1,
      waitingCount: 0,
      failedCount: 1,
      completedCount: 46,
      lastPollTime: 0,
      timeSinceLastPoll: 0,
    });
    getQueueMock.mockReturnValue({
      isPaused: isPausedMock,
      getJobs: getJobsMock,
    });
    isPausedMock.mockResolvedValue(false);
    getJobsMock.mockResolvedValue([]);
    isRedisAvailableMock.mockReturnValue(true);
    isRedisReachableMock.mockResolvedValue(true);
    getKangurSocialPipelineWorkerHeartbeatMock.mockResolvedValue(null);
  });

  it('reports the queue as running while work is actively processing even if the local worker flag is false', async () => {
    const response = await getHandler(
      new NextRequest('http://localhost/api/kangur/social-pipeline/status'),
      createContext()
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      deliveryMode: 'queue',
      workerState: 'running',
      redisAvailable: true,
      workerLocal: false,
      running: true,
      healthy: true,
      processing: true,
      activeCount: 1,
      waitingCount: 0,
      failedCount: 1,
      completedCount: 46,
      lastPollTime: 0,
      timeSinceLastPoll: 0,
      workerHeartbeatTime: undefined,
      timeSinceWorkerHeartbeat: undefined,
      isPaused: false,
      repeatEveryMs: 600000,
      activeProcessSummary: undefined,
    });
  });

  it('reports a shared redis queue with recent completed work as healthy idle instead of stopped', async () => {
    getHealthStatusMock.mockResolvedValueOnce({
      deliveryMode: 'queue',
      workerState: 'idle',
      redisAvailable: true,
      workerLocal: false,
      running: false,
      healthy: true,
      processing: false,
      activeCount: 0,
      waitingCount: 0,
      failedCount: 0,
      completedCount: 8,
      lastPollTime: 0,
      timeSinceLastPoll: 0,
    });

    const response = await getHandler(
      new NextRequest('http://localhost/api/kangur/social-pipeline/status'),
      createContext()
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      deliveryMode: 'queue',
      workerState: 'idle',
      redisAvailable: true,
      workerLocal: false,
      running: false,
      healthy: true,
      processing: false,
      activeCount: 0,
      waitingCount: 0,
      failedCount: 0,
      completedCount: 8,
      lastPollTime: 0,
      timeSinceLastPoll: 0,
      workerHeartbeatTime: undefined,
      timeSinceWorkerHeartbeat: undefined,
      isPaused: false,
      repeatEveryMs: 600000,
      activeProcessSummary: undefined,
    });
  });

  it('falls back to a redis-unreachable status when queue polling throws', async () => {
    getHealthStatusMock.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));
    isRedisAvailableMock.mockReturnValueOnce(true);
    isRedisReachableMock.mockResolvedValueOnce(false);

    const response = await getHandler(
      new NextRequest('http://localhost/api/kangur/social-pipeline/status'),
      createContext()
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      deliveryMode: 'queue',
      workerState: 'offline',
      statusReason: 'redis_unreachable',
      redisAvailable: false,
      workerLocal: false,
      running: false,
      healthy: false,
      processing: false,
      activeCount: 0,
      waitingCount: 0,
      failedCount: 0,
      completedCount: 0,
      lastPollTime: 0,
      timeSinceLastPoll: 0,
      workerHeartbeatTime: undefined,
      timeSinceWorkerHeartbeat: undefined,
      isPaused: false,
      repeatEveryMs: 600000,
      activeProcessSummary: undefined,
    });
  });

  it('upgrades offline worker state to idle when a fresh shared worker heartbeat exists', async () => {
    const heartbeatAt = Date.now() - 5_000;
    getHealthStatusMock.mockResolvedValueOnce({
      deliveryMode: 'queue',
      workerState: 'offline',
      statusReason: 'worker_inactive',
      redisAvailable: true,
      workerLocal: false,
      running: false,
      healthy: false,
      processing: false,
      activeCount: 0,
      waitingCount: 0,
      failedCount: 0,
      completedCount: 0,
      lastPollTime: 0,
      timeSinceLastPoll: 0,
    });
    getKangurSocialPipelineWorkerHeartbeatMock.mockResolvedValueOnce(heartbeatAt);

    const response = await getHandler(
      new NextRequest('http://localhost/api/kangur/social-pipeline/status'),
      createContext()
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toEqual(
      expect.objectContaining({
        deliveryMode: 'queue',
        workerState: 'idle',
        redisAvailable: true,
        workerLocal: false,
        running: false,
        healthy: true,
        workerHeartbeatTime: heartbeatAt,
        isPaused: false,
        repeatEveryMs: 600000,
      })
    );
    expect(payload.timeSinceWorkerHeartbeat).toBeTypeOf('number');
    expect(payload.timeSinceWorkerHeartbeat).toBeGreaterThanOrEqual(0);
    expect(payload).not.toHaveProperty('statusReason');
  });

  it('includes the first active process label in the status payload when queue work is running', async () => {
    getJobsMock.mockResolvedValueOnce([
      {
        data: {
          type: 'manual-post-visual-analysis',
        },
      },
    ]);

    const response = await getHandler(
      new NextRequest('http://localhost/api/kangur/social-pipeline/status'),
      createContext()
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        activeProcessSummary: {
          label: 'Image analysis',
          additionalRunningCount: 0,
        },
      })
    );
    expect(getJobsMock).toHaveBeenCalledWith(['active'], 0, 4);
  });
});
