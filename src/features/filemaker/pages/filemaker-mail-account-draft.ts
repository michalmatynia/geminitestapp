import type { FilemakerMailAccount, FilemakerMailAccountDraft } from '../types';

export type FilemakerMailAccountDraftFieldErrors = Partial<
  Record<keyof FilemakerMailAccountDraft, string>
>;

const hasText = (value: string | null | undefined): boolean => (value ?? '').trim().length > 0;

const isPositiveInteger = (value: number): boolean => Number.isInteger(value) && value > 0;

const hasFieldErrors = (errors: FilemakerMailAccountDraftFieldErrors): boolean =>
  Object.keys(errors).length > 0;

const REQUIRED_ACCOUNT_TEXT_FIELDS = [
  ['name', 'Mailbox name is required.'],
  ['emailAddress', 'Email address is required.'],
  ['imapHost', 'IMAP host is required.'],
  ['imapUser', 'IMAP user is required.'],
  ['smtpHost', 'SMTP host is required.'],
  ['smtpUser', 'SMTP user is required.'],
] as const satisfies ReadonlyArray<readonly [keyof FilemakerMailAccountDraft, string]>;

const CREATE_REQUIRED_SECRET_FIELDS = [
  ['imapPassword', 'IMAP password is required when creating a mailbox account.'],
  ['smtpPassword', 'SMTP password is required when creating a mailbox account.'],
] as const satisfies ReadonlyArray<readonly [keyof FilemakerMailAccountDraft, string]>;

const POSITIVE_INTEGER_FIELDS = [
  ['imapPort', 0, 'IMAP port must be a positive number.'],
  ['smtpPort', 0, 'SMTP port must be a positive number.'],
  ['initialSyncLookbackDays', 365, 'Initial sync lookback must be between 1 and 365 days.'],
  ['maxMessagesPerSync', 500, 'Max messages per sync must be between 1 and 500.'],
] as const satisfies ReadonlyArray<readonly [keyof FilemakerMailAccountDraft, number, string]>;

const readDraftString = (
  draft: FilemakerMailAccountDraft,
  field: keyof FilemakerMailAccountDraft
): string | null => {
  const value = draft[field];
  return typeof value === 'string' ? value : null;
};

const readDraftNumber = (
  draft: FilemakerMailAccountDraft,
  field: keyof FilemakerMailAccountDraft
): number | null => {
  const value = draft[field];
  return typeof value === 'number' ? value : null;
};

const collectRequiredStringErrors = (
  draft: FilemakerMailAccountDraft,
  fields: ReadonlyArray<readonly [keyof FilemakerMailAccountDraft, string]>
): FilemakerMailAccountDraftFieldErrors => {
  const errors: FilemakerMailAccountDraftFieldErrors = {};
  fields.forEach(([field, message]) => {
    if (!hasText(readDraftString(draft, field))) {
      errors[field] = message;
    }
  });
  return errors;
};

const collectPositiveIntegerErrors = (
  draft: FilemakerMailAccountDraft
): FilemakerMailAccountDraftFieldErrors => {
  const errors: FilemakerMailAccountDraftFieldErrors = {};
  POSITIVE_INTEGER_FIELDS.forEach(([field, max, message]) => {
    const value = readDraftNumber(draft, field);
    if (value === null || !isPositiveInteger(value) || (max > 0 && value > max)) {
      errors[field] = message;
    }
  });
  return errors;
};

const createDefaultFilemakerMailDraft = (): FilemakerMailAccountDraft => ({
  name: '',
  emailAddress: '',
  authMode: 'password',
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
  dkimDomain: null,
  dkimKeySelector: null,
  dkimPrivateKey: '',
});

const toDraftFromFilemakerMailAccount = (
  account: FilemakerMailAccount
): FilemakerMailAccountDraft => ({
  id: account.id,
  name: account.name,
  emailAddress: account.emailAddress,
  authMode: account.authMode,
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
  pushEnabled: account.pushEnabled,
  dkimDomain: account.dkimDomain ?? null,
  dkimKeySelector: account.dkimKeySelector ?? null,
  dkimPrivateKey: '',
});

const validateFilemakerMailAccountDraft = (
  draft: FilemakerMailAccountDraft
): FilemakerMailAccountDraftFieldErrors => ({
  ...collectRequiredStringErrors(draft, REQUIRED_ACCOUNT_TEXT_FIELDS),
  ...collectPositiveIntegerErrors(draft),
  ...(!hasText(draft.id) && draft.authMode !== 'google_oauth'
    ? collectRequiredStringErrors(draft, CREATE_REQUIRED_SECRET_FIELDS)
    : {}),
});

export {
  createDefaultFilemakerMailDraft,
  hasFieldErrors as hasFilemakerMailAccountDraftErrors,
  toDraftFromFilemakerMailAccount,
  validateFilemakerMailAccountDraft,
};
