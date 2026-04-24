import 'server-only';

import { createTransport } from 'nodemailer';
import { configurationError } from '@/shared/errors/app-error';
import type {
  FilemakerMailAccount,
} from '../../types';

export type FilemakerMailDkimConfig = {
  domainName: string;
  keySelector: string;
  privateKey: string;
};

export const resolveFilemakerMailDkimConfig = (
  account: FilemakerMailAccount,
  dkimPrivateKey?: string | null
): FilemakerMailDkimConfig | null => {
  const domain = account.dkimDomain?.trim();
  const selector = account.dkimKeySelector?.trim();
  const privateKey = dkimPrivateKey?.trim();
  if (!domain || !selector || !privateKey) return null;
  return { domainName: domain, keySelector: selector, privateKey };
};

export const createSmtpTransport = (
  account: FilemakerMailAccount,
  password?: string,
  dkimPrivateKey?: string | null
) => {
  const host = account.smtpHost;
  const port = account.smtpPort;
  if (!host || !port) {
    throw configurationError(`SMTP configuration missing for account ${account.id}`);
  }

  const dkim = resolveFilemakerMailDkimConfig(account, dkimPrivateKey);

  return createTransport({
    host,
    port,
    secure: account.smtpSecure,
    auth: {
      user: account.smtpUser || account.emailAddress,
      pass: password || '',
    },
    ...(dkim ? { dkim } : {}),
  });
};
