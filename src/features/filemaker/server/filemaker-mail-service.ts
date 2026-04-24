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

import { stripHtmlToPlainText } from '@/shared/lib/document-editor-format';

import {
  buildFilemakerMailForwardHtmlSeed,
  buildFilemakerMailPlainText,
  buildFilemakerMailReplyHtmlSeed,
  buildFilemakerMailSnippet,
  dedupeFilemakerMailParticipants,
  ensureFilemakerForwardSubject,
  ensureFilemakerMailPlainTextAlternative,
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
  FilemakerMailAccountStatus,
  FilemakerMailComposeInput,
  FilemakerMailFlagPatch,
  FilemakerMailFolderRole,
  FilemakerMailFolderSummary,
  FilemakerMailMessage,
  FilemakerMailOutboxEntry,
  FilemakerMailParticipant,
  FilemakerMailSearchHit,
  FilemakerMailSearchResponse,
  FilemakerMailSearchResultGroup,
  FilemakerMailSyncResult,
  FilemakerMailThread,
  FilemakerMailThreadDetail,
} from '../types';

import { logSystemEvent } from '@/shared/lib/observability/system-logger';

import { readFilemakerCampaignSettingValue } from './campaign-settings-store';
import {
  detectFilemakerCampaignReplyContext,
  recordFilemakerCampaignReply,
} from './campaign-reply-detector';
import {
  filterFilemakerMailSuppressionEntries,
  recordFilemakerMailBounceSuppressions,
} from './campaign-suppression';
import { createImapClient, listImapMailboxes } from './mail/mail-imap';
import {
  isLikelyFilemakerMailBounceMessage,
  parseFilemakerMailDsnReport,
} from './mail/mail-dsn';
import { parseMailSource } from './mail/mail-processor';
import * as storage from './mail/mail-storage';
import * as smtp from './mail/mail-smtp';
import * as mailServerUtils from './mail/mail-utils';

import type {
  MailparserAttachment,
  MailparserParsedMail,
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

type ImapCommandError = Error & {
  code?: unknown;
  mailboxMissing?: unknown;
  response?: unknown;
  responseStatus?: unknown;
  responseText?: unknown;
  serverResponseCode?: unknown;
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
    campaignId?: string | null;
    runId?: string | null;
    deliveryId?: string | null;
    limit?: number | null;
  } = {}
): Promise<FilemakerMailThread[]> => {
  const mongo = await getMongoDb();
  const filter: Record<string, unknown> = {};
  if (typeof input.accountId === 'string' && input.accountId.length > 0) {
    filter['accountId'] = input.accountId;
  }
  if (typeof input.mailboxPath === 'string' && input.mailboxPath.length > 0) {
    filter['mailboxPath'] = input.mailboxPath;
  }
  if (typeof input.campaignId === 'string' && input.campaignId.length > 0) {
    filter['campaignContext.campaignId'] = input.campaignId;
  }
  if (typeof input.runId === 'string' && input.runId.length > 0) {
    filter['campaignContext.runId'] = input.runId;
  }
  if (typeof input.deliveryId === 'string' && input.deliveryId.length > 0) {
    filter['campaignContext.deliveryId'] = input.deliveryId;
  }
  const cursor = mongo
    .collection<FilemakerMailThreadDocument>(MAIL_THREADS_COLLECTION)
    .find(filter)
    .sort({ lastMessageAt: -1, subject: 1 });
  if (typeof input.limit === 'number' && input.limit > 0) {
    cursor.limit(input.limit);
  }
  return await cursor.toArray();
};

const sortThreadsByActivity = (threads: FilemakerMailThread[]): FilemakerMailThread[] =>
  threads.slice().sort((left, right) => {
    const timeDelta =
      Date.parse(right.lastMessageAt ?? '') - Date.parse(left.lastMessageAt ?? '');
    if (timeDelta !== 0) return timeDelta;
    return left.subject.localeCompare(right.subject);
  });

const getThreadCampaignContextSearchTokens = (
  thread: FilemakerMailThread
): string[] => {
  const context = thread.campaignContext;
  if (context === null || context === undefined) return [];
  return [
    context.campaignId,
    context.runId ?? '',
    context.deliveryId ?? '',
  ];
};

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
    ...getThreadCampaignContextSearchTokens(thread),
  ]
    .join('\n')
    .toLowerCase()
    .includes(normalizedQuery);
};

const toIsoTimestamp = (
  value: Date | string | null | undefined,
  fallback: string
): string => {
  if (!value) return fallback;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toISOString();
};

const normalizeMailHtml = (
  value: MailparserParsedMail['html']
): string | null => {
  if (!value) return null;
  const html = typeof value === 'string' ? value : value.toString();
  const normalized = normalizeString(html);
  return normalized || null;
};

const mergeUniqueStrings = (
  ...groups: ReadonlyArray<ReadonlyArray<string | null | undefined>>
): string[] =>
  Array.from(
    new Set(
      groups
        .flat()
        .map((entry) => normalizeString(entry))
        .filter(Boolean)
    )
  );

const mergeParticipants = (
  ...groups: ReadonlyArray<ReadonlyArray<FilemakerMailParticipant>>
): FilemakerMailParticipant[] => dedupeFilemakerMailParticipants(groups.flat());

const buildThreadParticipantSummary = (
  account: Pick<FilemakerMailAccount, 'emailAddress'>,
  participants: FilemakerMailParticipant[]
): FilemakerMailParticipant[] => {
  const allParticipants = dedupeFilemakerMailParticipants(participants);
  const externalParticipants = allParticipants.filter(
    (participant) =>
      normalizeString(participant.address).toLowerCase() !==
      normalizeString(account.emailAddress).toLowerCase()
  );
  return externalParticipants.length > 0 ? externalParticipants : allParticipants;
};

const buildAttachmentIdBase = (value: string | null | undefined): string =>
  toIdToken(normalizeString(value)) || randomUUID();

