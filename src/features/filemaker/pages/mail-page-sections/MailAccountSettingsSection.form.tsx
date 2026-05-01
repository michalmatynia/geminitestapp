import { MailPlus } from 'lucide-react';
import React, { startTransition } from 'react';

import { Button, Checkbox, Input } from '@/shared/ui/primitives.public';
import { FormField, FormSection } from '@/shared/ui/forms-and-actions.public';

import { buildFilemakerMailComposeHref as buildComposeHref } from '../../components/FilemakerMailSidebar.helpers';
import { DMARC_WARNING_LABELS } from './MailAccountSettingsSection.labels';

import type { FilemakerMailDmarcAlignmentWarning } from '../../mail-utils';
import type { MailPageState } from '../AdminFilemakerMailPage.hooks';

type MailAccountSettingsFormProps = {
  draft: MailPageState['draft'];
  setDraft: MailPageState['setDraft'];
  selectedAccount: MailPageState['selectedAccount'];
  folderAllowlistValue: string;
  setFolderAllowlistValue: (value: string) => void;
  dmarcWarnings: FilemakerMailDmarcAlignmentWarning[];
  handleSaveAccount: () => Promise<void>;
  isSavingAccount: boolean;
  router: MailPageState['router'];
};

const toNullableInputValue = (value: string): string | null =>
  value.length > 0 ? value : null;

const parsePositiveInt = (value: string, fallback: number): number => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const hasStoredDkimPrivateKey = (
  selectedAccount: MailAccountSettingsFormProps['selectedAccount']
): boolean => (selectedAccount?.dkimPrivateKeySettingKey ?? '').trim().length > 0;

const resolveSaveButtonLabel = (
  isSavingAccount: boolean,
  hasSelectedAccount: boolean
): string => {
  if (isSavingAccount) return hasSelectedAccount ? 'Updating mailbox...' : 'Saving mailbox...';
  return hasSelectedAccount ? 'Update Mailbox' : 'Save Mailbox';
};

const ConnectionFields = ({
  draft,
  setDraft,
  selectedAccount,
}: Pick<MailAccountSettingsFormProps, 'draft' | 'setDraft' | 'selectedAccount'>): React.JSX.Element => (
  <>
    <FormField label='Mailbox name'>
      <Input
        value={draft.name}
        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
          setDraft((prev) => ({ ...prev, name: event.target.value }));
        }}
        placeholder='Primary support inbox'
      />
    </FormField>
    <FormField label='Email address'>
      <Input
        value={draft.emailAddress}
        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
          setDraft((prev) => ({ ...prev, emailAddress: event.target.value }));
        }}
        placeholder='support@example.com'
      />
    </FormField>
    <ServerConnectionGrid draft={draft} setDraft={setDraft} selectedAccount={selectedAccount} />
  </>
);

const ServerConnectionGrid = ({
  draft,
  setDraft,
  selectedAccount,
}: Pick<MailAccountSettingsFormProps, 'draft' | 'setDraft' | 'selectedAccount'>): React.JSX.Element => (
  <>
    <div className='grid gap-3 md:grid-cols-2'>
      <FormField label='IMAP host'>
        <Input value={draft.imapHost} onChange={(event): void => { setDraft((prev) => ({ ...prev, imapHost: event.target.value })); }} placeholder='imap.example.com' />
      </FormField>
      <FormField label='IMAP port'>
        <Input value={String(draft.imapPort)} onChange={(event): void => { setDraft((prev) => ({ ...prev, imapPort: parsePositiveInt(event.target.value, 993) })); }} />
      </FormField>
      <FormField label='IMAP user'>
        <Input value={draft.imapUser} onChange={(event): void => { setDraft((prev) => ({ ...prev, imapUser: event.target.value })); }} />
      </FormField>
      <FormField label='IMAP password'>
        <Input
          type='password'
          value={draft.imapPassword}
          onChange={(event): void => { setDraft((prev) => ({ ...prev, imapPassword: event.target.value })); }}
          placeholder={selectedAccount !== null ? 'Leave blank to keep current password' : ''}
        />
      </FormField>
    </div>
    <div className='grid gap-3 md:grid-cols-2'>
      <FormField label='SMTP host'>
        <Input value={draft.smtpHost} onChange={(event): void => { setDraft((prev) => ({ ...prev, smtpHost: event.target.value })); }} placeholder='smtp.example.com' />
      </FormField>
      <FormField label='SMTP port'>
        <Input value={String(draft.smtpPort)} onChange={(event): void => { setDraft((prev) => ({ ...prev, smtpPort: parsePositiveInt(event.target.value, 465) })); }} />
      </FormField>
      <FormField label='SMTP user'>
        <Input value={draft.smtpUser} onChange={(event): void => { setDraft((prev) => ({ ...prev, smtpUser: event.target.value })); }} />
      </FormField>
      <FormField label='SMTP password'>
        <Input
          type='password'
          value={draft.smtpPassword}
          onChange={(event): void => { setDraft((prev) => ({ ...prev, smtpPassword: event.target.value })); }}
          placeholder={selectedAccount !== null ? 'Leave blank to keep current password' : ''}
        />
      </FormField>
    </div>
  </>
);

