import { beforeEach, describe, expect, it, vi } from 'vitest';

const { initializeQueuesMock, getQueueHealthMock, isRedisAvailableMock } = vi.hoisted(() => ({
  initializeQueuesMock: vi.fn(),
  getQueueHealthMock: vi.fn(),
  isRedisAvailableMock: vi.fn(),
}));

vi.mock('@/features/jobs/server', () => ({
  initializeQueues: initializeQueuesMock,
}));

vi.mock('@/features/integrations/server', () => ({}));

vi.mock('@/shared/lib/queue', () => ({
  getQueueHealth: getQueueHealthMock,
  isRedisAvailable: isRedisAvailableMock,
}));

import { GET_handler } from './handler';

describe('base import queue health handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports queue health for the base-import queue', async () => {
    isRedisAvailableMock.mockReturnValue(true);
    getQueueHealthMock.mockResolvedValue({
      'base-import': {
        waitingCount: 2,
        activeCount: 1,
        completedCount: 5,
        failedCount: 0,
        running: true,
        workerState: 'running',
        deliveryMode: 'queue',
        redisAvailable: true,
      },
    });

    const response = await GET_handler({} as never, {} as never);
    const body = await response.json();

    expect(initializeQueuesMock).toHaveBeenCalledTimes(1);
    expect(body).toEqual(
      expect.objectContaining({
        ok: true,
        mode: 'bullmq',
        redisAvailable: true,
        queues: {
          baseImport: expect.objectContaining({
            waitingCount: 2,
            activeCount: 1,
          }),
        },
      })
    );
  });
});
