import 'server-only';

import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type {
  FilemakerMailAccount,
  FilemakerMailFolderSyncState,
  FilemakerMailMessage,
  FilemakerMailOutboxEntry,
  FilemakerMailThread,
} from '../../types';
import type {
  FilemakerMailAccountDocument,
  FilemakerMailMessageDocument,
  FilemakerMailOutboxDocument,
  FilemakerMailSyncStateDocument,
  FilemakerMailThreadDocument,
} from './mail-types';

const MAIL_ACCOUNTS_COLLECTION = 'filemaker_mail_accounts';
const MAIL_THREADS_COLLECTION = 'filemaker_mail_threads';
const MAIL_MESSAGES_COLLECTION = 'filemaker_mail_messages';
const MAIL_SYNC_STATES_COLLECTION = 'filemaker_mail_sync_states';
const MAIL_OUTBOX_COLLECTION = 'filemaker_mail_outbox';

export const ensureMailIndexes = async (): Promise<void> => {
  const mongo = await getMongoDb();
  await Promise.all([
    mongo.collection<FilemakerMailAccountDocument>(MAIL_ACCOUNTS_COLLECTION).createIndex({ emailAddress: 1 }),
    mongo.collection<FilemakerMailThreadDocument>(MAIL_THREADS_COLLECTION).createIndex({ accountId: 1, lastMessageAt: -1 }),
    mongo.collection<FilemakerMailThreadDocument>(MAIL_THREADS_COLLECTION).createIndex(
      { accountId: 1, normalizedSubject: 1, anchorAddress: 1 },
      { sparse: true }
    ),
    mongo.collection<FilemakerMailThreadDocument>(MAIL_THREADS_COLLECTION).createIndex(
      { accountId: 1, providerThreadId: 1 },
      { sparse: true }
    ),
    mongo.collection<FilemakerMailThreadDocument>(MAIL_THREADS_COLLECTION).createIndex(
      { 'campaignContext.campaignId': 1, 'campaignContext.runId': 1, 'campaignContext.deliveryId': 1 },
      { sparse: true }
    ),
    mongo.collection<FilemakerMailMessageDocument>(MAIL_MESSAGES_COLLECTION).createIndex({ threadId: 1, sentAt: 1, receivedAt: 1 }),
    mongo.collection<FilemakerMailMessageDocument>(MAIL_MESSAGES_COLLECTION).createIndex(
      { accountId: 1, providerMessageId: 1 },
      { sparse: true }
    ),
    mongo.collection<FilemakerMailMessageDocument>(MAIL_MESSAGES_COLLECTION).createIndex(
      { accountId: 1, mailboxPath: 1, providerUid: 1 },
      { sparse: true }
    ),
    mongo.collection<FilemakerMailMessageDocument>(MAIL_MESSAGES_COLLECTION).createIndex(
      { 'campaignContext.campaignId': 1, 'campaignContext.runId': 1, 'campaignContext.deliveryId': 1 },
      { sparse: true }
    ),
    mongo.collection<FilemakerMailMessageDocument>(MAIL_MESSAGES_COLLECTION).createIndex(
      { subject: 'text', textBody: 'text', 'from.address': 'text', 'from.name': 'text' },
      { name: 'mail_messages_text_search', default_language: 'none' }
    ),
    mongo.collection<FilemakerMailSyncStateDocument>(MAIL_SYNC_STATES_COLLECTION).createIndex({ accountId: 1, mailboxPath: 1 }, { unique: true }),
    mongo.collection<FilemakerMailOutboxDocument>(MAIL_OUTBOX_COLLECTION).createIndex({ accountId: 1, status: 1 }),
  ]);
};

export const upsertMailAccount = async (account: FilemakerMailAccount): Promise<void> => {
  const mongo = await getMongoDb();
  await mongo.collection<FilemakerMailAccountDocument>(MAIL_ACCOUNTS_COLLECTION).updateOne(
    { id: account.id },
    { $set: account },
    { upsert: true }
  );
};