const toMessageAttachments = (
  attachments: MailparserAttachment[] | null | undefined,
  idBase: string
): FilemakerMailMessage['attachments'] =>
  (attachments ?? []).map((attachment, index) => ({
    id: `filemaker-mail-attachment-${idBase}-${index + 1}`,
    fileName: normalizeString(attachment.filename) || null,
    contentType: normalizeString(attachment.contentType) || null,
    sizeBytes:
      typeof attachment.size === 'number' && Number.isFinite(attachment.size)
        ? attachment.size
        : null,
    contentId: normalizeString(attachment.cid) || null,
    disposition: normalizeString(attachment.contentDisposition) || null,
    isInline: normalizeString(attachment.contentDisposition).toLowerCase() === 'inline',
  }));

const resolveMailboxPath = (
  availablePaths: Map<string, string>,
  path: string
): string => availablePaths.get(normalizeString(path).toLowerCase()) ?? path;

const resolveMailboxPathsToSync = (
  account: FilemakerMailAccount,
  mailboxes: Array<{
    path: string;
    flags: Set<string>;
  }>
): string[] => {
  const selectableMailboxes = mailboxes.filter((mailbox) => !mailbox.flags.has('\\Noselect'));
  const availablePaths = new Map(
    selectableMailboxes.map((mailbox) => [mailbox.path.toLowerCase(), mailbox.path])
  );

  if (account.folderAllowlist.length > 0) {
    return Array.from(
      new Set(
        account.folderAllowlist
          .map((path) => resolveMailboxPath(availablePaths, path))
          .map((path) => normalizeString(path))
          .filter(Boolean)
      )
    );
  }

  const autoPaths = selectableMailboxes.map((mailbox) => mailbox.path);
  return autoPaths.length > 0 ? autoPaths : ['INBOX'];
};

const normalizeErrorTextPart = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : null;
};

const formatImapSyncError = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return 'Mailbox sync failed.';
  }

  const imapError = error as ImapCommandError;
  const responseText = normalizeErrorTextPart(imapError.responseText);
  const response = normalizeErrorTextPart(imapError.response);
  const responseStatus = normalizeErrorTextPart(imapError.responseStatus);
  const responseCode =
    normalizeErrorTextPart(imapError.serverResponseCode) ??
    normalizeErrorTextPart(imapError.code);
  const detail = responseText ?? response;
  const statusParts: string[] = [];
  if (responseStatus !== null) statusParts.push(responseStatus);
  if (responseCode !== null) statusParts.push(responseCode);
  const statusLabel = statusParts.join(' ');

  if (error.message === 'Command failed') {
    if (detail !== null) {
      return statusLabel.length > 0
        ? `IMAP command failed (${statusLabel}): ${detail}`
        : `IMAP command failed: ${detail}`;
    }
    if (imapError.mailboxMissing === true) {
      return 'IMAP command failed: mailbox not found.';
    }
    return 'IMAP command failed.';
  }

  if (detail !== null && detail !== error.message) {
    return `${error.message}: ${detail}`;
  }

  return error.message || 'Mailbox sync failed.';
};

const formatFolderSyncErrors = (errors: string[]): string => {
  const suffix = errors.length === 1 ? 'folder' : 'folders';
  return `Mailbox sync finished with ${errors.length} failed ${suffix}: ${errors.join('; ')}`;
};

const resolveImapSearchResults = (
  searchResults: number[] | false,
  mailboxPath: string
): number[] => {
  if (searchResults === false) {
    throw new Error(
      `IMAP search failed for mailbox ${mailboxPath}. The server rejected the search command.`
    );
  }
  return searchResults.slice().sort((left, right) => left - right);
};

const buildInitialMailboxUids = async (
  client: ReturnType<typeof createImapClient>,
  account: FilemakerMailAccount,
  mailboxPath: string
): Promise<number[]> => {
  const lookbackStart = new Date();
  lookbackStart.setDate(lookbackStart.getDate() - account.initialSyncLookbackDays);
  const searchResults = await client.search({ since: lookbackStart }, { uid: true });
  const uids = resolveImapSearchResults(searchResults, mailboxPath);
  return uids.slice(-account.maxMessagesPerSync);
};

const buildIncrementalMailboxUids = async (
  client: ReturnType<typeof createImapClient>,
  lastUid: number,
  mailboxPath: string
): Promise<number[]> => {
  const searchResults = await client.search({ uid: `${lastUid + 1}:*` }, { uid: true });
  return resolveImapSearchResults(searchResults, mailboxPath);
};

