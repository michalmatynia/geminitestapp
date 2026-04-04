import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  parseJsonBodyMock: vi.fn(),
  enqueueBaseExportJobMock: vi.fn(),
  loadExportResourcesMock: vi.fn(),
  createExportRunMock: vi.fn(),
  recoverStaleBaseExportRunsMock: vi.fn(),
  getPathRunRepositoryMock: vi.fn(),
  isRedisAvailableMock: vi.fn(),
  isRedisReachableMock: vi.fn(),
  initializeQueuesMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  LogCapture: class {
    start(): void {}
    stop(): void {}
    getLogs(): unknown[] {
      return [];
    }
  },
}));

vi.mock('@/features/integrations/workers/baseExportQueue', () => ({
  enqueueBaseExportJob: (...args: unknown[]) => mocks.enqueueBaseExportJobMock(...args),
}));

vi.mock('@/features/integrations/services/base-export-run-recovery', () => ({
  recoverStaleBaseExportRuns: (...args: unknown[]) => mocks.recoverStaleBaseExportRunsMock(...args),
}));

vi.mock('@/features/products/server', () => ({
  parseJsonBody: (...args: unknown[]) => mocks.parseJsonBodyMock(...args),
}));

vi.mock('@/shared/lib/queue', () => ({
  isRedisAvailable: (...args: unknown[]) => mocks.isRedisAvailableMock(...args),
  isRedisReachable: (...args: unknown[]) => mocks.isRedisReachableMock(...args),
}));

vi.mock('@/features/jobs/server', () => ({
  initializeQueues: (...args: unknown[]) => mocks.initializeQueuesMock(...args),
}));

vi.mock('./segments', () => ({
  loadExportResources: (...args: unknown[]) => mocks.loadExportResourcesMock(...args),
  createExportRun: (...args: unknown[]) => mocks.createExportRunMock(...args),
}));

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: (...args: unknown[]) => mocks.getPathRunRepositoryMock(...args),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => mocks.captureExceptionMock(...args),
  },
}));

import { postExportToBaseHandler } from './handler';

const makeRequest = () =>
  new NextRequest('http://localhost/api/v2/integrations/products/product-1/export-to-base', {
    method: 'POST',
  });

describe('integration product export-to-base handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        connectionId: 'connection-1',
        inventoryId: '4069',
        templateId: 'template-1',
        imagesOnly: false,
      },
    });
    mocks.loadExportResourcesMock.mockResolvedValue({
      product: { id: 'product-1' },
      connection: { id: 'connection-1' },
      session: { user: { id: 'user-1' } },
    });
    mocks.createExportRunMock.mockResolvedValue({
      run: { id: 'run-1' },
      runRepository: {
        createRunEvent: vi.fn(),
        updateRun: vi.fn(),
        updateRunIfStatus: vi.fn(),
      },
    });
    mocks.recoverStaleBaseExportRunsMock.mockResolvedValue(0);
    mocks.enqueueBaseExportJobMock.mockResolvedValue('job-1');
    mocks.getPathRunRepositoryMock.mockResolvedValue({
      createRunEvent: vi.fn().mockResolvedValue(undefined),
      updateRun: vi.fn().mockResolvedValue(undefined),
    });
    mocks.isRedisAvailableMock.mockReturnValue(false);
    mocks.isRedisReachableMock.mockResolvedValue(false);
    mocks.initializeQueuesMock.mockReturnValue(undefined);
  });

  it('fails fast when Redis is configured but unreachable', async () => {
    mocks.isRedisAvailableMock.mockReturnValue(true);
    mocks.isRedisReachableMock.mockResolvedValue(false);

    await expect(
      postExportToBaseHandler(makeRequest(), {} as never, { id: 'product-1' })
    ).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      httpStatus: 503,
      message:
        'Base.com export queue is unavailable because Redis is unreachable. Start Redis and retry.',
    });

    expect(mocks.loadExportResourcesMock).not.toHaveBeenCalled();
    expect(mocks.createExportRunMock).not.toHaveBeenCalled();
    expect(mocks.enqueueBaseExportJobMock).not.toHaveBeenCalled();
    expect(mocks.initializeQueuesMock).toHaveBeenCalledTimes(1);
  });

  it('creates a run without marking it started before queue dispatch', async () => {
    const runRepository = {
      createRunEvent: vi.fn(),
      updateRun: vi.fn(),
      updateRunIfStatus: vi.fn(),
    };
    mocks.createExportRunMock.mockResolvedValue({
      run: { id: 'run-1' },
      runRepository,
    });

    const response = await postExportToBaseHandler(makeRequest(), {} as never, { id: 'product-1' });
    const payload = await response.json();

    expect(payload).toMatchObject({
      success: true,
      status: 'queued',
      runId: 'run-1',
      jobId: 'job-1',
    });
    expect(mocks.initializeQueuesMock).toHaveBeenCalledTimes(1);
    expect(mocks.enqueueBaseExportJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'product-1',
        connectionId: 'connection-1',
        inventoryId: '4069',
        runId: 'run-1',
        userId: 'user-1',
      })
    );
    expect(mocks.recoverStaleBaseExportRunsMock).toHaveBeenCalledWith({
      userId: 'user-1',
      productId: 'product-1',
      connectionId: 'connection-1',
    });
    expect(runRepository.createRunEvent).not.toHaveBeenCalled();
    expect(runRepository.updateRun).not.toHaveBeenCalled();
    expect(runRepository.updateRunIfStatus).not.toHaveBeenCalled();
  });
});
