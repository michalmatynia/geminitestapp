import type {
  FilemakerMailAccount,
  FilemakerMailFolderSyncState,
  FilemakerMailMessage,
  FilemakerMailOutboxEntry,
  FilemakerMailParticipant,
  FilemakerMailThread,
} from '../../types';

export type FilemakerMailAccountDocument = FilemakerMailAccount & { _id: string };
export type FilemakerMailThreadDocument = FilemakerMailThread & { _id: string };
export type FilemakerMailMessageDocument = FilemakerMailMessage & { _id: string };
export type FilemakerMailSyncStateDocument = FilemakerMailFolderSyncState & { _id: string };
export type FilemakerMailOutboxDocument = FilemakerMailOutboxEntry & { _id: string };

export type FilemakerMailPartyLinks = {
  persons: string[];
  organizations: string[];
};

export type MailparserAddressEntry = {
  name?: string | null;
  address?: string | null;
};

export type MailparserAddressObject = {
  value?: MailparserAddressEntry[] | null;
};

export type MailparserAttachment = {
  filename?: string | null;
  contentType?: string | null;
  size?: number | null;
  cid?: string | null;
  contentDisposition?: string | null;
};

export type MailparserParsedMail = {
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

export type MailparserSimpleParser = (
  source: string | Buffer | Uint8Array | NodeJS.ReadableStream
) => Promise<MailparserParsedMail>;
