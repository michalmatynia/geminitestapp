'use server';

import 'server-only';

import { randomUUID } from 'crypto';

import type { MongoStringSettingRecord } from '@/shared/contracts/settings';
import { configurationError, validationError } from '@/shared/errors/app-error';
import { findProviderForKey } from '@/shared/lib/db/settings-registry';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { clearSecretSettingCache, readSecretSettingValues } from '@/shared/lib/settings/secret-settings';
import { decodeSettingValue, encodeSettingValue } from '@/shared/lib/settings/settings-compression';
import { clearSettingsCache } from '@/shared/lib/settings-cache';
import { clearLiteSettingsServerCache } from '@/shared/lib/settings-lite-server-cache';

import {
  buildFilemakerMailPlainText,
  buildFilemakerMailReplyHtmlSeed,
  buildFilemakerMailSnippet,
  dedupeFilemakerMailParticipants,
  ensureFilemakerReplySubject,
  normalizeFilemakerMailSubject,
  parseFilemakerMailboxAllowlistInput,
  resolveFilemakerReplyRecipients,
} from '../mail-utils';
import { normalizeFilemakerDatabase } from '../filemaker-settings.database';
import { normalizeString, toIdToken } from '../filemaker-settings.helpers';
import { getFilemakerPartiesForEmail } from '../settings/database-getters';
import { FILEMAKER_DATABASE_KEY } from '../settings-constants';

import type {
  FilemakerMailAccount,
  FilemakerMailAccountDraft,
  FilemakerMailComposeInput,
  FilemakerMailFolderRole,
  FilemakerMailFolderSummary,
  FilemakerMailMessage,
  FilemakerMailOutboxEntry,
  FilemakerMailParticipant,
  FilemakerMailSyncResult,
  FilemakerMailThread,
  FilemakerMailThreadDetail,
} from '../types';

import { readFilemakerCampaignSettingValue } from './campaign-settings-store';
import * as storage from './mail/mail-storage';
import * as smtp from './mail/mail-smtp';
import * as mailServerUtils from './mail/mail-utils';

import type {
  FilemakerMailThreadDocument,
} from './mail/mail-types';

const SETTINGS_COLLECTION = 'settings';
const MAIL_THREADS_COLLECTION = 'filemaker_mail_threads';

const invalidateSettingsCaches = (): void => {
  clearSettingsCache();
  clearLiteSettingsServerCache();
  clearSecretSettingCache();
};

const normalizeNullableString = (value: string | null | undefined): string | null => {
  const normalized = normalizeString(value);
  return normalized || null;
};

const normalizeNullableEmail = (value: string | null | undefined): string | null => {
  const normalized = normalizeString(value).toLowerCase();
  return normalized || null;
};

const inferMailboxRoleFromPath = (mailboxPath: string): FilemakerMailFolderRole => {
  const normalized = normalizeString(mailboxPath).toLowerCase();
  if (!normalized || normalized === 'inbox') return 'inbox';
  if (normalized === 'sent' || normalized.includes('sent')) return 'sent';
  if (normalized === 'drafts' || normalized.includes('draft')) return 'drafts';
  if (normalized === 'archive' || normalized.includes('archive')) return 'archive';
  if (normalized === 'spam' || normalized.includes('junk')) return 'spam';
  if (normalized === 'trash' || normalized.includes('bin')) return 'trash';
  return 'custom';
};

