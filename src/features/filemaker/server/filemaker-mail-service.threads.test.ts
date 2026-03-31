import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type MockDocument = Record<string, unknown> & { _id: string };

const {
  getMongoDbMock,
  readSecretSettingValuesMock,
  findProviderForKeyMock,
  readFilemakerCampaignSettingValueMock,
  sendMailMock,
  clearSecretSettingCacheMock,
  clearSettingsCacheMock,
  clearLiteSettingsServerCacheMock,
} = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
  readSecretSettingValuesMock: vi.fn(),
  findProviderForKeyMock: vi.fn(),
  readFilemakerCampaignSettingValueMock: vi.fn(),
  sendMailMock: vi.fn(),
  clearSecretSettingCacheMock: vi.fn(),
  clearSettingsCacheMock: vi.fn(),
  clearLiteSettingsServerCacheMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

vi.mock('@/shared/lib/settings/secret-settings', () => ({
  readSecretSettingValues: readSecretSettingValuesMock,
  clearSecretSettingCache: clearSecretSettingCacheMock,
}));

vi.mock('@/shared/lib/db/settings-registry', () => ({
  findProviderForKey: findProviderForKeyMock,
}));

vi.mock('@/shared/lib/settings-cache', () => ({
  clearSettingsCache: clearSettingsCacheMock,
}));

vi.mock('@/shared/lib/settings-lite-server-cache', () => ({
  clearLiteSettingsServerCache: clearLiteSettingsServerCacheMock,
}));

vi.mock('./campaign-settings-store', () => ({
  readFilemakerCampaignSettingValue: readFilemakerCampaignSettingValueMock,
}));

vi.mock('nodemailer', () => ({
  createTransport: () => ({
    sendMail: sendMailMock,
  }),
}));

type MockCollection<T extends MockDocument> = ReturnType<typeof createMockCollection<T>>;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const getValueAtPath = (input: Record<string, unknown>, path: string): unknown =>
  path.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[segment];
  }, input);

const matchesFilter = (document: Record<string, unknown>, filter: Record<string, unknown>): boolean =>
  Object.entries(filter).every(([key, expected]) => getValueAtPath(document, key) === expected);

const createMockCursor = <T extends MockDocument>(input: T[]) => {
  let docs = input.map((entry) => clone(entry));
  let projection: Record<string, number> | null = null;
  let limitCount: number | null = null;

  return {
    sort(sortSpec: Record<string, 1 | -1>) {
      const entries = Object.entries(sortSpec);
      docs = docs.slice().sort((left, right) => {
        for (const [key, direction] of entries) {
          const leftValue = getValueAtPath(left, key);
          const rightValue = getValueAtPath(right, key);
          if (leftValue === rightValue) continue;
          if (leftValue === undefined || leftValue === null) return 1;
          if (rightValue === undefined || rightValue === null) return -1;
          return leftValue > rightValue ? direction : -direction;
        }
        return 0;
      });
      return this;
    },
    project(nextProjection: Record<string, number>) {
      projection = nextProjection;
      return this;
    },
    limit(value: number) {
      limitCount = value;
      return this;
    },
    async toArray(): Promise<T[]> {
      const limited = limitCount === null ? docs : docs.slice(0, limitCount);
      if (projection?._id === 0) {
        return limited.map(({ _id: _ignored, ...rest }) => clone(rest as T));
      }
      return limited.map((entry) => clone(entry));
    },
  };
};

