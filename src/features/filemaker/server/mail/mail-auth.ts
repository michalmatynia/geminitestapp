import 'server-only';

import { configurationError } from '@/shared/errors/app-error';
import { readSecretSettingValues } from '@/shared/lib/settings/secret-settings';

import type { FilemakerMailAccount } from '../../types';
import { refreshGoogleMailAccessToken, type FilemakerMailOAuthCredential } from './mail-google-oauth';
import { resolveAccountSecretSettingKey } from './mail-utils';

export type FilemakerMailCredential = string | FilemakerMailOAuthCredential;

const isGoogleOAuthAccount = (account: FilemakerMailAccount): boolean =>
  account.authMode === 'google_oauth';

export const resolveFilemakerMailImapCredential = async (
  account: FilemakerMailAccount
): Promise<FilemakerMailCredential> => {
  if (isGoogleOAuthAccount(account)) {
    return { accessToken: await refreshGoogleMailAccessToken(account) };
  }

  const passwordKey = resolveAccountSecretSettingKey(account, 'imap_password');
  const secrets = await readSecretSettingValues([passwordKey]);
  const password = secrets[passwordKey];
  if (password === null || password === undefined) {
    throw configurationError(
      `IMAP password not configured for ${account.emailAddress}. Set it on the mail account before syncing.`
    );
  }
  return password;
};

export const resolveFilemakerMailSmtpCredential = async (
  account: FilemakerMailAccount
): Promise<FilemakerMailCredential> => {
  if (isGoogleOAuthAccount(account)) {
    return { accessToken: await refreshGoogleMailAccessToken(account) };
  }

  const passwordKey = resolveAccountSecretSettingKey(account, 'smtp_password');
  const secrets = await readSecretSettingValues([passwordKey]);
  return secrets[passwordKey] ?? '';
};
