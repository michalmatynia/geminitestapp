import 'server-only';

import { ImapFlow } from 'imapflow';
import type { FetchMessageObject, ListResponse } from 'imapflow';
import { configurationError } from '@/shared/errors/app-error';
import type {
  FilemakerMailAccount,
} from '../../types';

export const createImapClient = (account: FilemakerMailAccount, password?: string): ImapFlow => {
  const host = account.imapHost;
  const port = account.imapPort;
  if (!host || !port) {
    throw configurationError(`IMAP configuration missing for account ${account.id}`);
  }

  return new ImapFlow({
    host,
    port,
    secure: account.imapSecure,
    auth: {
      user: account.imapUser || account.emailAddress,
      pass: password || '',
    },
    logger: false,
  });
};

export const listImapMailboxes = async (client: ImapFlow): Promise<ListResponse[]> => {
  return await client.list();
};