const createMockCollection = <T extends MockDocument>(seed: T[] = []) => {
  const docs = seed.map((entry) => clone(entry));

  return {
    docs,
    createIndex: vi.fn(async () => 'ok'),
    async findOne(filter: Record<string, unknown>): Promise<T | null> {
      const doc = docs.find((entry) => matchesFilter(entry, filter));
      return doc ? clone(doc) : null;
    },
    find(filter: Record<string, unknown>) {
      return createMockCursor(docs.filter((entry) => matchesFilter(entry, filter)));
    },
    async insertOne(doc: T): Promise<{ insertedId: string }> {
      docs.push(clone(doc));
      return { insertedId: doc._id };
    },
    async updateOne(
      filter: Record<string, unknown>,
      update: { $set?: Partial<T>; $setOnInsert?: Partial<T> },
      options?: { upsert?: boolean }
    ): Promise<{ matchedCount: number }> {
      const existingIndex = docs.findIndex((entry) => matchesFilter(entry, filter));
      if (existingIndex >= 0) {
        const existing = docs[existingIndex]!;
        docs[existingIndex] = {
          ...existing,
          ...(update.$set ?? {}),
        } as T;
        return { matchedCount: 1 };
      }

      if (options?.upsert) {
        const nextDocument = {
          _id:
            (update.$set?._id as string | undefined) ??
            (update.$setOnInsert?._id as string | undefined) ??
            (filter._id as string | undefined) ??
            crypto.randomUUID(),
          ...(update.$setOnInsert ?? {}),
          ...(update.$set ?? {}),
        } as T;
        docs.push(clone(nextDocument));
        return { matchedCount: 0 };
      }

      return { matchedCount: 0 };
    },
    async deleteOne(filter: Record<string, unknown>): Promise<{ deletedCount: number }> {
      const existingIndex = docs.findIndex((entry) => matchesFilter(entry, filter));
      if (existingIndex < 0) return { deletedCount: 0 };
      docs.splice(existingIndex, 1);
      return { deletedCount: 1 };
    },
    async deleteMany(filter: Record<string, unknown>): Promise<{ deletedCount: number }> {
      const beforeCount = docs.length;
      for (let index = docs.length - 1; index >= 0; index -= 1) {
        if (matchesFilter(docs[index]!, filter)) {
          docs.splice(index, 1);
        }
      }
      return { deletedCount: beforeCount - docs.length };
    },
  };
};

const createMongoHarness = () => {
  const collections = new Map<string, MockCollection<MockDocument>>();

  const ensureCollection = <T extends MockDocument>(name: string): MockCollection<T> => {
    if (!collections.has(name)) {
      collections.set(name, createMockCollection());
    }
    return collections.get(name)! as MockCollection<T>;
  };

  const mongo = {
    collection<T extends MockDocument>(name: string): MockCollection<T> {
      return ensureCollection<T>(name);
    },
  };

  return {
    mongo,
    seed<T extends MockDocument>(name: string, docs: T[]): void {
      collections.set(name, createMockCollection(docs as MockDocument[]));
    },
    docs<T extends MockDocument>(name: string): T[] {
      return ensureCollection<T>(name).docs.map((entry) => clone(entry as T));
    },
  };
};