export const getMailAccountById = async (id: string): Promise<FilemakerMailAccount | null> => {
  const mongo = await getMongoDb();
  return await mongo.collection<FilemakerMailAccountDocument>(MAIL_ACCOUNTS_COLLECTION).findOne({ id });
};

export const listMailAccounts = async (): Promise<FilemakerMailAccount[]> => {
  const mongo = await getMongoDb();
  return await mongo.collection<FilemakerMailAccountDocument>(MAIL_ACCOUNTS_COLLECTION).find().toArray();
};

export const deleteMailAccount = async (id: string): Promise<void> => {
  const mongo = await getMongoDb();
  await Promise.all([
    mongo.collection<FilemakerMailAccountDocument>(MAIL_ACCOUNTS_COLLECTION).deleteOne({ id }),
    mongo.collection<FilemakerMailThreadDocument>(MAIL_THREADS_COLLECTION).deleteMany({ accountId: id }),
    mongo.collection<FilemakerMailMessageDocument>(MAIL_MESSAGES_COLLECTION).deleteMany({ accountId: id }),
    mongo.collection<FilemakerMailSyncStateDocument>(MAIL_SYNC_STATES_COLLECTION).deleteMany({ accountId: id }),
    mongo.collection<FilemakerMailOutboxDocument>(MAIL_OUTBOX_COLLECTION).deleteMany({ accountId: id }),
  ]);
};

export const getMailSyncState = async (accountId: string, mailboxPath: string): Promise<FilemakerMailFolderSyncState | null> => {
  const mongo = await getMongoDb();
  return await mongo.collection<FilemakerMailSyncStateDocument>(MAIL_SYNC_STATES_COLLECTION).findOne({ accountId, mailboxPath });
};

export const upsertMailSyncState = async (state: FilemakerMailFolderSyncState): Promise<void> => {
  const mongo = await getMongoDb();
  await mongo.collection<FilemakerMailSyncStateDocument>(MAIL_SYNC_STATES_COLLECTION).updateOne(
    { accountId: state.accountId, mailboxPath: state.mailboxPath },
    { $set: state },
    { upsert: true }
  );
};

export const upsertMailThread = async (thread: FilemakerMailThread): Promise<void> => {
  const mongo = await getMongoDb();
  await mongo.collection<FilemakerMailThreadDocument>(MAIL_THREADS_COLLECTION).updateOne(
    { id: thread.id },
    { $set: thread },
    { upsert: true }
  );
};

export const getMailThreadById = async (id: string): Promise<FilemakerMailThread | null> => {
  const mongo = await getMongoDb();
  return await mongo.collection<FilemakerMailThreadDocument>(MAIL_THREADS_COLLECTION).findOne({ id });
};

export const findMailThreadByProviderId = async (accountId: string, providerThreadId: string): Promise<FilemakerMailThread | null> => {
  const mongo = await getMongoDb();
  return await mongo.collection<FilemakerMailThreadDocument>(MAIL_THREADS_COLLECTION).findOne({ accountId, providerThreadId });
};

export const findMailThreadBySubjectAndAnchor = async (accountId: string, normalizedSubject: string, anchorAddress: string): Promise<FilemakerMailThread | null> => {
  const mongo = await getMongoDb();
  return await mongo.collection<FilemakerMailThreadDocument>(MAIL_THREADS_COLLECTION).findOne({ accountId, normalizedSubject, anchorAddress });
};

export const findMailThreadByReferences = async (
  accountId: string,
  references: string[]
): Promise<FilemakerMailThread | null> => {
  const trimmed = references.map((entry) => entry?.trim()).filter((entry): entry is string => Boolean(entry));
  if (trimmed.length === 0) return null;
  const mongo = await getMongoDb();
  const message = await mongo
    .collection<FilemakerMailMessageDocument>(MAIL_MESSAGES_COLLECTION)
    .findOne({ accountId, providerMessageId: { $in: trimmed } });
  if (!message) return null;
  return await mongo
    .collection<FilemakerMailThreadDocument>(MAIL_THREADS_COLLECTION)
    .findOne({ id: message.threadId });
};

