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

const createDatabaseJson = (): string =>
  JSON.stringify({
    version: 2,
    persons: [],
    organizations: [],
    events: [],
    addresses: [],
    addressLinks: [],
    phoneNumbers: [],
    phoneNumberLinks: [],
    emails: [],
    emailLinks: [],
    eventOrganizationLinks: [],
    values: [],
  });

describe('filemaker mail service - drafts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-28T12:00:00.000Z'));
    readSecretSettingValuesMock.mockResolvedValue({
      'filemaker_mail_account_account-1_imap_password': 'imap-secret',
      'filemaker_mail_account_account-1_smtp_password': 'smtp-secret',
    });
    readFilemakerCampaignSettingValueMock.mockResolvedValue(createDatabaseJson());
    sendMailMock.mockResolvedValue({ messageId: '<provider-message@example.com>' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds a reply draft from the newest inbound message and reply-to address', async () => {
    findProviderForKeyMock.mockResolvedValue(null);

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
        unreadCount: 0,
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
        mailboxPath: 'Sent',
        mailboxRole: 'sent',
        providerMessageId: '<sent-message@example.com>',
        providerThreadId: null,
        providerUid: null,
        direction: 'outbound',
        subject: 'Launch update',
        snippet: 'Earlier outbound',
        from: { address: 'support@example.com', name: 'Support' },
        to: [{ address: 'sender@example.com', name: 'Sender' }],
        cc: [],
        bcc: [],
        replyTo: [],
        sentAt: '2026-03-28T09:00:00.000Z',
        receivedAt: '2026-03-28T09:00:00.000Z',
        flags: {
          seen: true,
          answered: false,
          flagged: false,
          draft: false,
          deleted: false,
        },
        textBody: 'Earlier outbound',
        htmlBody: '<p>Earlier outbound</p>',
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
        providerMessageId: '<inbound-message@example.com>',
        providerThreadId: null,
        providerUid: 42,
        direction: 'inbound',
        subject: 'Launch update',
        snippet: 'Latest inbound message',
        from: { address: 'sender@example.com', name: 'Sender' },
        to: [{ address: 'support@example.com', name: 'Support' }],
        cc: [],
        bcc: [],
        replyTo: [{ address: 'reply@example.com', name: 'Reply Desk' }],
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
        inReplyTo: '<sent-message@example.com>',
        references: ['<sent-message@example.com>'],
        attachments: [],
        relatedPersonIds: [],
        relatedOrganizationIds: [],
      },
    ]);
    getMongoDbMock.mockResolvedValue(mongoHarness.mongo);

    const { buildFilemakerMailReplyDraft } = await import('./filemaker-mail-service');

    const draft = await buildFilemakerMailReplyDraft('thread-1');

    expect(draft).toEqual(
      expect.objectContaining({
        accountId: 'account-1',
        to: [{ address: 'reply@example.com', name: 'Reply Desk' }],
        subject: 'Re: Launch update',
        inReplyTo: '<inbound-message@example.com>',
      })
    );
    expect(draft?.bodyHtml).toContain('data-filemaker-reply-quote="true"');
    expect(draft?.bodyHtml).toContain('Incoming <strong>html</strong> message');
  });

  it('builds a forward draft from the latest message in the thread', async () => {
    const mongoHarness = createMockHarness();
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
        providerMessageId: '<inbound-message@example.com>',
        providerThreadId: null,
        providerUid: 42,
        direction: 'inbound',
        subject: 'Launch update',
        snippet: 'Latest inbound message',
        from: { address: 'sender@example.com', name: 'Sender' },
        to: [{ address: 'support@example.com', name: 'Support' }],
        cc: [{ address: 'team@example.com', name: 'Team' }],
        bcc: [],
        replyTo: [{ address: 'reply@example.com', name: 'Reply Desk' }],
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
        inReplyTo: '<sent-message@example.com>',
        references: ['<sent-message@example.com>'],
        attachments: [],
        relatedPersonIds: [],
        relatedOrganizationIds: [],
      },
    ]);
    getMongoDbMock.mockResolvedValue(mongoHarness.mongo);

    const { buildFilemakerMailForwardDraft } = await import('./filemaker-mail-service');

    const draft = await buildFilemakerMailForwardDraft('thread-1');

    expect(draft).toEqual(
      expect.objectContaining({
        accountId: 'account-1',
        to: [],
        cc: [],
        bcc: [],
        subject: 'Fwd: Launch update',
        inReplyTo: null,
      })
    );
    expect(draft?.bodyHtml).toContain('data-filemaker-forward-quote="true"');
    expect(draft?.bodyHtml).toContain('Forwarded message');
    expect(draft?.bodyHtml).toContain('Incoming <strong>html</strong> message');
  });

  it('builds reply and forward drafts from a preloaded thread detail', async () => {
    const { buildFilemakerMailForwardDraft, buildFilemakerMailReplyDraft } = await import(
      './filemaker-mail-service'
    );

    const detail = {
      thread: {
        id: 'thread-1',
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
        messageCount: 2,
        lastMessageAt: '2026-03-28T09:10:00.000Z',
        createdAt: '2026-03-28T09:00:00.000Z',
        updatedAt: '2026-03-28T09:10:00.000Z',
      },
      messages: [
        {
          id: 'message-1',
          accountId: 'account-1',
          threadId: 'thread-1',
          mailboxPath: 'Sent',
          mailboxRole: 'sent',
          providerMessageId: '<sent-message@example.com>',
          providerThreadId: null,
          providerUid: null,
          direction: 'outbound',
          subject: 'Launch update',
          snippet: 'Earlier outbound',
          from: { address: 'support@example.com', name: 'Support' },
          to: [{ address: 'sender@example.com', name: 'Sender' }],
          cc: [],
          bcc: [],
          replyTo: [],
          sentAt: '2026-03-28T09:00:00.000Z',
          receivedAt: '2026-03-28T09:00:00.000Z',
          flags: {
            seen: true,
            answered: false,
            flagged: false,
            draft: false,
            deleted: false,
          },
          textBody: 'Earlier outbound',
          htmlBody: '<p>Earlier outbound</p>',
          inReplyTo: null,
          references: [],
          attachments: [],
          relatedPersonIds: [],
          relatedOrganizationIds: [],
          createdAt: '2026-03-28T09:00:00.000Z',
          updatedAt: '2026-03-28T09:00:00.000Z',
        },
        {
          id: 'message-2',
          accountId: 'account-1',
          threadId: 'thread-1',
          mailboxPath: 'INBOX',
          mailboxRole: 'inbox',
          providerMessageId: '<inbound-message@example.com>',
          providerThreadId: null,
          providerUid: 42,
          direction: 'inbound',
          subject: 'Launch update',
          snippet: 'Latest inbound message',
          from: { address: 'sender@example.com', name: 'Sender' },
          to: [{ address: 'support@example.com', name: 'Support' }],
          cc: [{ address: 'team@example.com', name: 'Team' }],
          bcc: [],
          replyTo: [{ address: 'reply@example.com', name: 'Reply Desk' }],
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
          inReplyTo: '<sent-message@example.com>',
          references: ['<sent-message@example.com>'],
          attachments: [],
          relatedPersonIds: [],
          relatedOrganizationIds: [],
          createdAt: '2026-03-28T09:10:00.000Z',
          updatedAt: '2026-03-28T09:10:00.000Z',
        },
      ],
    };

    const [replyDraft, forwardDraft] = await Promise.all([
      buildFilemakerMailReplyDraft(detail),
      buildFilemakerMailForwardDraft(detail),
    ]);

    expect(replyDraft).toEqual(
      expect.objectContaining({
        accountId: 'account-1',
        to: [{ address: 'reply@example.com', name: 'Reply Desk' }],
        subject: 'Re: Launch update',
        inReplyTo: '<inbound-message@example.com>',
      })
    );
    expect(forwardDraft).toEqual(
      expect.objectContaining({
        accountId: 'account-1',
        to: [],
        cc: [],
        bcc: [],
        subject: 'Fwd: Launch update',
        inReplyTo: null,
      })
    );
  });
});

function createMockHarness() {
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
}
