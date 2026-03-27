import { describe, expect, it, vi } from 'vitest';

import {
  syncAiPathRunEvents,
  syncAiPathRunEventsPrismaToMongo,
  syncAiPathRunNodes,
  syncAiPathRunNodesPrismaToMongo,
  syncAiPathRuns,
  syncAiPathRunsPrismaToMongo,
  syncProductAiJobs,
  syncProductAiJobsPrismaToMongo,
} from '@/shared/lib/db/services/sync/ai-sync';

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
      normalizeId: (doc: { _id?: unknown }): string =>
        typeof doc._id === 'string' ? doc._id : '',
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

describe('AI sync handlers', () => {
  it('syncs ai path runs with defaults and clears dependent tables first', async () => {
    const docs = [
      {
        _id: 'run-1',
        userId: 'user-1',
        pathId: 'path-1',
        triggerContext: { ok: true },
        retryCount: undefined,
      },
      {
        _id: null,
        pathId: 'skip-me',
      },
    ];
    const toArray = vi.fn().mockResolvedValue(docs);
    const find = vi.fn().mockReturnValue({ toArray });
    const collection = vi.fn().mockReturnValue({ find });
    const aiPathRunNodeDeleteMany = vi.fn().mockResolvedValue({ count: 2 });
    const aiPathRunEventDeleteMany = vi.fn().mockResolvedValue({ count: 3 });
    const aiPathRunDeleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const aiPathRunCreateMany = vi.fn().mockResolvedValue({ count: 1 });

    const result = await syncAiPathRuns({
      mongo: { collection } as never,
      prisma: {
        aiPathRunNode: { deleteMany: aiPathRunNodeDeleteMany },
        aiPathRunEvent: { deleteMany: aiPathRunEventDeleteMany },
        aiPathRun: {
          deleteMany: aiPathRunDeleteMany,
          createMany: aiPathRunCreateMany,
        },
      } as never,
      normalizeId: (doc: { _id?: unknown }): string =>
        typeof doc._id === 'string' ? doc._id : '',
      toDate: (value: unknown): Date | null => (value instanceof Date ? value : null),
      toObjectIdMaybe: () => null,
      toJsonValue: (value: unknown): unknown => value,
      currencyCodes: new Set<string>(),
      countryCodes: new Set<string>(),
    });

    expect(result).toEqual({
      sourceCount: 1,
      targetDeleted: 1,
      targetInserted: 1,
    });
    expect(aiPathRunNodeDeleteMany).toHaveBeenCalledBefore(aiPathRunDeleteMany);
    expect(aiPathRunEventDeleteMany).toHaveBeenCalledBefore(aiPathRunDeleteMany);
    expect(aiPathRunCreateMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'run-1',
          pathId: 'path-1',
          status: 'queued',
          maxAttempts: 3,
          retryCount: 0,
          userId: 'user-1',
        }),
      ],
    });
  });

  it('syncs ai path run nodes and events while skipping invalid rows and empty inserts', async () => {
    const nodeDocs = [
      {
        _id: 'node-1',
        runId: 'run-1',
        nodeId: 'graph-node',
      },
      {
        _id: 'node-missing-run',
      },
    ];
    const eventDocs = [
      {
        _id: 'event-missing-run',
      },
    ];
    const collection = vi.fn((name: string) => ({
      find: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(
          name === 'ai_path_run_nodes' ? nodeDocs : eventDocs
        ),
      }),
    }));
    const aiPathRunNodeDeleteMany = vi.fn().mockResolvedValue({ count: 4 });
    const aiPathRunNodeCreateMany = vi.fn().mockResolvedValue({ count: 1 });
    const aiPathRunEventDeleteMany = vi.fn().mockResolvedValue({ count: 5 });
    const aiPathRunEventCreateMany = vi.fn();

    const nodeResult = await syncAiPathRunNodes({
      mongo: { collection } as never,
      prisma: {
        aiPathRunNode: {
          deleteMany: aiPathRunNodeDeleteMany,
          createMany: aiPathRunNodeCreateMany,
        },
      } as never,
      normalizeId: (doc: { _id?: unknown }): string =>
        typeof doc._id === 'string' ? doc._id : '',
      toDate: () => null,
      toObjectIdMaybe: () => null,
      toJsonValue: (value: unknown): unknown => value,
      currencyCodes: new Set<string>(),
      countryCodes: new Set<string>(),
    });
    const eventResult = await syncAiPathRunEvents({
      mongo: { collection } as never,
      prisma: {
        aiPathRunEvent: {
          deleteMany: aiPathRunEventDeleteMany,
          createMany: aiPathRunEventCreateMany,
        },
      } as never,
      normalizeId: (doc: { _id?: unknown }): string =>
        typeof doc._id === 'string' ? doc._id : '',
      toDate: () => null,
      toObjectIdMaybe: () => null,
      toJsonValue: (value: unknown): unknown => value,
      currencyCodes: new Set<string>(),
      countryCodes: new Set<string>(),
    });

    expect(nodeResult).toEqual({
      sourceCount: 1,
      targetDeleted: 4,
      targetInserted: 1,
    });
    expect(aiPathRunNodeCreateMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'node-1',
          runId: 'run-1',
          status: 'pending',
          attempt: 0,
        }),
      ],
    });
    expect(eventResult).toEqual({
      sourceCount: 0,
      targetDeleted: 5,
      targetInserted: 0,
    });
    expect(aiPathRunEventCreateMany).not.toHaveBeenCalled();
  });

  it('syncs prisma ai path and product job rows back to mongo collections', async () => {
    const productDeleteMany = vi.fn().mockResolvedValue({ deletedCount: 2 });
    const productInsertMany = vi.fn().mockResolvedValue({ insertedCount: 1 });
    const runDeleteMany = vi.fn().mockResolvedValue({ deletedCount: 3 });
    const runInsertMany = vi.fn().mockResolvedValue({ insertedCount: 1 });
    const collection = vi.fn((name: string) => {
      if (name === 'product_ai_jobs') {
        return { deleteMany: productDeleteMany, insertMany: productInsertMany };
      }
      return { deleteMany: runDeleteMany, insertMany: runInsertMany };
    });

    const productResult = await syncProductAiJobsPrismaToMongo({
      mongo: { collection } as never,
      prisma: {
        productAiJob: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: 'job-1',
              productId: 'product-1',
              status: 'completed',
              type: 'generate',
              payload: { prompt: 'hello' },
              result: null,
              errorMessage: null,
              createdAt: new Date('2026-03-01T00:00:00.000Z'),
              startedAt: null,
              finishedAt: null,
            },
          ]),
        },
      } as never,
      normalizeId: () => '',
      toDate: () => null,
      toObjectIdMaybe: () => null,
      toJsonValue: (value: unknown): unknown => value,
      currencyCodes: new Set<string>(),
      countryCodes: new Set<string>(),
    });

    const runResult = await syncAiPathRunsPrismaToMongo({
      mongo: { collection } as never,
      prisma: {
        aiPathRun: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: 'run-1',
              userId: null,
              pathId: 'path-1',
              pathName: null,
              status: 'queued',
              triggerEvent: null,
              triggerNodeId: null,
              triggerContext: null,
              graph: null,
              runtimeState: null,
              meta: null,
              entityId: null,
              entityType: null,
              errorMessage: null,
              retryCount: 0,
              maxAttempts: 3,
              nextRetryAt: null,
              deadLetteredAt: null,
              startedAt: null,
              finishedAt: null,
              createdAt: new Date('2026-03-01T00:00:00.000Z'),
              updatedAt: new Date('2026-03-01T00:00:00.000Z'),
            },
          ]),
        },
      } as never,
      normalizeId: () => '',
      toDate: () => null,
      toObjectIdMaybe: () => null,
      toJsonValue: (value: unknown): unknown => value,
      currencyCodes: new Set<string>(),
      countryCodes: new Set<string>(),
    });

    expect(productResult).toEqual({
      sourceCount: 1,
      targetDeleted: 2,
      targetInserted: 1,
    });
    expect(productInsertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        _id: 'job-1',
        type: 'generate',
      }),
    ]);
    expect(runResult).toEqual({
      sourceCount: 1,
      targetDeleted: 3,
      targetInserted: 1,
    });
    expect(runInsertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        _id: 'run-1',
        pathId: 'path-1',
      }),
    ]);
  });

  it('syncs prisma ai path run nodes and events back to mongo and skips empty inserts', async () => {
    const nodeDeleteMany = vi.fn().mockResolvedValue({ deletedCount: 6 });
    const nodeInsertMany = vi.fn();
    const eventDeleteMany = vi.fn().mockResolvedValue({ deletedCount: 7 });
    const eventInsertMany = vi.fn().mockResolvedValue({ insertedCount: 1 });
    const collection = vi.fn((name: string) => {
      if (name === 'ai_path_run_nodes') {
        return { deleteMany: nodeDeleteMany, insertMany: nodeInsertMany };
      }
      return { deleteMany: eventDeleteMany, insertMany: eventInsertMany };
    });

    const nodeResult = await syncAiPathRunNodesPrismaToMongo({
      mongo: { collection } as never,
      prisma: {
        aiPathRunNode: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      } as never,
      normalizeId: () => '',
      toDate: () => null,
      toObjectIdMaybe: () => null,
      toJsonValue: (value: unknown): unknown => value,
      currencyCodes: new Set<string>(),
      countryCodes: new Set<string>(),
    });
    const eventResult = await syncAiPathRunEventsPrismaToMongo({
      mongo: { collection } as never,
      prisma: {
        aiPathRunEvent: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: 'event-1',
              runId: 'run-1',
              level: 'info',
              message: 'hello',
              metadata: null,
              createdAt: new Date('2026-03-01T00:00:00.000Z'),
            },
          ]),
        },
      } as never,
      normalizeId: () => '',
      toDate: () => null,
      toObjectIdMaybe: () => null,
      toJsonValue: (value: unknown): unknown => value,
      currencyCodes: new Set<string>(),
      countryCodes: new Set<string>(),
    });

    expect(nodeResult).toEqual({
      sourceCount: 0,
      targetDeleted: 6,
      targetInserted: 0,
    });
    expect(nodeInsertMany).not.toHaveBeenCalled();
    expect(eventResult).toEqual({
      sourceCount: 1,
      targetDeleted: 7,
      targetInserted: 1,
    });
    expect(eventInsertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        _id: 'event-1',
        runId: 'run-1',
      }),
    ]);
  });
});