export const findMailMessagesByProviderIds = async (
  accountId: string,
  providerMessageIds: string[]
): Promise<FilemakerMailMessage[]> => {
  const trimmed = providerMessageIds.map((entry) => entry?.trim()).filter((entry): entry is string => Boolean(entry));
  if (trimmed.length === 0) return [];
  const mongo = await getMongoDb();
  return await mongo
    .collection<FilemakerMailMessageDocument>(MAIL_MESSAGES_COLLECTION)
    .find({ accountId, providerMessageId: { $in: trimmed } })
    .toArray();
};

export const upsertMailMessage = async (message: FilemakerMailMessage): Promise<void> => {
  const mongo = await getMongoDb();
  await mongo.collection<FilemakerMailMessageDocument>(MAIL_MESSAGES_COLLECTION).updateOne(
    { id: message.id },
    { $set: message },
    { upsert: true }
  );
};

export const getMailMessageByProviderId = async (accountId: string, providerMessageId: string): Promise<FilemakerMailMessage | null> => {
  const mongo = await getMongoDb();
  return await mongo.collection<FilemakerMailMessageDocument>(MAIL_MESSAGES_COLLECTION).findOne({ accountId, providerMessageId });
};

export const getMailMessageByUid = async (accountId: string, mailboxPath: string, providerUid: number): Promise<FilemakerMailMessage | null> => {
  const mongo = await getMongoDb();
  return await mongo.collection<FilemakerMailMessageDocument>(MAIL_MESSAGES_COLLECTION).findOne({ accountId, mailboxPath, providerUid });
};

export const listMailMessagesByThreadId = async (threadId: string): Promise<FilemakerMailMessage[]> => {
  const mongo = await getMongoDb();
  return await mongo.collection<FilemakerMailMessageDocument>(MAIL_MESSAGES_COLLECTION)
    .find({ threadId })
    .sort({ sentAt: 1, receivedAt: 1 })
    .toArray();
};

export const upsertOutboxEntry = async (entry: FilemakerMailOutboxEntry): Promise<void> => {
  const mongo = await getMongoDb();
  await mongo.collection<FilemakerMailOutboxDocument>(MAIL_OUTBOX_COLLECTION).updateOne(
    { id: entry.id },
    { $set: entry },
    { upsert: true }
  );
};

export const searchMailMessages = async (input: {
  query: string;
  accountId?: string | null;
  limit?: number;
}): Promise<FilemakerMailMessage[]> => {
  const mongo = await getMongoDb();
  const filter: Record<string, unknown> = {};
  if (input.accountId) filter['accountId'] = input.accountId;

  const escapedQuery = input.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  filter['$or'] = [
    { subject: { $regex: escapedQuery, $options: 'i' } },
    { textBody: { $regex: escapedQuery, $options: 'i' } },
    { htmlBody: { $regex: escapedQuery, $options: 'i' } },
    { 'from.address': { $regex: escapedQuery, $options: 'i' } },
    { 'from.name': { $regex: escapedQuery, $options: 'i' } },
    { 'to.address': { $regex: escapedQuery, $options: 'i' } },
    { 'to.name': { $regex: escapedQuery, $options: 'i' } },
    { 'cc.address': { $regex: escapedQuery, $options: 'i' } },
    { 'cc.name': { $regex: escapedQuery, $options: 'i' } },
  ];

  return await mongo
    .collection<FilemakerMailMessageDocument>(MAIL_MESSAGES_COLLECTION)
    .find(filter)
    .sort({ receivedAt: -1, sentAt: -1 })
    .limit(input.limit ?? 200)
    .toArray();
};
