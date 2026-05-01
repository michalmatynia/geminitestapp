import { RefreshCcw } from 'lucide-react';
import React, { useMemo } from 'react';

import { Button } from '@/shared/ui/primitives.public';

import { evaluateFilemakerMailAccountDmarcAlignment } from '../../mail-utils';
import { useMailPageContext } from '../FilemakerMail.context';
import { MailAccountSettingsForm } from './MailAccountSettingsSection.form';

import type { MailPageState } from '../AdminFilemakerMailPage.hooks';

const hasStoredDkimPrivateKey = (settingKey: string | null | undefined): boolean =>
  (settingKey ?? '').trim().length > 0;

const formatNullableTimestamp = (value: string | null | undefined): string => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? new Date(normalized).toLocaleString() : 'Never';
};

const AccountHeader = ({
  selectedAccountLabel,
  selectedAccount,
  syncingAccountId,
  handleSyncAccount,
}: Pick<
  MailPageState,
  'selectedAccountLabel' | 'selectedAccount' | 'syncingAccountId' | 'handleSyncAccount'
>): React.JSX.Element => (
  <div className='flex flex-wrap items-center justify-between gap-3'>
    <div>
      <div className='text-base font-semibold text-white'>{selectedAccountLabel}</div>
      <div className='text-sm text-gray-500'>
        {selectedAccount !== null
          ? 'Update mailbox connection settings and run sync from here.'
          : 'Create a new IMAP/SMTP mailbox for Filemaker mail sync and replies.'}
      </div>
    </div>
    {selectedAccount !== null ? (
      <Button
        type='button'
        size='sm'
        variant='outline'
        disabled={syncingAccountId === selectedAccount.id}
        onClick={(): void => {
          handleSyncAccount(selectedAccount.id).catch(() => undefined);
        }}
      >
        <RefreshCcw className='mr-2 size-4' />
        {syncingAccountId === selectedAccount.id ? 'Syncing...' : 'Sync'}
      </Button>
    ) : null}
  </div>
);

const AccountSummary = ({
  selectedAccount,
}: Pick<MailPageState, 'selectedAccount'>): React.JSX.Element | null => {
  if (selectedAccount === null) return null;
  const lastSyncError = selectedAccount.lastSyncError?.trim() ?? '';
  return (
    <div className='grid gap-3 text-xs text-gray-500 md:grid-cols-3'>
      <div>Last sync: {formatNullableTimestamp(selectedAccount.lastSyncedAt)}</div>
      <div>
        Allowlist:{' '}
        {selectedAccount.folderAllowlist.length > 0
          ? selectedAccount.folderAllowlist.join(', ')
          : 'Auto'}
      </div>
      <div>Status: {selectedAccount.status}</div>
      {lastSyncError.length > 0 ? (
        <div className='md:col-span-3 text-red-400'>{lastSyncError}</div>
      ) : null}
    </div>
  );
};

export function MailAccountSettingsSection(): React.JSX.Element {
  const state = useMailPageContext();
  const dmarcAlignment = useMemo(
    () =>
      evaluateFilemakerMailAccountDmarcAlignment({
        emailAddress: state.draft.emailAddress,
        replyToEmail: state.draft.replyToEmail,
        dkimDomain: state.draft.dkimDomain,
        dkimKeySelector: state.draft.dkimKeySelector,
        hasDkimPrivateKey:
          state.draft.dkimPrivateKey.trim().length > 0 ||
          hasStoredDkimPrivateKey(state.selectedAccount?.dkimPrivateKeySettingKey),
      }),
    [
      state.draft.emailAddress,
      state.draft.replyToEmail,
      state.draft.dkimDomain,
      state.draft.dkimKeySelector,
      state.draft.dkimPrivateKey,
      state.selectedAccount?.dkimPrivateKeySettingKey,
    ]
  );

  return (
    <div className='space-y-6 rounded-lg border border-border/60 bg-card/25 p-4'>
      <AccountHeader
        selectedAccountLabel={state.selectedAccountLabel}
        selectedAccount={state.selectedAccount}
        syncingAccountId={state.syncingAccountId}
        handleSyncAccount={state.handleSyncAccount}
      />
      <AccountSummary selectedAccount={state.selectedAccount} />
      <MailAccountSettingsForm
        draft={state.draft}
        setDraft={state.setDraft}
        selectedAccount={state.selectedAccount}
        folderAllowlistValue={state.folderAllowlistValue}
        setFolderAllowlistValue={state.setFolderAllowlistValue}
        dmarcWarnings={dmarcAlignment.warnings}
        handleSaveAccount={state.handleSaveAccount}
        isSavingAccount={state.isSavingAccount}
        router={state.router}
      />
    </div>
  );
}
