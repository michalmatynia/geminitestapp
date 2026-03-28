'use server';

import 'server-only';

import { createRequire } from 'module';
import { randomUUID, createHash } from 'crypto';

import { ImapFlow } from 'imapflow';
import { createTransport } from 'nodemailer';

import type { MongoStringSettingRecord } from '@/shared/contracts/settings';
import { configurationError, validationError } from '@/shared/errors/app-error';
import { findProviderForKey } from '@/shared/lib/db/settings-registry';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { clearSecretSettingCache, readSecretSettingValues } from '@/shared/lib/settings/secret-settings';
import { encodeSettingValue } from '@/shared/lib/settings/settings-compression';
import { clearSettingsCache } from '@/shared/lib/settings-cache';
import { clearLiteSettingsServerCache } from '@/shared/lib/settings-lite-server-cache';
import { sanitizeHtml } from '@/shared/utils';

import {
  buildFilemakerMailPlainText,
  buildFilemakerMailReplyHtmlSeed,
  buildFilemakerMailSnippet,
  dedupeFilemakerMailParticipants,
  ensureFilemakerReplySubject,
  normalizeFilemakerMailSubject,
  resolveFilemakerReplyRecipients,
} from '../mail-utils';
import { FILEMAKER_DATABASE_KEY } from '../settings-constants';
import { normalizeFilemakerDatabase } from '../filemaker-settings.database';
import { normalizeString, toIdToken } from '../filemaker-settings.helpers';
import { readFilemakerCampaignSettingValue } from './campaign-settings-store';

import type {
  FilemakerDatabase,
  FilemakerMailAccount,
  FilemakerMailAccountDraft,
  FilemakerMailAttachment,
  FilemakerMailComposeInput,
  FilemakerMailFlags,
  FilemakerMailFolderRole,
  FilemakerMailFolderSyncState,
  FilemakerMailMessage,
  FilemakerMailMessageDirection,
  FilemakerMailOutboxEntry,
  FilemakerMailParticipant,
  FilemakerMailSyncResult,
  FilemakerMailThread,
  FilemakerMailThreadDetail,
} from '../types';
import type {
  FetchMessageObject,
  ListResponse,
  MessageAddressObject,
  MessageEnvelopeObject,
} from 'imapflow';

const SETTINGS_COLLECTION = 'settings';
const MAIL_ACCOUNTS_COLLECTION = 'filemaker_mail_accounts';
const MAIL_THREADS_COLLECTION = 'filemaker_mail_threads';
const MAIL_MESSAGES_COLLECTION = 'filemaker_mail_messages';
const MAIL_SYNC_STATES_COLLECTION = 'filemaker_mail_sync_states';
const MAIL_OUTBOX_COLLECTION = 'filemaker_mail_outbox';

const invalidateSettingsCaches = (): void => {
  clearSettingsCache();
  clearLiteSettingsServerCache();
  clearSecretSettingCache();
};

type FilemakerMailAccountDocument = FilemakerMailAccount & { _id: string };
type FilemakerMailThreadDocument = FilemakerMailThread & { _id: string };
type FilemakerMailMessageDocument = FilemakerMailMessage & { _id: string };
type FilemakerMailSyncStateDocument = FilemakerMailFolderSyncState & { _id: string };
type FilemakerMailOutboxDocument = FilemakerMailOutboxEntry & { _id: string };

type FilemakerMailPartyLinks = {
  persons: string[];
  organizations: string[];
};

type MailparserAddressEntry = {
  name?: string | null;
  address?: string | null;
};

type MailparserAddressObject = {
  value?: MailparserAddressEntry[] | null;
};

type MailparserAttachment = {
  filename?: string | null;
  contentType?: string | null;
  size?: number | null;
  cid?: string | null;
  contentDisposition?: string | null;
};

type MailparserParsedMail = {
  from?: MailparserAddressObject | null;
  to?: MailparserAddressObject | null;
  cc?: MailparserAddressObject | null;
  bcc?: MailparserAddressObject | null;
  replyTo?: MailparserAddressObject | null;
  subject?: string | null;
  html?: string | { toString(): string } | null;
  text?: string | null;
  messageId?: string | null;
  date?: Date | null;
  inReplyTo?: string | null;
  references?: string[] | null;
  attachments?: MailparserAttachment[] | null;
};

type MailparserSimpleParser = (
  source: string | Buffer | Uint8Array | NodeJS.ReadableStream
) => Promise<MailparserParsedMail>;

const normalizeEmailAddress = (value: string | null | undefined): string => {
  const normalized = normalizeString(value).toLowerCase();
  return normalized;
};

const getMailparserSimpleParser = (): MailparserSimpleParser => {
  const requireFn = createRequire(import.meta.url);
  const moduleRef = requireFn('mailparser') as { simpleParser?: MailparserSimpleParser };
  if (typeof moduleRef.simpleParser !== 'function') {
    throw configurationError('mailparser simpleParser runtime is not available.');
  }
  return moduleRef.simpleParser;
};

