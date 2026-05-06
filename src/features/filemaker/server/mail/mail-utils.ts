import { createHash, randomUUID } from 'crypto';
import type { ListResponse, MessageAddressObject, MessageEnvelopeObject } from 'imapflow';
import {
  dedupeFilemakerMailParticipants,
} from '../../mail-utils';
import { normalizeString, toIdToken } from '../../filemaker-settings.helpers';
import { FILEMAKER_MAIL_ACCOUNT_SECRET_SETTING_PREFIX } from '@/shared/lib/settings/secret-setting-keys';
import type {
  FilemakerMailAccount,
  FilemakerMailFlags,
  FilemakerMailFolderRole,
  FilemakerMailMessageDirection,
  FilemakerMailParticipant,
} from '../../types';

export const normalizeEmailAddress = (value: string | null | undefined): string => {
  const normalized = normalizeString(value).toLowerCase();
  return normalized;
};

const toNullableString = (value: string): string | null =>
  value.length > 0 ? value : null;

export const toParticipant = (
  input: MessageAddressObject | FilemakerMailParticipant | null | undefined
): FilemakerMailParticipant | null => {
  const rawAddress = input?.address ?? '';
  if (rawAddress.length === 0) return null;
  const address = normalizeEmailAddress(rawAddress);
  if (address.length === 0) return null;
  return {
    address,
    name: toNullableString(normalizeString('name' in input ? input.name : null)),
  };
};

export const toParticipantList = (
  input:
    | MessageAddressObject[]
    | FilemakerMailParticipant[]
    | null
    | undefined
): FilemakerMailParticipant[] =>
  dedupeFilemakerMailParticipants(
    (input ?? [])
      .map((entry) => toParticipant(entry))
      .filter((entry): entry is FilemakerMailParticipant => entry !== null)
  );

export const pickParticipantList = (
  preferred: FilemakerMailParticipant[],
  fallback: FilemakerMailParticipant[]
): FilemakerMailParticipant[] => (preferred.length > 0 ? preferred : fallback);

export const parseMailParserAddressList = (input: unknown): FilemakerMailParticipant[] => {
  if (input === null || input === undefined || typeof input !== 'object') return [];
  const values = Array.isArray((input as { value?: unknown }).value)
    ? ((input as { value?: Array<{ name?: string; address?: string }> }).value ?? [])
    : [];
  const participants: FilemakerMailParticipant[] = [];
  values.forEach((entry) => {
    if (entry.address === undefined || entry.address.length === 0) return;
    participants.push({
      address: normalizeEmailAddress(entry.address),
      name: toNullableString(normalizeString(entry.name)),
    });
  });
  return dedupeFilemakerMailParticipants(participants);
};

export const normalizeMailboxRole = (mailbox: Pick<ListResponse, 'path' | 'specialUse'>): FilemakerMailFolderRole => {
  const specialUse = normalizeString(mailbox.specialUse).toLowerCase();
  if (specialUse === '\\inbox' || mailbox.path.toUpperCase() === 'INBOX') return 'inbox';
  if (specialUse === '\\sent') return 'sent';
  if (specialUse === '\\drafts') return 'drafts';
  if (specialUse === '\\trash') return 'trash';
  if (specialUse === '\\archive') return 'archive';
  if (specialUse === '\\junk') return 'spam';
  return 'custom';
};

export const mailFolderRoleOrder: Record<FilemakerMailFolderRole, number> = {
  inbox: 0,
  sent: 1,
  drafts: 2,
  archive: 3,
  spam: 4,
  trash: 5,
  custom: 6,
};

export const buildSyncStateId = (accountId: string, mailboxPath: string): string => {
  const token = toIdToken(`${accountId}-${mailboxPath}`);
  return `filemaker-mail-sync-${token.length > 0 ? token : randomUUID()}`;
};

export const buildAccountSecretSettingKey = (
  accountId: string,
  kind: 'imap_password' | 'smtp_password' | 'google_oauth_refresh_token'
): string => `${FILEMAKER_MAIL_ACCOUNT_SECRET_SETTING_PREFIX}${accountId}_${kind}`;

export const resolveAccountSecretSettingKey = (
  account: Pick<FilemakerMailAccount, 'id' | 'imapPasswordSettingKey' | 'smtpPasswordSettingKey'>,
  kind: 'imap_password' | 'smtp_password'
): string => {
  const configuredKey = normalizeString(
    kind === 'imap_password' ? account.imapPasswordSettingKey : account.smtpPasswordSettingKey
  );
  return configuredKey.length > 0 ? configuredKey : buildAccountSecretSettingKey(account.id, kind);
};

export const buildThreadId = (input: {
  accountId: string;
  providerThreadId?: string | null;
  normalizedSubject: string;
  anchorAddress: string;
}): string => {
  const providerThreadId = input.providerThreadId ?? '';
  const hashSource =
    providerThreadId.length > 0
      ? `${input.accountId}:${providerThreadId}`
      : `${input.accountId}:${input.normalizedSubject}:${input.anchorAddress}`;
  const hash = createHash('sha1')
    .update(hashSource)
    .digest('hex')
    .slice(0, 16);
  return `filemaker-mail-thread-${hash}`;
};

export const pickAnchorAddress = (participants: FilemakerMailParticipant[]): string =>
  participants[0]?.address ?? 'unknown';

export const resolveDirection = (
  account: Pick<FilemakerMailAccount, 'emailAddress'>,
  from: FilemakerMailParticipant | null
): FilemakerMailMessageDirection =>
  normalizeEmailAddress(from?.address) === normalizeEmailAddress(account.emailAddress)
    ? 'outbound'
    : 'inbound';

const hasMailFlag = (flags: Set<string> | undefined, flag: string): boolean =>
  flags !== undefined ? flags.has(flag) : false;

export const deriveFlags = (flags: Set<string> | undefined): FilemakerMailFlags => ({
  seen: hasMailFlag(flags, '\\Seen'),
  answered: hasMailFlag(flags, '\\Answered'),
  flagged: hasMailFlag(flags, '\\Flagged'),
  draft: hasMailFlag(flags, '\\Draft'),
  deleted: hasMailFlag(flags, '\\Deleted'),
});

export const parseReferencesHeader = (envelope: MessageEnvelopeObject | undefined): string[] => {
  const inReplyTo = envelope?.inReplyTo ?? '';
  if (inReplyTo.length === 0) return [];
  return inReplyTo
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

export const normalizeReferenceIds = (input: unknown): string[] => {
  if (Array.isArray(input)) {
    return input.flatMap((entry) => normalizeReferenceIds(entry));
  }
  if (typeof input !== 'string') {
    return [];
  }
  return input
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};
