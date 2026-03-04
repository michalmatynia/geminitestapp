import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiPostMock } = vi.hoisted(() => ({
  apiPostMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/api/client/base', () => ({
  apiFetch: vi.fn(),
  apiPost: apiPostMock,
}));

import { databaseAction, databaseQuery, databaseUpdate } from '@/shared/lib/ai-paths/api/client/database';

describe('database client canonical db-action routing', () => {
  beforeEach(() => {
    apiPostMock.mockReset();
    apiPostMock.mockResolvedValue({ ok: true, data: {} });
  });

  it('routes databaseQuery payloads through db-action find/findOne mapping', async () => {
    await databaseQuery({
      provider: 'auto',
      collection: 'products',
      collectionMap: { Product: 'products' },
      filter: { id: 'p-1' },
      projection: { id: 1 },
      sort: { createdAt: -1 },
      limit: 10,
      single: false,
      idType: 'string',
    });

    expect(apiPostMock).toHaveBeenCalledWith('/api/ai-paths/db-action', {
      provider: 'auto',
      collection: 'products',
      collectionMap: { Product: 'products' },
      action: 'find',
      filter: { id: 'p-1' },
      projection: { id: 1 },
      sort: { createdAt: -1 },
      limit: 10,
      idType: 'string',
    });
  });

  it('routes databaseUpdate payloads through db-action updateOne/updateMany mapping', async () => {
    await databaseUpdate({
      provider: 'prisma',
      collection: 'products',
      filter: { id: 'p-1' },
      update: { name_en: 'Updated' },
      single: false,
      idType: 'string',
    });

    expect(apiPostMock).toHaveBeenCalledWith('/api/ai-paths/db-action', {
      provider: 'prisma',
      collection: 'products',
      action: 'updateMany',
      filter: { id: 'p-1' },
      update: { name_en: 'Updated' },
      idType: 'string',
    });
  });

  it('drops invalid provider values and keeps canonical db-action mapping', async () => {
    await databaseQuery({
      provider: 'legacy-provider',
      collection: 'products',
      filter: { id: 'p-2' },
      single: true,
    });

    expect(apiPostMock).toHaveBeenCalledWith('/api/ai-paths/db-action', {
      collection: 'products',
      action: 'findOne',
      filter: { id: 'p-2' },
    });
  });

  it('allows overriding db-action timeout for long-running runtime operations', async () => {
    await databaseAction(
      {
        provider: 'auto',
        action: 'updateOne',
        collection: 'products',
        filter: { id: 'p-1' },
        update: { $set: { description_en: 'updated' } },
      },
      { timeoutMs: 45_000 }
    );

    expect(apiPostMock).toHaveBeenCalledWith(
      '/api/ai-paths/db-action',
      {
        provider: 'auto',
        action: 'updateOne',
        collection: 'products',
        filter: { id: 'p-1' },
        update: { $set: { description_en: 'updated' } },
      },
      { timeoutMs: 45_000 }
    );
  });
});
