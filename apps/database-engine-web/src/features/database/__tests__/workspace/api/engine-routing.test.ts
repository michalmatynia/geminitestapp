/**
 * @vitest-environment node
 */

import { NextRequest } from 'next/server';
import { vi } from 'vitest';
import { ObjectId } from 'mongodb';

import { POST as POST_CRUD } from '@/features/database/server/api/crud/route-handler';
import { POST as POST_EXECUTE } from '@/features/database/server/api/execute/route-handler';
import { assertDatabaseEngineManageAccess } from '@/features/database/server';
import { getMongoClient } from '@/shared/lib/db/mongo-client';
import { createManagedMongoClient } from '@/shared/lib/db/services/managed-mongo-databases';

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoClient: vi.fn(),
}));

vi.mock('@/shared/lib/db/services/managed-mongo-databases', () => ({
  createManagedMongoClient: vi.fn(),
}));

vi.mock('@/features/database/server', () => ({
  assertDatabaseEngineManageAccess: vi.fn(),
}));

describe('Database Engine routing in database operations APIs', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(assertDatabaseEngineManageAccess).mockResolvedValue(undefined);
  });

  it('accepts CRUD auto mode and executes against the Mongo collection directly', async () => {
    const insertOne = vi.fn().mockResolvedValue({
      acknowledged: true,
      insertedId: 'mongo-id-1',
    });
    const collection = vi.fn().mockReturnValue({ insertOne });
    const db = vi.fn().mockReturnValue({ collection });
    vi.mocked(getMongoClient).mockResolvedValue({ db } as unknown as Awaited<
      ReturnType<typeof getMongoClient>
    >);

    const res = await POST_CRUD(
      new NextRequest('http://localhost/api/databases/crud', {
        method: 'POST',
        body: JSON.stringify({
          table: 'products',
          operation: 'insert',
          type: 'auto',
          data: { sku: 'SKU-1' },
        }),
      })
    );

    const payload = await res.json();
    const expectedDbName = process.env['MONGODB_DB'] ?? 'stardb';
    expect(res.status).toBe(200);
    expect(payload).toMatchObject({ success: true, rowCount: 1 });
    expect(db).toHaveBeenCalledWith(expectedDbName);
    expect(collection).toHaveBeenCalledWith('products');
    expect(insertOne).toHaveBeenCalledWith({ sku: 'SKU-1' });
  });

  it('updates Mongo documents by explicit _id and strips immutable primary key fields', async () => {
    const updateOne = vi.fn().mockResolvedValue({
      acknowledged: true,
      modifiedCount: 1,
    });
    const collection = vi.fn().mockReturnValue({ updateOne });
    const db = vi.fn().mockReturnValue({ collection });
    vi.mocked(getMongoClient).mockResolvedValue({ db } as unknown as Awaited<
      ReturnType<typeof getMongoClient>
    >);

    const res = await POST_CRUD(
      new NextRequest('http://localhost/api/databases/crud', {
        method: 'POST',
        body: JSON.stringify({
          table: 'products',
          operation: 'update',
          type: 'auto',
          primaryKey: { _id: 'product-id-1' },
          data: {
            _id: 'product-id-1',
            sku: 'SKU-2',
            ownerId: { $oid: '0123456789abcdef01234567' },
            updatedAt: { $date: '2026-05-07T16:00:00.000Z' },
          },
        }),
      })
    );

    const payload = await res.json();
    expect(res.status).toBe(200);
    expect(payload).toMatchObject({ success: true, rowCount: 1 });
    const updateCall = updateOne.mock.calls[0];
    expect(updateCall?.[0]).toEqual({ _id: 'product-id-1' });
    expect(updateCall?.[1]).toMatchObject({
      $set: { sku: 'SKU-2' },
    });
    const updateSet = updateCall?.[1]?.$set as Record<string, unknown>;
    expect(updateSet['_id']).toBeUndefined();
    expect(updateSet['ownerId']).toBeInstanceOf(ObjectId);
    expect(updateSet['updatedAt']).toBeInstanceOf(Date);
  });

  it('routes managed local CRUD to the selected application database and supports Mongo collection names', async () => {
    const insertOne = vi.fn().mockResolvedValue({
      acknowledged: true,
      insertedId: 'mongo-id-1',
    });
    const close = vi.fn().mockResolvedValue(undefined);
    const collection = vi.fn().mockReturnValue({ insertOne });
    vi.mocked(createManagedMongoClient).mockResolvedValue({
      client: { close },
      db: { collection },
      dbName: 'ecom_local',
      config: {
        source: 'local',
        configured: true,
        uri: 'mongodb://localhost:27021/ecom_local',
        dbName: 'ecom_local',
        usesLegacyEnv: false,
      },
    } as unknown as Awaited<ReturnType<typeof createManagedMongoClient>>);

    const res = await POST_CRUD(
      new NextRequest('http://localhost/api/databases/crud', {
        method: 'POST',
        body: JSON.stringify({
          table: 'product-listings.history',
          operation: 'insert',
          type: 'mongodb',
          application: 'products',
          source: 'local',
          data: { sku: 'SKU-1' },
        }),
      })
    );

    const payload = await res.json();
    expect(res.status).toBe(200);
    expect(payload).toMatchObject({ success: true, rowCount: 1 });
    expect(createManagedMongoClient).toHaveBeenCalledWith('products', 'local');
    expect(collection).toHaveBeenCalledWith('product-listings.history');
    expect(insertOne).toHaveBeenCalledWith({ sku: 'SKU-1' });
    expect(close).toHaveBeenCalled();
    expect(getMongoClient).not.toHaveBeenCalled();
  });

  it('accepts Execute auto mode and performs the Mongo operation directly', async () => {
    const toArray = vi.fn().mockResolvedValue([{ _id: 'id-1', sku: 'SKU-1' }]);
    const limit = vi.fn().mockReturnValue({ toArray });
    const skip = vi.fn().mockReturnValue({ limit });
    const sort = vi.fn().mockReturnValue({ skip });
    const find = vi.fn().mockReturnValue({ sort });
    const countDocuments = vi.fn().mockResolvedValue(1);
    const collection = vi.fn().mockReturnValue({ countDocuments, find });
    const db = vi.fn().mockReturnValue({ collection });
    vi.mocked(getMongoClient).mockResolvedValue({ db } as unknown as Awaited<
      ReturnType<typeof getMongoClient>
    >);

    const res = await POST_EXECUTE(
      new NextRequest('http://localhost/api/databases/execute', {
        method: 'POST',
        body: JSON.stringify({
          type: 'auto',
          collection: 'products',
          operation: 'find',
          filter: { sku: 'SKU-1' },
        }),
      })
    );

    const payload = await res.json();
    const expectedDbName = process.env['MONGODB_DB'] ?? 'stardb';
    expect(res.status).toBe(200);
    expect(payload).toMatchObject({
      command: 'find',
      rowCount: 1,
      rows: [{ _id: 'id-1', sku: 'SKU-1' }],
    });
    expect(db).toHaveBeenCalledWith(expectedDbName);
    expect(collection).toHaveBeenCalledWith('products');
    expect(find).toHaveBeenCalledWith({ sku: 'SKU-1' });
    expect(sort).toHaveBeenCalledWith({ _id: 1 });
    expect(skip).toHaveBeenCalledWith(0);
    expect(limit.mock.calls[0]?.[0]).toBe(200);
    expect(countDocuments).toHaveBeenCalledWith({ sku: 'SKU-1' });
  });
});