const roleSortOrder: Record<FilemakerMailFolderRole, number> = {
  inbox: 0,
  sent: 1,
  drafts: 2,
  archive: 3,
  spam: 4,
  trash: 5,
  custom: 6,
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

const loadFilemakerDatabase = async () => {
  const storedValue = await readFilemakerCampaignSettingValue(FILEMAKER_DATABASE_KEY);
  if (!storedValue) {
    return normalizeFilemakerDatabase(null);
  }
  const decoded = decodeSettingValue(FILEMAKER_DATABASE_KEY, storedValue);
  try {
    const parsed = JSON.parse(decoded) as Parameters<typeof normalizeFilemakerDatabase>[0];
    return normalizeFilemakerDatabase(parsed);
  } catch {
    return normalizeFilemakerDatabase(null);
  }
};

const resolveRelatedPartiesForParticipants = async (
  participants: FilemakerMailParticipant[]
): Promise<{ personIds: string[]; organizationIds: string[] }> => {
  const database = await loadFilemakerDatabase();
  const emailIdsByAddress = new Map<string, string>();
  database.emails.forEach((email) => {
    const normalizedAddress = normalizeString(email.email).toLowerCase();
    if (!normalizedAddress) return;
    emailIdsByAddress.set(normalizedAddress, email.id);
  });

  const personIds = new Set<string>();
  const organizationIds = new Set<string>();

  participants.forEach((participant) => {
    const emailId = emailIdsByAddress.get(normalizeString(participant.address).toLowerCase());
    if (!emailId) return;
    const parties = getFilemakerPartiesForEmail(database, emailId);
    parties.persons.forEach((person) => personIds.add(person.id));
    parties.organizations.forEach((organization) => organizationIds.add(organization.id));
  });

  return {
    personIds: Array.from(personIds),
    organizationIds: Array.from(organizationIds),
  };
};

const listThreadDocuments = async (
  input: {
    accountId?: string | null;
    mailboxPath?: string | null;
  } = {}
): Promise<FilemakerMailThread[]> => {
  const mongo = await getMongoDb();
  const filter: Record<string, unknown> = {};
  if (input.accountId) filter.accountId = input.accountId;
  if (input.mailboxPath) filter.mailboxPath = input.mailboxPath;
  return await mongo
    .collection<FilemakerMailThreadDocument>(MAIL_THREADS_COLLECTION)
    .find(filter)
    .toArray();
};

const sortThreadsByActivity = (threads: FilemakerMailThread[]): FilemakerMailThread[] =>
  threads.slice().sort((left, right) => {
    const timeDelta =
      Date.parse(right.lastMessageAt ?? '') - Date.parse(left.lastMessageAt ?? '');
    if (timeDelta !== 0) return timeDelta;
    return left.subject.localeCompare(right.subject);
  });

const matchesThreadQuery = (thread: FilemakerMailThread, query: string): boolean => {
  const normalizedQuery = normalizeString(query).toLowerCase();
  if (!normalizedQuery) return true;
  return [
    thread.subject,
    thread.normalizedSubject,
    thread.snippet ?? '',
    thread.mailboxPath,
    ...thread.participantSummary.flatMap((participant) => [
      participant.name ?? '',
      participant.address,
    ]),
  ]
    .join('\n')
    .toLowerCase()
    .includes(normalizedQuery);
};

export const listFilemakerMailAccounts = async (): Promise<FilemakerMailAccount[]> => {
  return (await storage.listMailAccounts()).sort((left, right) =>
    left.name.localeCompare(right.name)
  );
};

export const getFilemakerMailAccount = async (id: string): Promise<FilemakerMailAccount> => {
  const account = await storage.getMailAccountById(id);
  if (!account) {
    throw validationError(`Mail account ${id} not found.`);
  }
  return account;
};

export const upsertFilemakerMailAccount = async (
  draft: FilemakerMailAccountDraft
): Promise<FilemakerMailAccount> => {
  const existing = draft.id ? await storage.getMailAccountById(draft.id) : null;
  const id = existing?.id ?? draft.id ?? `mail-account-${toIdToken(draft.emailAddress) || randomUUID()}`;
  const now = new Date().toISOString();
  const isCreate = !existing;

  const nextAccount: FilemakerMailAccount = {
    id,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    name: normalizeString(draft.name),
    emailAddress: normalizeString(draft.emailAddress).toLowerCase(),
    provider: 'imap_smtp',
    status: draft.status,
    imapHost: normalizeString(draft.imapHost),
    imapPort: draft.imapPort,
    imapSecure: draft.imapSecure,
    imapUser: normalizeString(draft.imapUser),
    imapPasswordSettingKey: mailServerUtils.buildAccountSecretSettingKey(id, 'imap_password'),
    smtpHost: normalizeString(draft.smtpHost),
    smtpPort: draft.smtpPort,
    smtpSecure: draft.smtpSecure,
    smtpUser: normalizeString(draft.smtpUser),
    smtpPasswordSettingKey: mailServerUtils.buildAccountSecretSettingKey(id, 'smtp_password'),
    fromName: normalizeNullableString(draft.fromName),
    replyToEmail: normalizeNullableEmail(draft.replyToEmail),
    folderAllowlist: parseFilemakerMailboxAllowlistInput(draft.folderAllowlist.join(',')),
    initialSyncLookbackDays: draft.initialSyncLookbackDays,
    maxMessagesPerSync: draft.maxMessagesPerSync,
    lastSyncedAt: existing?.lastSyncedAt ?? null,
    lastSyncError: existing?.lastSyncError ?? null,
  };

  if (isCreate && !normalizeString(draft.imapPassword)) {
    throw validationError('IMAP password is required when creating a mailbox account.');
  }
  if (isCreate && !normalizeString(draft.smtpPassword)) {
    throw validationError('SMTP password is required when creating a mailbox account.');
  }

  await storage.upsertMailAccount(nextAccount);

  if (normalizeString(draft.imapPassword)) {
    await upsertSecretSettingValue(nextAccount.imapPasswordSettingKey, draft.imapPassword);
  }
  if (normalizeString(draft.smtpPassword)) {
    await upsertSecretSettingValue(nextAccount.smtpPasswordSettingKey, draft.smtpPassword);
  }

  await storage.ensureMailIndexes();
  return nextAccount;
};

export const saveFilemakerMailAccount = upsertFilemakerMailAccount;

export const deleteFilemakerMailAccount = async (id: string): Promise<void> => {
  await storage.deleteMailAccount(id);
};

export const listFilemakerMailFolderSummaries = async (input?: {
  accountId?: string | null;
}): Promise<FilemakerMailFolderSummary[]> => {
  const accounts = (await listFilemakerMailAccounts()).filter((account) =>
    input?.accountId ? account.id === input.accountId : true
  );
  const accountIds = new Set(accounts.map((account) => account.id));
  const threads = await listThreadDocuments(
    input?.accountId ? { accountId: input.accountId } : undefined
  );
  const summaryByKey = new Map<string, FilemakerMailFolderSummary>();

  threads.forEach((thread) => {
    if (!accountIds.has(thread.accountId)) return;
    const key = `${thread.accountId}::${thread.mailboxPath}`;
    const current = summaryByKey.get(key);
    const lastMessageAt =
      current?.lastMessageAt && Date.parse(current.lastMessageAt) > Date.parse(thread.lastMessageAt)
        ? current.lastMessageAt
        : thread.lastMessageAt;
    summaryByKey.set(key, {
      id: key,
      accountId: thread.accountId,
      mailboxPath: thread.mailboxPath,
      mailboxRole: thread.mailboxRole,
      threadCount: (current?.threadCount ?? 0) + 1,
      unreadCount: (current?.unreadCount ?? 0) + thread.unreadCount,
      lastMessageAt,
    });
  });

  accounts.forEach((account) => {
    account.folderAllowlist.forEach((mailboxPath) => {
      const key = `${account.id}::${mailboxPath}`;
      if (summaryByKey.has(key)) return;
      summaryByKey.set(key, {
        id: key,
        accountId: account.id,
        mailboxPath,
        mailboxRole: inferMailboxRoleFromPath(mailboxPath),
        threadCount: 0,
        unreadCount: 0,
        lastMessageAt: null,
      });
    });
  });

  return Array.from(summaryByKey.values()).sort((left, right) => {
    const leftAccount = accounts.find((account) => account.id === left.accountId);
    const rightAccount = accounts.find((account) => account.id === right.accountId);
    const accountDelta = (leftAccount?.name ?? '').localeCompare(rightAccount?.name ?? '');
    if (accountDelta !== 0) return accountDelta;
    const roleDelta = roleSortOrder[left.mailboxRole] - roleSortOrder[right.mailboxRole];
    if (roleDelta !== 0) return roleDelta;
    const timeDelta =
      Date.parse(right.lastMessageAt ?? '') - Date.parse(left.lastMessageAt ?? '');
    if (timeDelta !== 0) return timeDelta;
    return left.mailboxPath.localeCompare(right.mailboxPath);
  });
};

export const listFilemakerMailThreads = async (input?: {
  query?: string | null;
  accountId?: string | null;
  mailboxPath?: string | null;
}): Promise<FilemakerMailThread[]> => {
  const threads = await listThreadDocuments({
    accountId: input?.accountId ?? null,
    mailboxPath: input?.mailboxPath ?? null,
  });
  return sortThreadsByActivity(
    threads.filter((thread) => matchesThreadQuery(thread, input?.query ?? ''))
  );
};

export const syncFilemakerMailAccount = async (
  id: string
): Promise<FilemakerMailSyncResult & { lastSyncError: string | null }> => {
  const account = await getFilemakerMailAccount(id);
  const completedAt = new Date().toISOString();
  const nextAccount: FilemakerMailAccount = {
    ...account,
    updatedAt: completedAt,
    lastSyncedAt: completedAt,
    lastSyncError: null,
  };
  await storage.upsertMailAccount(nextAccount);

  return {
    accountId: id,
    foldersScanned:
      nextAccount.folderAllowlist.length > 0 ? nextAccount.folderAllowlist : ['INBOX'],
    fetchedMessageCount: 0,
    insertedMessageCount: 0,
    updatedMessageCount: 0,
    touchedThreadCount: 0,
    completedAt,
    lastSyncError: null,
  };
};

export const getFilemakerMailThreadDetail = async (
  id: string
): Promise<FilemakerMailThreadDetail | null> => {
  const thread = await storage.getMailThreadById(id);
  if (!thread) return null;
  const messages = await storage.listMailMessagesByThreadId(id);
  return {
    thread,
    messages,
  };
};

export const buildFilemakerMailReplyDraft = async (
  threadId: string
): Promise<{
  accountId: string;
  to: FilemakerMailParticipant[];
  subject: string;
  bodyHtml: string;
  inReplyTo: string | null;
} | null> => {
  const detail = await getFilemakerMailThreadDetail(threadId);
  if (!detail) return null;
  const referenceMessage =
    detail.messages
      .filter((message) => message.direction === 'inbound')
      .sort((left, right) => {
        const leftTimestamp = Date.parse(left.receivedAt ?? left.sentAt ?? left.createdAt ?? '');
        const rightTimestamp = Date.parse(
          right.receivedAt ?? right.sentAt ?? right.createdAt ?? ''
        );
        return rightTimestamp - leftTimestamp;
      })[0] ??
    detail.messages[detail.messages.length - 1] ??
    null;

  if (!referenceMessage) return null;

  return {
    accountId: detail.thread.accountId,
    to: resolveFilemakerReplyRecipients(referenceMessage),
    subject: ensureFilemakerReplySubject(detail.thread.subject || referenceMessage.subject),
    bodyHtml: buildFilemakerMailReplyHtmlSeed(referenceMessage),
    inReplyTo: referenceMessage.providerMessageId ?? null,
  };
};

export const sendFilemakerMailMessage = async (input: FilemakerMailComposeInput): Promise<{
  message: FilemakerMailMessage;
  outbox: FilemakerMailOutboxEntry;
  outboxEntry: FilemakerMailOutboxEntry;
}> => {
  const account = await getFilemakerMailAccount(input.accountId);
  const smtpPasswordKey = mailServerUtils.buildAccountSecretSettingKey(account.id, 'smtp_password');
  const secrets = await readSecretSettingValues([smtpPasswordKey]);
  const password = secrets[smtpPasswordKey];

  const to = dedupeFilemakerMailParticipants(input.to);
  const cc = dedupeFilemakerMailParticipants(input.cc ?? []);
  const bcc = dedupeFilemakerMailParticipants(input.bcc ?? []);
  const recipientSummary = dedupeFilemakerMailParticipants([...to, ...cc, ...bcc]);
  const normalizedSubject = normalizeFilemakerMailSubject(input.subject);
  const bodyText = buildFilemakerMailPlainText(input.bodyHtml);
  const snippet = buildFilemakerMailSnippet(bodyText, input.bodyHtml);
  const { personIds, organizationIds } = await resolveRelatedPartiesForParticipants(
    recipientSummary
  );
  const now = new Date().toISOString();
  const threadId =
    input.threadId ??
    mailServerUtils.buildThreadId({
      accountId: account.id,
      providerThreadId: null,
      normalizedSubject,
      anchorAddress: mailServerUtils.pickAnchorAddress(recipientSummary),
    });
  const existingThread = input.threadId ? await storage.getMailThreadById(input.threadId) : null;

  const queuedOutbox: FilemakerMailOutboxEntry = {
    id: `filemaker-mail-outbox-${randomUUID()}`,
    createdAt: now,
    updatedAt: now,
    accountId: account.id,
    threadId,
    inReplyTo: input.inReplyTo ?? null,
    to,
    cc,
    bcc,
    subject: normalizeString(input.subject),
    bodyHtml: input.bodyHtml,
    bodyText,
    status: 'queued',
    providerMessageId: null,
    errorMessage: null,
    sentAt: null,
  };
  await storage.upsertOutboxEntry(queuedOutbox);

  const transport = smtp.createSmtpTransport(account, password);
  const sendResult = await transport.sendMail({
    from: account.fromName
      ? `"${account.fromName}" <${account.emailAddress}>`
      : account.emailAddress,
    to: to.map((participant) => participant.address).join(', '),
    cc: cc.length > 0 ? cc.map((participant) => participant.address).join(', ') : undefined,
    bcc: bcc.length > 0 ? bcc.map((participant) => participant.address).join(', ') : undefined,
    replyTo: account.replyToEmail ?? undefined,
    inReplyTo: input.inReplyTo ?? undefined,
    subject: normalizeString(input.subject),
    text: bodyText || undefined,
    html: input.bodyHtml,
  });

  const message: FilemakerMailMessage = {
    id: `filemaker-mail-message-${randomUUID()}`,
    createdAt: now,
    updatedAt: now,
    accountId: account.id,
    threadId,
    mailboxPath: existingThread?.mailboxPath ?? 'Sent',
    mailboxRole: existingThread?.mailboxRole ?? 'sent',
    providerMessageId: sendResult.messageId ?? null,
    providerThreadId: existingThread?.providerThreadId ?? null,
    providerUid: null,
    direction: 'outbound',
    subject: normalizeString(input.subject),
    snippet,
    from: {
      address: account.emailAddress,
      name: account.fromName ?? null,
    },
    to,
    cc,
    bcc,
    replyTo: account.replyToEmail
      ? [{ address: account.replyToEmail, name: account.fromName ?? null }]
      : [],
    sentAt: now,
    receivedAt: now,
    flags: {
      seen: true,
      answered: false,
      flagged: false,
      draft: false,
      deleted: false,
    },
    textBody: bodyText,
    htmlBody: input.bodyHtml,
    inReplyTo: input.inReplyTo ?? null,
    references: input.inReplyTo ? [input.inReplyTo] : [],
    attachments: [],
    relatedPersonIds: personIds,
    relatedOrganizationIds: organizationIds,
  };
  await storage.upsertMailMessage(message);

  const thread: FilemakerMailThread = {
    id: threadId,
    createdAt: existingThread?.createdAt ?? now,
    updatedAt: now,
    accountId: account.id,
    mailboxPath: existingThread?.mailboxPath ?? 'Sent',
    mailboxRole: existingThread?.mailboxRole ?? 'sent',
    providerThreadId: existingThread?.providerThreadId ?? null,
    subject: normalizeString(input.subject) || normalizedSubject,
    normalizedSubject,
    snippet,
    participantSummary: recipientSummary,
    relatedPersonIds: personIds,
    relatedOrganizationIds: organizationIds,
    unreadCount: existingThread?.unreadCount ?? 0,
    messageCount: (existingThread?.messageCount ?? 0) + 1,
    lastMessageAt: now,
  };
  await storage.upsertMailThread(thread);

  const sentOutbox: FilemakerMailOutboxEntry = {
    ...queuedOutbox,
    updatedAt: now,
    status: 'sent',
    providerMessageId: sendResult.messageId ?? null,
    sentAt: now,
  };
  await storage.upsertOutboxEntry(sentOutbox);

  return {
    message,
    outbox: sentOutbox,
    outboxEntry: sentOutbox,
  };
};

export const sendFilemakerMail = sendFilemakerMailMessage;