const syncMailboxMessages = async (input: {
  account: FilemakerMailAccount;
  mailboxPath: string;
  mailboxRole: FilemakerMailFolderRole;
  client: ReturnType<typeof createImapClient>;
  touchedThreadIds: Set<string>;
}): Promise<{
  fetchedMessageCount: number;
  insertedMessageCount: number;
  updatedMessageCount: number;
  lastUid: number;
}> => {
  const lock = await input.client.getMailboxLock(input.mailboxPath, { readOnly: true });

  try {
    const mailbox = input.client.mailbox;
    if (!mailbox) {
      return {
        fetchedMessageCount: 0,
        insertedMessageCount: 0,
        updatedMessageCount: 0,
        lastUid: 0,
      };
    }

    const now = new Date().toISOString();
    const uidValidity = mailbox.uidValidity?.toString() ?? null;
    const existingSyncState = await storage.getMailSyncState(
      input.account.id,
      input.mailboxPath
    );
    const existingMessageCount = existingSyncState
      ? await storage.countMailMessagesForMailbox(input.account.id, input.mailboxPath)
      : 0;
    const uidValidityChanged =
      Boolean(existingSyncState?.uidValidity) &&
      existingSyncState?.uidValidity !== uidValidity;
    const isIncremental =
      Boolean(existingSyncState) &&
      existingMessageCount > 0 &&
      !uidValidityChanged &&
      existingSyncState?.uidValidity === uidValidity &&
      (existingSyncState?.lastUid ?? 0) > 0;
    const shouldResetSyncCursor = Boolean(existingSyncState) && existingMessageCount === 0;

    const messageUids = isIncremental
      ? await buildIncrementalMailboxUids(
          input.client,
          existingSyncState?.lastUid ?? 0,
          input.mailboxPath
        )
      : await buildInitialMailboxUids(input.client, input.account, input.mailboxPath);

    let fetchedMessageCount = 0;
    let insertedMessageCount = 0;
    let updatedMessageCount = 0;
    let highestSeenUid =
      uidValidityChanged || shouldResetSyncCursor ? 0 : existingSyncState?.lastUid ?? 0;

    if (messageUids.length > 0) {
      const limitedUids = messageUids.slice(-input.account.maxMessagesPerSync);
      highestSeenUid = Math.max(highestSeenUid, limitedUids[limitedUids.length - 1] ?? 0);

      for await (const entry of input.client.fetch(
        limitedUids,
        {
          uid: true,
          flags: true,
          envelope: true,
          internalDate: true,
          source: true,
          threadId: true,
        },
        { uid: true }
      )) {
        if (!entry.source) continue;

        fetchedMessageCount += 1;

        const parsed = await parseMailSource(entry.source);
        const providerMessageId =
          normalizeString(parsed.messageId ?? entry.envelope?.messageId ?? null) || null;
        const existingMessage =
          (providerMessageId
            ? await storage.getMailMessageByProviderId(input.account.id, providerMessageId)
            : null) ??
          (await storage.getMailMessageByUid(
            input.account.id,
            input.mailboxPath,
            entry.uid
          ));

        const from =
          mailServerUtils.parseMailParserAddressList(parsed.from)[0] ??
          mailServerUtils.toParticipantList(entry.envelope?.from ?? [])[0] ??
          null;
        const to = mailServerUtils.pickParticipantList(
          mailServerUtils.parseMailParserAddressList(parsed.to),
          mailServerUtils.toParticipantList(entry.envelope?.to ?? [])
        );
        const cc = mailServerUtils.pickParticipantList(
          mailServerUtils.parseMailParserAddressList(parsed.cc),
          mailServerUtils.toParticipantList(entry.envelope?.cc ?? [])
        );
        const bcc = mailServerUtils.pickParticipantList(
          mailServerUtils.parseMailParserAddressList(parsed.bcc),
          mailServerUtils.toParticipantList(entry.envelope?.bcc ?? [])
        );
        const replyTo = mailServerUtils.pickParticipantList(
          mailServerUtils.parseMailParserAddressList(parsed.replyTo),
          mailServerUtils.toParticipantList(entry.envelope?.replyTo ?? [])
        );
        const allParticipants = mergeParticipants(
          from ? [from] : [],
          to,
          cc,
          bcc,
          replyTo
        );
        const participantSummary = buildThreadParticipantSummary(input.account, allParticipants);
        const relatedLinks = await resolveRelatedPartiesForParticipants(allParticipants);
        const subject = normalizeString(parsed.subject ?? entry.envelope?.subject) || '(no subject)';
        const normalizedSubject = normalizeFilemakerMailSubject(subject);
        const htmlBody = normalizeMailHtml(parsed.html);
        const textBody = normalizeString(parsed.text) || null;
        const snippet = buildFilemakerMailSnippet(textBody, htmlBody);
        const sentAt = toIsoTimestamp(
          parsed.date ?? entry.envelope?.date ?? entry.internalDate ?? null,
          now
        );
        const receivedAt = toIsoTimestamp(
          entry.internalDate ?? parsed.date ?? entry.envelope?.date ?? null,
          sentAt
        );
        const messageTimestamp =
          Date.parse(receivedAt) >= Date.parse(sentAt) ? receivedAt : sentAt;
        const flags = mailServerUtils.deriveFlags(entry.flags);
        const direction = mailServerUtils.resolveDirection(input.account, from);
        const providerThreadId = normalizeString(entry.threadId) || null;
        const anchorParticipants =
          participantSummary.length > 0 ? participantSummary : allParticipants;
        const anchorAddress = mailServerUtils.pickAnchorAddress(anchorParticipants);
        const inReplyToHeader = normalizeString(parsed.inReplyTo ?? entry.envelope?.inReplyTo) || null;
        const referenceIds = Array.from(
          new Set(
            [
              ...mailServerUtils.normalizeReferenceIds(parsed.references),
              ...mailServerUtils.parseReferencesHeader(entry.envelope),
              ...(inReplyToHeader ? [inReplyToHeader] : []),
            ].filter((referenceId) => referenceId.trim().length > 0)
          )
        );

        let resolvedThread: FilemakerMailThread | null = null;
        if (!existingMessage) {
          if (providerThreadId) {
            resolvedThread = await storage.findMailThreadByProviderId(input.account.id, providerThreadId);
          }
          if (!resolvedThread && referenceIds.length > 0) {
            resolvedThread = await storage.findMailThreadByReferences(input.account.id, referenceIds);
          }
          if (!resolvedThread) {
            resolvedThread = await storage.findMailThreadBySubjectAndAnchor(
              input.account.id,
              normalizedSubject,
              anchorAddress
            );
          }
        }

        const threadId =
          existingMessage?.threadId ??
          resolvedThread?.id ??
          mailServerUtils.buildThreadId({
            accountId: input.account.id,
            providerThreadId,
            normalizedSubject,
            anchorAddress,
          });
        const currentThread = resolvedThread ?? (await storage.getMailThreadById(threadId));
        const attachmentIdBase = buildAttachmentIdBase(
          providerMessageId ?? `${input.mailboxPath}-${entry.uid}`
        );

        let campaignReplyContext = existingMessage?.campaignContext ?? null;
        if (!campaignReplyContext && direction === 'inbound' && referenceIds.length > 0) {
          campaignReplyContext = await detectFilemakerCampaignReplyContext({
            accountId: input.account.id,
            references: referenceIds,
          });
        }
        if (!campaignReplyContext && direction === 'inbound') {
          campaignReplyContext = currentThread?.campaignContext ?? null;
        }

        const nextMessage: FilemakerMailMessage = {
          id: existingMessage?.id ?? `filemaker-mail-message-${randomUUID()}`,
          createdAt: existingMessage?.createdAt ?? now,
          updatedAt: now,
          accountId: input.account.id,
          threadId,
          mailboxPath: input.mailboxPath,
          mailboxRole: input.mailboxRole,
          providerMessageId,
          providerThreadId,
          providerUid: entry.uid,
          direction,
          subject,
          snippet,
          from,
          to,
          cc,
          bcc,
          replyTo,
          sentAt,
          receivedAt,
          flags,
          textBody,
          htmlBody,
          inReplyTo: inReplyToHeader,
          references: referenceIds,
          attachments: toMessageAttachments(parsed.attachments, attachmentIdBase),
          relatedPersonIds: relatedLinks.personIds,
          relatedOrganizationIds: relatedLinks.organizationIds,
          campaignContext: campaignReplyContext,
        };
        await storage.upsertMailMessage(nextMessage);

        if (!existingMessage && campaignReplyContext && direction === 'inbound') {
          void recordFilemakerCampaignReply({
            campaignContext: campaignReplyContext,
            replyMessage: nextMessage,
          }).catch(() => {});
        }

        if (
          !existingMessage &&
          direction === 'inbound' &&
          isLikelyFilemakerMailBounceMessage(parsed)
        ) {
          const report = parseFilemakerMailDsnReport(parsed);
          if (report.isPermanent && report.bouncedAddresses.length > 0) {
            void recordFilemakerMailBounceSuppressions({
              addresses: report.bouncedAddresses,
              notes: `Auto-suppressed after inbound DSN${
                report.status ? ` (status ${report.status})` : ''
              }${report.diagnosticCode ? `: ${report.diagnosticCode}` : '.'}`,
              campaignId: campaignReplyContext?.campaignId ?? null,
              runId: campaignReplyContext?.runId ?? null,
              deliveryId: campaignReplyContext?.deliveryId ?? null,
            }).catch(() => {});
          }
        }

        const wasUnread =
          existingMessage?.direction === 'inbound' && !existingMessage.flags.seen ? 1 : 0;
        const isUnread = nextMessage.direction === 'inbound' && !nextMessage.flags.seen ? 1 : 0;
        const lastKnownThreadAt = currentThread?.lastMessageAt ?? '';
        const shouldRefreshThreadHeadline =
          !currentThread || Date.parse(messageTimestamp) >= Date.parse(lastKnownThreadAt || '');

        const nextThread: FilemakerMailThread = {
          id: threadId,
          createdAt: currentThread?.createdAt ?? now,
          updatedAt: now,
          accountId: input.account.id,
          mailboxPath: shouldRefreshThreadHeadline
            ? input.mailboxPath
            : (currentThread?.mailboxPath ?? input.mailboxPath),
          mailboxRole: shouldRefreshThreadHeadline
            ? input.mailboxRole
            : (currentThread?.mailboxRole ?? input.mailboxRole),
          providerThreadId: providerThreadId ?? currentThread?.providerThreadId ?? null,
          subject: shouldRefreshThreadHeadline
            ? subject
            : (currentThread?.subject ?? subject),
          normalizedSubject,
          anchorAddress: currentThread?.anchorAddress || anchorAddress,
          snippet: shouldRefreshThreadHeadline
            ? snippet
            : (currentThread?.snippet ?? snippet),
          participantSummary: mergeParticipants(
            participantSummary,
            currentThread?.participantSummary ?? []
          ),
          relatedPersonIds: mergeUniqueStrings(
            relatedLinks.personIds,
            currentThread?.relatedPersonIds ?? []
          ),
          relatedOrganizationIds: mergeUniqueStrings(
            relatedLinks.organizationIds,
            currentThread?.relatedOrganizationIds ?? []
          ),
          unreadCount: Math.max(
            0,
            (currentThread?.unreadCount ?? 0) + isUnread - wasUnread
          ),
          messageCount:
            (currentThread?.messageCount ?? 0) + (existingMessage ? 0 : 1),
          lastMessageAt: shouldRefreshThreadHeadline
            ? messageTimestamp
            : (currentThread?.lastMessageAt ?? messageTimestamp),
          campaignContext:
            campaignReplyContext ?? currentThread?.campaignContext ?? null,
        };
        await storage.upsertMailThread(nextThread);
        input.touchedThreadIds.add(threadId);

        if (existingMessage) {
          updatedMessageCount += 1;
        } else {
          insertedMessageCount += 1;
        }
      }
    } else if (!isIncremental) {
      highestSeenUid = Math.max(highestSeenUid, Math.max(0, mailbox.uidNext - 1));
    }

    await storage.upsertMailSyncState({
      id:
        existingSyncState?.id ??
        mailServerUtils.buildSyncStateId(input.account.id, input.mailboxPath),
      createdAt: existingSyncState?.createdAt ?? now,
      updatedAt: now,
      accountId: input.account.id,
      mailboxPath: input.mailboxPath,
      role: input.mailboxRole,
      uidValidity,
      lastUid: highestSeenUid,
      lastSyncedAt: now,
    });

    return {
      fetchedMessageCount,
      insertedMessageCount,
      updatedMessageCount,
      lastUid: highestSeenUid,
    };
  } finally {
    lock.release();
  }
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
  const existingImapPasswordSettingKey = normalizeString(existing?.imapPasswordSettingKey);
  const existingSmtpPasswordSettingKey = normalizeString(existing?.smtpPasswordSettingKey);
  const imapPasswordSettingKey =
    existingImapPasswordSettingKey.length > 0
      ? existingImapPasswordSettingKey
      : mailServerUtils.buildAccountSecretSettingKey(id, 'imap_password');
  const smtpPasswordSettingKey =
    existingSmtpPasswordSettingKey.length > 0
      ? existingSmtpPasswordSettingKey
      : mailServerUtils.buildAccountSecretSettingKey(id, 'smtp_password');
  const dkimDomain = normalizeNullableString(draft.dkimDomain);
  const dkimKeySelector = normalizeNullableString(draft.dkimKeySelector);
  const hasIncomingDkimPrivateKey = normalizeString(draft.dkimPrivateKey).length > 0;
  const existingDkimPrivateKeySettingKey = normalizeString(existing?.dkimPrivateKeySettingKey);
  const shouldPersistDkimKey = Boolean(dkimDomain && dkimKeySelector && hasIncomingDkimPrivateKey);
  const dkimPrivateKeySettingKey =
    shouldPersistDkimKey && existingDkimPrivateKeySettingKey.length === 0
      ? mailServerUtils.buildAccountSecretSettingKey(id, 'dkim_private_key')
      : existingDkimPrivateKeySettingKey || null;

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
    imapPasswordSettingKey,
    smtpHost: normalizeString(draft.smtpHost),
    smtpPort: draft.smtpPort,
    smtpSecure: draft.smtpSecure,
    smtpUser: normalizeString(draft.smtpUser),
    smtpPasswordSettingKey,
    fromName: normalizeNullableString(draft.fromName),
    replyToEmail: normalizeNullableEmail(draft.replyToEmail),
    folderAllowlist: parseFilemakerMailboxAllowlistInput(draft.folderAllowlist.join(',')),
    initialSyncLookbackDays: draft.initialSyncLookbackDays,
    maxMessagesPerSync: draft.maxMessagesPerSync,
    pushEnabled: draft.pushEnabled ?? existing?.pushEnabled ?? true,
    lastSyncedAt: existing?.lastSyncedAt ?? null,
    lastSyncError: existing?.lastSyncError ?? null,
    dkimDomain: dkimDomain ?? existing?.dkimDomain ?? null,
    dkimKeySelector: dkimKeySelector ?? existing?.dkimKeySelector ?? null,
    dkimPrivateKeySettingKey: dkimPrivateKeySettingKey ?? null,
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
  if (shouldPersistDkimKey && nextAccount.dkimPrivateKeySettingKey) {
    await upsertSecretSettingValue(nextAccount.dkimPrivateKeySettingKey, draft.dkimPrivateKey);
  }

  await storage.ensureMailIndexes();
  return nextAccount;
};

