import { createHash, randomUUID } from 'crypto';
import type { ListResponse, MessageAddressObject, MessageEnvelopeObject } from 'imapflow';
import {
  dedupeFilemakerMailParticipants,
} from '../../mail-utils';
import { normalizeString, toIdToken } from '../../filemaker-settings.helpers';
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

export const toParticipant = (
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
      .filter((entry): entry is FilemakerMailParticipant => Boolean(entry))
  );

export const pickParticipantList = (
  preferred: FilemakerMailParticipant[],
  fallback: FilemakerMailParticipant[]
): FilemakerMailParticipant[] => (preferred.length > 0 ? preferred : fallback);

export const parseMailParserAddressList = (input: unknown): FilemakerMailParticipant[] => {
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

export const buildSyncStateId = (accountId: string, mailboxPath: string): string =>
  `filemaker-mail-sync-${toIdToken(`${accountId}-${mailboxPath}`) || randomUUID()}`;

export const buildAccountSecretSettingKey = (
  accountId: string,
  kind: 'imap_password' | 'smtp_password'
): string => `filemaker_mail_account_${accountId}_${kind}`;

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

export const pickAnchorAddress = (participants: FilemakerMailParticipant[]): string =>
  participants[0]?.address ?? 'unknown';

export const resolveDirection = (
  account: Pick<FilemakerMailAccount, 'emailAddress'>,
  from: FilemakerMailParticipant | null
): FilemakerMailMessageDirection =>
  normalizeEmailAddress(from?.address) === normalizeEmailAddress(account.emailAddress)
    ? 'outbound'
    : 'inbound';

export const deriveFlags = (flags: Set<string> | undefined): FilemakerMailFlags => ({
  seen: flags?.has('\\Seen') ?? false,
  answered: flags?.has('\\Answered') ?? false,
  flagged: flags?.has('\\Flagged') ?? false,
  draft: flags?.has('\\Draft') ?? false,
  deleted: flags?.has('\\Deleted') ?? false,
});

export const parseReferencesHeader = (envelope: MessageEnvelopeObject | undefined): string[] => {
  if (!envelope?.inReplyTo) return [];
  return envelope.inReplyTo
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
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
