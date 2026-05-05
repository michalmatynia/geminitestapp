import { createImapClient, listImapMailboxes } from '../mail/mail-imap';

export const imapService = {
  createClient: createImapClient,
  listMailboxes: listImapMailboxes,
};
