import { describe, expect, it, vi } from 'vitest';

import {
  syncChatbotJobs,
  syncChatbotJobsPrismaToMongo,
  syncChatbotSessions,
  syncChatbotSessionsPrismaToMongo,
} from '@/shared/lib/db/services/sync/chatbot-sync';

const createMongo = (docsByCollection: Record<string, unknown[]>) => {
  const collections = new Map<
    string,
    {
      find: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
      insertMany: ReturnType<typeof vi.fn>;
    }
  >();

  const collection = vi.fn((name: string) => {
    if (!collections.has(name)) {
      collections.set(name, {
        find: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(docsByCollection[name] ?? []),
        }),
        deleteMany: vi.fn().mockResolvedValue({ deletedCount: 3 }),
        insertMany: vi.fn().mockResolvedValue({ insertedCount: (docsByCollection[name] ?? []).length }),
      });
    }
    return collections.get(name)!;
  });

  return {
    mongo: { collection } as unknown as Parameters<typeof syncChatbotSessions>[0]['mongo'],
    collections,
  };
};

const baseContext = {
  normalizeId: (doc: Record<string, unknown>): string =>
    typeof doc._id === 'string' ? doc._id : '',
  toDate: (value: unknown): Date | null => (value ? new Date(value as string | Date) : null),
  toObjectIdMaybe: (value: string) => value,
  toJsonValue: (value: unknown) => value,
  currencyCodes: new Set<string>(),
  countryCodes: new Set<string>(),
};

describe('chatbot-sync', () => {
  it('syncs chatbot sessions and nested messages from Mongo to Prisma', async () => {
    const createdAt = new Date('2026-03-25T10:00:00.000Z');
    const { mongo } = createMongo({
      chatbot_sessions: [
        {
          _id: 'session-1',
          title: 'Support thread',
          messages: [
            {
              role: 'user',
              content: 'Hello',
              createdAt,
            },
          ],
          createdAt,
          updatedAt: createdAt,
        },
        {
          title: 'missing id',
        },
      ],
    });

    const prisma = {
      chatbotMessage: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      chatbotSession: {
        deleteMany: vi.fn().mockResolvedValue({ count: 4 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    } as unknown as Parameters<typeof syncChatbotSessions>[0]['prisma'];

    const result = await syncChatbotSessions({
      mongo,
      prisma,
      ...baseContext,
    });

    expect(result).toEqual({
      sourceCount: 1,
      targetDeleted: 4,
      targetInserted: 1,
    });
    expect(prisma.chatbotMessage.deleteMany).toHaveBeenCalledWith();
    expect(prisma.chatbotSession.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'session-1',
          title: 'Support thread',
        }),
      ],
    });
    expect(prisma.chatbotMessage.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          sessionId: 'session-1',
          role: 'user',
          content: 'Hello',
          createdAt,
        }),
      ],
    });
  });

  it('syncs chatbot jobs from Mongo to Prisma and normalizes payload dates', async () => {
    const createdAt = new Date('2026-03-25T11:00:00.000Z');
    const toJsonValue = vi.fn((value: unknown) => ({ wrapped: value }));
    const { mongo } = createMongo({
      chatbot_jobs: [
        {
          _id: 'job-1',
          sessionId: 'session-1',
          payload: { prompt: 'hello' },
          resultText: 'done',
          errorMessage: null,
          createdAt,
          startedAt: '2026-03-25T11:01:00.000Z',
          finishedAt: '2026-03-25T11:02:00.000Z',
        },
        {
          _id: 'job-2',
          payload: { prompt: 'missing session' },
        },
      ],
    });

    const prisma = {
      chatbotJob: {
        deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    } as unknown as Parameters<typeof syncChatbotJobs>[0]['prisma'];

    const result = await syncChatbotJobs({
      mongo,
      prisma,
      ...baseContext,
      toJsonValue,
    });

    expect(result).toEqual({
      sourceCount: 1,
      targetDeleted: 2,
      targetInserted: 1,
    });
    expect(toJsonValue).toHaveBeenCalledWith({ prompt: 'hello' });
    expect(prisma.chatbotJob.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'job-1',
          sessionId: 'session-1',
          status: 'pending',
          payload: { wrapped: { prompt: 'hello' } },
          resultText: 'done',
        }),
      ],
    });
  });

  it('syncs chatbot sessions and jobs from Prisma back to Mongo', async () => {
    const createdAt = new Date('2026-03-25T12:00:00.000Z');
    const { mongo, collections } = createMongo({});

    const prisma = {
      chatbotSession: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'session-1',
            title: 'Support thread',
            messages: [
              {
                role: 'assistant',
                content: 'Hi there',
                createdAt,
              },
            ],
            createdAt,
            updatedAt: createdAt,
          },
        ]),
      },
      chatbotJob: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'job-1',
            sessionId: 'session-1',
            status: 'completed',
            model: 'gpt-4.1-mini',
            payload: { prompt: 'hello' },
            resultText: 'done',
            errorMessage: null,
            createdAt,
            startedAt: createdAt,
            finishedAt: createdAt,
          },
        ]),
      },
    } as unknown as Parameters<typeof syncChatbotSessionsPrismaToMongo>[0]['prisma'];

    const sessionResult = await syncChatbotSessionsPrismaToMongo({
      mongo,
      prisma,
      ...baseContext,
    });
    const jobResult = await syncChatbotJobsPrismaToMongo({
      mongo,
      prisma,
      ...baseContext,
    });

    expect(sessionResult).toEqual({
      sourceCount: 1,
      targetDeleted: 3,
      targetInserted: 1,
    });
    expect(jobResult).toEqual({
      sourceCount: 1,
      targetDeleted: 3,
      targetInserted: 1,
    });

    expect(collections.get('chatbot_sessions')?.deleteMany).toHaveBeenCalledWith({});
    expect(collections.get('chatbot_sessions')?.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        _id: 'session-1',
        messages: [
          {
            role: 'assistant',
            content: 'Hi there',
            createdAt,
          },
        ],
      }),
    ]);
    expect(collections.get('chatbot_jobs')?.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        _id: 'job-1',
        sessionId: 'session-1',
        status: 'completed',
      }),
    ]);
  });
});
