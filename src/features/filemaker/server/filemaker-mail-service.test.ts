import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type MockDocument = Record<string, unknown> & { _id: string };

const {
  getMongoDbMock,
  readSecretSettingValuesMock,
  findProviderForKeyMock,
  readFilemakerCampaignSettingValueMock,
  sendMailMock,
  createImapClientMock,
  listImapMailboxesMock,
  parseMailSourceMock,
  clearSecretSettingCacheMock,
  clearSettingsCacheMock,
  clearLiteSettingsServerCacheMock,
} = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
  readSecretSettingValuesMock: vi.fn(),
  findProviderForKeyMock: vi.fn(),
  readFilemakerCampaignSettingValueMock: vi.fn(),
  sendMailMock: vi.fn(),
  createImapClientMock: vi.fn(),
  listImapMailboxesMock: vi.fn(),
  parseMailSourceMock: vi.fn(),
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

vi.mock('./mail/mail-imap', () => ({
  createImapClient: createImapClientMock,
  listImapMailboxes: listImapMailboxesMock,
}));

vi.mock('./mail/mail-processor', () => ({
  parseMailSource: parseMailSourceMock,
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
    async countDocuments(filter: Record<string, unknown>): Promise<number> {
      return docs.filter((entry) => matchesFilter(entry, filter)).length;
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

type MockImapMailboxState = {
  uidValidity: bigint;
  uidNext: number;
};

const createMockImapClient = (input: {
  mailboxStates: Record<string, MockImapMailboxState>;
  initialSearchUids?: number[] | false;
  incrementalSearchUids?: number[] | false;
  entries?: Array<{
    uid: number;
    flags?: Set<string>;
    envelope?: {
      subject?: string;
      messageId?: string;
      inReplyTo?: string;
      from?: Array<{ name?: string; address?: string }>;
      to?: Array<{ name?: string; address?: string }>;
      cc?: Array<{ name?: string; address?: string }>;
      replyTo?: Array<{ name?: string; address?: string }>;
      date?: Date;
    };
    internalDate?: Date;
    source?: Buffer;
    threadId?: string;
  }>;
  connectError?: Error;
}) => {
  const mailboxRef: { current: MockImapMailboxState | false } = { current: false };
  const client = {
    connect: vi.fn(async () => {
      if (input.connectError) throw input.connectError;
    }),
    logout: vi.fn(async () => true),
    close: vi.fn(),
    search: vi.fn(async (query: Record<string, unknown>) => {
      if (typeof query['uid'] === 'string') {
        return input.incrementalSearchUids ?? [];
      }
      return input.initialSearchUids ?? [];
    }),
    getMailboxLock: vi.fn(async (path: string) => {
      const mailboxState = input.mailboxStates[path];
      if (!mailboxState) {
        throw new Error(`Mailbox ${path} not found`);
      }
      mailboxRef.current = mailboxState;
      return {
        path,
        release: vi.fn(() => {
          mailboxRef.current = false;
        }),
      };
    }),
    fetch: vi.fn(async function* (uids: number[]) {
      for (const entry of input.entries ?? []) {
        if (!uids.includes(entry.uid)) continue;
        yield {
          seq: entry.uid,
          uid: entry.uid,
          flags: entry.flags ?? new Set<string>(),
          envelope: entry.envelope,
          internalDate: entry.internalDate,
          source: entry.source ?? Buffer.from(`message-${entry.uid}`),
          threadId: entry.threadId,
        };
      }
    }),
    get mailbox() {
      return mailboxRef.current;
    },
  };

  return client;
};

const createMailAccountDoc = () => ({
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
});

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
    values: [],
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

  it('preserves existing secret setting keys when updating an account with blank passwords', async () => {
    const mongoHarness = createMongoHarness();
    mongoHarness.seed('filemaker_mail_accounts', [
      {
        ...createMailAccountDoc(),
        imapPasswordSettingKey: 'imap-custom-key',
        smtpPasswordSettingKey: 'smtp-custom-key',
      },
    ]);
    getMongoDbMock.mockResolvedValue(mongoHarness.mongo);

    const { getFilemakerMailAccount, upsertFilemakerMailAccount } = await import(
      './filemaker-mail-service'
    );

    const updated = await upsertFilemakerMailAccount({
      id: 'account-1',
      name: 'Support Inbox Updated',
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
    const stored = await getFilemakerMailAccount('account-1');

    expect(updated.imapPasswordSettingKey).toBe('imap-custom-key');
    expect(updated.smtpPasswordSettingKey).toBe('smtp-custom-key');
    expect(stored.imapPasswordSettingKey).toBe('imap-custom-key');
    expect(stored.smtpPasswordSettingKey).toBe('smtp-custom-key');
    expect(findProviderForKeyMock).not.toHaveBeenCalled();
  });

  it('updates mailbox status without rewriting stored secrets', async () => {
    const secretProvider = {
      upsertValue: vi.fn(async () => true),
    };
    findProviderForKeyMock.mockResolvedValue(secretProvider);

    const mongoHarness = createMongoHarness();
    getMongoDbMock.mockResolvedValue(mongoHarness.mongo);

    const { getFilemakerMailAccount, updateFilemakerMailAccountStatus, upsertFilemakerMailAccount } =
      await import('./filemaker-mail-service');

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

    vi.setSystemTime(new Date('2026-03-30T10:00:00.000Z'));

    const updated = await updateFilemakerMailAccountStatus('account-1', 'paused');
    const stored = await getFilemakerMailAccount('account-1');

    expect(updated.status).toBe('paused');
    expect(stored.status).toBe('paused');
    expect(stored.updatedAt).toBe('2026-03-30T10:00:00.000Z');
    expect(secretProvider.upsertValue).toHaveBeenCalledTimes(2);
  });

  it('limits thread listings by recent activity when a limit is requested', async () => {
    const mongoHarness = createMongoHarness();
    mongoHarness.seed('filemaker_mail_threads', [
      {
        _id: 'thread-older',
        id: 'thread-older',
        accountId: 'account-1',
        mailboxPath: 'INBOX',
        mailboxRole: 'inbox',
        providerThreadId: null,
        subject: 'Older thread',
        normalizedSubject: 'older thread',
        snippet: 'Older preview',
        participantSummary: [{ address: 'older@example.com', name: 'Older' }],
        relatedPersonIds: [],
        relatedOrganizationIds: [],
        unreadCount: 0,
        messageCount: 1,
        lastMessageAt: '2026-03-27T10:00:00.000Z',
      },
      {
        _id: 'thread-newest',
        id: 'thread-newest',
        accountId: 'account-1',
        mailboxPath: 'INBOX',
        mailboxRole: 'inbox',
        providerThreadId: null,
        subject: 'Newest thread',
        normalizedSubject: 'newest thread',
        snippet: 'Newest preview',
        participantSummary: [{ address: 'newest@example.com', name: 'Newest' }],
        relatedPersonIds: [],
        relatedOrganizationIds: [],
        unreadCount: 2,
        messageCount: 3,
        lastMessageAt: '2026-03-28T11:00:00.000Z',
      },
      {
        _id: 'thread-middle',
        id: 'thread-middle',
        accountId: 'account-1',
        mailboxPath: 'VIP',
        mailboxRole: 'custom',
        providerThreadId: null,
        subject: 'Middle thread',
        normalizedSubject: 'middle thread',
        snippet: 'Middle preview',
        participantSummary: [{ address: 'middle@example.com', name: 'Middle' }],
        relatedPersonIds: [],
        relatedOrganizationIds: [],
        unreadCount: 1,
        messageCount: 2,
        lastMessageAt: '2026-03-28T10:00:00.000Z',
      },
      {
        _id: 'thread-other-account',
        id: 'thread-other-account',
        accountId: 'account-2',
        mailboxPath: 'INBOX',
        mailboxRole: 'inbox',
        providerThreadId: null,
        subject: 'Other account thread',
        normalizedSubject: 'other account thread',
        snippet: 'Other preview',
        participantSummary: [{ address: 'other@example.com', name: 'Other' }],
        relatedPersonIds: [],
        relatedOrganizationIds: [],
        unreadCount: 0,
        messageCount: 1,
        lastMessageAt: '2026-03-29T09:00:00.000Z',
      },
    ]);
    getMongoDbMock.mockResolvedValue(mongoHarness.mongo);

    const { listFilemakerMailThreads } = await import('./filemaker-mail-service');

    const threads = await listFilemakerMailThreads({
      accountId: 'account-1',
      limit: 2,
    });

    expect(threads.map((thread) => thread.id)).toEqual(['thread-newest', 'thread-middle']);
  });

  it('lists campaign-linked threads by campaign, run, and delivery context', async () => {
    const mongoHarness = createMongoHarness();
    mongoHarness.seed('filemaker_mail_threads', [
      {
        _id: 'thread-campaign-delivery-1',
        id: 'thread-campaign-delivery-1',
        accountId: 'account-1',
        mailboxPath: 'Sent',
        mailboxRole: 'sent',
        providerThreadId: null,
        subject: 'Campaign delivery 1',
        normalizedSubject: 'campaign delivery 1',
        snippet: 'Preview 1',
        participantSummary: [{ address: 'one@example.com', name: 'One' }],
        relatedPersonIds: [],
        relatedOrganizationIds: [],
        unreadCount: 0,
        messageCount: 1,
        lastMessageAt: '2026-03-29T10:00:00.000Z',
        campaignContext: {
          campaignId: 'campaign-spring',
          runId: 'run-1',
          deliveryId: 'delivery-1',
        },
      },
      {
        _id: 'thread-campaign-delivery-2',
        id: 'thread-campaign-delivery-2',
        accountId: 'account-1',
        mailboxPath: 'Sent',
        mailboxRole: 'sent',
        providerThreadId: null,
        subject: 'Campaign delivery 2',
        normalizedSubject: 'campaign delivery 2',
        snippet: 'Preview 2',
        participantSummary: [{ address: 'two@example.com', name: 'Two' }],
        relatedPersonIds: [],
        relatedOrganizationIds: [],
        unreadCount: 0,
        messageCount: 1,
        lastMessageAt: '2026-03-29T11:00:00.000Z',
        campaignContext: {
          campaignId: 'campaign-spring',
          runId: 'run-1',
          deliveryId: 'delivery-2',
        },
      },
      {
        _id: 'thread-other-campaign',
        id: 'thread-other-campaign',
        accountId: 'account-1',
        mailboxPath: 'Sent',
        mailboxRole: 'sent',
        providerThreadId: null,
        subject: 'Other campaign',
        normalizedSubject: 'other campaign',
        snippet: 'Other preview',
        participantSummary: [{ address: 'other@example.com', name: 'Other' }],
        relatedPersonIds: [],
        relatedOrganizationIds: [],
        unreadCount: 0,
        messageCount: 1,
        lastMessageAt: '2026-03-29T12:00:00.000Z',
        campaignContext: {
          campaignId: 'campaign-other',
          runId: 'run-2',
          deliveryId: 'delivery-3',
        },
      },
    ]);
    getMongoDbMock.mockResolvedValue(mongoHarness.mongo);

    const {
      getFilemakerMailThreadForCampaignDelivery,
      listFilemakerMailThreads,
      listFilemakerMailThreadsForCampaign,
    } = await import('./filemaker-mail-service');

    const runThreads = await listFilemakerMailThreadsForCampaign({
      campaignId: 'campaign-spring',
      runId: 'run-1',
    });
    const deliveryThread = await getFilemakerMailThreadForCampaignDelivery({
      campaignId: 'campaign-spring',
      runId: 'run-1',
      deliveryId: 'delivery-1',
    });
    const queriedThreads = await listFilemakerMailThreads({
      query: 'run-1',
    });

    expect(runThreads.map((thread) => thread.id)).toEqual([
      'thread-campaign-delivery-2',
      'thread-campaign-delivery-1',
    ]);
    expect(deliveryThread?.id).toBe('thread-campaign-delivery-1');
    expect(queriedThreads.map((thread) => thread.id)).toEqual([
      'thread-campaign-delivery-2',
      'thread-campaign-delivery-1',
    ]);
  });

  it('downloads IMAP messages, stores them, and updates sync state', async () => {
    const mongoHarness = createMongoHarness();
    mongoHarness.seed('filemaker_mail_accounts', [createMailAccountDoc()]);
    getMongoDbMock.mockResolvedValue(mongoHarness.mongo);

    const client = createMockImapClient({
      mailboxStates: {
        INBOX: {
          uidValidity: 123n,
          uidNext: 43,
        },
      },
      initialSearchUids: [41, 42],
      entries: [
        {
          uid: 41,
          flags: new Set(),
          envelope: {
            subject: 'Welcome',
            messageId: '<message-41@example.com>',
            from: [{ name: 'Jane Recipient', address: 'jane@example.com' }],
            to: [{ address: 'support@example.com' }],
            date: new Date('2026-03-27T10:00:00.000Z'),
          },
          internalDate: new Date('2026-03-27T10:01:00.000Z'),
        },
        {
          uid: 42,
          flags: new Set(['\\Seen']),
          envelope: {
            subject: 'Welcome',
            messageId: '<message-42@example.com>',
            from: [{ name: 'Jane Recipient', address: 'jane@example.com' }],
            to: [{ address: 'support@example.com' }],
            date: new Date('2026-03-27T10:05:00.000Z'),
          },
          internalDate: new Date('2026-03-27T10:06:00.000Z'),
        },
      ],
    });
    createImapClientMock.mockReturnValue(client);
    listImapMailboxesMock.mockResolvedValue([
      {
        path: 'INBOX',
        flags: new Set<string>(),
        specialUse: '\\Inbox',
      },
    ]);
    parseMailSourceMock
      .mockResolvedValueOnce({
        subject: 'Welcome',
        messageId: '<message-41@example.com>',
        from: { value: [{ name: 'Jane Recipient', address: 'jane@example.com' }] },
        to: { value: [{ address: 'support@example.com' }] },
        text: 'Hello from Jane',
        html: '<p>Hello from <strong>Jane</strong></p>',
        date: new Date('2026-03-27T10:00:00.000Z'),
        references: [],
        attachments: [],
      })
      .mockResolvedValueOnce({
        subject: 'Welcome',
        messageId: '<message-42@example.com>',
        from: { value: [{ name: 'Jane Recipient', address: 'jane@example.com' }] },
        to: { value: [{ address: 'support@example.com' }] },
        text: 'Second note',
        html: '<p>Second note</p>',
        date: new Date('2026-03-27T10:05:00.000Z'),
        references: '<message-41@example.com> <legacy-message@example.com>',
        attachments: [],
      });

    const { syncFilemakerMailAccount } = await import('./filemaker-mail-service');

    const result = await syncFilemakerMailAccount('account-1');

    const accountDocs = mongoHarness.docs<MockDocument>('filemaker_mail_accounts');
    const threadDocs = mongoHarness.docs<MockDocument>('filemaker_mail_threads');
    const messageDocs = mongoHarness.docs<MockDocument>('filemaker_mail_messages');
    const syncStateDocs = mongoHarness.docs<MockDocument>('filemaker_mail_sync_states');

    expect(result).toEqual(
      expect.objectContaining({
        accountId: 'account-1',
        foldersScanned: ['INBOX'],
        fetchedMessageCount: 2,
        insertedMessageCount: 2,
        updatedMessageCount: 0,
        touchedThreadCount: 1,
        lastSyncError: null,
      })
    );
    expect(createImapClientMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'account-1' }),
      'imap-secret'
    );
    expect(listImapMailboxesMock).toHaveBeenCalledWith(client);
    expect(messageDocs).toHaveLength(2);
    expect(messageDocs[0]?.providerUid).toBe(41);
    expect(threadDocs).toHaveLength(1);
    expect(threadDocs[0]).toEqual(
      expect.objectContaining({
        mailboxPath: 'INBOX',
        messageCount: 2,
        unreadCount: 1,
        relatedPersonIds: ['person-1'],
      })
    );
    expect(syncStateDocs).toHaveLength(1);
    expect(syncStateDocs[0]).toEqual(
      expect.objectContaining({
        accountId: 'account-1',
        mailboxPath: 'INBOX',
        uidValidity: '123',
        lastUid: 42,
      })
    );
    expect(accountDocs[0]).toEqual(
      expect.objectContaining({
        id: 'account-1',
        lastSyncError: null,
        lastSyncedAt: expect.any(String),
      })
    );
  });

  it('syncs with the IMAP password key stored on the account', async () => {
    readSecretSettingValuesMock.mockResolvedValue({
      'imap-custom-key': 'custom-imap-secret',
    });

    const mongoHarness = createMongoHarness();
    mongoHarness.seed('filemaker_mail_accounts', [
      {
        ...createMailAccountDoc(),
        imapPasswordSettingKey: 'imap-custom-key',
      },
    ]);
    getMongoDbMock.mockResolvedValue(mongoHarness.mongo);

    const client = createMockImapClient({
      mailboxStates: {
        INBOX: {
          uidValidity: 123n,
          uidNext: 1,
        },
      },
      initialSearchUids: [],
    });
    createImapClientMock.mockReturnValue(client);
    listImapMailboxesMock.mockResolvedValue([
      {
        path: 'INBOX',
        flags: new Set<string>(),
        specialUse: '\\Inbox',
      },
    ]);

    const { syncFilemakerMailAccount } = await import('./filemaker-mail-service');

    const result = await syncFilemakerMailAccount('account-1');

    expect(readSecretSettingValuesMock).toHaveBeenCalledWith(['imap-custom-key']);
    expect(createImapClientMock).toHaveBeenCalledWith(
      expect.objectContaining({ imapPasswordSettingKey: 'imap-custom-key' }),
      'custom-imap-secret'
    );
    expect(result.lastSyncError).toBeNull();
  });

  it('replays the initial mailbox sync when sync state exists but no messages were stored', async () => {
    const mongoHarness = createMongoHarness();
    mongoHarness.seed('filemaker_mail_accounts', [createMailAccountDoc()]);
    mongoHarness.seed('filemaker_mail_sync_states', [
      {
        _id: 'sync-state-1',
        id: 'sync-state-1',
        createdAt: '2026-03-27T10:00:00.000Z',
        updatedAt: '2026-03-27T10:00:00.000Z',
        accountId: 'account-1',
        mailboxPath: 'INBOX',
        role: 'inbox',
        uidValidity: '123',
        lastUid: 99,
        lastSyncedAt: '2026-03-27T10:00:00.000Z',
      },
    ]);
    getMongoDbMock.mockResolvedValue(mongoHarness.mongo);

    const client = createMockImapClient({
      mailboxStates: {
        INBOX: {
          uidValidity: 123n,
          uidNext: 42,
        },
      },
      initialSearchUids: [41],
      incrementalSearchUids: [100],
      entries: [
        {
          uid: 41,
          flags: new Set(),
          envelope: {
            subject: 'Recovered message',
            messageId: '<message-41@example.com>',
            from: [{ name: 'Jane Recipient', address: 'jane@example.com' }],
            to: [{ address: 'support@example.com' }],
            date: new Date('2026-03-27T10:00:00.000Z'),
          },
          internalDate: new Date('2026-03-27T10:01:00.000Z'),
        },
      ],
    });
    createImapClientMock.mockReturnValue(client);
    listImapMailboxesMock.mockResolvedValue([
      {
        path: 'INBOX',
        flags: new Set<string>(),
        specialUse: '\\Inbox',
      },
    ]);
    parseMailSourceMock.mockResolvedValueOnce({
      subject: 'Recovered message',
      messageId: '<message-41@example.com>',
      from: { value: [{ name: 'Jane Recipient', address: 'jane@example.com' }] },
      to: { value: [{ address: 'support@example.com' }] },
      text: 'Recovered body',
      html: '<p>Recovered body</p>',
      date: new Date('2026-03-27T10:00:00.000Z'),
      references: [],
      attachments: [],
    });

    const { syncFilemakerMailAccount } = await import('./filemaker-mail-service');

    const result = await syncFilemakerMailAccount('account-1');
    const messageDocs = mongoHarness.docs<MockDocument>('filemaker_mail_messages');
    const syncStateDocs = mongoHarness.docs<MockDocument>('filemaker_mail_sync_states');

    expect(client.search).toHaveBeenCalledWith({ since: expect.any(Date) }, { uid: true });
    expect(result).toEqual(
      expect.objectContaining({
        accountId: 'account-1',
        fetchedMessageCount: 1,
        insertedMessageCount: 1,
        updatedMessageCount: 0,
        lastSyncError: null,
      })
    );
    expect(messageDocs).toHaveLength(1);
    expect(messageDocs[0]).toEqual(
      expect.objectContaining({
        providerUid: 41,
        subject: 'Recovered message',
      })
    );
    expect(syncStateDocs[0]).toEqual(
      expect.objectContaining({
        accountId: 'account-1',
        mailboxPath: 'INBOX',
        lastUid: 41,
      })
    );
  });

  it('keeps syncing available folders when another configured folder fails', async () => {
    const mongoHarness = createMongoHarness();
    mongoHarness.seed('filemaker_mail_accounts', [
      {
        ...createMailAccountDoc(),
        folderAllowlist: ['INBOX', 'Broken'],
      },
    ]);
    getMongoDbMock.mockResolvedValue(mongoHarness.mongo);

    const client = createMockImapClient({
      mailboxStates: {
        INBOX: {
          uidValidity: 123n,
          uidNext: 42,
        },
      },
      initialSearchUids: [41],
      entries: [
        {
          uid: 41,
          flags: new Set(),
          envelope: {
            subject: 'Available folder message',
            messageId: '<message-41@example.com>',
            from: [{ name: 'Jane Recipient', address: 'jane@example.com' }],
            to: [{ address: 'support@example.com' }],
            date: new Date('2026-03-27T10:00:00.000Z'),
          },
          internalDate: new Date('2026-03-27T10:01:00.000Z'),
        },
      ],
    });
    createImapClientMock.mockReturnValue(client);
    listImapMailboxesMock.mockResolvedValue([
      {
        path: 'INBOX',
        flags: new Set<string>(),
        specialUse: '\\Inbox',
      },
      {
        path: 'Broken',
        flags: new Set<string>(),
      },
    ]);
    parseMailSourceMock.mockResolvedValueOnce({
      subject: 'Available folder message',
      messageId: '<message-41@example.com>',
      from: { value: [{ name: 'Jane Recipient', address: 'jane@example.com' }] },
      to: { value: [{ address: 'support@example.com' }] },
      text: 'Available body',
      html: '<p>Available body</p>',
      date: new Date('2026-03-27T10:00:00.000Z'),
      references: [],
      attachments: [],
    });

    const { syncFilemakerMailAccount } = await import('./filemaker-mail-service');

    const result = await syncFilemakerMailAccount('account-1');
    const accountDocs = mongoHarness.docs<MockDocument>('filemaker_mail_accounts');
    const messageDocs = mongoHarness.docs<MockDocument>('filemaker_mail_messages');

    expect(result).toEqual(
      expect.objectContaining({
        accountId: 'account-1',
        fetchedMessageCount: 1,
        insertedMessageCount: 1,
        updatedMessageCount: 0,
        lastSyncError:
          'Mailbox sync finished with 1 failed folder: Broken: Mailbox Broken not found',
      })
    );
    expect(messageDocs).toHaveLength(1);
    expect(messageDocs[0]).toEqual(
      expect.objectContaining({
        providerUid: 41,
        subject: 'Available folder message',
      })
    );
    expect(accountDocs[0]).toEqual(
      expect.objectContaining({
        id: 'account-1',
        lastSyncError:
          'Mailbox sync finished with 1 failed folder: Broken: Mailbox Broken not found',
        lastSyncedAt: expect.any(String),
      })
    );
  });

  it('inherits campaign context for inbound replies matched to an existing campaign thread', async () => {
    const mongoHarness = createMongoHarness();
    mongoHarness.seed('filemaker_mail_accounts', [createMailAccountDoc()]);
    mongoHarness.seed('filemaker_mail_threads', [
      {
        _id: 'campaign-thread-1',
        id: 'campaign-thread-1',
        createdAt: '2026-03-27T10:00:00.000Z',
        updatedAt: '2026-03-27T10:00:00.000Z',
        accountId: 'account-1',
        mailboxPath: 'INBOX',
        mailboxRole: 'inbox',
        providerThreadId: null,
        subject: 'Spring Offer',
        normalizedSubject: 'Spring Offer',
        anchorAddress: 'jane@example.com',
        snippet: 'Campaign sent',
        participantSummary: [{ address: 'jane@example.com', name: 'Jane Recipient' }],
        relatedPersonIds: [],
        relatedOrganizationIds: [],
        unreadCount: 0,
        messageCount: 1,
        lastMessageAt: '2026-03-27T10:00:00.000Z',
        campaignContext: {
          campaignId: 'campaign-spring',
          runId: 'run-1',
          deliveryId: 'delivery-1',
        },
      },
    ]);
    getMongoDbMock.mockResolvedValue(mongoHarness.mongo);

    const client = createMockImapClient({
      mailboxStates: {
        INBOX: {
          uidValidity: 123n,
          uidNext: 44,
        },
      },
      initialSearchUids: [43],
      entries: [
        {
          uid: 43,
          flags: new Set(),
          envelope: {
            subject: 'Re: Spring Offer',
            messageId: '<reply-43@example.com>',
            from: [{ name: 'Jane Recipient', address: 'jane@example.com' }],
            to: [{ address: 'support@example.com' }],
            date: new Date('2026-03-27T10:30:00.000Z'),
          },
          internalDate: new Date('2026-03-27T10:31:00.000Z'),
        },
      ],
    });
    createImapClientMock.mockReturnValue(client);
    listImapMailboxesMock.mockResolvedValue([
      {
        path: 'INBOX',
        flags: new Set<string>(),
        specialUse: '\\Inbox',
      },
    ]);
    parseMailSourceMock.mockResolvedValueOnce({
      subject: 'Re: Spring Offer',
      messageId: '<reply-43@example.com>',
      from: { value: [{ name: 'Jane Recipient', address: 'jane@example.com' }] },
      to: { value: [{ address: 'support@example.com' }] },
      text: 'Sounds good',
      html: '<p>Sounds good</p>',
      date: new Date('2026-03-27T10:30:00.000Z'),
      references: [],
      attachments: [],
    });

    const { syncFilemakerMailAccount } = await import('./filemaker-mail-service');

    await syncFilemakerMailAccount('account-1');

    const messageDocs = mongoHarness.docs<MockDocument>('filemaker_mail_messages');
    expect(messageDocs[0]).toEqual(
      expect.objectContaining({
        threadId: 'campaign-thread-1',
        campaignContext: {
          campaignId: 'campaign-spring',
          runId: 'run-1',
          deliveryId: 'delivery-1',
        },
      })
    );
  });

  it('records IMAP sync errors on the account and returns the failure message', async () => {
    const mongoHarness = createMongoHarness();
    mongoHarness.seed('filemaker_mail_accounts', [createMailAccountDoc()]);
    getMongoDbMock.mockResolvedValue(mongoHarness.mongo);

    const client = createMockImapClient({
      mailboxStates: {
        INBOX: {
          uidValidity: 123n,
          uidNext: 1,
        },
      },
      connectError: new Error('Authentication failed'),
    });
    createImapClientMock.mockReturnValue(client);

    const { syncFilemakerMailAccount } = await import('./filemaker-mail-service');

    const result = await syncFilemakerMailAccount('account-1');
    const accountDocs = mongoHarness.docs<MockDocument>('filemaker_mail_accounts');

    expect(result).toEqual(
      expect.objectContaining({
        accountId: 'account-1',
        fetchedMessageCount: 0,
        insertedMessageCount: 0,
        updatedMessageCount: 0,
        touchedThreadCount: 0,
        lastSyncError: 'Authentication failed',
      })
    );
    expect(accountDocs[0]).toEqual(
      expect.objectContaining({
        id: 'account-1',
        lastSyncError: 'Authentication failed',
        lastSyncedAt: null,
      })
    );
  });

  it('records IMAP command response details when the provider rejects sync', async () => {
    const mongoHarness = createMongoHarness();
    mongoHarness.seed('filemaker_mail_accounts', [createMailAccountDoc()]);
    getMongoDbMock.mockResolvedValue(mongoHarness.mongo);

    const connectError = Object.assign(new Error('Command failed'), {
      responseStatus: 'NO',
      responseText: 'sync is not available for this account',
      serverResponseCode: 'ALERT',
    });
    const client = createMockImapClient({
      mailboxStates: {
        INBOX: {
          uidValidity: 123n,
          uidNext: 1,
        },
      },
      connectError,
    });
    createImapClientMock.mockReturnValue(client);

    const { syncFilemakerMailAccount } = await import('./filemaker-mail-service');

    const result = await syncFilemakerMailAccount('account-1');
    const accountDocs = mongoHarness.docs<MockDocument>('filemaker_mail_accounts');

    expect(result).toEqual(
      expect.objectContaining({
        accountId: 'account-1',
        fetchedMessageCount: 0,
        insertedMessageCount: 0,
        updatedMessageCount: 0,
        touchedThreadCount: 0,
        lastSyncError:
          'IMAP command failed (NO ALERT): sync is not available for this account',
      })
    );
    expect(accountDocs[0]).toEqual(
      expect.objectContaining({
        id: 'account-1',
        lastSyncError:
          'IMAP command failed (NO ALERT): sync is not available for this account',
        lastSyncedAt: null,
      })
    );
  });

  it('records IMAP search failures without advancing the mailbox sync state', async () => {
    const mongoHarness = createMongoHarness();
    mongoHarness.seed('filemaker_mail_accounts', [createMailAccountDoc()]);
    getMongoDbMock.mockResolvedValue(mongoHarness.mongo);

    const client = createMockImapClient({
      mailboxStates: {
        INBOX: {
          uidValidity: 123n,
          uidNext: 43,
        },
      },
      initialSearchUids: false,
    });
    createImapClientMock.mockReturnValue(client);
    listImapMailboxesMock.mockResolvedValue([
      {
        path: 'INBOX',
        flags: new Set<string>(),
        specialUse: '\\Inbox',
      },
    ]);

    const { syncFilemakerMailAccount } = await import('./filemaker-mail-service');

    const result = await syncFilemakerMailAccount('account-1');
    const accountDocs = mongoHarness.docs<MockDocument>('filemaker_mail_accounts');
    const syncStateDocs = mongoHarness.docs<MockDocument>('filemaker_mail_sync_states');

    expect(result).toEqual(
      expect.objectContaining({
        accountId: 'account-1',
        fetchedMessageCount: 0,
        insertedMessageCount: 0,
        updatedMessageCount: 0,
        touchedThreadCount: 0,
        lastSyncError:
          'Mailbox sync finished with 1 failed folder: INBOX: IMAP search failed for mailbox INBOX. The server rejected the search command.',
      })
    );
    expect(syncStateDocs).toHaveLength(0);
    expect(accountDocs[0]).toEqual(
      expect.objectContaining({
        id: 'account-1',
        lastSyncError:
          'Mailbox sync finished with 1 failed folder: INBOX: IMAP search failed for mailbox INBOX. The server rejected the search command.',
        lastSyncedAt: null,
      })
    );
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
