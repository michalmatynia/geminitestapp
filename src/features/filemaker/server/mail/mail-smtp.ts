import 'server-only';

import { createTransport } from 'nodemailer';
import { configurationError } from '@/shared/errors/app-error';
import type {
  FilemakerMailAccount,
} from '../../types';

export const createSmtpTransport = (account: FilemakerMailAccount, password?: string) => {
  const host = account.smtpHost;
  const port = account.smtpPort;
  if (!host || !port) {
    throw configurationError(`SMTP configuration missing for account ${account.id}`);
  }

  return createTransport({
    host,
    port,
    secure: account.smtpSecure,
    auth: {
      user: account.smtpUser || account.emailAddress,
      pass: password || '',
    },
  });
};
