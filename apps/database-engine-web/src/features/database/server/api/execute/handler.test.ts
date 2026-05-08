import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertDatabaseEngineManageAccess: vi.fn(),
  close: vi.fn(),
  collection: vi.fn(),
  countDocuments: vi.fn(),
  createManagedMongoClient: vi.fn(),
  find: vi.fn(),
  getMongoClient: vi.fn(),
}));

vi.mock('@/features/database/server', () => ({
  assertDatabaseEngineManageAccess: mocks.assertDatabaseEngineManageAccess,
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoClient: mocks.getMongoClient,
}));

vi.mock('@/shared/lib/db/services/managed-mongo-databases', () => ({
  createManagedMongoClient: mocks.createManagedMongoClient,
}));

import { postHandler } from './handler';

describe('databases execute handler', () => {
  const mockContext = { source: 'test' } as never;

  beforeEach(() => {
    vi.clearAllMocks();
    const cursor = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([{ _id: '1', status: 'open' }]),
    };
    mocks.find.mockReturnValue(cursor);
    mocks.countDocuments.mockResolvedValue(1);
    mocks.collection.mockReturnValue({
      countDocuments: mocks.countDocuments,
      find: mocks.find,
    });
    mocks.createManagedMongoClient.mockResolvedValue({
      client: { close: mocks.close },
      dbName: 'cms_cloud',
      db: { collection: mocks.collection },
    });
    mocks.close.mockResolvedValue(undefined);
  });

  it('routes managed Mongo commands to the requested application source', async () => {
    const response = await postHandler(
      new NextRequest('http://localhost/api/databases/execute', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          collection: 'pages',
          operation: 'find',
          type: 'mongodb',
          application: 'cms-builder',
          source: 'cloud',
          filter: { status: 'open' },
          limit: 25,
        }),
      }),
      mockContext
    );

    await expect(response.json()).resolves.toMatchObject({
      command: 'find',
      rowCount: 1,
      rows: [{ _id: '1', status: 'open' }],
    });
    expect(mocks.assertDatabaseEngineManageAccess).toHaveBeenCalled();
    expect(mocks.createManagedMongoClient).toHaveBeenCalledWith('cms-builder', 'cloud');
    expect(mocks.collection).toHaveBeenCalledWith('pages');
    expect(mocks.find).toHaveBeenCalledWith({ status: 'open' });
    expect(mocks.countDocuments).toHaveBeenCalledWith({ status: 'open' });
    expect(mocks.getMongoClient).not.toHaveBeenCalled();
    expect(mocks.close).toHaveBeenCalled();
  });
});
