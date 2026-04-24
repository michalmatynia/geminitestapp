import type { FilemakerMailAccount, FilemakerMailAccountDraft } from '../types';

const createDefaultFilemakerMailDraft = (): FilemakerMailAccountDraft => ({
  name: '',
  emailAddress: '',
  status: 'active',
  imapHost: '',
  imapPort: 993,
  imapSecure: true,
  imapUser: '',
  imapPassword: '',
  smtpHost: '',
  smtpPort: 465,
  smtpSecure: true,
  smtpUser: '',
  smtpPassword: '',
  fromName: null,
  replyToEmail: null,
  folderAllowlist: [],
  initialSyncLookbackDays: 30,
  maxMessagesPerSync: 100,
  pushEnabled: true,
});

const toDraftFromFilemakerMailAccount = (
  account: FilemakerMailAccount
): FilemakerMailAccountDraft => ({
  id: account.id,
  name: account.name,
  emailAddress: account.emailAddress,
  status: account.status,
  imapHost: account.imapHost,
  imapPort: account.imapPort,
  imapSecure: account.imapSecure,
  imapUser: account.imapUser,
  imapPassword: '',
  smtpHost: account.smtpHost,
  smtpPort: account.smtpPort,
  smtpSecure: account.smtpSecure,
  smtpUser: account.smtpUser,
  smtpPassword: '',
  fromName: account.fromName ?? null,
  replyToEmail: account.replyToEmail ?? null,
  folderAllowlist: account.folderAllowlist,
  initialSyncLookbackDays: account.initialSyncLookbackDays,
  maxMessagesPerSync: account.maxMessagesPerSync,
  pushEnabled: account.pushEnabled ?? true,
});

export { createDefaultFilemakerMailDraft, toDraftFromFilemakerMailAccount };