const parseMailSource = async (
  source: string | Buffer | Uint8Array | NodeJS.ReadableStream
): Promise<MailparserParsedMail> => {
  const parser = getMailparserSimpleParser();
  return await parser(source);
};

const toParticipant = (
  input: MessageAddressObject | FilemakerMailParticipant | null | undefined
): FilemakerMailParticipant | null => {
  if (!input?.address) return null;
  const address = normalizeEmailAddress(input.address);
  if (!address) return null;
  return {
    address,
    name: normalizeString('name' in input ? input.name : null) || null,
  };
};

const toParticipantList = (
  input:
    | MessageAddressObject[]
    | FilemakerMailParticipant[]
    | null
    | undefined
): FilemakerMailParticipant[] =>
  dedupeFilemakerMailParticipants(
    (input ?? [])
      .map((entry) => toParticipant(entry))
      .filter((entry): entry is FilemakerMailParticipant => Boolean(entry))
  );

const pickParticipantList = (
  preferred: FilemakerMailParticipant[],
  fallback: FilemakerMailParticipant[]
): FilemakerMailParticipant[] => (preferred.length > 0 ? preferred : fallback);

const parseMailParserAddressList = (input: unknown): FilemakerMailParticipant[] => {
  if (!input || typeof input !== 'object') return [];
  const values = Array.isArray((input as { value?: unknown }).value)
    ? ((input as { value?: Array<{ name?: string; address?: string }> }).value ?? [])
    : [];
  const participants: FilemakerMailParticipant[] = [];
  values.forEach((entry) => {
    if (!entry.address) return;
    participants.push({
      address: normalizeEmailAddress(entry.address),
      name: normalizeString(entry.name) || null,
    });
  });
  return dedupeFilemakerMailParticipants(participants);
};

const normalizeMailboxRole = (mailbox: Pick<ListResponse, 'path' | 'specialUse'>): FilemakerMailFolderRole => {
  const specialUse = normalizeString(mailbox.specialUse).toLowerCase();
  if (specialUse === '\\inbox' || mailbox.path.toUpperCase() === 'INBOX') return 'inbox';
  if (specialUse === '\\sent') return 'sent';
  if (specialUse === '\\drafts') return 'drafts';
  if (specialUse === '\\trash') return 'trash';
  if (specialUse === '\\archive') return 'archive';
  if (specialUse === '\\junk') return 'spam';
  return 'custom';
};

const buildSyncStateId = (accountId: string, mailboxPath: string): string =>
  `filemaker-mail-sync-${toIdToken(`${accountId}-${mailboxPath}`) || randomUUID()}`;

const buildAccountSecretSettingKey = (
  accountId: string,
  kind: 'imap_password' | 'smtp_password'
): string => `filemaker_mail_account_${accountId}_${kind}`;

const buildThreadId = (input: {
  accountId: string;
  providerThreadId?: string | null;
  normalizedSubject: string;
  anchorAddress: string;
}): string => {
  const hash = createHash('sha1')
    .update(
      input.providerThreadId
        ? `${input.accountId}:${input.providerThreadId}`
        : `${input.accountId}:${input.normalizedSubject}:${input.anchorAddress}`
    )
    .digest('hex')
    .slice(0, 16);
  return `filemaker-mail-thread-${hash}`;
};

const pickAnchorAddress = (participants: FilemakerMailParticipant[]): string =>
  participants[0]?.address ?? 'unknown';

const resolveDirection = (
  account: Pick<FilemakerMailAccount, 'emailAddress'>,
  from: FilemakerMailParticipant | null
): FilemakerMailMessageDirection =>
  normalizeEmailAddress(from?.address) === normalizeEmailAddress(account.emailAddress)
    ? 'outbound'
    : 'inbound';

const deriveFlags = (flags: Set<string> | undefined): FilemakerMailFlags => ({
  seen: flags?.has('\\Seen') ?? false,
  answered: flags?.has('\\Answered') ?? false,
  flagged: flags?.has('\\Flagged') ?? false,
  draft: flags?.has('\\Draft') ?? false,
  deleted: flags?.has('\\Deleted') ?? false,
});