export const saveFilemakerMailAccount = upsertFilemakerMailAccount;

export const deleteFilemakerMailAccount = async (id: string): Promise<void> => {
  await storage.deleteMailAccount(id);
};

export const updateFilemakerMailAccountStatus = async (
  id: string,
  status: FilemakerMailAccountStatus
): Promise<FilemakerMailAccount> => {
  const account = await getFilemakerMailAccount(id);
  const nextAccount: FilemakerMailAccount = {
    ...account,
    status,
    updatedAt: new Date().toISOString(),
  };

  await storage.upsertMailAccount(nextAccount);
  return nextAccount;
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
  campaignId?: string | null;
  runId?: string | null;
  deliveryId?: string | null;
  limit?: number | null;
}): Promise<FilemakerMailThread[]> => {
  const threads = await listThreadDocuments({
    accountId: input?.accountId ?? null,
    mailboxPath: input?.mailboxPath ?? null,
    campaignId: input?.campaignId ?? null,
    runId: input?.runId ?? null,
    deliveryId: input?.deliveryId ?? null,
    limit: input?.query ? null : input?.limit ?? null,
  });
  const matchingThreads = sortThreadsByActivity(
    threads.filter((thread) => matchesThreadQuery(thread, input?.query ?? ''))
  );
  return typeof input?.limit === 'number' ? matchingThreads.slice(0, input.limit) : matchingThreads;
};

