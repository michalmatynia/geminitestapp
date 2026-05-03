import 'server-only';

import { ImapFlow } from 'imapflow';
import type { ListResponse } from 'imapflow';
import { configurationError } from '@/shared/errors/app-error';
import type {
  FilemakerMailAccount,
} from '../../types';

export const createImapClient = (account: FilemakerMailAccount, password?: string): ImapFlow => {
  const host = account.imapHost.trim();
  const port = account.imapPort;
  if (host.length === 0 || !Number.isFinite(port) || port <= 0) {
    throw configurationError(`IMAP configuration missing for account ${account.id}`);
  }
  const user = account.imapUser.trim().length > 0 ? account.imapUser : account.emailAddress;
  const pass = typeof password === 'string' && password.length > 0 ? password : '';

  return new ImapFlow({
    host,
    port,
    secure: account.imapSecure,
    auth: {
      user,
      pass,
    },
    logger: false,
  });
};

export const listImapMailboxes = async (client: ImapFlow): Promise<ListResponse[]> => {
  return await client.list();
};
