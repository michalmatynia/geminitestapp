import { KeyRound, RefreshCcw, ShieldCheck, Unlink } from 'lucide-react';
import React, { useMemo } from 'react';

import { GoogleOAuthCredentialsSettings } from '@/shared/lib/oauth/components/GoogleOAuthCredentialsSettings';
import { Button } from '@/shared/ui/primitives.public';

import { evaluateFilemakerMailAccountDmarcAlignment } from '../../mail-utils';
import { useMailPageContext } from '../FilemakerMail.context';
import { MailAccountSettingsForm } from './MailAccountSettingsSection.form';

import type { MailPageState } from '../AdminFilemakerMailPage.hooks';

const GOOGLE_OAUTH_CREDENTIALS_SECTION_ID = 'filemaker-google-oauth-credentials';

const hasStoredDkimPrivateKey = (settingKey: string | null | undefined): boolean =>
  (settingKey ?? '').trim().length > 0;

const formatNullableTimestamp = (value: string | null | undefined): string => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? new Date(normalized).toLocaleString() : 'Never';
};

const GoogleAuthActions = ({
  selectedAccount,
  handleDisconnectGoogleAccount,
}: Pick<
  MailPageState,
  'selectedAccount' | 'handleDisconnectGoogleAccount'
>): React.JSX.Element | null => {
  if (selectedAccount === null) return null;
  return (
    <>
      <Button
        type='button'
        size='sm'
        variant='outline'
        onClick={(): void => {
          window.location.assign(
            `/api/filemaker/mail/google/oauth/start?accountId=${encodeURIComponent(
              selectedAccount.id
            )}`
          );
        }}
      >
        <ShieldCheck className='mr-2 size-4' />
        {selectedAccount.authMode === 'google_oauth' ? 'Reconnect Google' : 'Connect Google'}
      </Button>
      <Button type='button' size='sm' variant='outline' asChild>
        <a href={`#${GOOGLE_OAUTH_CREDENTIALS_SECTION_ID}`}>
          <KeyRound className='mr-2 size-4' />
          Configure credentials
        </a>
      </Button>
      {selectedAccount.authMode === 'google_oauth' ? (
        <Button
          type='button'
          size='sm'
          variant='outline'
          onClick={(): void => {
            handleDisconnectGoogleAccount(selectedAccount.id).catch(() => undefined);
          }}
        >
          <Unlink className='mr-2 size-4' />
          Disconnect Google
        </Button>
      ) : null}
    </>
  );
};

const AccountHeader = ({
  selectedAccountLabel,
  selectedAccount,
  syncingAccountId,
  handleSyncAccount,
  handleDisconnectGoogleAccount,
}: Pick<
  MailPageState,
  | 'selectedAccountLabel'
  | 'selectedAccount'
  | 'syncingAccountId'
  | 'handleSyncAccount'
  | 'handleDisconnectGoogleAccount'
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
      <div className='flex flex-wrap gap-2'>
        <GoogleAuthActions
          selectedAccount={selectedAccount}
          handleDisconnectGoogleAccount={handleDisconnectGoogleAccount}
        />
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
      </div>
    ) : null}
  </div>
);

const GoogleAuthErrorBanner = ({
  googleAuthErrorMessage,
}: Pick<MailPageState, 'googleAuthErrorMessage'>): React.JSX.Element | null => {
  if (googleAuthErrorMessage === null) return null;
  return (
    <div
      role='alert'
      className='rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100'
    >
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div className='space-y-1'>
          <p className='font-medium text-amber-50'>Google connection needs credentials</p>
          <p>{googleAuthErrorMessage}</p>
        </div>
        <Button type='button' size='sm' variant='warning' asChild>
          <a href={`#${GOOGLE_OAUTH_CREDENTIALS_SECTION_ID}`}>
            <KeyRound className='mr-2 size-4' />
            Configure Google OAuth
          </a>
        </Button>
      </div>
    </div>
  );
};

const AccountSummary = ({
  selectedAccount,
}: Pick<MailPageState, 'selectedAccount'>): React.JSX.Element | null => {
  if (selectedAccount === null) return null;
  const lastSyncError = selectedAccount.lastSyncError?.trim() ?? '';
  const authMode = selectedAccount.authMode;
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
      <div>
        Auth:{' '}
        {authMode === 'google_oauth'
          ? `Google OAuth, connected ${formatNullableTimestamp(selectedAccount.oauthConnectedAt)}`
          : 'Password/App password'}
      </div>
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
        handleDisconnectGoogleAccount={state.handleDisconnectGoogleAccount}
      />
      <GoogleAuthErrorBanner googleAuthErrorMessage={state.googleAuthErrorMessage} />
      <AccountSummary selectedAccount={state.selectedAccount} />
      <GoogleOAuthCredentialsSettings id={GOOGLE_OAUTH_CREDENTIALS_SECTION_ID} />
      <MailAccountSettingsForm
        draft={state.draft}
        setDraft={state.setDraft}
        selectedAccount={state.selectedAccount}
        accountFormErrors={state.accountFormErrors}
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
