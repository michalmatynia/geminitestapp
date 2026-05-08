import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertDatabaseEngineManageAccess: vi.fn(),
  close: vi.fn(),
  collection: vi.fn(),
  createManagedMongoClient: vi.fn(),
  getMongoClient: vi.fn(),
  insertOne: vi.fn(),
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

describe('databases crud handler', () => {
  const mockContext = { source: 'test' } as never;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.insertOne.mockResolvedValue({
      acknowledged: true,
      insertedId: 'inserted-id',
    });
    mocks.collection.mockReturnValue({
      insertOne: mocks.insertOne,
    });
    mocks.createManagedMongoClient.mockResolvedValue({
      client: { close: mocks.close },
      dbName: 'products_cloud',
      db: { collection: mocks.collection },
    });
    mocks.close.mockResolvedValue(undefined);
  });

  it('routes managed CRUD writes to the requested application source', async () => {
    const response = await postHandler(
      new NextRequest('http://localhost/api/databases/crud', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          table: 'products',
          operation: 'insert',
          type: 'mongodb',
          application: 'products',
          source: 'cloud',
          data: { name: 'Widget' },
        }),
      }),
      mockContext
    );

    await expect(response.json()).resolves.toMatchObject({
      success: true,
      rowCount: 1,
    });
    expect(mocks.assertDatabaseEngineManageAccess).toHaveBeenCalled();
    expect(mocks.createManagedMongoClient).toHaveBeenCalledWith('products', 'cloud');
    expect(mocks.collection).toHaveBeenCalledWith('products');
    expect(mocks.insertOne).toHaveBeenCalledWith({ name: 'Widget' });
    expect(mocks.getMongoClient).not.toHaveBeenCalled();
    expect(mocks.close).toHaveBeenCalled();
  });
});
