import { beforeEach, describe, expect, it, vi } from 'vitest';

type SessionDoc = {
  _id: string;
  id: string;
  title: string | null;
  userId?: string | null;
  personaId?: string | null;
  settings?: Record<string, unknown> | null;
  lastMessageAt?: Date | null;
  messageCount?: number;
  isActive?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown> | null;
  messages: Array<{
    id: string;
    sessionId: string;
    role: 'system' | 'user' | 'assistant' | 'tool' | 'error' | 'info' | 'audit';
    content: string;
    createdAt: Date;
    model?: string | null;
    images?: string[];
    metadata?: Record<string, unknown> | null;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

const clone = <T>(value: T): T =>
  typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value)) as T;

const { sessionStore, mockCollection, mockDb } = vi.hoisted(() => {
  const sessionStore: SessionDoc[] = [];

  const matchesFilter = (doc: SessionDoc, filter: Record<string, unknown>): boolean => {
    if (!filter || Object.keys(filter).length === 0) {
      return true;
    }
    if (Array.isArray(filter['$or'])) {
      return (filter['$or'] as Array<Record<string, unknown>>).some((entry) =>
        matchesFilter(doc, entry)
      );
    }
    return Object.entries(filter).every(([key, rawValue]) => {
      if (key === '_id' || key === 'id') {
        if (typeof rawValue === 'string') {
          return doc[key] === rawValue;
        }
        if (
          rawValue &&
          typeof rawValue === 'object' &&
          Array.isArray((rawValue as { $in?: unknown }).$in)
        ) {
          return ((rawValue as { $in: unknown[] }).$in as unknown[]).includes(doc[key]);
        }
      }
      return doc[key as keyof SessionDoc] === rawValue;
    });
  };

  const applyProjection = (
    doc: SessionDoc,
    projection?: Record<string, 0 | 1>
  ): Record<string, unknown> => {
    if (!projection) {
      return clone(doc) as Record<string, unknown>;
    }
    const next: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(projection)) {
      if (value === 1) {
        next[key] = doc[key as keyof SessionDoc];
      }
    }
    return next;
  };

  const mockCollection = {
    createIndex: vi.fn().mockResolvedValue('index_name'),
    find: vi.fn((filter: Record<string, unknown> = {}) => {
      let docs = sessionStore.filter((doc) => matchesFilter(doc, filter));
      return {
        sort(sortSpec: Record<string, 1 | -1>) {
          const [key, direction] = Object.entries(sortSpec)[0] ?? ['updatedAt', -1];
          docs = [...docs].sort((left, right) => {
            const leftValue = left[key as keyof SessionDoc] as Date;
            const rightValue = right[key as keyof SessionDoc] as Date;
            return direction === -1
              ? rightValue.getTime() - leftValue.getTime()
              : leftValue.getTime() - rightValue.getTime();
          });
          return this;
        },
        async toArray() {
          return docs.map((doc) => clone(doc));
        },
      };
    }),
    findOne: vi.fn(
      async (filter: Record<string, unknown>, options?: { projection?: Record<string, 0 | 1> }) => {
        const doc = sessionStore.find((entry) => matchesFilter(entry, filter));
        if (!doc) {
          return null;
        }
        return applyProjection(doc, options?.projection);
      }
    ),
    insertOne: vi.fn(async (doc: SessionDoc) => {
      sessionStore.push(clone(doc));
      return { insertedId: doc._id };
    }),
    updateOne: vi.fn(async (filter: Record<string, unknown>, update: Record<string, unknown>) => {
      const index = sessionStore.findIndex((entry) => matchesFilter(entry, filter));
      if (index === -1) {
        return { matchedCount: 0, modifiedCount: 0 };
      }
      const current = sessionStore[index]!;
      const setPayload = update['$set'] as Record<string, unknown> | undefined;
      if (setPayload) {
        Object.assign(current, clone(setPayload));
      }
      const pushPayload = update['$push'] as { messages?: SessionDoc['messages'][number] } | undefined;
      if (pushPayload?.messages) {
        current.messages.push(clone(pushPayload.messages));
      }
      const incPayload = update['$inc'] as Record<string, number> | undefined;
      if (incPayload) {
        for (const [key, delta] of Object.entries(incPayload)) {
          const currentValue = typeof current[key as keyof SessionDoc] === 'number'
            ? Number(current[key as keyof SessionDoc])
            : 0;
          (current as Record<string, unknown>)[key] = currentValue + delta;
        }
      }
      return { matchedCount: 1, modifiedCount: 1 };
    }),
    deleteOne: vi.fn(async (filter: Record<string, unknown>) => {
      const index = sessionStore.findIndex((entry) => matchesFilter(entry, filter));
      if (index === -1) {
        return { deletedCount: 0 };
      }
      sessionStore.splice(index, 1);
      return { deletedCount: 1 };
    }),
    deleteMany: vi.fn(async (filter: Record<string, unknown>) => {
      const before = sessionStore.length;
      for (let index = sessionStore.length - 1; index >= 0; index -= 1) {
        if (matchesFilter(sessionStore[index]!, filter)) {
          sessionStore.splice(index, 1);
        }
      }
      return { deletedCount: before - sessionStore.length };
    }),
  };

  const mockDb = {
    collection: vi.fn().mockReturnValue(mockCollection),
  };

  return { sessionStore, mockCollection, mockDb };
});

