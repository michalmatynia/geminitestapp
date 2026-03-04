import { describe, expect, it, vi } from 'vitest';

import { syncProductAiJobs } from '@/shared/lib/db/services/sync/ai-sync';

describe('syncProductAiJobs', () => {
  it('uses canonical unknown type fallback when source type is missing', async () => {
    const docs = [
      {
        _id: 'job-1',
        productId: 'product-1',
        status: 'pending',
        type: '',
      },
    ];

    const toArray = vi.fn().mockResolvedValue(docs);
    const find = vi.fn().mockReturnValue({ toArray });
    const collection = vi.fn().mockReturnValue({ find });

    const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const createMany = vi.fn().mockResolvedValue({ count: 1 });

    const result = await syncProductAiJobs({
      mongo: {
        collection,
      } as unknown as Parameters<typeof syncProductAiJobs>[0]['mongo'],
      prisma: {
        productAiJob: {
          deleteMany,
          createMany,
        },
      } as unknown as Parameters<typeof syncProductAiJobs>[0]['prisma'],
      normalizeId: (doc: Record<string, unknown>): string =>
        (typeof doc['_id'] === 'string' ? doc['_id'] : ''),
      toDate: (): Date | null => null,
      toObjectIdMaybe: () => null,
      toJsonValue: (value: unknown): unknown => value,
      currencyCodes: new Set<string>(),
      countryCodes: new Set<string>(),
    });

    expect(result).toMatchObject({
      sourceCount: 1,
      targetInserted: 1,
    });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'job-1',
          productId: 'product-1',
          type: 'unknown',
        }),
      ],
    });
  });
});