const SenderFields = ({
  draft,
  setDraft,
  folderAllowlistValue,
  setFolderAllowlistValue,
}: Pick<
  MailAccountSettingsFormProps,
  'draft' | 'setDraft' | 'folderAllowlistValue' | 'setFolderAllowlistValue'
>): React.JSX.Element => (
  <>
    <div className='grid gap-3 md:grid-cols-2'>
      <FormField label='From name'>
        <Input value={draft.fromName ?? ''} onChange={(event): void => { setDraft((prev) => ({ ...prev, fromName: toNullableInputValue(event.target.value) })); }} placeholder='Filemaker Team' />
      </FormField>
      <FormField label='Reply-to email'>
        <Input value={draft.replyToEmail ?? ''} onChange={(event): void => { setDraft((prev) => ({ ...prev, replyToEmail: toNullableInputValue(event.target.value) })); }} placeholder='reply@example.com' />
      </FormField>
    </div>
    <FormField label='Mailbox allowlist'>
      <Input value={folderAllowlistValue} onChange={(event): void => { setFolderAllowlistValue(event.target.value); }} placeholder='INBOX, Sent' />
    </FormField>
  </>
);

const SyncLimitsFields = ({
  draft,
  setDraft,
}: Pick<MailAccountSettingsFormProps, 'draft' | 'setDraft'>): React.JSX.Element => (
  <div className='grid gap-3 md:grid-cols-2'>
    <FormField label='Initial sync lookback (days)'>
      <Input value={String(draft.initialSyncLookbackDays)} onChange={(event): void => { setDraft((prev) => ({ ...prev, initialSyncLookbackDays: parsePositiveInt(event.target.value, 30) })); }} />
    </FormField>
    <FormField label='Max messages per sync'>
      <Input value={String(draft.maxMessagesPerSync)} onChange={(event): void => { setDraft((prev) => ({ ...prev, maxMessagesPerSync: parsePositiveInt(event.target.value, 100) })); }} />
    </FormField>
  </div>
);

const DkimSection = ({
  draft,
  setDraft,
  selectedAccount,
  dmarcWarnings,
}: Pick<MailAccountSettingsFormProps, 'draft' | 'setDraft' | 'selectedAccount' | 'dmarcWarnings'>): React.JSX.Element => (
  <FormSection title='DKIM signing (optional)' className='space-y-3 p-0'>
    <div className='grid gap-3 md:grid-cols-2'>
      <FormField label='DKIM domain'>
        <Input value={draft.dkimDomain ?? ''} onChange={(event): void => { setDraft((prev) => ({ ...prev, dkimDomain: toNullableInputValue(event.target.value) })); }} placeholder='example.com' />
      </FormField>
      <FormField label='DKIM selector'>
        <Input value={draft.dkimKeySelector ?? ''} onChange={(event): void => { setDraft((prev) => ({ ...prev, dkimKeySelector: toNullableInputValue(event.target.value) })); }} placeholder='mail' />
      </FormField>
    </div>
    <FormField label='DKIM private key (PEM)'>
      <Input
        type='password'
        value={draft.dkimPrivateKey}
        onChange={(event): void => { setDraft((prev) => ({ ...prev, dkimPrivateKey: event.target.value })); }}
        placeholder={hasStoredDkimPrivateKey(selectedAccount) ? 'Leave blank to keep the current key' : '-----BEGIN PRIVATE KEY-----'}
        autoComplete='off'
      />
    </FormField>
    {dmarcWarnings.length > 0 && draft.emailAddress.trim().length > 0 ? <DmarcWarningList warnings={dmarcWarnings} /> : null}
  </FormSection>
);