describe('Chatbot Session Repository', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    sessionStore.splice(0, sessionStore.length);
    mockDb.collection.mockReturnValue(mockCollection);
    vi.doMock('@/shared/lib/db/mongo-client', () => ({
      getMongoDb: vi.fn().mockResolvedValue(mockDb),
    }));
  });

  const loadRepository = async () =>
    (await import('@/features/ai/chatbot/services/chatbot-session-repository'))
      .chatbotSessionRepository;

  it('findAll returns sessions sorted by updatedAt desc', async () => {
    sessionStore.push(
      {
        _id: 'session-older',
        id: 'session-older',
        title: 'Older',
        userId: null,
        personaId: null,
        settings: null,
        messageCount: 0,
        isActive: true,
        tags: [],
        metadata: null,
        messages: [],
        createdAt: new Date('2024-01-01T10:00:00.000Z'),
        updatedAt: new Date('2024-01-01T10:00:00.000Z'),
      },
      {
        _id: 'session-newer',
        id: 'session-newer',
        title: 'Newer',
        userId: null,
        personaId: null,
        settings: null,
        messageCount: 0,
        isActive: true,
        tags: [],
        metadata: null,
        messages: [],
        createdAt: new Date('2024-01-01T10:00:00.000Z'),
        updatedAt: new Date('2024-01-02T10:00:00.000Z'),
      }
    );

    const repository = await loadRepository();
    const result = await repository.findAll();

    expect(result.map((session) => session.id)).toEqual(['session-newer', 'session-older']);
    expect(mockCollection.find).toHaveBeenCalledWith({});
  });

  it('creates a session and preserves persona settings in Mongo', async () => {
    const repository = await loadRepository();
    const result = await repository.create({
      title: 'Persona Session',
      userId: 'user-1',
      personaId: 'persona-direct',
      messages: [],
      messageCount: 0,
      settings: {
        model: 'gpt-4o-mini',
        personaId: 'persona-1',
      },
    });

    expect(result.title).toBe('Persona Session');
    expect(result.userId).toBe('user-1');
    expect(result.personaId).toBe('persona-1');
    expect(result.settings?.model).toBe('gpt-4o-mini');
    expect(sessionStore[0]?.personaId).toBe('persona-1');
    expect(sessionStore[0]?.settings).toEqual({
      model: 'gpt-4o-mini',
      personaId: 'persona-1',
    });
  });

  it('finds a session id by persona and title', async () => {
    sessionStore.push({
      _id: 'session-1',
      id: 'session-1',
      title: 'Kangur AI Tutor · Mila · learner:learner-1',
      userId: null,
      personaId: 'persona-1',
      settings: { personaId: 'persona-1' },
      messageCount: 0,
      isActive: true,
      tags: [],
      metadata: null,
      messages: [],
      createdAt: new Date('2024-01-01T10:00:00.000Z'),
      updatedAt: new Date('2024-01-01T10:00:00.000Z'),
    });

    const repository = await loadRepository();
    const result = await repository.findSessionIdByPersonaAndTitle(
      'Kangur AI Tutor · Mila · learner:learner-1',
      'persona-1'
    );

    expect(result).toBe('session-1');
    expect(mockCollection.findOne).toHaveBeenCalledWith(
      {
        personaId: 'persona-1',
        title: 'Kangur AI Tutor · Mila · learner:learner-1',
      },
      {
        projection: { _id: 1, id: 1 },
      }
    );
  });

  it('adds a message and updates timestamps', async () => {
    sessionStore.push({
      _id: 'session-1',
      id: 'session-1',
      title: 'Session 1',
      userId: null,
      personaId: null,
      settings: null,
      messageCount: 0,
      isActive: true,
      tags: [],
      metadata: null,
      messages: [],
      createdAt: new Date('2024-01-01T10:00:00.000Z'),
      updatedAt: new Date('2024-01-01T10:00:00.000Z'),
    });

    const repository = await loadRepository();
    const result = await repository.addMessage('session-1', {
      role: 'assistant',
      content: 'Hello back',
      model: 'gpt-4o-mini',
      images: ['https://example.com/image.png'],
      metadata: { source: 'chatbot' },
    });

    expect(result?.messages).toHaveLength(1);
    expect(result?.messages?.[0]).toMatchObject({
      role: 'assistant',
      content: 'Hello back',
      model: 'gpt-4o-mini',
      images: ['https://example.com/image.png'],
      metadata: { source: 'chatbot' },
    });
    expect(result?.messageCount).toBe(1);
    expect(sessionStore[0]?.messageCount).toBe(1);
    expect(sessionStore[0]?.lastMessageAt).toBeInstanceOf(Date);
  });

  it('updates and deletes sessions from Mongo', async () => {
    sessionStore.push({
      _id: 'session-1',
      id: 'session-1',
      title: 'Session 1',
      userId: null,
      personaId: null,
      settings: null,
      messageCount: 0,
      isActive: true,
      tags: [],
      metadata: null,
      messages: [],
      createdAt: new Date('2024-01-01T10:00:00.000Z'),
      updatedAt: new Date('2024-01-01T10:00:00.000Z'),
    });

    const repository = await loadRepository();
    const updated = await repository.update('session-1', {
      title: 'Updated Title',
      settings: { personaId: 'persona-2' },
    });
    const deleted = await repository.delete('session-1');

    expect(updated?.title).toBe('Updated Title');
    expect(updated?.personaId).toBe('persona-2');
    expect(deleted).toBe(true);
    expect(sessionStore).toHaveLength(0);
  });
});