export const listFilemakerMailThreadsForCampaign = async (input: {
  campaignId: string;
  runId?: string | null;
  deliveryId?: string | null;
  limit?: number | null;
}): Promise<FilemakerMailThread[]> => {
  const campaignId = normalizeString(input.campaignId);
  if (campaignId.length === 0) return [];

  return listFilemakerMailThreads({
    campaignId,
    runId: normalizeNullableString(input.runId),
    deliveryId: normalizeNullableString(input.deliveryId),
    limit: input.limit ?? null,
  });
};

export const getFilemakerMailThreadForCampaignDelivery = async (input: {
  campaignId: string;
  runId?: string | null;
  deliveryId: string;
}): Promise<FilemakerMailThread | null> => {
  const threads = await listFilemakerMailThreadsForCampaign({
    campaignId: input.campaignId,
    runId: input.runId ?? null,
    deliveryId: input.deliveryId,
    limit: 1,
  });
  return threads[0] ?? null;
};

export const syncFilemakerMailAccount = async (
  id: string
): Promise<FilemakerMailSyncResult & { lastSyncError: string | null }> => {
  const account = await getFilemakerMailAccount(id);
  const completedAt = new Date().toISOString();
  const imapPasswordKey = mailServerUtils.resolveAccountSecretSettingKey(account, 'imap_password');
  const defaultFolders =
    account.folderAllowlist.length > 0 ? account.folderAllowlist : ['INBOX'];

  try {
    const secrets = await readSecretSettingValues([imapPasswordKey]);
    const imapPassword = secrets[imapPasswordKey];
    if (!imapPassword) {
      throw configurationError(
        `IMAP password not configured for ${account.emailAddress}. Set it on the mail account before syncing.`
      );
    }
    const client = createImapClient(account, imapPassword);
    const touchedThreadIds = new Set<string>();
    let foldersScanned = defaultFolders;
    let fetchedMessageCount = 0;
    let insertedMessageCount = 0;
    let updatedMessageCount = 0;
    let successfulFolderCount = 0;
    const folderSyncErrors: string[] = [];

    try {
      await client.connect();
      const mailboxes = await listImapMailboxes(client);
      const mailboxRoleByPath = new Map(
        mailboxes.map((mailbox) => [mailbox.path, mailServerUtils.normalizeMailboxRole(mailbox)])
      );
      foldersScanned = resolveMailboxPathsToSync(account, mailboxes);

      for (const mailboxPath of foldersScanned) {
        try {
          const mailboxResult = await syncMailboxMessages({
            account,
            mailboxPath,
            mailboxRole:
              mailboxRoleByPath.get(mailboxPath) ?? inferMailboxRoleFromPath(mailboxPath),
            client,
            touchedThreadIds,
          });
          fetchedMessageCount += mailboxResult.fetchedMessageCount;
          insertedMessageCount += mailboxResult.insertedMessageCount;
          updatedMessageCount += mailboxResult.updatedMessageCount;
          successfulFolderCount += 1;
        } catch (error) {
          const folderError = `${mailboxPath}: ${formatImapSyncError(error)}`;
          folderSyncErrors.push(folderError);
          await logSystemEvent({
            level: 'warn',
            source: 'filemaker-mail-sync',
            message: `Failed to sync Filemaker mailbox ${mailboxPath} for ${account.emailAddress}`,
            error,
            context: {
              accountId: account.id,
              mailboxPath,
            },
          }).catch(() => {});
        }
      }
    } finally {
      try {
        await client.logout();
      } catch {
        client.close();
      }
    }

    if (successfulFolderCount === 0 && folderSyncErrors.length > 0) {
      throw new Error(formatFolderSyncErrors(folderSyncErrors));
    }

    const lastSyncError =
      folderSyncErrors.length > 0 ? formatFolderSyncErrors(folderSyncErrors) : null;
    const nextAccount: FilemakerMailAccount = {
      ...account,
      updatedAt: completedAt,
      lastSyncedAt: completedAt,
      lastSyncError,
    };
    await storage.upsertMailAccount(nextAccount);

    return {
      accountId: id,
      foldersScanned,
      fetchedMessageCount,
      insertedMessageCount,
      updatedMessageCount,
      touchedThreadCount: touchedThreadIds.size,
      completedAt,
      lastSyncError,
    };
  } catch (error) {
    const lastSyncError = formatImapSyncError(error);
    await storage.upsertMailAccount({
      ...account,
      updatedAt: completedAt,
      lastSyncError,
    });

    return {
      accountId: id,
      foldersScanned: defaultFolders,
      fetchedMessageCount: 0,
      insertedMessageCount: 0,
      updatedMessageCount: 0,
      touchedThreadCount: 0,
      completedAt,
      lastSyncError,
    };
  }
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

const resolveFilemakerMailThreadDetailInput = async (
  input: string | FilemakerMailThreadDetail
): Promise<FilemakerMailThreadDetail | null> => {
  if (typeof input !== 'string') {
    return input;
  }
  return getFilemakerMailThreadDetail(input);
};

export const buildFilemakerMailReplyDraft = async (
  threadIdOrDetail: string | FilemakerMailThreadDetail
): Promise<{
  accountId: string;
  to: FilemakerMailParticipant[];
  subject: string;
  bodyHtml: string;
  inReplyTo: string | null;
} | null> => {
  const detail = await resolveFilemakerMailThreadDetailInput(threadIdOrDetail);
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

export const buildFilemakerMailForwardDraft = async (
  threadIdOrDetail: string | FilemakerMailThreadDetail
): Promise<{
  accountId: string;
  to: FilemakerMailParticipant[];
  cc: FilemakerMailParticipant[];
  bcc: FilemakerMailParticipant[];
  subject: string;
  bodyHtml: string;
  inReplyTo: string | null;
} | null> => {
  const detail = await resolveFilemakerMailThreadDetailInput(threadIdOrDetail);
  if (!detail) return null;
  const referenceMessage = detail.messages[detail.messages.length - 1] ?? null;

  if (!referenceMessage) return null;

  return {
    accountId: detail.thread.accountId,
    to: [],
    cc: [],
    bcc: [],
    subject: ensureFilemakerForwardSubject(detail.thread.subject || referenceMessage.subject),
    bodyHtml: buildFilemakerMailForwardHtmlSeed(referenceMessage),
    inReplyTo: null,
  };
};

export const sendFilemakerMailMessage = async (input: FilemakerMailComposeInput): Promise<{
  message: FilemakerMailMessage;
  outbox: FilemakerMailOutboxEntry;
  outboxEntry: FilemakerMailOutboxEntry;
}> => {
  const account = await getFilemakerMailAccount(input.accountId);
  const smtpPasswordKey = mailServerUtils.resolveAccountSecretSettingKey(account, 'smtp_password');
  const dkimPrivateKeySettingKey = account.dkimPrivateKeySettingKey?.trim() || null;
  const secretKeys = [smtpPasswordKey, ...(dkimPrivateKeySettingKey ? [dkimPrivateKeySettingKey] : [])];
  const secrets = await readSecretSettingValues(secretKeys);
  const password = secrets[smtpPasswordKey];
  const dkimPrivateKey = dkimPrivateKeySettingKey ? secrets[dkimPrivateKeySettingKey] ?? null : null;

  const to = dedupeFilemakerMailParticipants(input.to);
  const cc = dedupeFilemakerMailParticipants(input.cc ?? []);
  const bcc = dedupeFilemakerMailParticipants(input.bcc ?? []);
  const recipientSummary = dedupeFilemakerMailParticipants([...to, ...cc, ...bcc]);

  if (!input.overrideSuppression) {
    const suppressed = await filterFilemakerMailSuppressionEntries(
      recipientSummary.map((participant) => participant.address)
    );
    if (suppressed.length > 0) {
      throw validationError(
        `Recipient(s) are on the suppression list: ${suppressed
          .map((entry) => `${entry.emailAddress} (${entry.reason})`)
          .join(', ')}. Pass overrideSuppression=true to force-send.`
      );
    }
  }
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

  const transport = smtp.createSmtpTransport(account, password ?? undefined, dkimPrivateKey);
  const attachments = (input.attachments ?? []).map((attachment) => ({
    filename: attachment.fileName,
    contentType: attachment.contentType,
    content: Buffer.from(attachment.dataBase64, 'base64'),
  }));
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
    text: ensureFilemakerMailPlainTextAlternative(bodyText, input.bodyHtml),
    html: input.bodyHtml,
    attachments: attachments.length > 0 ? attachments : undefined,
  });
  const rawMessage = (sendResult as unknown as { message?: Buffer | string }).message;
  if (rawMessage) {
    void appendFilemakerMailToSentFolder({
      account,
      rawMessage,
    }).catch(() => {});
  }

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
    campaignContext: input.campaignContext ?? null,
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
    anchorAddress:
      existingThread?.anchorAddress ||
      mailServerUtils.pickAnchorAddress(recipientSummary),
    snippet,
    participantSummary: recipientSummary,
    relatedPersonIds: personIds,
    relatedOrganizationIds: organizationIds,
    unreadCount: existingThread?.unreadCount ?? 0,
    messageCount: (existingThread?.messageCount ?? 0) + 1,
    lastMessageAt: now,
    campaignContext: input.campaignContext ?? existingThread?.campaignContext ?? null,
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

export const markFilemakerMailThreadRead = async (
  threadId: string,
  read: boolean
): Promise<FilemakerMailThread> => {
  const thread = await storage.getMailThreadById(threadId);
  if (!thread) throw validationError('Thread not found.');
  const messages = await storage.listMailMessagesByThreadId(threadId);
  for (const message of messages) {
    await storage.upsertMailMessage({
      ...message,
      flags: { ...message.flags, seen: read },
    });
  }
  const updatedThread: FilemakerMailThread = {
    ...thread,
    unreadCount: read ? 0 : messages.length,
    updatedAt: new Date().toISOString(),
  };
  await storage.upsertMailThread(updatedThread);
  return updatedThread;
};

const flagKeyToImapName = (key: keyof FilemakerMailFlagPatch): string => {
  switch (key) {
    case 'seen':
      return '\\Seen';
    case 'flagged':
      return '\\Flagged';
    case 'answered':
      return '\\Answered';
    case 'deleted':
      return '\\Deleted';
  }
};

export const updateFilemakerMailMessageFlags = async (
  messageId: string,
  patch: FilemakerMailFlagPatch
): Promise<FilemakerMailMessage> => {
  const mongo = await getMongoDb();
  const message = await mongo
    .collection<FilemakerMailMessage & { _id: string }>('filemaker_mail_messages')
    .findOne({ id: messageId });
  if (!message) throw validationError('Message not found.');
  const account = await getFilemakerMailAccount(message.accountId);
  const adds: string[] = [];
  const removes: string[] = [];
  const nextFlags = { ...message.flags };
  (Object.keys(patch) as Array<keyof FilemakerMailFlagPatch>).forEach((key) => {
    const next = patch[key];
    if (typeof next !== 'boolean') return;
    const current = message.flags[key] ?? false;
    if (next === current) return;
    nextFlags[key] = next;
    const flagName = flagKeyToImapName(key);
    if (next) adds.push(flagName);
    else removes.push(flagName);
  });

  if (typeof message.providerUid === 'number' && (adds.length > 0 || removes.length > 0)) {
    const passwordKey = mailServerUtils.resolveAccountSecretSettingKey(account, 'imap_password');
    const secrets = await readSecretSettingValues([passwordKey]);
    const password = secrets[passwordKey];
    if (password) {
      const client = createImapClient(account, password);
      try {
        await client.connect();
        const lock = await client.getMailboxLock(message.mailboxPath);
        try {
          if (adds.length > 0) {
            await client.messageFlagsAdd({ uid: message.providerUid }, adds, { uid: true });
          }
          if (removes.length > 0) {
            await client.messageFlagsRemove({ uid: message.providerUid }, removes, { uid: true });
          }
        } finally {
          lock.release();
        }
      } finally {
        try {
          await client.logout();
        } catch {
          client.close();
        }
      }
    }
  }

  const updatedMessage: FilemakerMailMessage = {
    ...message,
    flags: nextFlags,
    updatedAt: new Date().toISOString(),
  };
  await storage.upsertMailMessage(updatedMessage);

  const thread = await storage.getMailThreadById(message.threadId);
  if (thread) {
    const messages = await storage.listMailMessagesByThreadId(message.threadId);
    const unreadCount = messages.filter(
      (candidate) => candidate.direction === 'inbound' && !candidate.flags.seen
    ).length;
    await storage.upsertMailThread({
      ...thread,
      unreadCount,
      updatedAt: new Date().toISOString(),
    });
  }

  return updatedMessage;
};

const resolveMailboxPathByRole = async (
  client: ReturnType<typeof createImapClient>,
  role: FilemakerMailFolderRole
): Promise<string | null> => {
  const mailboxes = await listImapMailboxes(client);
  const match = mailboxes.find(
    (mailbox) => mailServerUtils.normalizeMailboxRole(mailbox) === role
  );
  return match?.path ?? null;
};

export const moveFilemakerMailMessage = async (input: {
  messageId: string;
  targetMailboxPath?: string | null;
  targetRole?: FilemakerMailFolderRole | null;
}): Promise<FilemakerMailMessage> => {
  const mongo = await getMongoDb();
  const message = await mongo
    .collection<FilemakerMailMessage & { _id: string }>('filemaker_mail_messages')
    .findOne({ id: input.messageId });
  if (!message) throw validationError('Message not found.');
  if (typeof message.providerUid !== 'number') {
    throw validationError('Message has no provider UID and cannot be moved.');
  }
  const account = await getFilemakerMailAccount(message.accountId);
  const passwordKey = mailServerUtils.resolveAccountSecretSettingKey(account, 'imap_password');
  const secrets = await readSecretSettingValues([passwordKey]);
  const password = secrets[passwordKey];
  if (!password) {
    throw configurationError(`IMAP password not configured for ${account.emailAddress}.`);
  }

  const client = createImapClient(account, password);
  let resolvedPath = input.targetMailboxPath ?? null;
  try {
    await client.connect();
    if (!resolvedPath && input.targetRole) {
      resolvedPath = await resolveMailboxPathByRole(client, input.targetRole);
    }
    if (!resolvedPath) {
      throw validationError('Target mailbox not found.');
    }
    const lock = await client.getMailboxLock(message.mailboxPath);
    try {
      await client.messageMove({ uid: message.providerUid }, resolvedPath, { uid: true });
    } finally {
      lock.release();
    }
  } finally {
    try {
      await client.logout();
    } catch {
      client.close();
    }
  }

  const updatedMessage: FilemakerMailMessage = {
    ...message,
    mailboxPath: resolvedPath,
    mailboxRole: input.targetRole ?? inferMailboxRoleFromPath(resolvedPath),
    updatedAt: new Date().toISOString(),
  };
  await storage.upsertMailMessage(updatedMessage);

  const threadMessages = await storage.listMailMessagesByThreadId(message.threadId);
  const representative = threadMessages[threadMessages.length - 1] ?? updatedMessage;
  const thread = await storage.getMailThreadById(message.threadId);
  if (thread) {
    await storage.upsertMailThread({
      ...thread,
      mailboxPath: representative.mailboxPath,
      mailboxRole: representative.mailboxRole,
      updatedAt: new Date().toISOString(),
    });
  }

  return updatedMessage;
};

export const appendFilemakerMailToSentFolder = async (input: {
  account: FilemakerMailAccount;
  rawMessage: string | Buffer;
}): Promise<void> => {
  const passwordKey = mailServerUtils.resolveAccountSecretSettingKey(input.account, 'imap_password');
  const secrets = await readSecretSettingValues([passwordKey]);
  const password = secrets[passwordKey];
  if (!password) return;
  const client = createImapClient(input.account, password);
  try {
    await client.connect();
    const sentPath = await resolveMailboxPathByRole(client, 'sent');
    if (!sentPath) return;
    await client.append(sentPath, input.rawMessage, ['\\Seen']);
  } catch (error) {
    await logSystemEvent({
      level: 'warn',
      source: 'filemaker-mail-sent-append',
      message: `Failed to append sent message for ${input.account.emailAddress}`,
      error,
    }).catch(() => {});
  } finally {
    try {
      await client.logout();
    } catch {
      client.close();
    }
  }
};

export const deleteFilemakerMailThread = async (threadId: string): Promise<void> => {
  const thread = await storage.getMailThreadById(threadId);
  if (!thread) throw validationError('Thread not found.');
  const mongo = await getMongoDb();
  await Promise.all([
    mongo.collection(MAIL_THREADS_COLLECTION).deleteOne({ id: threadId }),
    mongo.collection('filemaker_mail_messages').deleteMany({ threadId }),
  ]);
};

const SEARCH_SNIPPET_RADIUS = 80;
const MAX_SEARCH_SNIPPET_LENGTH = 200;

const buildSearchMatchSnippet = (
  text: string,
  query: string
): string => {
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  const lowerText = normalizedText.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);
  if (matchIndex < 0) {
    return normalizedText.length > MAX_SEARCH_SNIPPET_LENGTH
      ? `${normalizedText.slice(0, MAX_SEARCH_SNIPPET_LENGTH)}...`
      : normalizedText;
  }
  const start = Math.max(0, matchIndex - SEARCH_SNIPPET_RADIUS);
  const end = Math.min(normalizedText.length, matchIndex + query.length + SEARCH_SNIPPET_RADIUS);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < normalizedText.length ? '...' : '';
  return `${prefix}${normalizedText.slice(start, end)}${suffix}`;
};

