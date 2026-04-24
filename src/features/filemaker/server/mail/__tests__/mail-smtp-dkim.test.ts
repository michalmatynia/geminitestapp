import { describe, expect, it } from 'vitest';

import { resolveFilemakerMailDkimConfig } from '../mail-smtp';
import type { FilemakerMailAccount } from '../../../types';

const buildAccount = (
  overrides: Partial<FilemakerMailAccount> = {}
): FilemakerMailAccount => ({
  id: 'acct-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  name: 'Default',
  emailAddress: 'hello@example.com',
  provider: 'imap_smtp',
  status: 'active',
  imapHost: 'imap.example.com',
  imapPort: 993,
  imapSecure: true,
  imapUser: 'hello@example.com',
  imapPasswordSettingKey: 'filemaker_mail_acct-1_imap_password',
  smtpHost: 'smtp.example.com',
  smtpPort: 465,
  smtpSecure: true,
  smtpUser: 'hello@example.com',
  smtpPasswordSettingKey: 'filemaker_mail_acct-1_smtp_password',
  folderAllowlist: [],
  initialSyncLookbackDays: 30,
  maxMessagesPerSync: 100,
  pushEnabled: true,
  ...overrides,
});

describe('resolveFilemakerMailDkimConfig', () => {
  it('returns null when DKIM is not configured', () => {
    expect(resolveFilemakerMailDkimConfig(buildAccount(), null)).toBeNull();
    expect(resolveFilemakerMailDkimConfig(buildAccount(), '   ')).toBeNull();
  });

  it('returns null when any of the three fields is missing', () => {
    expect(
      resolveFilemakerMailDkimConfig(
        buildAccount({ dkimKeySelector: 'mail', dkimPrivateKeySettingKey: 'k' }),
        '-----BEGIN PRIVATE KEY-----'
      )
    ).toBeNull();
    expect(
      resolveFilemakerMailDkimConfig(
        buildAccount({ dkimDomain: 'example.com', dkimPrivateKeySettingKey: 'k' }),
        '-----BEGIN PRIVATE KEY-----'
      )
    ).toBeNull();
    expect(
      resolveFilemakerMailDkimConfig(
        buildAccount({ dkimDomain: 'example.com', dkimKeySelector: 'mail' }),
        null
      )
    ).toBeNull();
  });

  it('returns the full config when all three fields are present', () => {
    const config = resolveFilemakerMailDkimConfig(
      buildAccount({
        dkimDomain: 'example.com',
        dkimKeySelector: 'mail',
        dkimPrivateKeySettingKey: 'filemaker_mail_acct-1_dkim_private_key',
      }),
      '-----BEGIN PRIVATE KEY-----\nMII...\n-----END PRIVATE KEY-----'
    );
    expect(config).toEqual({
      domainName: 'example.com',
      keySelector: 'mail',
      privateKey: '-----BEGIN PRIVATE KEY-----\nMII...\n-----END PRIVATE KEY-----',
    });
  });
});
