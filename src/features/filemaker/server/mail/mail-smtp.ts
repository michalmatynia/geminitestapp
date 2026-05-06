import 'server-only';

import { createTransport, type Transporter } from 'nodemailer';
import { configurationError } from '@/shared/errors/app-error';
import type {
  FilemakerMailAccount,
} from '../../types';
import type { FilemakerMailCredential } from './mail-auth';

export type FilemakerMailDkimConfig = {
  domainName: string;
  keySelector: string;
  privateKey: string;
};

const normalizeOptionalString = (value: string | null | undefined): string =>
  value?.trim() ?? '';

export const resolveFilemakerMailDkimConfig = (
  account: FilemakerMailAccount,
  dkimPrivateKey?: string | null
): FilemakerMailDkimConfig | null => {
  const domain = normalizeOptionalString(account.dkimDomain);
  const selector = normalizeOptionalString(account.dkimKeySelector);
  const privateKey = normalizeOptionalString(dkimPrivateKey);
  if ([domain, selector, privateKey].some((value: string): boolean => value === '')) return null;
  return { domainName: domain, keySelector: selector, privateKey };
};

const isInvalidSmtpEndpoint = (host: string, port: number): boolean =>
  host === '' || !Number.isFinite(port) || port <= 0;

export const createSmtpTransport = (
  account: FilemakerMailAccount,
  credential?: FilemakerMailCredential,
  dkimPrivateKey?: string | null
): Transporter => {
  const host = account.smtpHost.trim();
  const port = account.smtpPort;
  if (isInvalidSmtpEndpoint(host, port)) {
    throw configurationError(`SMTP configuration missing for account ${account.id}`);
  }

  const dkim = resolveFilemakerMailDkimConfig(account, dkimPrivateKey);
  const user = account.smtpUser.trim() !== '' ? account.smtpUser : account.emailAddress;
  const password = typeof credential === 'string' ? credential : '';
  const auth =
    typeof credential === 'object' && credential.accessToken.length > 0
      ? {
          type: 'OAuth2' as const,
          user,
          accessToken: credential.accessToken,
        }
      : {
          user,
          pass: password,
        };

  return createTransport({
    host,
    port,
    secure: account.smtpSecure,
    auth,
    ...(dkim !== null ? { dkim } : {}),
  });
};
