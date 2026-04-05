import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createManagedQueueMock: vi.fn(),
  getPathRunRepositoryMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  logInfoMock: vi.fn(),
}));

vi.mock('@/shared/lib/queue', () => ({
  createManagedQueue: (...args: unknown[]) => mocks.createManagedQueueMock(...args),
}));

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: (...args: unknown[]) => mocks.getPathRunRepositoryMock(...args),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => mocks.captureExceptionMock(...args),
    logInfo: (...args: unknown[]) => mocks.logInfoMock(...args),
  },
}));

describe('baseExportQueue', () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.createManagedQueueMock.mockReset();
    mocks.getPathRunRepositoryMock.mockReset();
    mocks.captureExceptionMock.mockReset();
    mocks.logInfoMock.mockReset();
    mocks.createManagedQueueMock.mockImplementation((config: unknown) => ({
      startWorker: vi.fn(),
      stopWorker: vi.fn(),
      enqueue: vi.fn(),
      getHealthStatus: vi.fn(),
      processInline: vi.fn(),
      getQueue: vi.fn(),
      __config: config,
    }));
  });

  it('marks the export run failed when the queue worker reports a job failure', async () => {
    const repo = {
      findRunById: vi.fn().mockResolvedValue({
        id: 'run-1',
        status: 'running',
        meta: { source: 'integration_base_export' },
      }),
      updateRunIfStatus: vi.fn().mockResolvedValue({ id: 'run-1', status: 'failed' }),
      createRunEvent: vi.fn().mockResolvedValue(undefined),
    };
    mocks.getPathRunRepositoryMock.mockResolvedValue(repo);

    await import('./baseExportQueue');

    const config = mocks.createManagedQueueMock.mock.calls
      .map((call) => call[0])
      .find((entry) => (entry as { name?: string } | undefined)?.name === 'base-export') as {
      name: string;
      onFailed?: (
        jobId: string,
        error: Error,
        data: {
          productId: string;
          connectionId: string;
          inventoryId: string;
          templateId: string | null;
          imagesOnly: boolean;
          listingId: string | null;
          externalListingId: string | null;
          allowDuplicateSku: boolean;
          exportImagesAsBase64: boolean | null;
          imageBase64Mode: string | null;
          imageTransform: null;
          imageBaseUrl: string;
          requestId: string | null;
          runId: string;
          userId: string | null;
        },
        context?: Record<string, unknown>
      ) => Promise<void>;
    };
    expect(config?.name).toBe('base-export');

    const error = new Error('worker crashed');
    await config.onFailed?.(
      'job-1',
      error,
      {
        productId: 'product-1',
        connectionId: 'connection-1',
        inventoryId: '4069',
        templateId: 'template-1',
        imagesOnly: false,
        listingId: null,
        externalListingId: null,
        allowDuplicateSku: false,
        exportImagesAsBase64: null,
        imageBase64Mode: null,
        imageTransform: null,
        imageBaseUrl: 'http://localhost:3000',
        requestId: null,
        runId: 'run-1',
        userId: 'user-1',
      },
      { attemptsMade: 2, maxAttempts: 2 }
    );

    expect(mocks.captureExceptionMock).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        service: 'base-export-queue',
        runId: 'run-1',
        jobId: 'job-1',
      })
    );
    expect(repo.updateRunIfStatus).toHaveBeenCalledWith(
      'run-1',
      ['queued', 'running'],
      expect.objectContaining({
        status: 'failed',
        errorMessage: 'worker crashed',
      })
    );
    expect(repo.createRunEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-1',
        level: 'error',
        message: 'Export failed: worker crashed',
      })
    );
  });
});