const parseReferencesHeader = (envelope: MessageEnvelopeObject | undefined): string[] => {
  if (!envelope?.inReplyTo) return [];
  return envelope.inReplyTo
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const upsertSecretSettingValue = async (key: string, value: string): Promise<void> => {
  const provider = await findProviderForKey(key);
  if (provider) {
    await provider.upsertValue(key, value);
    invalidateSettingsCaches();
    return;
  }
  if (!process.env['MONGODB_URI']) {
    throw configurationError('MONGODB_URI is not set.');
  }
  const mongo = await getMongoDb();
  const now = new Date();
  await mongo.collection<MongoStringSettingRecord>(SETTINGS_COLLECTION).updateOne(
    { key },
    {
      $set: {
        value: encodeSettingValue(key, value),
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
  invalidateSettingsCaches();
};

const ensureMailIndexes = async (): Promise<void> => {
  const mongo = await getMongoDb();
  await Promise.all([
    mongo.collection<FilemakerMailAccountDocument>(MAIL_ACCOUNTS_COLLECTION).createIndex({ emailAddress: 1 }),
    mongo.collection<FilemakerMailThreadDocument>(MAIL_THREADS_COLLECTION).createIndex({ accountId: 1, lastMessageAt: -1 }),
    mongo.collection<FilemakerMailMessageDocument>(MAIL_MESSAGES_COLLECTION).createIndex({ threadId: 1, sentAt: 1, receivedAt: 1 }),
    mongo.collection<FilemakerMailMessageDocument>(MAIL_MESSAGES_COLLECTION).createIndex(
      { accountId: 1, providerMessageId: 1 },
      { sparse: true }
    ),
    mongo.collection<FilemakerMailMessageDocument>(MAIL_MESSAGES_COLLECTION).createIndex(
      { accountId: 1, mailboxPath: 1, providerUid: 1 },
      { sparse: true }
    ),
    mongo.collection<FilemakerMailSyncStateDocument>(MAIL_SYNC_STATES_COLLECTION).createIndex(
      { accountId: 1, mailboxPath: 1 },
      { unique: true }
    ),
    mongo.collection<FilemakerMailOutboxDocument>(MAIL_OUTBOX_COLLECTION).createIndex({ accountId: 1, createdAt: -1 }),
  ]);
};

const readFilemakerDatabase = async (): Promise<FilemakerDatabase> => {
  const raw = await readFilemakerCampaignSettingValue(FILEMAKER_DATABASE_KEY);
  if (!raw) return normalizeFilemakerDatabase(null);
  try {
    return normalizeFilemakerDatabase(JSON.parse(raw) as FilemakerDatabase);
  } catch {
    return normalizeFilemakerDatabase(null);
  }
};

const buildPartyLinksLookup = async (): Promise<Map<string, FilemakerMailPartyLinks>> => {
  const database = await readFilemakerDatabase();
  const map = new Map<string, FilemakerMailPartyLinks>();
  database.emailLinks.forEach((link) => {
    const emailRecord = database.emails.find((entry) => entry.id === link.emailId);
    const address = normalizeEmailAddress(emailRecord?.email);
    if (!address) return;
    const current = map.get(address) ?? { persons: [], organizations: [] };
    if (link.partyKind === 'person' && !current.persons.includes(link.partyId)) {
      current.persons.push(link.partyId);
    }
    if (link.partyKind === 'organization' && !current.organizations.includes(link.partyId)) {
      current.organizations.push(link.partyId);
    }
    map.set(address, current);
  });
  return map;
};

const resolveLinkedParties = (
  lookup: Map<string, FilemakerMailPartyLinks>,
  participants: FilemakerMailParticipant[]
): FilemakerMailPartyLinks => {
  const persons = new Set<string>();
  const organizations = new Set<string>();
  participants.forEach((participant) => {
    const current = lookup.get(normalizeEmailAddress(participant.address));
    current?.persons.forEach((entry) => persons.add(entry));
    current?.organizations.forEach((entry) => organizations.add(entry));
  });
  return {
    persons: [...persons],
    organizations: [...organizations],
  };
};

const selectMailboxPaths = (
  account: Pick<FilemakerMailAccount, 'folderAllowlist'>,
  mailboxes: ListResponse[]
): Array<{ path: string; role: FilemakerMailFolderRole }> => {
  const mailboxMap = new Map(mailboxes.map((entry) => [entry.path, entry]));
  if (account.folderAllowlist.length > 0) {
    return account.folderAllowlist.map((path) => {
      const mailbox = mailboxMap.get(path);
      return {
        path,
        role: mailbox ? normalizeMailboxRole(mailbox) : 'custom',
      };
    });
  }

  const preferred = mailboxes.filter((mailbox) => {
    const role = normalizeMailboxRole(mailbox);
    return role === 'inbox' || role === 'sent';
  });

  if (preferred.length > 0) {
    return preferred.map((mailbox) => ({
      path: mailbox.path,
      role: normalizeMailboxRole(mailbox),
    }));
  }

  return mailboxes.slice(0, 1).map((mailbox) => ({
    path: mailbox.path,
    role: normalizeMailboxRole(mailbox),
  }));
};

const rebuildThread = async (threadId: string): Promise<FilemakerMailThread | null> => {
  const mongo = await getMongoDb();
  const messages = await mongo
    .collection<FilemakerMailMessageDocument>(MAIL_MESSAGES_COLLECTION)
    .find({ threadId })
    .sort({ receivedAt: 1, sentAt: 1, createdAt: 1 })
    .toArray();

  if (messages.length === 0) {
    await mongo.collection<FilemakerMailThreadDocument>(MAIL_THREADS_COLLECTION).deleteOne({ _id: threadId });
    return null;
  }

  const first = messages[0]!;
  const latest = messages.at(-1)!;
  const participants = dedupeFilemakerMailParticipants(
    messages.flatMap((message) => [
      ...(message.from ? [message.from] : []),
      ...message.to,
      ...message.cc,
      ...message.replyTo,
    ])
  );
  const thread: FilemakerMailThread = {
    id: threadId,
    createdAt: first.createdAt,
    updatedAt: new Date().toISOString(),
    accountId: latest.accountId,
    mailboxPath: latest.mailboxPath,
    mailboxRole: latest.mailboxRole,
    providerThreadId: latest.providerThreadId ?? null,
    subject: latest.subject,
    normalizedSubject: normalizeFilemakerMailSubject(latest.subject),
    snippet: latest.snippet ?? null,
    participantSummary: participants,
    relatedPersonIds: [...new Set(messages.flatMap((message) => message.relatedPersonIds))],
    relatedOrganizationIds: [
      ...new Set(messages.flatMap((message) => message.relatedOrganizationIds)),
    ],
    unreadCount: messages.filter(
      (message) => message.direction === 'inbound' && !message.flags.seen
    ).length,
    messageCount: messages.length,
    lastMessageAt:
      latest.receivedAt ?? latest.sentAt ?? latest.updatedAt ?? latest.createdAt ?? new Date().toISOString(),
  };

  await mongo.collection<FilemakerMailThreadDocument>(MAIL_THREADS_COLLECTION).updateOne(
    { _id: thread.id },
    { $set: { ...thread, _id: thread.id } },
    { upsert: true }
  );

  return thread;
};

const parseFetchedMessage = async (input: {
  account: FilemakerMailAccount;
  mailboxPath: string;
  mailboxRole: FilemakerMailFolderRole;
  fetched: FetchMessageObject;
  partyLookup: Map<string, FilemakerMailPartyLinks>;
}): Promise<Omit<FilemakerMailMessage, 'id' | 'threadId' | 'createdAt' | 'updatedAt'>> => {
  const parsed: MailparserParsedMail | null = input.fetched.source
    ? await parseMailSource(input.fetched.source)
    : null;
  const from =
    toParticipantList(input.fetched.envelope?.from)[0] ??
    toParticipantList(parseMailParserAddressList(parsed?.from))[0] ??
    null;
  const to = pickParticipantList(
    toParticipantList(input.fetched.envelope?.to),
    parseMailParserAddressList(parsed?.to)
  );
  const cc = pickParticipantList(
    toParticipantList(input.fetched.envelope?.cc),
    parseMailParserAddressList(parsed?.cc)
  );
  const bcc = pickParticipantList(
    toParticipantList(input.fetched.envelope?.bcc),
    parseMailParserAddressList(parsed?.bcc)
  );
  const replyTo = pickParticipantList(
    toParticipantList(input.fetched.envelope?.replyTo),
    parseMailParserAddressList(parsed?.replyTo)
  );
  const subject =
    normalizeString(parsed?.subject) ||
    normalizeString(input.fetched.envelope?.subject) ||
    '(no subject)';
  const htmlBody =
    typeof parsed?.html === 'string'
      ? parsed.html
      : typeof parsed?.html === 'object' && typeof parsed?.html?.toString === 'function'
        ? parsed.html.toString()
        : null;
  const textBody =
    normalizeString(parsed?.text) ||
    (htmlBody ? buildFilemakerMailPlainText(htmlBody) : null);
  const relatedParticipants = dedupeFilemakerMailParticipants([
    ...(from ? [from] : []),
    ...to,
    ...cc,
    ...bcc,
    ...replyTo,
  ]);
  const linked = resolveLinkedParties(input.partyLookup, relatedParticipants);

  return {
    accountId: input.account.id,
    mailboxPath: input.mailboxPath,
    mailboxRole: input.mailboxRole,
    providerMessageId:
      normalizeString(parsed?.messageId) ||
      normalizeString(input.fetched.envelope?.messageId) ||
      null,
    providerThreadId: normalizeString(input.fetched.threadId) || null,
    providerUid: input.fetched.uid ?? null,
    direction: resolveDirection(input.account, from),
    subject,
    snippet: buildFilemakerMailSnippet(textBody, htmlBody),
    from,
    to,
    cc,
    bcc,
    replyTo,
    sentAt:
      (parsed?.date instanceof Date ? parsed.date.toISOString() : null) ??
      (input.fetched.envelope?.date instanceof Date
        ? input.fetched.envelope.date.toISOString()
        : null),
    receivedAt:
      input.fetched.internalDate instanceof Date
        ? input.fetched.internalDate.toISOString()
        : typeof input.fetched.internalDate === 'string'
          ? input.fetched.internalDate
          : null,
    flags: deriveFlags(input.fetched.flags),
    textBody,
    htmlBody,
    inReplyTo:
      normalizeString(parsed?.inReplyTo) ||
      normalizeString(input.fetched.envelope?.inReplyTo) ||
      null,
    references:
      Array.isArray(parsed?.references)
        ? parsed.references
            .map((entry: string) => normalizeString(entry))
            .filter((entry): entry is string => Boolean(entry))
        : parseReferencesHeader(input.fetched.envelope),
    attachments: (parsed?.attachments ?? []).map(
      (attachment: MailparserAttachment): FilemakerMailAttachment => ({
        id: `filemaker-mail-attachment-${randomUUID()}`,
        fileName: normalizeString(attachment.filename) || null,
        contentType: normalizeString(attachment.contentType) || null,
        sizeBytes: typeof attachment.size === 'number' ? attachment.size : null,
        contentId: normalizeString(attachment.cid) || null,
        disposition: normalizeString(attachment.contentDisposition) || null,
        isInline: attachment.contentDisposition === 'inline',
      })
    ),
    relatedPersonIds: linked.persons,
    relatedOrganizationIds: linked.organizations,
  };
};

const upsertMailMessage = async (
  account: FilemakerMailAccount,
  input: Omit<FilemakerMailMessage, 'id' | 'threadId' | 'createdAt' | 'updatedAt'>
): Promise<{ threadId: string; inserted: boolean }> => {
  const mongo = await getMongoDb();
  const collection = mongo.collection<FilemakerMailMessageDocument>(MAIL_MESSAGES_COLLECTION);

  const existing =
    (input.providerMessageId
      ? await collection.findOne({
          accountId: account.id,
          providerMessageId: input.providerMessageId,
        })
      : null) ??
    (input.providerUid !== null
      ? await collection.findOne({
          accountId: account.id,
          mailboxPath: input.mailboxPath,
          providerUid: input.providerUid,
        })
      : null);

  const threadId =
    existing?.threadId ??
    buildThreadId({
      accountId: account.id,
      providerThreadId: input.providerThreadId,
      normalizedSubject: normalizeFilemakerMailSubject(input.subject),
      anchorAddress: pickAnchorAddress(
        dedupeFilemakerMailParticipants([
          ...(input.from ? [input.from] : []),
          ...input.to,
          ...input.cc,
          ...input.replyTo,
        ])
      ),
    });

  const nextId = existing?.id ?? `filemaker-mail-message-${randomUUID()}`;
  const now = new Date().toISOString();
  const message: FilemakerMailMessageDocument = {
    _id: nextId,
    id: nextId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    threadId,
    ...input,
  };

  await collection.updateOne(
    { _id: message._id },
    { $set: message },
    { upsert: true }
  );

  return { threadId, inserted: !existing };
};

const readAccountSecrets = async (
  account: FilemakerMailAccount
): Promise<{ imapPassword: string; smtpPassword: string }> => {
  const values = await readSecretSettingValues([
    account.imapPasswordSettingKey,
    account.smtpPasswordSettingKey,
  ]);
  const imapPassword = values[account.imapPasswordSettingKey];
  const smtpPassword = values[account.smtpPasswordSettingKey];
  if (!imapPassword) {
    throw configurationError(`Missing IMAP password for Filemaker mail account "${account.name}".`);
  }
  if (!smtpPassword) {
    throw configurationError(`Missing SMTP password for Filemaker mail account "${account.name}".`);
  }
  return { imapPassword, smtpPassword };
};

export async function listFilemakerMailAccounts(): Promise<FilemakerMailAccount[]> {
  await ensureMailIndexes();
  const mongo = await getMongoDb();
  return await mongo
    .collection<FilemakerMailAccountDocument>(MAIL_ACCOUNTS_COLLECTION)
    .find({})
    .sort({ updatedAt: -1, createdAt: -1 })
    .project<FilemakerMailAccount>({ _id: 0 })
    .toArray();
}

export async function getFilemakerMailAccount(accountId: string): Promise<FilemakerMailAccount | null> {
  await ensureMailIndexes();
  const mongo = await getMongoDb();
  const account = await mongo
    .collection<FilemakerMailAccountDocument>(MAIL_ACCOUNTS_COLLECTION)
    .findOne({ _id: accountId });
  if (!account) return null;
  const { _id: _ignored, ...rest } = account;
  return rest;
}

export async function upsertFilemakerMailAccount(
  draft: FilemakerMailAccountDraft
): Promise<FilemakerMailAccount> {
  await ensureMailIndexes();
  const now = new Date().toISOString();
  const accountId = normalizeString(draft.id) || `filemaker-mail-account-${toIdToken(draft.emailAddress) || randomUUID()}`;
  const account: FilemakerMailAccount = {
    id: accountId,
    createdAt: now,
    updatedAt: now,
    name: normalizeString(draft.name) || draft.emailAddress,
    emailAddress: normalizeEmailAddress(draft.emailAddress),
    provider: 'imap_smtp',
    status: draft.status,
    imapHost: normalizeString(draft.imapHost),
    imapPort: draft.imapPort,
    imapSecure: draft.imapSecure,
    imapUser: normalizeString(draft.imapUser),
    imapPasswordSettingKey: buildAccountSecretSettingKey(accountId, 'imap_password'),
    smtpHost: normalizeString(draft.smtpHost),
    smtpPort: draft.smtpPort,
    smtpSecure: draft.smtpSecure,
    smtpUser: normalizeString(draft.smtpUser),
    smtpPasswordSettingKey: buildAccountSecretSettingKey(accountId, 'smtp_password'),
    fromName: normalizeString(draft.fromName) || null,
    replyToEmail: normalizeEmailAddress(draft.replyToEmail) || null,
    folderAllowlist: draft.folderAllowlist,
    initialSyncLookbackDays: draft.initialSyncLookbackDays,
    maxMessagesPerSync: draft.maxMessagesPerSync,
    lastSyncedAt: null,
    lastSyncError: null,
  };

  const mongo = await getMongoDb();
  const existing = await mongo
    .collection<FilemakerMailAccountDocument>(MAIL_ACCOUNTS_COLLECTION)
    .findOne({ _id: accountId });

  await Promise.all([
    upsertSecretSettingValue(account.imapPasswordSettingKey, draft.imapPassword),
    upsertSecretSettingValue(account.smtpPasswordSettingKey, draft.smtpPassword),
  ]);

  await mongo.collection<FilemakerMailAccountDocument>(MAIL_ACCOUNTS_COLLECTION).updateOne(
    { _id: accountId },
    {
      $set: { ...account, _id: account.id, createdAt: existing?.createdAt ?? now },
    },
    { upsert: true }
  );

  return {
    ...account,
    createdAt: existing?.createdAt ?? now,
  };
}

export async function listFilemakerMailThreads(input?: {
  accountId?: string | null;
  query?: string | null;
  limit?: number | null;
}): Promise<FilemakerMailThread[]> {
  await ensureMailIndexes();
  const mongo = await getMongoDb();
  const filter: Record<string, unknown> = {};
  if (input?.accountId) filter['accountId'] = input.accountId;
  if (input?.query) {
    filter['$or'] = [
      { subject: { $regex: input.query, $options: 'i' } },
      { snippet: { $regex: input.query, $options: 'i' } },
      { 'participantSummary.address': { $regex: input.query, $options: 'i' } },
      { 'participantSummary.name': { $regex: input.query, $options: 'i' } },
    ];
  }
  return await mongo
    .collection<FilemakerMailThreadDocument>(MAIL_THREADS_COLLECTION)
    .find(filter)
    .sort({ lastMessageAt: -1 })
    .limit(input?.limit ?? 100)
    .project<FilemakerMailThread>({ _id: 0 })
    .toArray();
}

export async function getFilemakerMailThreadDetail(
  threadId: string
): Promise<FilemakerMailThreadDetail | null> {
  await ensureMailIndexes();
  const mongo = await getMongoDb();
  const thread = await mongo
    .collection<FilemakerMailThreadDocument>(MAIL_THREADS_COLLECTION)
    .findOne({ _id: threadId });
  if (!thread) return null;
  const messages = await mongo
    .collection<FilemakerMailMessageDocument>(MAIL_MESSAGES_COLLECTION)
    .find({ threadId })
    .sort({ receivedAt: 1, sentAt: 1, createdAt: 1 })
    .project<FilemakerMailMessage>({ _id: 0 })
    .toArray();

  return {
    thread: (({ _id: _ignored, ...rest }) => rest)(thread),
    messages,
  };
}

export async function syncFilemakerMailAccount(
  accountId: string
): Promise<FilemakerMailSyncResult> {
  await ensureMailIndexes();
  const account = await getFilemakerMailAccount(accountId);
  if (!account) {
    throw validationError('Filemaker mail account was not found.');
  }
  if (account.status !== 'active') {
    throw validationError('Only active Filemaker mail accounts can be synced.');
  }

  const { imapPassword } = await readAccountSecrets(account);
  const partyLookup = await buildPartyLinksLookup();
  const mongo = await getMongoDb();
  const syncStateCollection = mongo.collection<FilemakerMailSyncStateDocument>(
    MAIL_SYNC_STATES_COLLECTION
  );
  const touchedThreads = new Set<string>();
  const foldersScanned: string[] = [];
  let fetchedMessageCount = 0;
  let insertedMessageCount = 0;
  let updatedMessageCount = 0;
  let lastSyncError: string | null = null;

  const client = new ImapFlow({
    host: account.imapHost,
    port: account.imapPort,
    secure: account.imapSecure,
    auth: {
      user: account.imapUser,
      pass: imapPassword,
    },
    logger: false,
    disableAutoIdle: true,
  });

  try {
    await client.connect();
    const mailboxes = await client.list();
    const selectedMailboxes = selectMailboxPaths(account, mailboxes);

    for (const mailbox of selectedMailboxes) {
      foldersScanned.push(mailbox.path);
      const lock = await client.getMailboxLock(mailbox.path, { readOnly: true });
      try {
        const currentMailbox = client.mailbox;
        if (!currentMailbox) continue;

        const state = await syncStateCollection.findOne({
          accountId: account.id,
          mailboxPath: mailbox.path,
        });
        const uidValidity = currentMailbox.uidValidity?.toString() ?? null;
        const isFreshMailbox = state?.uidValidity !== uidValidity;
        const sinceDate = new Date(Date.now() - account.initialSyncLookbackDays * 24 * 60 * 60 * 1000);
        const searchQuery = isFreshMailbox
          ? ({ since: sinceDate } as const)
          : ({ uid: `${Math.max((state?.lastUid ?? 0) + 1, 1)}:*` } as const);

        const messageUidsResult = await client.search(searchQuery, { uid: true });
        const messageUids = Array.isArray(messageUidsResult) ? messageUidsResult : [];
        const uidsToFetch = messageUids.slice(-account.maxMessagesPerSync);

        for (const uid of uidsToFetch) {
          const fetched = await client.fetchOne(
            String(uid),
            {
              uid: true,
              envelope: true,
              flags: true,
              internalDate: true,
              source: true,
              threadId: true,
            },
            { uid: true }
          );
          if (!fetched) continue;
          fetchedMessageCount += 1;
          const parsed = await parseFetchedMessage({
            account,
            mailboxPath: mailbox.path,
            mailboxRole: mailbox.role,
            fetched,
            partyLookup,
          });
          const upserted = await upsertMailMessage(account, parsed);
          touchedThreads.add(upserted.threadId);
          if (upserted.inserted) {
            insertedMessageCount += 1;
          } else {
            updatedMessageCount += 1;
          }
        }

        const lastFetchedUid = uidsToFetch.at(-1);
        const lastUid =
          lastFetchedUid ?? (state?.lastUid ?? Math.max(currentMailbox.uidNext - 1, 0));
        const syncState: FilemakerMailSyncStateDocument = {
          _id: state?._id ?? buildSyncStateId(account.id, mailbox.path),
          id: state?.id ?? buildSyncStateId(account.id, mailbox.path),
          createdAt: state?.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          accountId: account.id,
          mailboxPath: mailbox.path,
          role: mailbox.role,
          uidValidity,
          lastUid,
          lastSyncedAt: new Date().toISOString(),
        };
        await syncStateCollection.updateOne(
          { _id: syncState._id },
          { $set: syncState },
          { upsert: true }
        );
      } finally {
        lock.release();
      }
    }
  } catch (error) {
    lastSyncError = error instanceof Error ? error.message : 'Mail sync failed.';
    throw error;
  } finally {
    try {
      await client.logout();
    } catch {
      // Ignore logout cleanup failures.
    }
    await mongo.collection<FilemakerMailAccountDocument>(MAIL_ACCOUNTS_COLLECTION).updateOne(
      { _id: account.id },
      {
        $set: {
          lastSyncedAt: new Date().toISOString(),
          lastSyncError,
          updatedAt: new Date().toISOString(),
        },
      }
    );
  }

  for (const threadId of touchedThreads) {
    await rebuildThread(threadId);
  }

  return {
    accountId: account.id,
    foldersScanned,
    fetchedMessageCount,
    insertedMessageCount,
    updatedMessageCount,
    touchedThreadCount: touchedThreads.size,
    completedAt: new Date().toISOString(),
  };
}

export async function sendFilemakerMailMessage(
  input: FilemakerMailComposeInput
): Promise<{ outbox: FilemakerMailOutboxEntry; message: FilemakerMailMessage }> {
  await ensureMailIndexes();
  const account = await getFilemakerMailAccount(input.accountId);
  if (!account) {
    throw validationError('Filemaker mail account was not found.');
  }
  const { smtpPassword } = await readAccountSecrets(account);
  const mongo = await getMongoDb();
  const now = new Date().toISOString();
  const normalizedHtml = sanitizeHtml(input.bodyHtml);
  const bodyText = buildFilemakerMailPlainText(normalizedHtml);
  const threadId = input.threadId || `filemaker-mail-thread-${randomUUID()}`;
  const outboxId = `filemaker-mail-outbox-${randomUUID()}`;

  const outbox: FilemakerMailOutboxEntry = {
    id: outboxId,
    createdAt: now,
    updatedAt: now,
    accountId: account.id,
    threadId: input.threadId ?? null,
    inReplyTo: input.inReplyTo ?? null,
    to: dedupeFilemakerMailParticipants(input.to),
    cc: dedupeFilemakerMailParticipants(input.cc),
    bcc: dedupeFilemakerMailParticipants(input.bcc),
    subject: input.subject,
    bodyHtml: normalizedHtml,
    bodyText,
    status: 'queued',
    providerMessageId: null,
    errorMessage: null,
    sentAt: null,
  };

  await mongo.collection<FilemakerMailOutboxDocument>(MAIL_OUTBOX_COLLECTION).insertOne({
    _id: outbox.id,
    ...outbox,
  });

  const transporter = createTransport({
    host: account.smtpHost,
    port: account.smtpPort,
    secure: account.smtpSecure,
    auth: {
      user: account.smtpUser,
      pass: smtpPassword,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: account.fromName
        ? `"${account.fromName.replaceAll('"', '\\"')}" <${account.emailAddress}>`
        : account.emailAddress,
      replyTo: account.replyToEmail ?? undefined,
      to: outbox.to.map((entry) => entry.address).join(', '),
      cc: outbox.cc.map((entry) => entry.address).join(', ') || undefined,
      bcc: outbox.bcc.map((entry) => entry.address).join(', ') || undefined,
      subject: input.subject,
      html: normalizedHtml,
      text: bodyText,
      inReplyTo: input.inReplyTo ?? undefined,
      references: input.inReplyTo ? [input.inReplyTo] : undefined,
    });

    const partyLookup = await buildPartyLinksLookup();
    const relatedParticipants = dedupeFilemakerMailParticipants([
      { address: account.emailAddress, name: account.fromName ?? null },
      ...outbox.to,
      ...outbox.cc,
      ...outbox.bcc,
    ]);
    const linked = resolveLinkedParties(partyLookup, relatedParticipants);

    const message: FilemakerMailMessage = {
      id: `filemaker-mail-message-${randomUUID()}`,
      createdAt: now,
      updatedAt: new Date().toISOString(),
      accountId: account.id,
      threadId,
      mailboxPath: 'Sent',
      mailboxRole: 'sent',
      providerMessageId: normalizeString(info.messageId) || null,
      providerThreadId: null,
      providerUid: null,
      direction: 'outbound',
      subject: input.subject,
      snippet: buildFilemakerMailSnippet(bodyText, normalizedHtml),
      from: { address: account.emailAddress, name: account.fromName ?? null },
      to: outbox.to,
      cc: outbox.cc,
      bcc: outbox.bcc,
      replyTo: account.replyToEmail
        ? [{ address: account.replyToEmail, name: account.fromName ?? null }]
        : [],
      sentAt: now,
      receivedAt: now,
      flags: {
        seen: true,
        answered: Boolean(input.inReplyTo),
        flagged: false,
        draft: false,
        deleted: false,
      },
      textBody: bodyText,
      htmlBody: normalizedHtml,
      inReplyTo: input.inReplyTo ?? null,
      references: input.inReplyTo ? [input.inReplyTo] : [],
      attachments: [],
      relatedPersonIds: linked.persons,
      relatedOrganizationIds: linked.organizations,
    };

    await mongo.collection<FilemakerMailMessageDocument>(MAIL_MESSAGES_COLLECTION).insertOne({
      _id: message.id,
      ...message,
    });

    await mongo.collection<FilemakerMailOutboxDocument>(MAIL_OUTBOX_COLLECTION).updateOne(
      { _id: outbox.id },
      {
        $set: {
          status: 'sent',
          providerMessageId: message.providerMessageId,
          sentAt: now,
          updatedAt: now,
        },
      }
    );

    await rebuildThread(threadId);

    return {
      outbox: {
        ...outbox,
        status: 'sent',
        providerMessageId: message.providerMessageId,
        sentAt: now,
        updatedAt: now,
      },
      message,
    };
  } catch (error) {
    await mongo.collection<FilemakerMailOutboxDocument>(MAIL_OUTBOX_COLLECTION).updateOne(
      { _id: outbox.id },
      {
        $set: {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Failed to send email.',
          updatedAt: new Date().toISOString(),
        },
      }
    );
    throw error;
  }
}

export async function buildFilemakerMailReplyDraft(
  threadId: string
): Promise<{
  accountId: string;
  to: FilemakerMailParticipant[];
  subject: string;
  bodyHtml: string;
  inReplyTo: string | null;
} | null> {
  const detail = await getFilemakerMailThreadDetail(threadId);
  if (!detail || detail.messages.length === 0) return null;
  const target =
    [...detail.messages].reverse().find((message) => message.direction === 'inbound') ??
    detail.messages.at(-1);
  if (!target) return null;
  return {
    accountId: detail.thread.accountId,
    to: resolveFilemakerReplyRecipients(target),
    subject: ensureFilemakerReplySubject(detail.thread.subject),
    bodyHtml: buildFilemakerMailReplyHtmlSeed(target),
    inReplyTo: target.providerMessageId ?? null,
  };
}