describe('filemaker mail service - threads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-28T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('marks a thread read and unread by rewriting message seen flags', async () => {
    const mongoHarness = createMongoHarness();
    mongoHarness.seed('filemaker_mail_threads', [
      {
        _id: 'thread-1',
        id: 'thread-1',
        createdAt: '2026-03-28T09:00:00.000Z',
        updatedAt: '2026-03-28T09:10:00.000Z',
        accountId: 'account-1',
        mailboxPath: 'INBOX',
        mailboxRole: 'inbox',
        providerThreadId: null,
        subject: 'Launch update',
        normalizedSubject: 'Launch update',
        snippet: 'Latest inbound message',
        participantSummary: [{ address: 'sender@example.com', name: 'Sender' }],
        relatedPersonIds: [],
        relatedOrganizationIds: [],
        unreadCount: 2,
        messageCount: 2,
        lastMessageAt: '2026-03-28T09:10:00.000Z',
      },
    ]);
    mongoHarness.seed('filemaker_mail_messages', [
      {
        _id: 'message-1',
        id: 'message-1',
        createdAt: '2026-03-28T09:00:00.000Z',
        updatedAt: '2026-03-28T09:00:00.000Z',
        accountId: 'account-1',
        threadId: 'thread-1',
        mailboxPath: 'INBOX',
        mailboxRole: 'inbox',
        providerMessageId: null,
        providerThreadId: null,
        providerUid: 1,
        direction: 'inbound',
        subject: 'Launch update',
        snippet: 'First message',
        from: { address: 'sender@example.com', name: 'Sender' },
        to: [{ address: 'support@example.com', name: 'Support' }],
        cc: [],
        bcc: [],
        replyTo: [],
        sentAt: '2026-03-28T09:00:00.000Z',
        receivedAt: '2026-03-28T09:00:00.000Z',
        flags: {
          seen: false,
          answered: false,
          flagged: false,
          draft: false,
          deleted: false,
        },
        textBody: 'First',
        htmlBody: '<p>First</p>',
        inReplyTo: null,
        references: [],
        attachments: [],
        relatedPersonIds: [],
        relatedOrganizationIds: [],
      },
      {
        _id: 'message-2',
        id: 'message-2',
        createdAt: '2026-03-28T09:10:00.000Z',
        updatedAt: '2026-03-28T09:10:00.000Z',
        accountId: 'account-1',
        threadId: 'thread-1',
        mailboxPath: 'INBOX',
        mailboxRole: 'inbox',
        providerMessageId: null,
        providerThreadId: null,
        providerUid: 2,
        direction: 'inbound',
        subject: 'Launch update',
        snippet: 'Second message',
        from: { address: 'sender@example.com', name: 'Sender' },
        to: [{ address: 'support@example.com', name: 'Support' }],
        cc: [],
        bcc: [],
        replyTo: [],
        sentAt: '2026-03-28T09:10:00.000Z',
        receivedAt: '2026-03-28T09:10:00.000Z',
        flags: {
          seen: false,
          answered: false,
          flagged: false,
          draft: false,
          deleted: false,
        },
        textBody: 'Second',
        htmlBody: '<p>Second</p>',
        inReplyTo: null,
        references: [],
        attachments: [],
        relatedPersonIds: [],
        relatedOrganizationIds: [],
      },
    ]);
    getMongoDbMock.mockResolvedValue(mongoHarness.mongo);

    const { markFilemakerMailThreadRead } = await import('./filemaker-mail-service');

    const readThread = await markFilemakerMailThreadRead('thread-1', true);
    expect(readThread.unreadCount).toBe(0);
    expect(
      mongoHarness.docs<{ _id: string; flags: { seen: boolean } }>('filemaker_mail_messages').map((message) =>
        message.flags.seen
      )
    ).toEqual([true, true]);

    const unreadThread = await markFilemakerMailThreadRead('thread-1', false);
    expect(unreadThread.unreadCount).toBe(2);
    expect(
      mongoHarness.docs<{ _id: string; flags: { seen: boolean } }>('filemaker_mail_messages').map((message) =>
        message.flags.seen
      )
    ).toEqual([false, false]);
  });

  it('deletes a thread together with its messages', async () => {
    const mongoHarness = createMongoHarness();
    mongoHarness.seed('filemaker_mail_threads', [
      {
        _id: 'thread-1',
        id: 'thread-1',
        createdAt: '2026-03-28T09:00:00.000Z',
        updatedAt: '2026-03-28T09:10:00.000Z',
        accountId: 'account-1',
        mailboxPath: 'INBOX',
        mailboxRole: 'inbox',
        providerThreadId: null,
        subject: 'Launch update',
        normalizedSubject: 'Launch update',
        snippet: 'Latest inbound message',
        participantSummary: [{ address: 'sender@example.com', name: 'Sender' }],
        relatedPersonIds: [],
        relatedOrganizationIds: [],
        unreadCount: 1,
        messageCount: 1,
        lastMessageAt: '2026-03-28T09:10:00.000Z',
      },
    ]);
    mongoHarness.seed('filemaker_mail_messages', [
      {
        _id: 'message-1',
        id: 'message-1',
        createdAt: '2026-03-28T09:10:00.000Z',
        updatedAt: '2026-03-28T09:10:00.000Z',
        accountId: 'account-1',
        threadId: 'thread-1',
        mailboxPath: 'INBOX',
        mailboxRole: 'inbox',
        providerMessageId: null,
        providerThreadId: null,
        providerUid: 42,
        direction: 'inbound',
        subject: 'Launch update',
        snippet: 'Latest inbound message',
        from: { address: 'sender@example.com', name: 'Sender' },
        to: [{ address: 'support@example.com', name: 'Support' }],
        cc: [],
        bcc: [],
        replyTo: [],
        sentAt: '2026-03-28T09:10:00.000Z',
        receivedAt: '2026-03-28T09:10:00.000Z',
        flags: {
          seen: false,
          answered: false,
          flagged: false,
          draft: false,
          deleted: false,
        },
        textBody: 'Incoming plain-text message',
        htmlBody: '<p>Incoming <strong>html</strong> message</p>',
        inReplyTo: null,
        references: [],
        attachments: [],
        relatedPersonIds: [],
        relatedOrganizationIds: [],
      },
    ]);
    getMongoDbMock.mockResolvedValue(mongoHarness.mongo);

    const { deleteFilemakerMailThread } = await import('./filemaker-mail-service');

    await deleteFilemakerMailThread('thread-1');

    expect(mongoHarness.docs('filemaker_mail_threads')).toEqual([]);
    expect(mongoHarness.docs('filemaker_mail_messages')).toEqual([]);
  });
});
