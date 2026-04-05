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
    persons: [
      {
        id: 'person-1',
        firstName: 'Jane',
        lastName: 'Recipient',
        addressId: '',
        street: '',
        streetNumber: '',
        city: '',
        postalCode: '',
        country: '',
        countryId: '',
        nip: '',
        regon: '',
        phoneNumbers: [],
        createdAt: '2026-03-28T10:00:00.000Z',
        updatedAt: '2026-03-28T10:00:00.000Z',
      },
    ],
    organizations: [],
    events: [],
    addresses: [],
    addressLinks: [],
    phoneNumbers: [],
    phoneNumberLinks: [],
    emails: [
      {
        id: 'email-1',
        email: 'jane@example.com',
        status: 'active',
        createdAt: '2026-03-28T10:00:00.000Z',
        updatedAt: '2026-03-28T10:00:00.000Z',
      },
    ],
    emailLinks: [
      {
        id: 'email-link-1',
        emailId: 'email-1',
        partyKind: 'person',
        partyId: 'person-1',
        createdAt: '2026-03-28T10:00:00.000Z',
        updatedAt: '2026-03-28T10:00:00.000Z',
      },
    ],
    eventOrganizationLinks: [],
  });

describe('filemaker mail service - accounts and sending', () => {
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

  it('persists accounts with normalized addresses and preserves createdAt on update', async () => {
    const secretProvider = {
      upsertValue: vi.fn(async () => true),
    };
    findProviderForKeyMock.mockResolvedValue(secretProvider);

    const mongoHarness = createMongoHarness();
    getMongoDbMock.mockResolvedValue(mongoHarness.mongo);

    const { getFilemakerMailAccount, upsertFilemakerMailAccount } = await import(
      './filemaker-mail-service'
    );

    const first = await upsertFilemakerMailAccount({
      id: 'account-1',
      name: ' Support Inbox ',
      emailAddress: 'SUPPORT@example.com',
      status: 'active',
      imapHost: 'imap.example.com',
      imapPort: 993,
      imapSecure: true,
      imapUser: 'support@example.com',
      imapPassword: 'imap-secret',
      smtpHost: 'smtp.example.com',
      smtpPort: 465,
      smtpSecure: true,
      smtpUser: 'support@example.com',
      smtpPassword: 'smtp-secret',
      fromName: 'Support',
      replyToEmail: 'REPLIES@example.com',
      folderAllowlist: ['INBOX', 'Sent'],
      initialSyncLookbackDays: 30,
      maxMessagesPerSync: 100,
    });

    vi.setSystemTime(new Date('2026-03-29T12:00:00.000Z'));

    const second = await upsertFilemakerMailAccount({
      id: 'account-1',
      name: 'Support Mailbox',
      emailAddress: 'support@example.com',
      status: 'paused',
      imapHost: 'imap.example.com',
      imapPort: 993,
      imapSecure: true,
      imapUser: 'support@example.com',
      imapPassword: 'imap-secret',
      smtpHost: 'smtp.example.com',
      smtpPort: 465,
      smtpSecure: true,
      smtpUser: 'support@example.com',
      smtpPassword: 'smtp-secret',
      fromName: 'Support Team',
      replyToEmail: 'replies@example.com',
      folderAllowlist: ['INBOX'],
      initialSyncLookbackDays: 14,
      maxMessagesPerSync: 50,
    });

    const stored = await getFilemakerMailAccount('account-1');

    expect(first.emailAddress).toBe('support@example.com');
    expect(first.replyToEmail).toBe('replies@example.com');
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.status).toBe('paused');
    expect(stored).toEqual(
      expect.objectContaining({
        id: 'account-1',
        name: 'Support Mailbox',
        emailAddress: 'support@example.com',
        replyToEmail: 'replies@example.com',
        folderAllowlist: ['INBOX'],
      })
    );
    expect(secretProvider.upsertValue).toHaveBeenCalledTimes(4);
    expect(secretProvider.upsertValue).toHaveBeenCalledWith(
      'filemaker_mail_account_account-1_imap_password',
      'imap-secret'
    );
    expect(secretProvider.upsertValue).toHaveBeenCalledWith(
      'filemaker_mail_account_account-1_smtp_password',
      'smtp-secret'
    );
  });

  it('preserves stored secrets when updating an account with blank passwords', async () => {
    const secretProvider = {
      upsertValue: vi.fn(async () => true),
    };
    findProviderForKeyMock.mockResolvedValue(secretProvider);

    const mongoHarness = createMongoHarness();
    getMongoDbMock.mockResolvedValue(mongoHarness.mongo);

    const { upsertFilemakerMailAccount } = await import('./filemaker-mail-service');

    await upsertFilemakerMailAccount({
      id: 'account-1',
      name: 'Support Inbox',
      emailAddress: 'support@example.com',
      status: 'active',
      imapHost: 'imap.example.com',
      imapPort: 993,
      imapSecure: true,
      imapUser: 'support@example.com',
      imapPassword: 'imap-secret',
      smtpHost: 'smtp.example.com',
      smtpPort: 465,
      smtpSecure: true,
      smtpUser: 'support@example.com',
      smtpPassword: 'smtp-secret',
      fromName: 'Support',
      replyToEmail: null,
      folderAllowlist: ['INBOX'],
      initialSyncLookbackDays: 30,
      maxMessagesPerSync: 100,
    });

    await upsertFilemakerMailAccount({
      id: 'account-1',
      name: 'Support Inbox',
      emailAddress: 'support@example.com',
      status: 'active',
      imapHost: 'imap.example.com',
      imapPort: 993,
      imapSecure: true,
      imapUser: 'support@example.com',
      imapPassword: '',
      smtpHost: 'smtp.example.com',
      smtpPort: 465,
      smtpSecure: true,
      smtpUser: 'support@example.com',
      smtpPassword: '',
      fromName: 'Support',
      replyToEmail: null,
      folderAllowlist: ['INBOX'],
      initialSyncLookbackDays: 30,
      maxMessagesPerSync: 100,
    });

    expect(secretProvider.upsertValue).toHaveBeenCalledTimes(2);
  });

  it('sends a composed message, stores outbox state, and links related parties', async () => {
    findProviderForKeyMock.mockResolvedValue(null);

    const mongoHarness = createMongoHarness();
    mongoHarness.seed('filemaker_mail_accounts', [
      {
        _id: 'account-1',
        id: 'account-1',
        createdAt: '2026-03-28T09:00:00.000Z',
        updatedAt: '2026-03-28T09:00:00.000Z',
        name: 'Support Inbox',
        emailAddress: 'support@example.com',
        provider: 'imap_smtp',
        status: 'active',
        imapHost: 'imap.example.com',
        imapPort: 993,
        imapSecure: true,
        imapUser: 'support@example.com',
        imapPasswordSettingKey: 'filemaker_mail_account_account-1_imap_password',
        smtpHost: 'smtp.example.com',
        smtpPort: 465,
        smtpSecure: true,
        smtpUser: 'support@example.com',
        smtpPasswordSettingKey: 'filemaker_mail_account_account-1_smtp_password',
        fromName: 'Support Team',
        replyToEmail: 'replies@example.com',
        folderAllowlist: ['INBOX'],
        initialSyncLookbackDays: 30,
        maxMessagesPerSync: 100,
        lastSyncedAt: null,
        lastSyncError: null,
      },
    ]);
    getMongoDbMock.mockResolvedValue(mongoHarness.mongo);

    const { sendFilemakerMailMessage } = await import('./filemaker-mail-service');

    const result = await sendFilemakerMailMessage({
      accountId: 'account-1',
      to: [
        { address: 'jane@example.com', name: 'Jane' },
        { address: 'JANE@example.com', name: 'Duplicate Jane' },
      ],
      cc: [],
      bcc: [],
      subject: 'Follow up',
      bodyHtml: '<p>Hello <strong>Jane</strong></p><p>Second line.</p>',
    });

    const outboxDocs = mongoHarness.docs<MockDocument>('filemaker_mail_outbox');
    const messageDocs = mongoHarness.docs<MockDocument>('filemaker_mail_messages');
    const threadDocs = mongoHarness.docs<MockDocument>('filemaker_mail_threads');

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'jane@example.com',
        subject: 'Follow up',
        text: expect.stringContaining('Hello Jane'),
        html: expect.stringContaining('<strong>Jane</strong>'),
        replyTo: 'replies@example.com',
      })
    );
    expect(result.outbox.status).toBe('sent');
    expect(result.message.direction).toBe('outbound');
    expect(result.message.relatedPersonIds).toEqual(['person-1']);
    expect(result.message.textBody).toContain('Hello Jane');
    expect(outboxDocs).toHaveLength(1);
    expect(outboxDocs[0]?.status).toBe('sent');
    expect(messageDocs).toHaveLength(1);
    expect(messageDocs[0]?.providerMessageId).toBe('<provider-message@example.com>');
    expect(threadDocs).toHaveLength(1);
    expect(threadDocs[0]?.messageCount).toBe(1);
    expect(threadDocs[0]?.relatedPersonIds).toEqual(['person-1']);
  });
});
