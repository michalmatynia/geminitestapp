import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getMongoDbMock, captureExceptionMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: (...args: unknown[]) => getMongoDbMock(...args),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => captureExceptionMock(...args),
  },
}));

type IndexDoc = {
  name: string;
};

const createFindCursorMock = (docs: unknown[]) => ({
  sort: vi.fn(() => ({
    limit: vi.fn(() => ({
      toArray: vi.fn().mockResolvedValue(docs),
    })),
  })),
});

describe('product-scans-repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env['MONGODB_URI'] = 'mongodb://example.test/product-scans';
  });

  afterEach(() => {
    delete process.env['MONGODB_URI'];
  });

  it('replaces the legacy engineRunId sparse index with a partial unique string index', async () => {
    const indexesMock = vi.fn<() => Promise<IndexDoc[]>>().mockResolvedValue([
      { name: '_id_' },
      { name: 'engineRunId_1' },
    ]);
    const dropIndexMock = vi.fn().mockResolvedValue(undefined);
    const createIndexMock = vi.fn().mockResolvedValue(undefined);
    const findMock = vi.fn(() => createFindCursorMock([]));

    getMongoDbMock.mockResolvedValue({
      collection: vi.fn(() => ({
        indexes: indexesMock,
        dropIndex: dropIndexMock,
        createIndex: createIndexMock,
        find: findMock,
      })),
    });

    const { listProductScans } = await import('./product-scans-repository');

    await expect(listProductScans({ limit: 5 })).resolves.toEqual([]);

    expect(indexesMock).toHaveBeenCalledTimes(1);
    expect(dropIndexMock).toHaveBeenCalledWith('engineRunId_1');
    expect(createIndexMock).toHaveBeenCalledWith(
      { engineRunId: 1 },
      {
        name: 'product_scans_engineRunId_unique',
        unique: true,
        partialFilterExpression: { engineRunId: { $type: 'string' } },
      }
    );
    expect(createIndexMock).not.toHaveBeenCalledWith(
      { engineRunId: 1 },
      expect.objectContaining({ sparse: true })
    );
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });
});
