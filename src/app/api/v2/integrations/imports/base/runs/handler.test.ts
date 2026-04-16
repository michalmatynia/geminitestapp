import { beforeEach, describe, expect, it, vi } from 'vitest';

const { initializeQueuesMock, listBaseImportRunsMock, startBaseImportRunResponseMock } = vi.hoisted(
  () => ({
    initializeQueuesMock: vi.fn(),
    listBaseImportRunsMock: vi.fn(),
    startBaseImportRunResponseMock: vi.fn(),
  })
);

vi.mock('@/features/jobs/server', () => ({
  initializeQueues: initializeQueuesMock,
}));

vi.mock('@/features/integrations/services/imports/base-import-run-repository', () => ({
  listBaseImportRuns: listBaseImportRunsMock,
}));

vi.mock('@/features/integrations/services/imports/base-import-run-starter', () => ({
  startBaseImportRunResponse: startBaseImportRunResponseMock,
}));

import { GET_handler, POST_handler, listRunsQuerySchema, startRunSchema } from './handler';

describe('base import runs handler module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports the supported handlers and schemas', () => {
    expect(typeof GET_handler).toBe('function');
    expect(typeof POST_handler).toBe('function');
    expect(typeof listRunsQuerySchema.safeParse).toBe('function');
    expect(typeof startRunSchema.safeParse).toBe('function');
  });

  it('initializes queues before starting an import run', async () => {
    startBaseImportRunResponseMock.mockResolvedValue({
      runId: 'run-1',
      status: 'queued',
      queueJobId: 'job-1',
      dispatchMode: 'queued',
      summaryMessage: 'Queued 1 products for import.',
    });

    const response = await POST_handler({} as never, {
      body: {
        connectionId: ' connection-1 ',
        inventoryId: 'inventory-1',
        catalogId: 'catalog-1',
        imageMode: 'download',
        uniqueOnly: true,
        allowDuplicateSku: false,
      },
    } as never);

    expect(initializeQueuesMock).toHaveBeenCalledTimes(1);
    expect(startBaseImportRunResponseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: 'connection-1',
        inventoryId: 'inventory-1',
        catalogId: 'catalog-1',
      })
    );
    expect(response.status).toBe(200);
  });

  it('passes directTarget through when starting an exact import run', async () => {
    startBaseImportRunResponseMock.mockResolvedValue({
      runId: 'run-exact',
      status: 'queued',
      queueJobId: 'job-exact',
      dispatchMode: 'queued',
      summaryMessage: 'Queued exact SKU target FOASW022 for import.',
    });

    await POST_handler({} as never, {
      body: {
        connectionId: 'connection-1',
        inventoryId: 'inventory-1',
        catalogId: 'catalog-1',
        imageMode: 'download',
        uniqueOnly: true,
        allowDuplicateSku: false,
        directTarget: {
          type: 'sku',
          value: 'FOASW022',
        },
      },
    } as never);

    expect(startBaseImportRunResponseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        directTarget: {
          type: 'sku',
          value: 'FOASW022',
        },
      })
    );
  });
});
