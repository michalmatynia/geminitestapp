/**
 * @vitest-environment node
 */

import { NextRequest } from 'next/server';
import { Mock, vi } from 'vitest';

import { POST as POST_CRUD } from '@/app/api/databases/crud/route';
import { POST as POST_EXECUTE } from '@/app/api/databases/execute/route';
import { resolveCollectionProviderForRequest } from '@/shared/lib/db/collection-provider-map';
import { getMongoClient } from '@/shared/lib/db/mongo-client';

vi.mock('@/shared/lib/db/collection-provider-map', () => ({
  resolveCollectionProviderForRequest: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoClient: vi.fn(),
}));

describe('Database Engine routing in database operations APIs', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('routes CRUD auto mode through collection provider map', async () => {
    vi.mocked(resolveCollectionProviderForRequest).mockResolvedValue('mongodb');

    const insertOne = vi.fn().mockResolvedValue({
      acknowledged: true,
      insertedId: 'mongo-id-1',
    });
    const collection = vi.fn().mockReturnValue({ insertOne });
    const db = vi.fn().mockReturnValue({ collection });
    vi.mocked(getMongoClient).mockResolvedValue({ db } as unknown as Awaited<ReturnType<typeof getMongoClient>>);

    const res = await POST_CRUD(
      new NextRequest('http://localhost/api/databases/crud', {
        method: 'POST',
        body: JSON.stringify({
          table: 'products',
          operation: 'insert',
          data: { sku: 'SKU-1' },
        }),
      })
    );

    const payload = await res.json();
    expect(res.status).toBe(200);
    expect(payload).toMatchObject({ success: true, rowCount: 1 });
    expect(resolveCollectionProviderForRequest).toHaveBeenCalledWith('products', 'auto');
    expect(insertOne).toHaveBeenCalledWith({ sku: 'SKU-1' });
  });

  it('routes Execute auto mode through collection provider map for Mongo operations', async () => {
    vi.mocked(resolveCollectionProviderForRequest).mockResolvedValue('mongodb');

    const toArray = vi.fn().mockResolvedValue([{ _id: 'id-1', sku: 'SKU-1' }]);
    const limit = vi.fn().mockReturnValue({ toArray });
    const find = vi.fn().mockReturnValue({ limit });
    const collection = vi.fn().mockReturnValue({ find });
    const db = vi.fn().mockReturnValue({ collection });
    vi.mocked(getMongoClient).mockResolvedValue({ db } as unknown as Awaited<ReturnType<typeof getMongoClient>>);

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
    expect(res.status).toBe(200);
    expect(payload).toMatchObject({
      command: 'find',
      rowCount: 1,
      rows: [{ _id: 'id-1', sku: 'SKU-1' }],
    });
    expect(resolveCollectionProviderForRequest).toHaveBeenCalledWith('products', 'auto');
    expect(find).toHaveBeenCalledWith({ sku: 'SKU-1' });
    expect((limit).mock.calls[0]?.[0]).toBe(200);
  });
});