const detectMatchField = (
  message: FilemakerMailMessage,
  query: string
): FilemakerMailSearchHit['matchField'] => {
  const lowerQuery = query.toLowerCase();
  if (message.subject.toLowerCase().includes(lowerQuery)) return 'subject';
  if (message.from?.address.toLowerCase().includes(lowerQuery)) return 'from';
  if (message.from?.name?.toLowerCase().includes(lowerQuery)) return 'from';
  if (message.to.some((p) => p.address.toLowerCase().includes(lowerQuery) || p.name?.toLowerCase().includes(lowerQuery))) return 'to';
  if (message.cc.some((p) => p.address.toLowerCase().includes(lowerQuery) || p.name?.toLowerCase().includes(lowerQuery))) return 'cc';
  return 'body';
};

const buildSearchableText = (message: FilemakerMailMessage): string => {
  if (message.textBody?.trim()) return message.textBody;
  if (message.htmlBody?.trim()) return stripHtmlToPlainText(message.htmlBody);
  return '';
};

export const searchFilemakerMailMessages = async (input: {
  query: string;
  accountId?: string | null;
}): Promise<FilemakerMailSearchResponse> => {
  const query = input.query.trim();
  if (!query) {
    return { query: '', totalHits: 0, groups: [] };
  }

  const messages = await storage.searchMailMessages({
    query,
    accountId: input.accountId ?? null,
    limit: 200,
  });

  const threadIds = [...new Set(messages.map((m) => m.threadId))];
  const threadDocs = await Promise.all(
    threadIds.map((id) => storage.getMailThreadById(id))
  );
  const threadMap = new Map(
    threadDocs.filter(Boolean).map((t) => [t!.id, t!])
  );

  const groupMap = new Map<string, FilemakerMailSearchResultGroup>();

  for (const message of messages) {
    const thread = threadMap.get(message.threadId);
    const matchField = detectMatchField(message, query);
    const textForSnippet =
      matchField === 'subject'
        ? message.subject
        : matchField === 'from'
          ? `${message.from?.name ?? ''} ${message.from?.address ?? ''}`
          : matchField === 'to'
            ? message.to.map((p) => `${p.name ?? ''} ${p.address}`).join(', ')
            : matchField === 'cc'
              ? message.cc.map((p) => `${p.name ?? ''} ${p.address}`).join(', ')
              : buildSearchableText(message);

    const hit: FilemakerMailSearchHit = {
      messageId: message.id,
      threadId: message.threadId,
      accountId: message.accountId,
      mailboxPath: message.mailboxPath,
      subject: message.subject,
      from: message.from ?? null,
      to: message.to,
      direction: message.direction,
      sentAt: message.sentAt ?? null,
      receivedAt: message.receivedAt ?? null,
      matchSnippet: buildSearchMatchSnippet(textForSnippet, query),
      matchField,
    };

    const existing = groupMap.get(message.threadId);
    if (existing) {
      existing.hits.push(hit);
    } else {
      groupMap.set(message.threadId, {
        threadId: message.threadId,
        threadSubject: thread?.subject ?? message.subject,
        accountId: message.accountId,
        mailboxPath: thread?.mailboxPath ?? message.mailboxPath,
        lastMessageAt: thread?.lastMessageAt ?? message.receivedAt ?? message.sentAt ?? message.createdAt ?? '',
        hits: [hit],
      });
    }
  }

  const groups = Array.from(groupMap.values()).sort(
    (a, b) => Date.parse(b.lastMessageAt || '') - Date.parse(a.lastMessageAt || '')
  );

  return {
    query,
    totalHits: messages.length,
    groups,
  };
};
