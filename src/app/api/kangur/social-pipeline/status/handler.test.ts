import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const {
  getKangurSocialPipelineQueueMock,
  getHealthStatusMock,
  getQueueMock,
  isPausedMock,
} = vi.hoisted(() => ({
  getKangurSocialPipelineQueueMock: vi.fn(),
  getHealthStatusMock: vi.fn(),
  getQueueMock: vi.fn(),
  isPausedMock: vi.fn(),
}));

vi.mock('@/features/kangur/workers/kangurSocialPipelineQueue', () => ({
  getKangurSocialPipelineQueue: (...args: unknown[]) =>
    getKangurSocialPipelineQueueMock(...args),
  KANGUR_SOCIAL_PIPELINE_REPEAT_EVERY_MS: 600000,
}));

import { GET_handler } from './handler';

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
    });
    isPausedMock.mockResolvedValue(false);
  });

  it('reports the queue as running while work is actively processing even if the local worker flag is false', async () => {
    const response = await GET_handler(
      new NextRequest('http://localhost/api/kangur/social-pipeline/status'),
      createContext()
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      running: true,
      healthy: true,
      processing: true,
      activeCount: 1,
      waitingCount: 0,
      failedCount: 1,
      completedCount: 46,
      lastPollTime: 0,
      timeSinceLastPoll: 0,
      isPaused: false,
      repeatEveryMs: 600000,
    });
  });
});
