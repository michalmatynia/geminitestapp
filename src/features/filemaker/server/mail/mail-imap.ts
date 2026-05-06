import 'server-only';

import { ImapFlow } from 'imapflow';
import type { ListResponse } from 'imapflow';
import { configurationError } from '@/shared/errors/app-error';
import type {
  FilemakerMailAccount,
} from '../../types';
import type { FilemakerMailCredential } from './mail-auth';

const resolveImapAuth = (
  user: string,
  credential?: FilemakerMailCredential
): { user: string; pass: string } | { user: string; accessToken: string } => {
  if (
    typeof credential === 'object' &&
    typeof credential.accessToken === 'string' &&
    credential.accessToken.length > 0
  ) {
    return { user, accessToken: credential.accessToken };
  }
  return {
    user,
    pass: typeof credential === 'string' && credential.length > 0 ? credential : '',
  };
};

export const createImapClient = (
  account: FilemakerMailAccount,
  credential?: FilemakerMailCredential
): ImapFlow => {
  const host = account.imapHost.trim();
  const port = account.imapPort;
  if (host.length === 0 || !Number.isFinite(port) || port <= 0) {
    throw configurationError(`IMAP configuration missing for account ${account.id}`);
  }
  const user = account.imapUser.trim().length > 0 ? account.imapUser : account.emailAddress;

  return new ImapFlow({
    host,
    port,
    secure: account.imapSecure,
    auth: resolveImapAuth(user, credential),
    logger: false,
  });
};

export const listImapMailboxes = async (client: ImapFlow): Promise<ListResponse[]> => {
  return await client.list();
};