const DmarcWarningList = ({ warnings }: { warnings: FilemakerMailDmarcAlignmentWarning[] }): React.JSX.Element => (
  <div role='alert' className='rounded border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200'>
    <div className='font-semibold'>DMARC alignment warnings</div>
    <ul className='mt-1 list-disc space-y-1 pl-4'>
      {warnings.map((warning) => <li key={warning}>{DMARC_WARNING_LABELS[warning]}</li>)}
    </ul>
  </div>
);

const SecurityToggles = ({
  draft,
  setDraft,
}: Pick<MailAccountSettingsFormProps, 'draft' | 'setDraft'>): React.JSX.Element => (
  <div className='flex items-center gap-6'>
    <label htmlFor='filemaker-mail-account-imap-secure' className='flex items-center gap-2 text-sm text-white'>
      <Checkbox id='filemaker-mail-account-imap-secure' checked={draft.imapSecure} onCheckedChange={(checked): void => { setDraft((prev) => ({ ...prev, imapSecure: checked === true })); }} />
      IMAP secure
    </label>
    <label htmlFor='filemaker-mail-account-smtp-secure' className='flex items-center gap-2 text-sm text-white'>
      <Checkbox id='filemaker-mail-account-smtp-secure' checked={draft.smtpSecure} onCheckedChange={(checked): void => { setDraft((prev) => ({ ...prev, smtpSecure: checked === true })); }} />
      SMTP secure
    </label>
    <label htmlFor='filemaker-mail-account-push-enabled' className='flex items-center gap-2 text-sm text-white' title='Maintain a live IMAP IDLE connection for push-style new-mail notifications'>
      <Checkbox id='filemaker-mail-account-push-enabled' checked={draft.pushEnabled} onCheckedChange={(checked): void => { setDraft((prev) => ({ ...prev, pushEnabled: checked === true })); }} />
      Push (IMAP IDLE)
    </label>
  </div>
);

const FormActions = ({
  selectedAccount,
  handleSaveAccount,
  isSavingAccount,
  router,
}: Pick<MailAccountSettingsFormProps, 'selectedAccount' | 'handleSaveAccount' | 'isSavingAccount' | 'router'>): React.JSX.Element => (
  <div className='flex flex-wrap gap-2'>
    <Button type='button' onClick={(): void => { handleSaveAccount().catch(() => undefined); }} disabled={isSavingAccount}>
      {resolveSaveButtonLabel(isSavingAccount, selectedAccount !== null)}
    </Button>
    {selectedAccount !== null ? (
      <Button type='button' variant='outline' onClick={(): void => { startTransition(() => { router.push(buildComposeHref({ accountId: selectedAccount.id })); }); }}>
        <MailPlus className='mr-2 size-4' />
        Compose from Account
      </Button>
    ) : null}
  </div>
);

export const MailAccountSettingsForm = (props: MailAccountSettingsFormProps): React.JSX.Element => (
  <FormSection title={props.selectedAccount !== null ? 'Mailbox Settings' : 'Add Mailbox'} className='space-y-3 p-4'>
    <ConnectionFields draft={props.draft} setDraft={props.setDraft} selectedAccount={props.selectedAccount} />
    <SenderFields draft={props.draft} setDraft={props.setDraft} folderAllowlistValue={props.folderAllowlistValue} setFolderAllowlistValue={props.setFolderAllowlistValue} />
    <SyncLimitsFields draft={props.draft} setDraft={props.setDraft} />
    <DkimSection draft={props.draft} setDraft={props.setDraft} selectedAccount={props.selectedAccount} dmarcWarnings={props.dmarcWarnings} />
    <SecurityToggles draft={props.draft} setDraft={props.setDraft} />
    <FormActions selectedAccount={props.selectedAccount} handleSaveAccount={props.handleSaveAccount} isSavingAccount={props.isSavingAccount} router={props.router} />
  </FormSection>
);
